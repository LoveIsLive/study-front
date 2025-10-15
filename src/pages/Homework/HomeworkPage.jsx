import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import PublishHomeworkModal from './components/PublishHomeworkModal';
import styles from './HomeworkPage.module.css';

const HomeworkPage = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState({ name: 'list', data: null });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const navigateTo = useCallback((viewName, viewData = null) => {
        setView({ name: viewName, data: viewData });
    }, []);

    const handlePublishSuccess = () => {
        setIsModalOpen(false);
        // 递增 refreshTrigger 的值，这将作为 prop 传递给 TeacherDashboard
        // TeacherDashboard 中的 useEffect 会监听到这个值的变化，并重新获取数据
        setRefreshTrigger(t => t + 1);
    };

    const renderContent = () => {
        if (user.isTeacher) {
            return <TeacherDashboard view={view} navigateTo={navigateTo} refreshTrigger={refreshTrigger} />;
        }
        return <StudentDashboard view={view} navigateTo={navigateTo} />;
    };

    return (
        <div className={styles.appContainer}>
            <header className={styles.appHeader}>
                <h1>作业区</h1>
                {/* 仅当是教师、且处于列表视图时，才显示“发布作业”按钮 */}
                {user.isTeacher && view.name === 'list' && (
                    <div>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setIsModalOpen(true)}>
                            <i className="fas fa-plus"></i> 发布作业
                        </button>
                    </div>
                )}
            </header>

            <main id="app-main-content">
                {renderContent()}
            </main>

            {/* 模态框的渲染和状态管理由主页面负责 */}
            {user.isTeacher && (
                <PublishHomeworkModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handlePublishSuccess}
                />
            )}
        </div>
    );
};

export default HomeworkPage;