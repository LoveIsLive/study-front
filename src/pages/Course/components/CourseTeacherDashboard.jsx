// src/pages/Course/components/CourseTeacherDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { homeworkApi } from "../../../services/api";
import HomeworkList from "../../Homework/components/HomeworkList";
import SubmissionList from "../../Homework/components/SubmissionList";
import Spinner from "../../../components/common/Spinner/Spinner";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFilter } from "@fortawesome/free-solid-svg-icons";
import styles from "./CourseTeacherDashboard.module.css";

const MySwal = withReactContent(Swal);

const CourseTeacherDashboard = ({
  courseId,
  view,
  navigateTo,
  onOpenCreateModal,
  onEditHomework,
  onOpenDiscussion,
  refreshTrigger,
}) => {
  const [rawHomeworks, setRawHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 专属于课程视图，仅保留日期筛选
  const [filters, setFilters] = useState({ date: "" });

  useEffect(() => {
    const fetchCourseHomeworks = async () => {
      if (!courseId) return;
      setIsLoading(true);
      try {
        const res = await homeworkApi.get(`/course/${courseId}`);
        if (res.data.code === 200) {
          setRawHomeworks(res.data.data || []);
        } else {
          MySwal.fire({ icon: "error", title: "加载作业失败" });
        }
      } catch (error) {
        console.error("Failed to fetch homeworks:", error);
        MySwal.fire({ icon: "error", title: "加载作业失败" });
      } finally {
        setIsLoading(false);
      }
    };

    if (view.name === "list") {
      fetchCourseHomeworks();
    }
  }, [courseId, view.name, refreshTrigger]);

  const displayHomeworks = useMemo(() => {
    return rawHomeworks.filter((item) => {
      const matchDate =
        !filters.date || item.createTime?.startsWith(filters.date);
      return matchDate;
    });
  }, [rawHomeworks, filters]);

  const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
    const result = await MySwal.fire({
      title: `确认删除作业 "${homeworkTitle}"?`,
      text: "此操作将一并删除所有学生的提交记录，且无法恢复！",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "取消",
      confirmButtonText: "确认删除",
    });

    if (result.isConfirmed) {
      try {
        await homeworkApi.delete(`/${homeworkId}`);
        MySwal.fire({
          icon: "success",
          title: "作业已删除",
          timer: 1500,
          showConfirmButton: false,
        });

        // 重新获取数据
        const res = await homeworkApi.get(`/course/${courseId}`);
        if (res.data.code === 200) {
          setRawHomeworks(res.data.data || []);
        }
      } catch (error) {
        MySwal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  if (isLoading && view.name === "list") {
    return <Spinner />;
  }

  if (view.name === "submissionList") {
    return (
      <SubmissionList
        homeworkId={view.data}
        onBack={() => navigateTo("list")}
        onOpenDiscussion={onOpenDiscussion}
        onViewDetail={(submissionId) =>
          navigateTo("submissionGrading", submissionId)
        }
      />
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterIcon}>
            <FontAwesomeIcon icon={faFilter} />
          </div>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ date: e.target.value })}
            className={styles.dateInput}
            title="按发布日期筛选"
          />
        </div>

        <button className={styles.publishBtn} onClick={onOpenCreateModal}>
          <FontAwesomeIcon icon={faPlus} /> 发布新作业
        </button>
      </div>

      <HomeworkList
        homeworks={displayHomeworks}
        onViewSubmissions={(homeworkId) =>
          navigateTo("submissionList", homeworkId)
        }
        onDeleteHomework={handleDeleteHomework}
        onEditHomework={onEditHomework}
        onOpenDiscussion={onOpenDiscussion}
      />
    </div>
  );
};

export default CourseTeacherDashboard;