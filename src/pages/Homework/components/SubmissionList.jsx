import React, { useState, useEffect, useCallback } from "react";
import { submissionApi, homeworkApi } from "../../../services/api";
import Spinner from "../../../components/common/Spinner/Spinner";
import SubmissionCard from "./SubmissionCard";
import styles from "../HomeworkPage.module.css";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faFilter } from "@fortawesome/free-solid-svg-icons";

const SubmissionList = ({
  homeworkId,
  onBack,
  isStudentView = false,
  submissions: studentSubmissions,
  onEditSubmission,
  onOpenDiscussion,
  onViewDetail,
}) => {
  const [submissions, setSubmissions] = useState([]);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [isLoading, setIsLoading] = useState(!isStudentView);

  // 1. 将 scoreRange 拆分为 minScore 和 maxScore
  const [filters, setFilters] = useState({
    status: "",
    minScore: "",
    maxScore: "",
    date: "",
  });

  const fetchSubmissions = useCallback(async () => {
    if (isStudentView) {
      setSubmissions(studentSubmissions || []);
      return;
    }
    if (homeworkId) {
      setIsLoading(true);
      try {
        const hwRes = await homeworkApi.get(`/${homeworkId}`);
        setHomeworkTitle(hwRes.data.data.title);

        const subRes = await submissionApi.get(`/${homeworkId}/submissions`);
        setSubmissions(subRes.data.data || []);
      } catch (error) {
        Swal.fire({ icon: "error", title: "加载提交列表失败" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [homeworkId, isStudentView, studentSubmissions]);

  // 2. 补全与学生视角一致的全部状态解析
  const normalizeStatus = (statusVal) => {
    if (statusVal === null || statusVal === undefined) return "UNSUBMITTED";
    const s = String(statusVal).toUpperCase();
    if (s === "0" || s === "未提交" || s === "UNSUBMITTED")
      return "UNSUBMITTED";
    if (s === "1" || s === "已提交" || s === "提交" || s === "SUBMITTED")
      return "SUBMITTED";
    if (s === "RETURNED" || s === "被退回") return "RETURNED";
    if (s === "HAVE_UPDATED" || s === "作业有更新") return "HAVE_UPDATED";
    if (s === "RE_SUBMITTED" || s === "重新提交") return "RE_SUBMITTED";
    if (s === "2" || s === "已批改" || s === "批改" || s === "GRADED")
      return "GRADED";
    return s;
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      // 防空保护
      if (!sub) return false;

      // 状态过滤修复
      const normalizedStatus = normalizeStatus(sub.status);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      // 3. 双输入框分数范围支持
      let matchScore = true;
      const hasMin = filters.minScore !== "";
      const hasMax = filters.maxScore !== "";
      if ((hasMin || hasMax) && sub.score !== null && sub.score !== undefined) {
        const min = hasMin ? Number(filters.minScore) : -Infinity;
        const max = hasMax ? Number(filters.maxScore) : Infinity;
        matchScore = sub.score >= min && sub.score <= max;
      } else if (
        (hasMin || hasMax) &&
        (sub.score === null || sub.score === undefined)
      ) {
        matchScore = false;
      }

      // 使用 updateTime 替代不存在的 submitTime
      const matchDate =
        !filters.date ||
        (sub.updateTime && sub.updateTime.substring(0, 10) === filters.date);

      return matchStatus && matchScore && matchDate;
    });
  }, [submissions, filters]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleReturnSubmission = async (submissionId, studentName) => {
    const result = await Swal.fire({
      title: `确认退回 ${studentName} 的作业吗?`,
      text: "学生将可以重新修改并提交此作业。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "确认退回",
      cancelButtonText: "取消",
      confirmButtonColor: "#dc3545",
    });

    if (result.isConfirmed) {
      try {
        await homeworkApi.post(`/returnSubmission/${submissionId}`);
        Swal.fire({
          icon: "success",
          title: "操作成功",
          text: "该作业已被退回",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchSubmissions(); // 刷新列表以更新状态
      } catch (error) {
        Swal.fire({ icon: "error", title: "操作失败" });
        console.error("Failed to return submission:", error);
      }
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className={styles.view}>
      {!isStudentView && (
        <div className={styles.viewHeader}>
          <button
            onClick={onBack}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> 返回作业列表
          </button>
          <h2>{homeworkTitle} 的提交列表</h2>
        </div>
      )}
      {!isStudentView && (
        <div className={styles.toolbar} style={{ margin: "0 0 20px 0" }}>
          <div className={styles.filterGroup}>
            <div className={styles.filterIcon}>
              <FontAwesomeIcon icon={faFilter} />
            </div>

            {/* 同步状态枚举列表 */}
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className={styles.filterInput}
            >
              <option value="">全部状态</option>
              {/* <option value="UNSUBMITTED">未提交</option> */}
              <option value="SUBMITTED">已提交</option>
              <option value="RETURNED">被退回</option>
              <option value="HAVE_UPDATED">作业有更新</option>
              <option value="RE_SUBMITTED">重新提交</option>
              <option value="GRADED">已批改</option>
            </select>

            {/* 同步学生视角的双输入框成绩筛选 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "#fff",
                border: "1px solid #ced4da",
                padding: "0 8px",
                borderRadius: "6px",
              }}
            >
              <input
                type="number"
                placeholder="最低分"
                value={filters.minScore}
                onChange={(e) =>
                  setFilters({ ...filters, minScore: e.target.value })
                }
                style={{
                  border: "none",
                  outline: "none",
                  width: "60px",
                  background: "transparent",
                  padding: "8px 0",
                }}
              />
              <span style={{ color: "#6c757d" }}>-</span>
              <input
                type="number"
                placeholder="最高分"
                value={filters.maxScore}
                onChange={(e) =>
                  setFilters({ ...filters, maxScore: e.target.value })
                }
                style={{
                  border: "none",
                  outline: "none",
                  width: "60px",
                  background: "transparent",
                  padding: "8px 0",
                }}
              />
            </div>

            {/* 优化并同步日期筛选框UI */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                border: "1px solid #ced4da",
                padding: "0 12px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  color: "#6c757d",
                  whiteSpace: "nowrap",
                }}
              >
                提交时间
              </span>
              <input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                style={{
                  border: "none",
                  padding: "8px 0",
                  outline: "none",
                  background: "transparent",
                  color: "#495057",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.listContainer}>
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              isStudentView={isStudentView}
              onReturn={handleReturnSubmission}
              onEdit={onEditSubmission}
              onOpenDiscussion={onOpenDiscussion}
              onViewDetail={onViewDetail}
            />
          ))
        ) : (
          <p className={styles.placeholderText}>
            {isStudentView ? "你还没有提交过任何作业" : "暂无学生提交"}
          </p>
        )}
      </div>
    </div>
  );
};

export default SubmissionList;
