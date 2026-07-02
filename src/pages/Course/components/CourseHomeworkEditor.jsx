// src/pages/Course/components/CourseHomeworkEditor.jsx
import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPaperPlane,
  faMagic,
  faCloudUploadAlt,
  faTimes,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import { useUploader } from "../../../hooks/useUploader";
import { homeworkApi, attachApi } from "../../../services/api";
import { getFileIcon } from "../../../utils/helpers";
import useAuthStore from "../../../store/authStore";
import FileUpload from "../../../components/shared/FileUpload/FileUpload";
import QuestionBuilder from "../../../components/shared/QuestionEngine/Builder/QuestionBuilder";
import AIAssistantPanel from "../../../components/shared/QuestionEngine/Builder/AIAssistantPanel";

// 引入专属的新样式
import styles from "./CourseHomeworkEditor.module.css";
// 复用进度条样式
import progressStyles from "../../Ware/components/NewItemModal.module.css";

const CourseHomeworkEditor = ({ onBack, editingHomework, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [homeworkType, setHomeworkType] = useState("SIMPLE");
  const [questions, setQuestions] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentIdsToDelete, setAttachmentIdsToDelete] = useState([]);

  const { isUploading, uploadProgress, startUpload, setIsUploading } =
    useUploader(attachApi);
  const textareaRef = useRef(null);
  const isEditMode = !!editingHomework;

  useEffect(() => {
    if (isEditMode) {
      setTitle(editingHomework.title || "");
      setContent(editingHomework.content || "");
      setExistingAttachments(editingHomework.attachments || []);
      setCourseId(editingHomework.courseId || null);

      if (editingHomework.type === "STRUCTURED") {
        setHomeworkType("STRUCTURED");
        if (editingHomework.metaData) {
          try {
            const meta =
              typeof editingHomework.metaData === "string"
                ? JSON.parse(editingHomework.metaData)
                : editingHomework.metaData;
            setQuestions(meta.questions || []);
          } catch (e) {
            setQuestions([]);
          }
        }
      }
    } else {
      const { currentCourseId } = useAuthStore.getState();
      setCourseId(currentCourseId || null);
    }
  }, [isEditMode, editingHomework]);

  useEffect(() => {
    if (homeworkType === "SIMPLE" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [content, homeworkType]);

  const handleToggleAIPanel = () => {
    const nextState = !isAIPanelOpen;
    setIsAIPanelOpen(nextState);
    if (nextState && homeworkType !== "STRUCTURED") {
      setHomeworkType("STRUCTURED");
    }
  };

  const handleAIApply = (aiData) => {
    setHomeworkType("STRUCTURED");
    if (aiData.title) setTitle(aiData.title);
    if (aiData.content) setContent(aiData.content);
    if (aiData.questions && aiData.questions.length > 0) {
      setQuestions(aiData.questions);
    }
  };

  const handleContentChange = (e) => setContent(e.target.value);

  const handleRemoveExistingAttachment = (attachmentId) => {
    setExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId),
    );
    setAttachmentIdsToDelete((prev) => [...prev, attachmentId]);
  };

  const handleSubmit = async () => {
    if (!courseId)
      return Swal.fire({
        toast: true,
        icon: "warning",
        title: "请选择课程",
        position: "top",
      });
    if (!title.trim())
      return Swal.fire({
        toast: true,
        icon: "warning",
        title: "请输入作业标题",
        position: "top",
      });
    if (homeworkType === "STRUCTURED" && questions.length === 0) {
      return Swal.fire({
        toast: true,
        icon: "warning",
        title: "请至少添加一道题目",
        position: "top",
      });
    }

    try {
      setIsUploading(true);
      const { smallFiles, largeFileAttachmentIds } =
        await startUpload(newlyUploadedFiles);

      const dto = {
        title,
        content,
        courseId,
        type: homeworkType,
        attachmentUploadIds: largeFileAttachmentIds.map((f) => f.uploadId),
      };
      if (isEditMode) dto.attachmentIdsToDelete = attachmentIdsToDelete;
      if (homeworkType === "STRUCTURED") {
        dto.metaData = {
          totalScore: questions.reduce((acc, q) => acc + (q.score || 0), 0),
          questions,
        };
      }

      const formData = new FormData();
      formData.append(
        "dto",
        new Blob([JSON.stringify(dto)], { type: "application/json" }),
      );
      if (smallFiles && smallFiles.length > 0) {
        smallFiles.forEach((file) => formData.append("files", file));
      }

      const response = await homeworkApi.post("/publish", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.code === 200) {
        Swal.fire({
          icon: "success",
          title: isEditMode ? "修改成功" : "发布成功",
          timer: 1500,
        });
        onSuccess();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "操作失败",
        text: error.response?.data?.message || "网络异常",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.editorPage}>
      <header className={styles.topBar}>
        <div className={styles.barLeft}>
          <button onClick={onBack} className={styles.backBtn} title="返回">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span className={styles.saveStatus}>
            {isEditMode ? "编辑作业" : "新建作业"}
          </span>
        </div>
        <div className={styles.barRight}>
          <button
            className={`${styles.modeBtn} ${isAIPanelOpen ? styles.active : ""}`}
            onClick={handleToggleAIPanel}
          >
            {/* 改写主题色为主调橘黄 */}
            <FontAwesomeIcon
              icon={faMagic}
              style={{
                marginRight: 5,
                color: isAIPanelOpen ? "#faad14" : "#8c8c8c",
              }}
            />
            AI 助手
          </button>
          <div className={styles.dividerVertical}></div>
          <div className={styles.modeSwitcher}>
            <button
              className={`${styles.modeBtn} ${homeworkType === "SIMPLE" ? styles.active : ""}`}
              onClick={() => setHomeworkType("SIMPLE")}
            >
              普通文本
            </button>
            <button
              className={`${styles.modeBtn} ${homeworkType === "STRUCTURED" ? styles.active : ""}`}
              onClick={() => setHomeworkType("STRUCTURED")}
            >
              结构化出题
            </button>
          </div>
          <div className={styles.dividerVertical}></div>
          <button
            className={styles.publishBtn}
            onClick={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
            <span>{isUploading ? "发布中" : "发布"}</span>
          </button>
        </div>
      </header>

      <div
        className={`${styles.workspace} ${isAIPanelOpen ? styles.hasPanel : ""}`}
      >
        <main className={styles.editorArea}>
          <div className={styles.paper}>
            <input
              type="text"
              className={styles.titleInput}
              placeholder="作业标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className={styles.metaLine}></div>

            {homeworkType === "STRUCTURED" ? (
              <div className={styles.builderWrapper}>
                <div className={styles.noteSection}>
                  <label>作业导语 / 说明 (可选)</label>
                  <textarea
                    ref={textareaRef}
                    className={styles.noteInput}
                    placeholder="在此填写作业说明、注意事项..."
                    value={content}
                    onChange={handleContentChange}
                    rows={2}
                  />
                </div>
                <QuestionBuilder
                  questions={questions}
                  setQuestions={setQuestions}
                  onToggleAIPanel={handleToggleAIPanel}
                />
              </div>
            ) : (
              <div className={styles.simpleEditor}>
                <textarea
                  ref={textareaRef}
                  className={styles.contentInput}
                  placeholder="在此输入详细的作业内容..."
                  value={content}
                  onChange={handleContentChange}
                  rows={10}
                />
              </div>
            )}

            <div className={styles.attachmentSection}>
              <div className={styles.sectionTitle}>
                <FontAwesomeIcon icon={faCloudUploadAlt} /> 附件材料
              </div>
              {existingAttachments.length > 0 && (
                <div className={styles.existingFiles}>
                  {existingAttachments.map((att) => (
                    <div key={att.id} className={styles.fileChip}>
                      <FontAwesomeIcon
                        icon={getFileIcon(att.fileName).icon}
                        className={getFileIcon(att.fileName).className}
                      />
                      <span className={styles.fileName} title={att.fileName}>
                        {att.fileName}
                      </span>
                      <button
                        onClick={() => handleRemoveExistingAttachment(att.id)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FileUpload
                files={newlyUploadedFiles}
                onFilesChange={setNewlyUploadedFiles}
              />

              {(isUploading || Object.keys(uploadProgress).length > 0) && (
                <div
                  className={progressStyles.progressContainer}
                  style={{ marginTop: "15px" }}
                >
                  {newlyUploadedFiles.map((file) => {
                    const prog = uploadProgress[file.name] || {};
                    return (
                      <div
                        key={file.name}
                        className={progressStyles.progressItem}
                      >
                        <span style={{ fontSize: "0.8rem" }}>
                          {file.name} - {prog.status}
                        </span>
                        <div className={progressStyles.progressBarBg}>
                          <div
                            className={progressStyles.progressBarFg}
                            style={{ width: `${prog.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        <AIAssistantPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          onApplyHomework={handleAIApply}
          currentHomework={{ title, content, questions, type: homeworkType }}
        />
      </div>
    </div>
  );
};

export default CourseHomeworkEditor;
