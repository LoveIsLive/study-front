// src/pages/Ware/CourseWareFlatView.jsx
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashAlt,
  faEllipsisH,
  faPlus,
  faDownload,
  faEdit,
  faRobot,
  faClipboardList,
  faFolder,
  faFile,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileImage,
  faFileVideo,
  faFileAudio,
  faFileCode,
  faFileArchive,
  faFileLines,
  faEyeSlash,
  faBoxOpen,
} from "@fortawesome/free-solid-svg-icons";
import { wareApi } from "../../services/api";
import { isPreviewable, formatFileSize } from "../../utils/helpers";
import useAuthStore from "../../store/authStore";
import useAIStore from "../../store/aiStore";
import Swal from "sweetalert2";
import NewItemModal from "./components/NewItemModal";
import styles from "./CourseWareFlatView.module.css";
// 【新增】引入 STOMP 客户端
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client"; // 【新增这行】

/**
 * 根据身份重写完整后端实际仓库路径的包装器 (基于名称拼接)
 */
const getWareApiPath = (path, courseId) => {
  if (!courseId) return path;
  const state = useAuthStore.getState();
  const isAdmin = state.isAdmin();
  const isPrincipal = state.isPrincipal();

  let cleanPath = path || "/";
  const prefix = `/${courseId}`;
  if (cleanPath === prefix) {
    cleanPath = "";
  } else if (cleanPath.startsWith(prefix + "/")) {
    cleanPath = cleanPath.slice(prefix.length);
  }
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  if (cleanPath === "/") cleanPath = "";

  if (isAdmin || isPrincipal) {
    let schoolName =
      localStorage.getItem("adminSelectedSchoolName") || "未知学校";
    let className =
      localStorage.getItem("adminSelectedClassName") || "未知班级";

    if (isAdmin) {
      return `/${schoolName}/${className}/${courseId}${cleanPath}`;
    } else if (isPrincipal) {
      return `/${className}/${courseId}${cleanPath}`;
    }
  }

  return path;
};

const getFileIconConfig = (fileName, isDir) => {
  if (isDir) return { icon: faFolder, color: "#ffd43b" };
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return { icon: faFilePdf, color: "#e2574c" };
    case "doc":
    case "docx":
      return { icon: faFileWord, color: "#2b579a" };
    case "xls":
    case "xlsx":
      return { icon: faFileExcel, color: "#217346" };
    case "ppt":
    case "pptx":
      return { icon: faFilePowerpoint, color: "#d24726" };
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
    case "webp":
      return { icon: faFileImage, color: "#17a2b8" };
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
      return { icon: faFileVideo, color: "#6f42c1" };
    case "mp3":
    case "wav":
    case "flac":
      return { icon: faFileAudio, color: "#17a2b8" };
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return { icon: faFileArchive, color: "#6c757d" };
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "html":
    case "css":
    case "json":
    case "java":
    case "py":
    case "cpp":
      return { icon: faFileCode, color: "#fd7e14" };
    case "txt":
    case "md":
    case "csv":
      return { icon: faFileLines, color: "#495057" };
    default:
      return { icon: faFile, color: "#adb5bd" };
  }
};

const ChevronRight = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// --- 递归的树节点组件 ---
const TreeNode = ({ node, currentPath, onRefresh, openModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const { currentCourseId } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const hasFullAccess = isTeacher || isAdmin || isPrincipal;

  const isDir =
    node.isDir !== undefined ? node.isDir : !node.name.includes(".");
  const fullPath =
    currentPath === "/" ? `/${node.name}` : `${currentPath}/${node.name}`;

  const isNodeHidden = node.isHidden === 1;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const fetchChildren = async () => {
    try {
      const reqPath = getWareApiPath(fullPath, currentCourseId);
      const response = await wareApi.get("/get/dir", {
        params: { path: reqPath },
      });
      setChildren(response.data.data.fileObjectDescs || []);
      setHasFetched(true);
    } catch (error) {
      console.error("加载文件夹内容失败:", error);
    }
  };

  const handleToggle = async (e) => {
    if (!isDir) return;
    if (!hasFetched) {
      setIsLoading(true);
      setIsExpanded(true);
      await fetchChildren();
      setIsLoading(false);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleItemClick = (e) => {
    if (isDir) {
      handleToggle(e);
    } else if (isPreviewable(node.mimeTypeName || node.name)) {
      handleAction("preview", e);
    }
  };

  const handleRename = async () => {
    if (newName && newName !== node.name) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId);
        if (isDir) {
          await wareApi.post("/update/dir", null, {
            params: { path: reqPath, newName },
          });
        } else {
          await wareApi.post("/update/file", { path: reqPath, newName });
        }
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "重命名成功",
          showConfirmButton: false,
          timer: 2000,
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "重命名失败",
          text: error.response?.data?.message,
        });
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: `确定要删除 "${node.name}" 吗?`,
      text: isDir ? "警告：删除目录将永久删除其所有内容！" : "此操作无法撤销。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "取消",
      confirmButtonText: "是的，删除",
    });

    if (result.isConfirmed) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId);
        const url = isDir ? "/delete/dir" : "/delete/file";
        await wareApi.delete(url, { params: { path: reqPath } });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `"${node.name}" 已删除`,
          showConfirmButton: false,
          timer: 2000,
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        Swal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  const handleToggleHidden = async (e) => {
    e.stopPropagation();

    const actionText = isNodeHidden ? "显示" : "隐藏";
    const targetStatus = isNodeHidden ? 0 : 1;

    const result = await Swal.fire({
      title: `确定要${actionText} "${node.name}" 吗?`,
      text: isNodeHidden
        ? "显示后，学生和访客将可以看到此内容。"
        : "隐藏后，学生和访客将无法看到此内容。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isNodeHidden ? "#28a745" : "#f39c12",
      cancelButtonText: "取消",
      confirmButtonText: `是的，${actionText}`,
    });

    if (result.isConfirmed) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId);
        await wareApi.post("/update/hidden", null, {
          params: {
            path: reqPath,
            isHidden: targetStatus,
          },
        });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `已成功${actionText}`,
          showConfirmButton: false,
          timer: 2000,
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: `${actionText}失败`,
          text: error.response?.data?.message || "接口调用失败",
        });
      }
    }
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: `确定要压缩目录 "${node.name}" 吗?`,
      text: "打包任务将在后台执行，执行完成后会自动刷新。",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "确定压缩",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId);
        await wareApi.post("/archive", {
          sourceDirPath: reqPath,
          zipFileName: `${node.name}.zip`,
        });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "打包任务已提交",
          text: "完成后将自动通知并刷新列表",
          showConfirmButton: false,
          timer: 3000,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "提交打包失败",
          text: error.response?.data?.message || "接口调用失败",
        });
      }
    }
  };

  const handleUnarchive = async (e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: `确定要解压 "${node.name}" 吗?`,
      text: "解压将释放文件到当前目录层级，并在后台执行。",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "确定解压",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      try {
        const zipFilePath = getWareApiPath(fullPath, currentCourseId);
        const parentPath = currentPath === "/" ? "/" : currentPath;
        const targetDirPath = getWareApiPath(parentPath, currentCourseId);

        await wareApi.post("/unarchive", {
          zipFilePath: zipFilePath,
          targetDirPath: targetDirPath,
        });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "解压任务已提交",
          text: "完成后将自动通知并刷新列表",
          showConfirmButton: false,
          timer: 3000,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "提交解压失败",
          text: error.response?.data?.message || "接口调用失败",
        });
      }
    }
  };

  const handleAction = async (action, e) => {
    e.stopPropagation();
    const reqPath = getWareApiPath(fullPath, currentCourseId);

    try {
      if (action === "details") {
        const response = await wareApi.get("/get/node", {
          params: { path: reqPath },
        });
        const details = response.data.data;
        Swal.fire({
          title: `<strong>属性: ${details.name}</strong>`,
          html: `<div style="text-align: left; margin-left: 2rem;">
                     <p><strong>类型:</strong> ${details.type === 0 ? "目录" : "文件"}</p>
                     <p><strong>大小:</strong> ${details.type === 1 ? formatFileSize(details.size) : "--"}</p>
                     <p><strong>路径:</strong> ${fullPath}</p>
                     <p><strong>状态:</strong> <span style="color: ${details.isHidden === 1 ? "#e74c3c" : "#2ecc71"}; font-weight: bold;">${details.isHidden === 1 ? "已隐藏" : "公开"}</span></p>
                     <p><strong>创建时间:</strong> ${new Date(details.createTime).toLocaleString()}</p>
                     <p><strong>修改时间:</strong> ${new Date(details.modifyTime).toLocaleString()}</p>
                 </div>`,
          showCloseButton: true,
        });
      } else if (action === "preview" || action === "download") {
        const res = await wareApi.get("/get/downloadId", {
          params: { path: reqPath },
        });
        const token = res.data.data;
        const baseUrl = wareApi.defaults.baseURL;
        const url = `${baseUrl}/download?path=${encodeURIComponent(reqPath)}&token=${token}`;

        if (action === "preview") {
          window.open(`${url}&mode=inline`, "_blank");
        } else {
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", node.name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (action === "ai-summary") {
        const aiStore = useAIStore.getState();
        const authStore = useAuthStore.getState();

        let apiPath = fullPath;
        if (authStore.currentCourseId) {
          const courseIdStr = String(authStore.currentCourseId);
          if (!apiPath.startsWith(`/${courseIdStr}`)) {
            if (apiPath === "/" || apiPath === "") {
              apiPath = `/${courseIdStr}`;
            } else {
              const normalizedPath = apiPath.startsWith("/")
                ? apiPath
                : "/" + apiPath;
              apiPath = `/${courseIdStr}${normalizedPath}`;
            }
          }
        }

        const finalPath = getWareApiPath(apiPath, authStore.currentCourseId);
        console.log("最终发送给AI后端的路径:", finalPath);

        aiStore.setContext("file-summary", {
          path: finalPath,
          autoSendMsg: `请帮我总结一下这个文件：${node.name}`,
          requireNewChat: true,
        });

        if (typeof aiStore.toggleChat === "function") {
          aiStore.toggleChat(true);
        }
        window.dispatchEvent(new CustomEvent("open-ai-chat"));

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "已唤醒AI",
          text: "正在新建对话并生成总结...",
          showConfirmButton: false,
          timer: 2000,
        });
      } else if (action === "view-summary") {
        const response = await wareApi.get("/get/summary", {
          params: { path: reqPath },
        });
        const currentSummary = response.data.data?.aiSummary || "";

        if (hasFullAccess) {
          const { value: newSummary, isConfirmed } = await Swal.fire({
            title: "AI 文件总结",
            input: "textarea",
            inputValue: currentSummary,
            inputPlaceholder: "暂无AI总结内容...",
            showCancelButton: true,
            confirmButtonText: "保存修改",
            cancelButtonText: "关闭",
          });
          if (isConfirmed && newSummary !== currentSummary) {
            await wareApi.post("/update/summary", null, {
              params: { path: reqPath, summary: newSummary },
            });
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "总结已保存",
              showConfirmButton: false,
              timer: 2000,
            });
          }
        } else {
          await Swal.fire({
            title: "AI 文件总结",
            html: `<div style="text-align: left; white-space: pre-wrap; line-height: 1.6;">${currentSummary || "暂无AI总结内容"}</div>`,
            showCancelButton: true,
            cancelButtonText: "关闭",
          });
        }
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "操作失败" });
    }
  };
  return (
    <li className={styles.nodeItem}>
      <div className={styles.nodeContent} onClick={handleItemClick}>
        <div className={styles.iconCircle}>
          {(() => {
            const { icon, color } = getFileIconConfig(node.name, isDir);
            return (
              <FontAwesomeIcon
                icon={icon}
                style={{ color, fontSize: "1.2rem" }}
              />
            );
          })()}
        </div>

        <div className={styles.nodeNameWrapper}>
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleRename()}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className={styles.renameInput}
            />
          ) : (
            <>
              <span
                className={styles.nodeName}
                style={{ color: isNodeHidden ? "#999" : "#333" }}
              >
                {node.name}
              </span>
              {isNodeHidden && (
                <FontAwesomeIcon
                  icon={faEyeSlash}
                  style={{
                    color: "#f39c12",
                    marginLeft: "8px",
                    fontSize: "0.9rem",
                    opacity: 0.8,
                  }}
                  title="已对学生和访客隐藏"
                />
              )}
            </>
          )}
        </div>

        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {hasFullAccess && isDir && (
            <FontAwesomeIcon
              icon={faPlus}
              className={styles.actionBtn}
              title="上传到此文件夹"
              onClick={(e) => {
                e.stopPropagation();
                openModal(fullPath, fetchChildren);
              }}
            />
          )}
          {!isDir && (
            <FontAwesomeIcon
              icon={faDownload}
              className={styles.actionBtn}
              title="下载"
              onClick={(e) => handleAction("download", e)}
            />
          )}

          {!isDir &&
            node.name.toLowerCase().endsWith(".zip") &&
            hasFullAccess && (
              <FontAwesomeIcon
                icon={faBoxOpen}
                className={styles.actionBtn}
                title="解压到当前目录"
                onClick={handleUnarchive}
              />
            )}

          {!isDir && (
            <>
              <FontAwesomeIcon
                icon={faRobot}
                className={styles.actionBtn}
                title="AI一键总结"
                onClick={(e) => handleAction("ai-summary", e)}
              />
              <FontAwesomeIcon
                icon={faClipboardList}
                className={styles.actionBtn}
                title="查看AI总结"
                onClick={(e) => handleAction("view-summary", e)}
              />
            </>
          )}

          <div className={styles.moreMenuWrapper} ref={menuRef}>
            <FontAwesomeIcon
              icon={faEllipsisH}
              className={styles.actionBtn}
              title="更多"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            />
            {showMenu && (
              <div className={styles.dropdownMenu}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction("details", e);
                    setShowMenu(false);
                  }}
                >
                  查看属性
                </div>
                {hasFullAccess && (
                  <>
                    <div
                      onClick={(e) => {
                        handleToggleHidden(e);
                        setShowMenu(false);
                      }}
                    >
                      {isNodeHidden ? "显示" : "隐藏"}
                    </div>

                    {isDir && (
                      <div
                        onClick={(e) => {
                          handleArchive(e);
                          setShowMenu(false);
                        }}
                      >
                        压缩为ZIP
                      </div>
                    )}

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(true);
                        setShowMenu(false);
                      }}
                    >
                      重命名
                    </div>
                    <div
                      onClick={(e) => {
                        handleDelete(e);
                        setShowMenu(false);
                      }}
                    >
                      删除
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {isDir && (
          <div
            className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}
          >
            <ChevronRight />
          </div>
        )}
      </div>

      {isDir && (
        <div
          className={`${styles.childrenWrapper} ${isExpanded ? styles.expanded : ""}`}
        >
          <div className={styles.childrenInner}>
            <div className={styles.childrenContainer}>
              {isLoading ? (
                <div className={styles.loading}>加载中...</div>
              ) : (
                <ul className={styles.nodeList}>
                  {children.map((child, index) => (
                    <TreeNode
                      key={index}
                      node={child}
                      currentPath={fullPath}
                      onRefresh={fetchChildren}
                      openModal={openModal}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

// --- 主组件 ---
// --- 主组件 ---
const CourseWareFlatView = ({ courseId }) => {
  const [rootNodes, setRootNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    path: "/",
    onRefresh: null,
  });

  // 【新增】：用于强制刷新整个文件树的 Key
  const [treeVersion, setTreeVersion] = useState(0);

  const { isAdmin, isTeacher, isPrincipal } = useAuthStore();
  const hasFullAccess = isTeacher() || isAdmin() || isPrincipal();

  const fetchRoot = async () => {
    setIsLoading(true);
    try {
      const reqPath = getWareApiPath("/", courseId);
      const response = await wareApi.get("/get/dir", {
        params: { path: reqPath },
      });
      setRootNodes(response.data.data.fileObjectDescs || []);
    } catch (error) {
      console.error("加载根目录失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchRoot();

    const token = useAuthStore.getState().token || "";

    const stompClient = new Client({
      // 【修改点 1】：删掉或注释掉 brokerURL
      // brokerURL: `ws://localhost:8080/ws/search?token=${token}`,

      // 【修改点 2】：改用 webSocketFactory，并且使用 http:// 协议
      webSocketFactory: () =>
        new SockJS(`http://localhost:8080/ws/search?token=${token}`),

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => console.log("[STOMP] " + str),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("仓库 WebSocket 已连接，正在监听后台解压/压缩任务...");

        stompClient.subscribe("/user/queue/task-notifications", (message) => {
          if (message.body) {
            const payload = JSON.parse(message.body);

            if (payload.type === "FILE_TASK") {
              if (payload.status === "SUCCESS") {
                Swal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: payload.message,
                  showConfirmButton: false,
                  timer: 3000,
                });

                // 刷新页面数据
                fetchRoot();
                setTreeVersion((prev) => prev + 1);
              } else if (payload.status === "ERROR") {
                Swal.fire({
                  icon: "error",
                  title: "任务执行失败",
                  text: payload.message,
                });
              }
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP 连接错误:", frame.headers["message"]);
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [courseId]);

  const openModal = (path, onRefresh) =>
    setModalConfig({ isOpen: true, path, onRefresh });

  if (isLoading) return <div className={styles.loadingMain}>仓库加载中...</div>;

  return (
    <div className={styles.container}>
      {hasFullAccess && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>课程资料</span>
          <button
            className={styles.newBtn}
            onClick={() => openModal("/", fetchRoot)}
          >
            <FontAwesomeIcon icon={faPlus} /> 上传到根目录
          </button>
        </div>
      )}

      {/* 【修改点 3】：给外层 ul 加上 key={treeVersion}，一旦 version 改变，内部所有展开的文件夹会全部刷新 */}
      <ul className={styles.nodeList} key={treeVersion}>
        {rootNodes.map((node, index) => (
          <TreeNode
            key={index}
            node={node}
            currentPath="/"
            onRefresh={fetchRoot}
            openModal={openModal}
          />
        ))}
      </ul>

      <NewItemModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        currentPath={getWareApiPath(modalConfig.path, courseId)}
        onSuccess={() => modalConfig.onRefresh && modalConfig.onRefresh()}
      />
    </div>
  );
};

export default CourseWareFlatView;
