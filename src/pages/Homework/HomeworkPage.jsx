import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import HomeworkModal from './components/HomeworkModal';
import DiscussionDrawer from './components/DiscussionDrawer';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './HomeworkPage.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const HomeworkPage = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState({ name: 'list', data: null });

    // --- 状态管理重构 ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHomework, setEditingHomework] = useState(null); // null for create, object for edit
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [discussionTarget, setDiscussionTarget] = useState(null);

    useEffect(() => {
        setView({ name: 'list', data: null });
    }, [user?.isAdmin, user?.isTeacher]);

    const navigateTo = useCallback((viewName, viewData = null) => {
        setView({ name: viewName, data: viewData });
    }, []);

    // --- 讨论区模态框控制 ---
    const handleOpenDiscussion = useCallback((target) => {
        setDiscussionTarget(target);
    }, []);

    const handleCloseDiscussion = () => {
        setDiscussionTarget(null);
    };

    // --- 统一的模态框控制逻辑 ---
    const handleOpenCreateModal = () => {
        setEditingHomework(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (homework) => {
        setEditingHomework(homework);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingHomework(null); // 关闭时总是清空
    };

    const handleModalSuccess = () => {
        handleModalClose();
        setRefreshTrigger(t => t + 1); // 触发子组件刷新
    };

    const renderContent = () => {
        if (!user) return <Spinner />;

        // 将模态框的控制函数传递给子组件
        if (user.isAdmin) {
            return <AdminDashboard
                view={view}
                navigateTo={navigateTo}
                onEditHomework={handleOpenEditModal}
                onOpenDiscussion={handleOpenDiscussion}
                refreshTrigger={refreshTrigger}
            />;
        }
        if (user.isTeacher) {
            return <TeacherDashboard
                view={view}
                navigateTo={navigateTo}
                onEditHomework={handleOpenEditModal}
                onOpenDiscussion={handleOpenDiscussion}
                refreshTrigger={refreshTrigger}
            />;
        }
        return <StudentDashboard
            view={view}
            navigateTo={navigateTo}
            onOpenDiscussion={handleOpenDiscussion} />;
    };

    return (
        <div className={styles.appContainer}>
            <header className={styles.appHeader}>
                <h1>作业区</h1>
                {/* --- 按钮显示逻辑修正 --- */}
                {/* 只有纯教师角色在列表视图时才显示“发布作业”按钮 */}
                {user && user.isTeacher && !user.isAdmin && view.name === 'list' && (
                    <div>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenCreateModal}>
                            <FontAwesomeIcon icon={faPlus} /> 发布作业
                        </button>
                    </div>
                )}
            </header>

            <main id="app-main-content">
                {renderContent()}
            </main>

            {/* --- 统一渲染 HomeworkModal --- */}
            {/* 只有教师或管理员才能打开此模态框 */}
            {user && (user.isTeacher || user.isAdmin) && (
                <HomeworkModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                    editingHomework={editingHomework}
                />
            )}

            <DiscussionDrawer
                target={discussionTarget}
                onClose={handleCloseDiscussion}
            />
        </div>
    );
};

export default HomeworkPage;