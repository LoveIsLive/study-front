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
  const [filters, setFilters] = useState({
    status: "",
    scoreRange: "",
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

  const normalizeStatus = (statusVal) => {
    if (statusVal === null || statusVal === undefined) return "UNSUBMITTED";
    const s = String(statusVal).toUpperCase();
    if (s === "0" || s === "未提交" || s === "UNSUBMITTED")
      return "UNSUBMITTED";
    if (s === "1" || s === "已提交" || s === "提交" || s === "SUBMITTED")
      return "SUBMITTED";
    if (s === "2" || s === "已批改" || s === "批改" || s === "GRADED")
      return "GRADED";
    return s;
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      // 状态过滤修复
      const normalizedStatus = normalizeStatus(sub.status);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      // 分数范围支持 (例: 80-100)
      let matchScore = true;
      if (filters.scoreRange && sub.score !== null) {
        if (filters.scoreRange.includes("-")) {
          const [min, max] = filters.scoreRange.split("-").map(Number);
          if (!isNaN(min) && !isNaN(max))
            matchScore = sub.score >= min && sub.score <= max;
        } else {
          matchScore = String(sub.score).includes(filters.scoreRange);
        }
      } else if (filters.scoreRange && sub.score === null) {
        matchScore = false;
      }

      // 【修复】：使用 updateTime 替代不存在的 submitTime
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
        // 根据后端代码，这个API在HomeworkController里
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
            <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className={styles.filterInput}
            >
              <option value="">全部状态</option>
              <option value="UNSUBMITTED">未提交</option>
              <option value="SUBMITTED">已提交</option>
              <option value="GRADED">已批改</option>
            </select>
            <input
              type="text"
              placeholder="分数筛选 (例: 80-100)"
              value={filters.scoreRange}
              onChange={(e) =>
                setFilters({ ...filters, scoreRange: e.target.value })
              }
              className={styles.filterInput}
            />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className={styles.filterInput}
            />
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
