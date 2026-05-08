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
import { faPlus } from "@fortawesome/free-solid-svg-icons";

const MySwal = withReactContent(Swal);

// 修改点：props 中 onOpenCreateModal 和 onEditHomework 现在由父组件 HomeworkPage 传入，用于跳转路由
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
  // 1. 存储从后端获取的原始完整数据
  const [rawHomeworks, setRawHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // 2. 存储前端的筛选条件
  const [filters, setFilters] = useState({
    courseId: context === "course" ? contextId : "",
    creatorName: "",
    date: ""
  });
  const { courseList } = useAuthStore();

  // 只在组件加载或 context 变化时请求一次后端
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        let url;
        if (context === "course" && contextId) {
          url = `/course/${contextId}`;
        } else if (context === "class" && contextId) {
          url = `/class/${contextId}`;
        } else {
          // 回退到全局查询（例如教师所有作业）
          url = "/teacher/all";
        }
        const res = await homeworkApi.get(url);
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
      fetchAll();
    }
  }, [context, contextId, view.name, refreshTrigger]); // 监听 refreshTrigger 以刷新数据

  // 3. 核心逻辑：使用 useMemo 在前端进行纯数据筛选
  const displayHomeworks = useMemo(() => {
    return rawHomeworks.filter(item => {
      // 课程筛选
      const matchCourse = !filters.courseId || String(item.courseId) === String(filters.courseId);
      // 发布者筛选 (模糊匹配)
      const matchCreator = !filters.creatorName || item.creatorName?.includes(filters.creatorName);
      // 日期筛选 (假设 item.createTime 是 YYYY-MM-DD 格式)
      const matchDate = !filters.date || item.createTime?.startsWith(filters.date);
      
      return matchCourse && matchCreator && matchDate;
    });
  }, [rawHomeworks, filters]);

  // 删除逻辑保持不变
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
        // 删除成功后，重新获取原始数据
        const fetchAll = async () => {
          try {
            let url;
            if (context === "course" && contextId) {
              url = `/course/${contextId}`;
            } else if (context === "class" && contextId) {
              url = `/class/${contextId}`;
            } else {
              url = "/teacher/all";
            }
            const res = await homeworkApi.get(url);
            if (res.data.code === 200) {
              setRawHomeworks(res.data.data || []);
            }
          } catch (error) {
            console.error("Failed to refresh after delete:", error);
          }
        };
        fetchAll();
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
        // 关键修复：老师点击某学生的提交 -> 这里的 ID 必须是 Submission ID
        // 并且 viewName 必须是 submissionGrading 以便 HomeworkPage 正确路由
        onViewDetail={(submissionId) =>
          navigateTo("submissionGrading", submissionId)
        }
      />
    );
  }

  return (
    <div>
      <div className={styles.dashboardHeader}>
        <h2>我发布的</h2>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onOpenCreateModal}
        >
          <FontAwesomeIcon icon={faPlus} /> 发布作业
        </button>
      </div>
      <div
        className="filter-bar"
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        {/* 只有在班级视角下才显示课程选择 */}
        {context !== "course" && (
          <select
            value={filters.courseId}
            onChange={(e) =>
              setFilters({ ...filters, courseId: e.target.value })
            }
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="">全部课程</option>
            {courseList?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        )}
        {/* <select 
                    value={filters.creatorName} 
                    onChange={e => setFilters({...filters, creatorName: e.target.value})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    <option value="">全部发布者</option>
                </select> */}
        <input
          type="date"
          value={filters.date}
          onChange={(e) =>
            setFilters({ ...filters, date: e.target.value })
          }
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>
      <HomeworkList
        homeworks={displayHomeworks}
        onViewSubmissions={(homeworkId) =>
          navigateTo("submissionList", homeworkId)
        }
        onDeleteHomework={handleDeleteHomework}
        onEditHomework={onEditHomework} // 这里点击会触发父组件跳转路由
        onOpenDiscussion={onOpenDiscussion}
      />
    </div>
  );
};

export default TeacherDashboard;
