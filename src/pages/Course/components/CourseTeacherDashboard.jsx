// src/pages/Course/components/CourseTeacherDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { homeworkApi } from "../../../services/api";
// 【修改点 1】：引入权限鉴定 store
import useAuthStore from "../../../store/authStore";
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
  // 【修改点 2】：提取校长判断属性
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const [rawHomeworks, setRawHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 专属于课程视图，新增发布者姓名筛选
  const [filters, setFilters] = useState({ date: "", creatorName: "" });

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
      // 匹配 teacherName
      const matchCreator =
        !filters.creatorName ||
        (item.teacherName && item.teacherName.includes(filters.creatorName));
      return matchDate && matchCreator;
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

          {/* 新增的发布者筛选输入框 */}
          <input
            type="text"
            placeholder="发布者姓名"
            value={filters.creatorName}
            onChange={(e) =>
              setFilters({ ...filters, creatorName: e.target.value })
            }
            className={styles.dateInput}
            style={{ marginRight: "10px" }}
            title="按发布者筛选"
          />

          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className={styles.dateInput}
            title="按发布日期筛选"
          />
        </div>

        {!isPrincipal && (
          <button className={styles.publishBtn} onClick={onOpenCreateModal}>
            <FontAwesomeIcon icon={faPlus} /> 发布新作业
          </button>
        )}
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

// 【这一行就是解决白屏的核心，不可省略】
export default CourseTeacherDashboard;
