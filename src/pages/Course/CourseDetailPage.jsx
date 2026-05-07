// src/pages/Course/CourseDetailPage.jsx
import React, { useState, useEffect } from "react";
import {
  useParams,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import CourseWareFlatView from "../Ware/CourseWareFlatView";
import HomeworkPage from "../Homework/HomeworkPage";
import DiscussionPage from "../Discussion/DiscussionPage";
import styles from "./CourseDetailPage.module.css";
import useAuthStore from "../../store/authStore";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setCurrentCourse = useAuthStore((state) => state.setCurrentCourse);
  const [courseInfo, setCourseInfo] = useState(null);

  // 1. 同步全局 store (新标签页打开时，Zustand 的 store 可能是空的，需要重新注入)
  useEffect(() => {
    if (courseId) {
      setCurrentCourse(Number(courseId), { id: Number(courseId) });
      // 此处替换为真实的 API 请求
      setCourseInfo({
        title: "课程详情展示",
        description:
          "这里是原模态框里的详细内容。保持原样展示在这里，可以介绍课程大纲、目标等。",
      });
    }
  }, [courseId, setCurrentCourse]);

  // 2. 根据当前的 URL 动态判定选中哪个 Tab
  const currentTab = location.pathname.includes("/homework")
    ? "homework"
    : location.pathname.includes("/discussion")
      ? "discussion"
      : "ware";

  if (!courseInfo) return <div>加载中...</div>;

  return (
    <div className={styles.detailContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>{courseInfo.title}</h1>
        <p className={styles.description}>{courseInfo.description}</p>
      </div>

      <div className={styles.tabsSection}>
        <button
          className={`${styles.tabButton} ${currentTab === "ware" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/ware`)}
        >
          仓库 (Ware)
        </button>
        <button
          className={`${styles.tabButton} ${currentTab === "homework" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/homework`)}
        >
          作业 (Homework)
        </button>
        <button
          className={`${styles.tabButton} ${currentTab === "discussion" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/discussion`)}
        >
          讨论 (Discussion)
        </button>
      </div>

      <div className={styles.contentSection}>
        {/* 3. 使用嵌套路由渲染子组件 */}
        <Routes>
          <Route path="ware/*" element={<CourseWareFlatView courseId={courseId} />} />
          <Route
            path="homework/*"
            element={<HomeworkPage courseId={courseId} />}
          />
          <Route
            path="discussion/*"
            element={<DiscussionPage courseId={courseId} />}
          />
          {/* 默认重定向到仓库 */}
          <Route path="*" element={<Navigate to="ware" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CourseDetailPage;
