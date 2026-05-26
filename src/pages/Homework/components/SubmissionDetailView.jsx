import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUser,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faInfoCircle,
  faExclamationTriangle,
  faPaperclip,
  faSpinner,
  faPenNib,
  faUndo,
  faTimes,
  faMagic, // <--- 添加 faMagic
} from "@fortawesome/free-solid-svg-icons";

import useAuthStore from "../../../store/authStore";
import { useUploader } from "../../../hooks/useUploader";
import { homeworkApi, submissionApi, attachApi } from "../../../services/api";
import { sanitizeHTML } from "../../../utils/helpers";

import AttachmentList from "./AttachmentList";
import DiscussionBoard from "./Discussion/DiscussionBoard";
import FileUpload from "../../../components/shared/FileUpload/FileUpload";
import Spinner from "../../../components/common/Spinner/Spinner";
import HomeworkPlayer from "../../../components/shared/QuestionEngine/Player/HomeworkPlayer";

import progressStyles from "../../Ware/components/NewItemModal.module.css";
import styles from "./SubmissionDetailView.module.css";

// --- 状态徽章组件 ---
const StatusBadge = ({ status }) => {
  let icon = faInfoCircle;
  let colorClass = styles.statusInfo;

  if (status === "被退回") {
    icon = faTimesCircle;
    colorClass = styles.statusDanger;
  } else if (status === "作业有更新") {
    icon = faExclamationTriangle;
    colorClass = styles.statusWarning;
  } else if (status === "已提交" || status === "重新提交") {
    icon = faCheckCircle;
    colorClass = styles.statusSuccess;
  } else if (status === "已批改") {
    icon = faCheckCircle;
    colorClass = styles.statusGraded;
  }

  return (
    <div className={`${styles.statusBadge} ${colorClass}`}>
      <FontAwesomeIcon icon={icon} /> {status}
    </div>
  );
};

const SubmissionDetailView = ({ viewId, mode, onBack, refreshTrigger }) => {
  const { user } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isStudent = useAuthStore((state) => state.isStudent());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const isGuest = useAuthStore((state) => state.isGuest()); // 👈 1. 新增：获取访客状态
  // 复用，操作者
  const isTeacher =
    useAuthStore((state) => state.isTeacher()) || isAdmin || isPrincipal;

  const [homework, setHomework] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [existingAttachments, setExistingAttachments] = useState([]); // 当前显示的已上传附件
  const [attachmentIdsToDelete, setAttachmentIdsToDelete] = useState([]); // 准备删除的附件ID列表

  // 答题/批改状态
  const [content, setContent] = useState("");
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState([]);
  const [questions, setQuestions] = useState([]);

  const maxScore = useMemo(() => {
    if (!questions || questions.length === 0) return 0;
    return questions.reduce((acc, q) => acc + (q.score || 0), 0);
  }, [questions]);

  // 教师批改状态
  const [isGrading, setIsGrading] = useState(false);
  const [isAIGrading, setIsAIGrading] = useState(false); // <--- 新增状态

  const [gradingData, setGradingData] = useState({
    generalComment: "",
    details: {},
  });

  const {
    uploadProgress,
    isUploading,
    startUpload,
    setIsUploading,
    resetUploader,
  } = useUploader(attachApi);

  // --- 数据加载 ---
  const loadData = async () => {
    if (!viewId || viewId === "undefined") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let hwData = null;
      let subData = null;

      if (mode === "grading") {
        const subRes = await submissionApi.get(`/${viewId}`);
        subData = subRes.data.data;
        hwData = subData.homework;
      } else {
        if (isStudent) {
          try {
            const subRes = await submissionApi.get(
              `/student/${viewId}/submission`,
            );
            subData = subRes.data.data;
            hwData = subData.homework;
          } catch (e) { }
        } else {
          const hwRes = await homeworkApi.get(`/${viewId}`);
          hwData = hwRes.data.data;
        }
      }

      if (hwData) {
        setHomework(hwData);
        if (hwData.type === "STRUCTURED" && hwData.metaData) {
          try {
            const meta =
              typeof hwData.metaData === "string"
                ? JSON.parse(hwData.metaData)
                : hwData.metaData;
            setQuestions(meta.questions || []);
          } catch (e) { }
        }
      }

      if (subData) {
        setSubmission(subData);
        setExistingAttachments(subData.attachments || []); // 新增：初始化已存在附件
        setAttachmentIdsToDelete([]); // 新增：重置待删除列表
        if (subData.content) setContent(subData.content);
        if (hwData.type === "STRUCTURED" && subData.answerData) {
          try {
            const ans =
              typeof subData.answerData === "string"
                ? JSON.parse(subData.answerData)
                : subData.answerData;
            setAnswers(ans || {});
          } catch (e) { }
        }
        if (subData.gradingData) {
          try {
            const gd =
              typeof subData.gradingData === "string"
                ? JSON.parse(subData.gradingData)
                : subData.gradingData;
            setGradingData({
              generalComment: gd.generalComment || "",
              details: gd.details || {},
            });
          } catch (e) { }
        }
      } else {
        setSubmission(null);
        setAnswers({});
        setContent("");
        setGradingData({ generalComment: "", details: {} });
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载失败", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewId, mode, isStudent, refreshTrigger]);

  const handleRemoveExistingAttachment = (attachmentId) => {
    // 从界面上移除
    setExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId),
    );
    // 记录到待删除列表，传给后端
    setAttachmentIdsToDelete((prev) => [...prev, attachmentId]);
  };

  // --- 学生提交逻辑 ---
  const handleStudentSubmit = async () => {
    if (homework.type === "STRUCTURED") {
      const unfinished = questions.some((q) => {
        const ans = answers[q.id];
        return (
          ans === undefined ||
          ans === null ||
          ans === "" ||
          (Array.isArray(ans) && ans.length === 0)
        );
      });
      if (unfinished) {
        const confirm = await Swal.fire({
          title: "还有题目未作答",
          text: "确定要强行提交吗？",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "提交",
          cancelButtonText: "继续答题",
        });
        if (!confirm.isConfirmed) return;
      }
    } else {
      if (!content.trim() && files.length === 0 && !submission) {
        Swal.fire("内容不能为空", "请填写内容或上传附件", "warning");
        return;
      }
    }

    try {
      const { smallFiles, largeFileAttachmentIds } = await startUpload(files);
      const dto = {
        homeworkId: homework.id,
        content,
        attachmentUploadIds: largeFileAttachmentIds,
      };
      if (homework.type === "STRUCTURED") {
        dto.answerData = answers;
      }
      if (
        submission &&
        (submission.status === "被退回" || submission.status === "作业有更新")
      ) {
        dto.attachmentIdsToDelete = attachmentIdsToDelete;
      }

      const formData = new FormData();
      formData.append(
        "dto",
        new Blob([JSON.stringify(dto)], { type: "application/json" }),
      );
      smallFiles.forEach((f) => formData.append("files", f));

      if (
        submission &&
        (submission.status === "被退回" || submission.status === "作业有更新")
      ) {
        await submissionApi.put(`/${submission.id}`, formData);
      } else {
        await submissionApi.post("/submit", formData);
      }

      Swal.fire({
        icon: "success",
        title: "提交成功",
        timer: 1500,
        showConfirmButton: false,
      });
      resetUploader();
      setFiles([]);
      loadData(); // 提交成功后刷新数据
    } catch (error) {
      Swal.fire(
        "提交失败",
        error.response?.data?.message || "未知错误",
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // --- 教师批改逻辑 ---
  // --- 新增：请求 AI 一键批改 ---
  const handleAIGrade = async () => {
    setIsAIGrading(true);
    try {
      const res = await submissionApi.post(`/${submission.id}/ai-grade`);
      const aiData = res.data.data;

      // 将后端传回的数据直接 Apply 到当前组件的状态中
      setGradingData({
        generalComment: aiData.generalComment || "",
        details: aiData.details || {},
      });

      // 自动开启批改模式，以便教师能够看到分数框并可以修改
      setIsGrading(true);

      Swal.fire({
        toast: true,
        position: "top",
        icon: "success",
        title: "✨ AI 批改完成！",
        text: "请核对分数和评语，确认无误后点击右下角【确认评分】",
        showConfirmButton: false,
        timer: 4000,
      });
    } catch (error) {
      Swal.fire(
        "AI 批改失败",
        error.response?.data?.message || "服务器繁忙，请稍后重试",
        "error",
      );
    } finally {
      setIsAIGrading(false);
    }
  };

  const currentTotalScore = useMemo(() => {
    let total = 0;
    if (gradingData && gradingData.details) {
      Object.values(gradingData.details).forEach((item) => {
        if (item && item.score) {
          const s = parseInt(item.score, 10);
          if (!isNaN(s)) total += s;
        }
      });
    }
    return total;
  }, [gradingData]);

  const handleDetailGradingChange = (qId, field, value) => {
    setGradingData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [qId]: {
          ...prev.details?.[qId],
          [field]: value,
        },
      },
    }));
  };

  const handleTeacherGrade = async () => {
    try {
      const dto = {
        submissionId: submission.id,
        generalComment: gradingData.generalComment,
        details: gradingData.details,
        manualTotalScore: currentTotalScore,
      };

      const res = await submissionApi.post("/grade", dto);

      // 成功后直接更新页面数据状态，不刷新页面
      setSubmission(res.data.data);
      setIsGrading(false); // 退出批改模式

      Swal.fire({
        icon: "success",
        title: "批改完成",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("批改失败", error.response?.data?.message, "error");
    }
  };

  const handleCancelGrading = () => {
    setIsGrading(false);
  };

  const handleReturnSubmission = async () => {
    const result = await Swal.fire({
      title: "确认退回?",
      text: "学生将需要重新提交作业",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "退回",
      confirmButtonColor: "#dc3545",
    });
    if (result.isConfirmed) {
      try {
        await homeworkApi.post(`/returnSubmission/${submission.id}`);
        Swal.fire("已退回", "", "success");
        loadData();
      } catch (e) {
        Swal.fire("操作失败", e.response?.data?.message, "error");
      }
    }
  };

  if (isLoading) return <Spinner />;
  if (!homework) return <div className={styles.errorState}>无法加载数据</div>;

  const isStructured = homework.type === "STRUCTURED";
  const canStudentEdit =
    isStudent &&
    (!submission || ["被退回", "作业有更新"].includes(submission.status));
  const isReadOnly = isTeacher || (isStudent && !canStudentEdit) || isGuest;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>
          <FontAwesomeIcon icon={faArrowLeft} /> 返回
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{homework.title}</h1>
          <div className={styles.meta}>
            <span>
              <FontAwesomeIcon icon={faUser} /> 教师: {homework.teacherName}
            </span>

            {/* 新增：展示提交人姓名 */}
            {submission &&
              (submission.studentName ||
                submission.userName ||
                submission.creatorName ||
                submission.student?.name ||
                submission.user?.name) && (
                <span>
                  <FontAwesomeIcon icon={faUser} /> 提交人:{" "}
                  {submission.studentName ||
                    submission.userName ||
                    submission.creatorName ||
                    submission.student?.name ||
                    submission.user?.name}
                </span>
              )}

            <span>
              <FontAwesomeIcon icon={faClock} />{" "}
              {new Date(homework.updateTime).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          {/* 作业要求卡片 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>作业要求</div>
            <div className={styles.cardBody}>
              {homework.content ? (
                <div
                  className={styles.richText}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(homework.content),
                  }}
                />
              ) : (
                <span className={styles.placeholder}>
                  {isStructured ? "请完成下方题目" : "无附加说明"}
                </span>
              )}
              {homework.attachments?.length > 0 && (
                <AttachmentList attachments={homework.attachments} />
              )}
            </div>
          </div>

          {/* 答题/批改交互卡片 */}
          <div className={`${styles.card} ${styles.submissionCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitleRow}>
                <span>{isStructured ? "答题卡" : "作答内容"}</span>
                {submission && <StatusBadge status={submission.status} />}
                {submission && submission.score !== null && (
                  <span className={styles.totalScoreDisplay}>
                    得分: {submission.score}{" "}
                    {maxScore > 0 ? `/ ${maxScore}` : ""}
                  </span>
                )}
              </div>

              {/* --- 教师操作按钮组 --- */}
              {isTeacher && submission && (
                <div className={styles.teacherActions}>
                  {isStructured &&
                    (submission.status === "已提交" ||
                      submission.status === "重新提交" ||
                      submission.status === "已批改") && (
                      <button
                        className={`${styles.actionBtn} ${styles.btnAiGrade}`}
                        onClick={handleAIGrade}
                        disabled={isAIGrading}
                      >
                        <FontAwesomeIcon
                          icon={isAIGrading ? faSpinner : faMagic}
                          spin={isAIGrading}
                        />
                        {isAIGrading ? " 批改中..." : " AI一键批改"}
                      </button>
                    )}

                  {/* 原有的切换批改状态按钮 */}
                  {(submission.status === "已提交" ||
                    submission.status === "重新提交" ||
                    submission.status === "已批改") && (
                      <button
                        className={`${styles.actionBtn} ${isGrading ? styles.btnSecondary : styles.btnGrade}`}
                        onClick={() => setIsGrading(!isGrading)}
                        disabled={isAIGrading} // AI批改中禁用
                      >
                        <FontAwesomeIcon icon={isGrading ? faTimes : faPenNib} />
                        {isGrading
                          ? " 退出批改"
                          : submission.status === "已批改"
                            ? " 修改评分"
                            : " 开始批改"}
                      </button>
                    )}

                  {submission.status !== "已批改" && (
                    <button
                      className={`${styles.actionBtn} ${styles.btnReturn}`}
                      onClick={handleReturnSubmission}
                      disabled={submission.status === "被退回" || isAIGrading}
                    >
                      <FontAwesomeIcon icon={faUndo} /> 退回
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={styles.cardBody}>
              {/* HomeworkPlayer */}
              {isStructured ? (
                <HomeworkPlayer
                  questions={questions}
                  answers={answers}
                  setAnswers={setAnswers}
                  readOnly={isReadOnly}
                  isTeacher={isTeacher}
                  isGradingMode={isGrading}
                  gradingData={gradingData}
                  onGradingChange={handleDetailGradingChange}
                  submissionStatus={submission?.status}
                />
              ) : (
                <div className={styles.simpleModeWrapper}>
                  {!canStudentEdit && submission ? (
                    <div
                      className={styles.richText}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(submission.content),
                      }}
                    />
                  ) : null}

                  {canStudentEdit && (
                    <textarea
                      className={styles.textarea}
                      rows={8}
                      placeholder="在此输入答案..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      disabled={isUploading}
                    />
                  )}

                  {isGrading && (
                    <div className={styles.simpleGradingBox}>
                      <label>当前总分：</label>
                      <input
                        type="number"
                        className={styles.scoreInput}
                        value={gradingData.details?.["simple"]?.score || ""}
                        onChange={(e) =>
                          handleDetailGradingChange(
                            "simple",
                            "score",
                            e.target.value,
                          )
                        }
                        placeholder="输入分数"
                      />
                    </div>
                  )}
                </div>
              )}

              {isStructured && (
                <div className={styles.noteSection}>
                  <label>备注：</label>
                  {canStudentEdit ? (
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="如有特殊说明..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  ) : (
                    <div className={styles.noteDisplay}>
                      {submission?.content || "无"}
                    </div>
                  )}
                </div>
              )}

              {/* 教师总评 */}
              {(isGrading || gradingData.generalComment) && (
                <div className={styles.generalCommentBox}>
                  <label>教师总评：</label>
                  {isGrading ? (
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      placeholder="请输入整份作业的评语..."
                      value={gradingData.generalComment}
                      onChange={(e) =>
                        setGradingData({
                          ...gradingData,
                          generalComment: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className={styles.commentText}>
                      {gradingData.generalComment}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.attachmentArea}>
                {/* 情况 A: 学生正在编辑/修改被退回的作业 */}
                {canStudentEdit && existingAttachments.length > 0 && (
                  <div className={styles.existingAttachments}>
                    <label>管理已上传附件：</label>
                    <ul className={styles.editAttachmentList}>
                      {existingAttachments.map((att) => (
                        <li key={att.id} className={styles.editAttachmentItem}>
                          <div className={styles.fileInfo}>
                            {/* 使用 helpers 里的工具获取图标 */}
                            <span>{att.fileName}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() =>
                              handleRemoveExistingAttachment(att.id)
                            }
                            title="删除此附件"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 情况 B: 老师查看或学生查看已提交且不可编辑的状态 */}
                {!canStudentEdit && submission?.attachments?.length > 0 && (
                  <div className={styles.existingAttachments}>
                    <label>提交的附件：</label>
                    <AttachmentList attachments={submission.attachments} />
                  </div>
                )}

                {/* 上传新附件区域 */}
                {canStudentEdit && (
                  <div className={styles.uploadBox}>
                    <label>
                      <FontAwesomeIcon icon={faPaperclip} /> 上传新附件
                    </label>
                    <FileUpload files={files} onFilesChange={setFiles} />
                  </div>
                )}
              </div>

              <div className={styles.footerActions}>
                {canStudentEdit && (
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleStudentSubmit}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> 提交中...
                      </>
                    ) : submission ? (
                      "确认修改"
                    ) : (
                      "提交作业"
                    )}
                  </button>
                )}

                {isGrading && (
                  <div className={styles.gradingFooter}>
                    <div className={styles.totalPreview}>
                      计算总分: <strong>{currentTotalScore}</strong>
                    </div>
                    <div className={styles.gradingBtnGroup}>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={handleCancelGrading}
                      >
                        取消
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={handleTeacherGrade}
                      >
                        确认评分
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>作业讨论</div>
            <div className={styles.cardBody} style={{ padding: "0 10px 10px" }}>
              <DiscussionBoard ownerId={homework.id} ownerType="homework" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailView;
