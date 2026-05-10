import React, { useState, useEffect, useMemo } from "react";
import { homeworkApi } from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import HomeworkList from "./HomeworkList";
import SubmissionList from "./SubmissionList";
import Spinner from "../../../components/common/Spinner/Spinner";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import styles from "../HomeworkPage.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFilter } from "@fortawesome/free-solid-svg-icons"; // 【引入 faFilter】

const MySwal = withReactContent(Swal);

const TeacherDashboard = ({
  context = "class",
  contextId = null,
  view,
  navigateTo,
  onOpenCreateModal,
  onEditHomework,
  onOpenDiscussion,
  refreshTrigger,
}) => {
  // ... 此处保留您原有的所有 useState, useEffect 和其他逻辑函数 ...
  const [rawHomeworks, setRawHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    courseId: context === "course" ? contextId : "",
    creatorName: "",
    date: "",
  });
  const { courseList } = useAuthStore();

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        let url;
        if (context === "course" && contextId) url = `/course/${contextId}`;
        else if (context === "class" && contextId) url = `/class/${contextId}`;
        else url = "/teacher/all";
        const res = await homeworkApi.get(url);
        if (res.data.code === 200) setRawHomeworks(res.data.data || []);
      } catch (error) {
        MySwal.fire({ icon: "error", title: "加载作业失败" });
      } finally {
        setIsLoading(false);
      }
    };
    if (view.name === "list") fetchAll();
  }, [context, contextId, view.name, refreshTrigger]);

  const displayHomeworks = useMemo(() => {
    return rawHomeworks.filter((item) => {
      const matchCourse =
        !filters.courseId || String(item.courseId) === String(filters.courseId);
      const matchCreator =
        !filters.creatorName ||
        (item.teacherName && item.teacherName.includes(filters.creatorName));
      const matchDate =
        !filters.date || item.createTime?.startsWith(filters.date);
      return matchCourse && matchCreator && matchDate;
    });
  }, [rawHomeworks, filters]);

  const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
    // 保持原有删除逻辑
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
        const res = await homeworkApi.get("/teacher/all"); // 简单刷新示例
        if (res.data.code === 200) setRawHomeworks(res.data.data || []);
      } catch (error) {
        MySwal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  if (isLoading && view.name === "list") return <Spinner />;

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

  // --- 返回的视图（修改部分在这里） ---
  return (
    <div>
      <div className={styles.dashboardHeader}>
        <h2>我发布的</h2>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterIcon}>
            <FontAwesomeIcon icon={faFilter} />
          </div>

          {context !== "course" && (
            <select
              value={filters.courseId}
              onChange={(e) =>
                setFilters({ ...filters, courseId: e.target.value })
              }
              className={styles.filterInput}
            >
              <option value="">全部课程</option>
              {courseList?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="发布者姓名"
            value={filters.creatorName}
            onChange={(e) =>
              setFilters({ ...filters, creatorName: e.target.value })
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

        {/* 按钮移入了 toolbar 右侧 */}
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onOpenCreateModal}
        >
          <FontAwesomeIcon icon={faPlus} /> 发布作业
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

export default TeacherDashboard;
