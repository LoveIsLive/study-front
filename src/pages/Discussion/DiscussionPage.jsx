import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import DiscussionBoard from "../Homework/components/Discussion/DiscussionBoard";
import styles from "./DiscussionPage.module.css";

// 接收来自 CourseDetailPage 路由传来的 courseId
const DiscussionPage = ({ courseId: propCourseId }) => {
  const navigate = useNavigate();
  // 备用：如果在左侧固定栏点击，则从全局状态里取当前所在课程
  const { currentCourseId } = useAuthStore();

  // 综合判定 courseId
  const actualCourseId = propCourseId || currentCourseId;

  if (!actualCourseId) {
    return (
      <div className={styles.discussionPage}>
        <div className={styles.fileManager}>
          <div className={styles.errorState}>
            <h2>请先选择课程</h2>
            <p>使用课程讨论区前，请先指定一门课程。</p>
            <button onClick={() => navigate("/")} className={styles.backButton}>
              <FontAwesomeIcon icon={faArrowLeft} /> 返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.discussionPage}>
      <div className={styles.fileManager}>
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            <h1>
              <FontAwesomeIcon icon={faComments} /> 课程讨论区
            </h1>
          </div>
        </header>

        <div className={styles.mainContent}>
          {/* 复用统一讨论板组件，保证数据格式精准匹配后端 */}
          <DiscussionBoard
            ownerId={Number(actualCourseId)}
            ownerType="course"
          />
        </div>
      </div>
    </div>
  );
};

export default DiscussionPage;