// src/pages/Ware/components/NewItemModal.jsx
import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faFileUpload } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

import { wareApi } from "../../../services/api";
import { buildNewPath, fileMimeTypeName } from "../../../utils/helpers";
import { config } from "../../../utils/config";
import Modal from "../../../components/common/Modal/Modal";
import FileUpload from "../../../components/shared/FileUpload/FileUpload";
import useAuthStore from "../../../store/authStore"; // 引入 AuthStore

import styles from "./NewItemModal.module.css";

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

const NewItemModal = ({ isOpen, onClose, currentPath, onSuccess }) => {
  const [view, setView] = useState("options");
  const [dirName, setDirName] = useState("");
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const abortControllersRef = useRef([]);

  // 获取当前课程ID
  const { currentCourseId } = useAuthStore();

  const resetForm = () => {
    setView("options");
    setDirName("");
    setFiles([]);
    setIsProcessing(false);
    setUploadProgress({});
    abortControllersRef.current = [];
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateFileProgress = (fileName, progressData) => {
    setUploadProgress((prev) => ({
      ...prev,
      [fileName]: { ...(prev[fileName] || {}), ...progressData },
    }));
  };

  const executeConcurrent = async (tasks, limit) => {
    const results = [];
    const executing = [];
    for (const task of tasks) {
      const p = Promise.resolve().then(() => task());
      results.push(p);
      if (limit <= tasks.length) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }
    }
    return Promise.all(results);
  };

  // 生成传递给 AI 的格式化路径（课程ID/路径）
  // 生成传递给 AI 的格式化路径（按照角色进行前缀拼接：学校/班级/课程）
  const getFormatAiPath = (destPath) => {
    if (!currentCourseId) return destPath;

    const state = useAuthStore.getState();
    const isAdmin = state.isAdmin();
    const isPrincipal = state.isPrincipal();
    const courseIdStr = String(currentCourseId);

    let cleanPath = destPath || "/";

    // 1. 如果是从外层传进来的路径，可能已经带有正确的管理员或校长前缀，直接返回即可
    if (isAdmin) {
      const schoolName =
        localStorage.getItem("adminSelectedSchoolName") || "未知学校";
      const className =
        localStorage.getItem("adminSelectedClassName") || "未知班级";
      const adminPrefix = `/${schoolName}/${className}/${courseIdStr}`;
      if (cleanPath.startsWith(adminPrefix)) {
        return cleanPath;
      }
    } else if (isPrincipal) {
      const className =
        localStorage.getItem("adminSelectedClassName") || "未知班级";
      const principalPrefix = `/${className}/${courseIdStr}`;
      if (cleanPath.startsWith(principalPrefix)) {
        return cleanPath;
      }
    }

    // 2. 如果是没有前缀的干净路径，则执行清理和重新拼接逻辑
    const prefix = `/${courseIdStr}`;
    if (cleanPath === prefix) {
      cleanPath = "";
    } else if (cleanPath.startsWith(prefix + "/")) {
      cleanPath = cleanPath.slice(prefix.length);
    }

    if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
    if (cleanPath === "/") cleanPath = "";

    // 3. 按照角色返回正确的路径格式
    if (isAdmin) {
      const schoolName =
        localStorage.getItem("adminSelectedSchoolName") || "未知学校";
      const className =
        localStorage.getItem("adminSelectedClassName") || "未知班级";
      return `/${schoolName}/${className}/${courseIdStr}${cleanPath}`;
    } else if (isPrincipal) {
      const className =
        localStorage.getItem("adminSelectedClassName") || "未知班级";
      return `/${className}/${courseIdStr}${cleanPath}`;
    }

    // 老师默认：/课程id/path
    return `/${courseIdStr}${cleanPath}`;
  };

  const uploadSmallFile = async (file, destPath) => {
    updateFileProgress(file.name, { percent: 0, status: "上传中..." });
    const formData = new FormData();
    formData.append("path", destPath);
    formData.append("file", file);
    formData.append("mimeTypeName", fileMimeTypeName(file));

    try {
      await wareApi.post("/create/files", formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          updateFileProgress(file.name, { percent, status: "上传中..." });
        },
      });
      updateFileProgress(file.name, { percent: 100, status: "成功" });

      // 同步调用 /ai/summary 接口，要求传递拼接上课程ID的 paths 数组
      const aiPath = getFormatAiPath(destPath);
      const apiRoot = wareApi.defaults.baseURL.split("/ware")[0];
      wareApi
        .post("/llm/ai/summary", { paths: [aiPath] }, { baseURL: apiRoot })
        .catch((e) => console.error("AI Summary Trigger Failed:", e));
    } catch (error) {
      updateFileProgress(file.name, {
        percent: 0,
        status: "失败",
        error: true,
      });
      throw error;
    }
  };

  const uploadLargeFile = async (file, destPath) => {
    updateFileProgress(file.name, { percent: 0, status: "初始化..." });

    let uploadId;
    try {
      const initResponse = await wareApi.post("/chunk/init", {
        path: destPath,
        mimeTypeName: fileMimeTypeName(file),
      });
      uploadId = initResponse.data.data.uploadId;
    } catch (error) {
      updateFileProgress(file.name, { status: "初始化失败", error: true });
      throw error;
    }

    const totalChunks = Math.ceil(file.size / LARGE_FILE_THRESHOLD);
    const chunkTasks = [];
    const progressMap = new Array(totalChunks).fill(0);

    for (let i = 0; i < totalChunks; i++) {
      chunkTasks.push(() => {
        const start = i * LARGE_FILE_THRESHOLD;
        const end = Math.min(start + LARGE_FILE_THRESHOLD, file.size);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", i);
        formData.append("totalChunks", totalChunks);
        formData.append("chunk", chunk);

        return wareApi.post("/chunk/upload", formData, {
          onUploadProgress: (progressEvent) => {
            progressMap[i] = progressEvent.loaded;
            const totalLoaded = progressMap.reduce((acc, val) => acc + val, 0);
            const percent = Math.round((totalLoaded * 100) / file.size);
            updateFileProgress(file.name, {
              percent,
              status: `分片上传中 (${i + 1}/${totalChunks})`,
            });
          },
        });
      });
    }

    try {
      await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY);
    } catch (error) {
      updateFileProgress(file.name, { status: "分片上传失败", error: true });
      throw error;
    }

    updateFileProgress(file.name, { percent: 100, status: "合并中..." });
    try {
      const formData = new FormData();
      formData.append("uploadId", uploadId);
      formData.append("totalChunks", totalChunks);
      await wareApi.post("/chunk/merge", formData);
      updateFileProgress(file.name, { percent: 100, status: "成功" });

      // 同步调用 /ai/summary 接口，要求传递拼接上课程ID的 paths 数组
      const aiPath = getFormatAiPath(destPath);
      const apiRoot = wareApi.defaults.baseURL.split("/ware")[0];
      wareApi
        .post("/llm/ai/summary", { paths: [aiPath] }, { baseURL: apiRoot })
        .catch((e) => console.error("AI Summary Trigger Failed:", e));
    } catch (error) {
      updateFileProgress(file.name, { status: "合并失败", error: true });
      throw error;
    }
  };

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      Swal.fire({ icon: "info", title: "请选择文件" });
      return;
    }

    setIsProcessing(true);
    setUploadProgress({});

    const uploadTasks = files.map((file) => {
      const destPath = buildNewPath(currentPath, file.name);
      if (file.size <= LARGE_FILE_THRESHOLD) {
        return uploadSmallFile(file, destPath);
      } else {
        return uploadLargeFile(file, destPath);
      }
    });

    const results = await Promise.allSettled(uploadTasks);
    const failedCount = results.filter((r) => r.status === "rejected").length;

    setIsProcessing(false);

    if (failedCount === 0) {
      Swal.fire({
        icon: "success",
        title: "所有文件上传成功",
        timer: 1500,
        showConfirmButton: false,
      });
      onSuccess();
      handleClose();
    } else if (failedCount === files.length) {
      Swal.fire({ icon: "error", title: "所有文件上传失败" });
    } else {
      Swal.fire({
        icon: "warning",
        title: `部分文件上传失败 (${failedCount}/${files.length})`,
        text: "请检查进度列表。",
      });
      onSuccess();
    }
  };

  const handleCreateDir = async (e) => {
    e.preventDefault();
    if (!dirName.trim()) return;
    setIsProcessing(true);
    try {
      const path = buildNewPath(currentPath, dirName);
      await wareApi.post("/create/directories", null, { params: { path } });
      Swal.fire({
        icon: "success",
        title: "目录创建成功",
        timer: 1500,
        showConfirmButton: false,
      });
      onSuccess();
      handleClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "创建失败",
        text: error.response?.data?.message || "服务器错误",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal show={isOpen} onClose={handleClose} title="新建">
      {view === "options" && (
        <div className={styles.newItemOptions}>
          <button className={styles.optionBtn} onClick={() => setView("dir")}>
            <FontAwesomeIcon icon={faFolderPlus} />
            <span>新建目录</span>
          </button>
          <button
            className={styles.optionBtn}
            onClick={() => setView("upload")}
          >
            <FontAwesomeIcon icon={faFileUpload} />
            <span>上传文件</span>
          </button>
        </div>
      )}

      {view === "dir" && (
        <form onSubmit={handleCreateDir} className={styles.formContainer}>
          <h3 className={styles.formSubtitle}>新建目录</h3>
          <input
            type="text"
            placeholder="目录名称"
            value={dirName}
            onChange={(e) => setDirName(e.target.value)}
            required
            autoFocus
            className={styles.dirInput}
            disabled={isProcessing}
          />
          <div className={styles.formActions}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> 创建中...
                </>
              ) : (
                "创建"
              )}
            </button>
          </div>
        </form>
      )}

      {view === "upload" && (
        <form onSubmit={handleUploadFiles} className={styles.formContainer}>
          <h3 className={styles.formSubtitle}>上传文件</h3>
          {!isProcessing && (
            <FileUpload files={files} onFilesChange={setFiles} />
          )}

          {(isProcessing || Object.keys(uploadProgress).length > 0) && (
            <div className={styles.progressContainer}>
              {files.map((file) => {
                const prog = uploadProgress[file.name] || {
                  percent: 0,
                  status: "等待中...",
                };
                const statusClass = prog.error
                  ? styles.statusError
                  : prog.percent === 100
                    ? styles.statusSuccess
                    : "";
                return (
                  <div key={file.name} className={styles.progressItem}>
                    <div className={styles.progressInfo}>
                      <span className={styles.progressFileName}>
                        {file.name}
                      </span>
                      <span
                        className={`${styles.progressStatus} ${statusClass}`}
                      >
                        {prog.status}
                      </span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div
                        className={`${styles.progressBarFg} ${prog.error ? styles.barError : ""}`}
                        style={{ width: `${prog.percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> 上传中...
                </>
              ) : (
                "立即上传"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default NewItemModal;
