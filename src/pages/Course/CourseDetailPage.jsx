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
import CourseHomeworkView from "./components/CourseHomeworkView";
import CourseDiscussionView from "./components/CourseDiscussionView";
import styles from "./CourseDetailPage.module.css";
import useAuthStore from "../../store/authStore";
import { getCourse } from "../../services/courseService"; // 引入获取课程API

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setCurrentCourse = useAuthStore((state) => state.setCurrentCourse);
  const [courseInfo, setCourseInfo] = useState(null);

  // 1. 获取课程真实数据并同步全局 store
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const res = await getCourse(courseId);
        // 根据 1.md 的接口文档，res格式通常为 { code: 200, message: "...", data: {...} }
        if (res.code === 200) {
          setCourseInfo({
            title: res.data.name,
            description: res.data.description || "当前课程没有描述",
          });
        }
      } catch (error) {
        console.error("获取课程详细信息失败:", error);
        setCourseInfo({
          title: "未知课程",
          description: "当前课程没有描述",
        });
      }
    };

    if (courseId) {
      setCurrentCourse(Number(courseId), { id: Number(courseId) });
      fetchCourseData();
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
        {/* 1. 课程名称：保持居中且带动感方块 */}
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>{courseInfo.title}</h1>
        </div>

        {/* 2. 淡灰色分隔线 */}
        <div className={styles.divider}></div>

        {/* 3. 课程描述区域：改为左对齐 */}
        <div className={styles.descriptionSection}>
          <h2 className={styles.descriptionHeader}>课程描述</h2>
          <p className={styles.descriptionText}>{courseInfo.description}</p>
        </div>
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
          <Route
            path="ware/*"
            element={<CourseWareFlatView courseId={courseId} />}
          />
          <Route
            path="homework/*"
            element={<CourseHomeworkView courseId={courseId} />}
          />
          <Route
            path="discussion/*"
            element={<CourseDiscussionView courseId={courseId} />}
          />
          {/* 默认重定向到仓库 */}
          <Route path="*" element={<Navigate to="ware" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CourseDetailPage;