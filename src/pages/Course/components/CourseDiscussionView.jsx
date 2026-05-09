// src/pages/Course/components/CourseDiscussionView.jsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments } from "@fortawesome/free-solid-svg-icons";
import DiscussionBoard from "../../Homework/components/Discussion/DiscussionBoard";
import styles from "./CourseDiscussionView.module.css";

const CourseDiscussionView = ({ courseId }) => {
  // 因为在 CourseDetailPage 中一定有 courseId 传入，可以直接使用
  if (!courseId) {
    return (
      <div className={styles.emptyState}>
        <p>无法获取课程信息，请重新加载页面。</p>
      </div>
    );
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconWrapper}>
            <FontAwesomeIcon icon={faComments} />
          </div>
          <div>
            <h2>课程讨论区</h2>
            {/* <p className={styles.subtitle}>
              在这里与老师和同学交流心得、解答疑问
            </p> */}
          </div>
        </div>
      </div>

      <div className={styles.boardWrapper}>
        {/* 完全复用原有的讨论板组件，保证数据和功能100%一致 */}
        <DiscussionBoard ownerId={Number(courseId)} ownerType="course" />
      </div>
    </div>
  );
};

export default CourseDiscussionView;