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
import CourseAnalysisView from "./components/CourseAnalysisView"; // 【新增】引入新提取的分析组件
import styles from "./CourseDetailPage.module.css";
import useAuthStore from "../../store/authStore";
import { getCourse } from "../../services/courseService";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const setCurrentCourse = useAuthStore((state) => state.setCurrentCourse);
  const [courseInfo, setCourseInfo] = useState(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const res = await getCourse(courseId);
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

  // 【修改】增加 analysis 的路由判定
  const currentTab = location.pathname.includes("/homework")
    ? "homework"
    : location.pathname.includes("/discussion")
      ? "discussion"
      : location.pathname.includes("/analysis")
        ? "analysis"
        : "ware";

  if (!courseInfo) return <div>加载中...</div>;

  return (
    <div className={styles.detailContainer}>
      <div className={styles.headerSection}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>{courseInfo.title}</h1>
        </div>
        <div className={styles.divider}></div>
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
          课程仓库
        </button>
        <button
          className={`${styles.tabButton} ${currentTab === "homework" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/homework`)}
        >
          作业区
        </button>
        <button
          className={`${styles.tabButton} ${currentTab === "discussion" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/discussion`)}
        >
          讨论区
        </button>
        {/* 【新增】分析模块 Tab */}
        <button
          className={`${styles.tabButton} ${currentTab === "analysis" ? styles.active : ""}`}
          onClick={() => navigate(`/course/${courseId}/analysis`)}
        >
          成绩分析
        </button>
      </div>

      <div className={styles.contentSection}>
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
          {/* 【新增】分析组件路由匹配 */}
          <Route
            path="analysis/*"
            element={<CourseAnalysisView courseId={courseId} />}
          />
          <Route path="*" element={<Navigate to="ware" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CourseDetailPage;
