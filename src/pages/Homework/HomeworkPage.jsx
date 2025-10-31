import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import HomeworkModal from './components/HomeworkModal';
import DiscussionDrawer from './components/DiscussionDrawer';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './HomeworkPage.module.css';

const HomeworkPage = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState({ name: 'list', data: null });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHomework, setEditingHomework] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [discussionTarget, setDiscussionTarget] = useState(null);

    // --- 路由逻辑 ---
    const navigateTo = useCallback((viewName, viewData = null) => {
        let hash = '#/';
        if (viewName === 'submissionDetail' && viewData) {
            hash = `#/homework/${viewData}`;
        } else if (viewName === 'submissionList' && viewData) {
            hash = `#/submissions/${viewData}`;
        }
        window.location.hash = hash;
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1);
            const parts = hash.split('/').filter(p => p);

            if (parts[0] === 'homework' && parts[1]) {
                setView({ name: 'submissionDetail', data: parts[1] });
            } else if (parts[0] === 'submissions' && parts[1]) {
                setView({ name: 'submissionList', data: parts[1] });
            } else {
                setView({ name: 'list', data: null });
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial load

        return () => window.removeEventListener('hashchange', handleHashChange);
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
        setEditingHomework(null);
    };

    const handleModalSuccess = () => {
        handleModalClose();
        setRefreshTrigger(t => t + 1);
    };

    const renderContent = () => {
        if (!user) return <Spinner />;

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
                onOpenCreateModal={handleOpenCreateModal} // 传递创建函数
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
            {/* 全局 Header 已被移除 */}
            <main id="app-main-content">
                {renderContent()}
            </main>

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