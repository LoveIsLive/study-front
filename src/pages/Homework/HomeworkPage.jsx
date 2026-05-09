import React, { useState, useEffect, useCallback } from "react";
import useAuthStore from "../../store/authStore";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import HomeworkEditorPage from "./components/HomeworkEditorPage";
import DiscussionDrawer from "./components/DiscussionDrawer";
import SubmissionDetailView from "./components/SubmissionDetailView"; // 引入详情页
import SubmissionList from "./components/SubmissionList"; // 引入提交列表页
import Spinner from "../../components/common/Spinner/Spinner";
import styles from "./HomeworkPage.module.css";

const HomeworkPage = () => {
  const { user, detailInfo, activeId, activeType } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const isStudent = useAuthStore((state) => state.isStudent());
  const isGuest = useAuthStore((state) => state.isGuest()); // 【新增这行】

  // view 结构: { name: string, data: any, mode: string }
  const [view, setView] = useState({ name: "list", data: null, mode: null });
  const [editingHomework, setEditingHomework] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [discussionTarget, setDiscussionTarget] = useState(null);

  // --- 路由逻辑重构 ---
  const navigateTo = useCallback((viewName, viewData = null) => {
    let hash = "#/";
    if (viewName === "create") hash = "#/homework/create";
    else if (viewName === "edit") {
      /* 编辑逻辑通常在组件内处理或带ID */
    }

    // 区分：学生看作业(homework) vs 老师看提交列表(submissions) vs 老师批改(submission)
    else if (viewName === "homeworkDetail")
      hash = `#/homework/${viewData}`; // 学生查看作业
    else if (viewName === "submissionList")
      hash = `#/homework/${viewData}/submissions`; // 老师查看某作业的提交列表
    else if (viewName === "submissionGrading")
      hash = `#/submission/${viewData}`; // 老师批改某具体提交
    // 如果是返回列表
    else if (viewName === "list") hash = "#/";

    window.location.hash = hash;
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const parts = hash.split("/").filter((p) => p);

      // 路由解析逻辑
      if (parts.length === 0) {
        setView({ name: "list", data: null });
        setEditingHomework(null);
      } else if (parts[0] === "homework") {
        if (parts[1] === "create") {
          setView({ name: "create" });
        } else if (parts[2] === "submissions") {
          // #/homework/{id}/submissions
          setView({ name: "submissionList", data: parts[1] });
        } else if (parts[1] && parts[1] !== "undefined") {
          // #/homework/{id} -> 学生写作业模式
          setView({ name: "homeworkDetail", data: parts[1], mode: "homework" });
        }
      } else if (
        parts[0] === "submission" &&
        parts[1] &&
        parts[1] !== "undefined"
      ) {
        // #/submission/{id} -> 老师批改模式
        setView({ name: "submissionGrading", data: parts[1], mode: "grading" });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // 初始化执行
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleDetailBack = () => {
    // 当从详情页返回时，触发刷新计数器，这样如果缓存了组件也能强制更新
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

    if (!isAdmin && !detailInfo) {
      return <Spinner />;
    }

    // 1. 全局顶级视图 (编辑器)
    if (view.name === "create") {
      return (
        <HomeworkEditorPage
          onBack={() => (window.location.hash = "#/")}
          editingHomework={editingHomework}
          onSuccess={handleEditorSuccess}
        />
      );
    }

    // 2. 全局顶级视图 (详情/批改页) - 修复 Bug 1 的关键
    // 将详情页提到 Dashboard 之外，避免 Dashboard 内部路由处理不当
    // 在渲染 SubmissionDetailView 时：
    if (view.name === "homeworkDetail" || view.name === "submissionGrading") {
      return (
        <SubmissionDetailView
          viewId={view.data}
          mode={view.mode}
          onBack={handleDetailBack} // 使用这个处理函数
          refreshTrigger={refreshTrigger}
        />
      );
    }

    // 3. 全局顶级视图 (提交列表页)
    // 虽然 TeacherDashboard 内部处理了 submissionList，但为了统一路由，也可以提取出来
    // 这里暂时保留在 Dashboard 内部处理，或提取出来如下：
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
    console.log(isTeacher, "是否是教师");

    // 4. 仪表盘视图 (列表页)
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
    if (isTeacher) {
      return (
        <TeacherDashboard
          context="class"
          contextId={activeType === "class" ? activeId : null}
          view={view}
          navigateTo={navigateTo}
          onOpenCreateModal={handleOpenCreate}
          onEditHomework={handleOpenEdit}
          onOpenDiscussion={handleOpenDiscussion}
          refreshTrigger={refreshTrigger}
        />
      );
    }
    if (isStudent || isGuest) {
      // 【新增 || isGuest】
      // 学生和访客统一使用这个 Dashboard（Dashboard 内部已做了 UI 隔离）
      return (
        <StudentDashboard
          context="global"
          contextId={null}
          view={view}
          navigateTo={navigateTo}
          onOpenDiscussion={handleOpenDiscussion}
        />
      );
    }
    // 4. 兜底处理：如果有 detailInfo 但不属于任何角色（例如新注册账号）
    return <div className="no-access">您当前没有加入任何班级或学校。</div>;
  };

  return (
    <div className={styles.appContainer}>
      <main id="app-main-content">{renderContent()}</main>
      <DiscussionDrawer
        target={discussionTarget}
        onClose={() => setDiscussionTarget(null)}
      />
    </div>
  );
};

export default HomeworkPage;
