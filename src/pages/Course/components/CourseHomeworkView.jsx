// src/pages/Course/components/CourseHomeworkView.jsx
import React, { useState, useEffect, useCallback } from "react";
import useAuthStore from "../../../store/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";

// 引入原 HomeworkPage 使用的所有内部组件 (注意相对路径的层级)
import CourseTeacherDashboard from "./CourseTeacherDashboard";
import StudentDashboard from "../../Homework/components/StudentDashboard";
import AdminDashboard from "../../Homework/components/AdminDashboard";
// import HomeworkEditorPage from "../../Homework/components/HomeworkEditorPage";
import CourseHomeworkEditor from "./CourseHomeworkEditor";
import DiscussionDrawer from "../../Homework/components/DiscussionDrawer";
import SubmissionDetailView from "../../Homework/components/SubmissionDetailView";
import SubmissionList from "../../Homework/components/SubmissionList";
import Spinner from "../../../components/common/Spinner/Spinner";

import styles from "./CourseHomeworkView.module.css";

const CourseHomeworkView = ({ courseId }) => {
  const { user, detailInfo } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const isStudent = useAuthStore((state) => state.isStudent());

  const [view, setView] = useState({ name: "list", data: null, mode: null });
  const [editingHomework, setEditingHomework] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [discussionTarget, setDiscussionTarget] = useState(null);

  // --- 完全保留原有的 Hash 路由逻辑，保证子组件内部跳转正常 ---
  const navigateTo = useCallback((viewName, viewData = null) => {
    let hash = "#/";
    if (viewName === "create") hash = "#/homework/create";
    else if (viewName === "homeworkDetail") hash = `#/homework/${viewData}`;
    else if (viewName === "submissionList")
      hash = `#/homework/${viewData}/submissions`;
    else if (viewName === "submissionGrading")
      hash = `#/submission/${viewData}`;
    else if (viewName === "list") hash = "#/";
    window.location.hash = hash;
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const parts = hash.split("/").filter((p) => p);

      if (parts.length === 0) {
        setView({ name: "list", data: null });
        setEditingHomework(null);
      } else if (parts[0] === "homework") {
        if (parts[1] === "create") {
          setView({ name: "create" });
        } else if (parts[2] === "submissions") {
          setView({ name: "submissionList", data: parts[1] });
        } else if (parts[1] && parts[1] !== "undefined") {
          setView({ name: "homeworkDetail", data: parts[1], mode: "homework" });
        }
      } else if (
        parts[0] === "submission" &&
        parts[1] &&
        parts[1] !== "undefined"
      ) {
        setView({ name: "submissionGrading", data: parts[1], mode: "grading" });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleDetailBack = () => {
    setRefreshTrigger((t) => t + 1);
    window.history.back();
  };

  const handleOpenDiscussion = useCallback(
    (target) => setDiscussionTarget(target),
    [],
  );

  const handleOpenCreate = () => {
    setEditingHomework(null);
    window.location.hash = "#/homework/create";
  };

  const handleOpenEdit = (homework) => {
    setEditingHomework(homework);
    window.location.hash = "#/homework/create";
  };

  const handleEditorSuccess = () => {
    setRefreshTrigger((t) => t + 1);
    window.location.hash = "#/";
  };

  // --- 视图渲染分发 ---
  const renderContent = () => {
    if (!user) return <Spinner />;
    if (!isAdmin && !detailInfo) return <Spinner />;

    if (view.name === "create") {
      return (
        <CourseHomeworkEditor
          onBack={() => (window.location.hash = "#/")}
          editingHomework={editingHomework}
          onSuccess={handleEditorSuccess}
        />
      );
    }

    if (view.name === "homeworkDetail" || view.name === "submissionGrading") {
      return (
        <SubmissionDetailView
          viewId={view.data}
          mode={view.mode}
          onBack={handleDetailBack}
          refreshTrigger={refreshTrigger}
        />
      );
    }

    if (view.name === "submissionList" && (isTeacher || isAdmin)) {
      return (
        <SubmissionList
          homeworkId={view.data}
          onBack={() => (window.location.hash = "#/")}
          onOpenDiscussion={handleOpenDiscussion}
          onViewDetail={(submissionId) =>
            navigateTo("submissionGrading", submissionId)
          }
        />
      );
    }

    if (isAdmin || isPrincipal) {
      return (
        <AdminDashboard
          view={view}
          navigateTo={navigateTo}
          onEditHomework={handleOpenEdit}
          onOpenDiscussion={handleOpenDiscussion}
          refreshTrigger={refreshTrigger}
        />
      );
    }
    // 修改这里：使用全新的专属组件
    if (isTeacher) {
      return (
        <CourseTeacherDashboard
          courseId={courseId}
          view={view}
          navigateTo={navigateTo}
          onOpenCreateModal={handleOpenCreate}
          onEditHomework={handleOpenEdit}
          onOpenDiscussion={handleOpenDiscussion}
          refreshTrigger={refreshTrigger}
        />
      );
    }
    if (isStudent) {
      return (
        <StudentDashboard
          context="course"
          contextId={courseId}
          view={view}
          navigateTo={navigateTo}
          onOpenDiscussion={handleOpenDiscussion}
        />
      );
    }

    return (
      <div className={styles.noAccess}>您当前没有加入任何班级或学校。</div>
    );
  };

  return (
    <div className={styles.viewContainer}>
      {/* 只在列表首页展示自定义的精美头部，进入详情/编辑页则交给组件自己渲染 */}
      {view.name === "list" && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
            <div>
              <h2>课程作业区</h2>
              <p className={styles.subtitle}>
                在这里查看、提交和批改当前课程的作业
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.homeworkContent}>{renderContent()}</div>

      <DiscussionDrawer
        target={discussionTarget}
        onClose={() => setDiscussionTarget(null)}
      />
    </div>
  );
};

export default CourseHomeworkView;
