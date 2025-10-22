import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import PublishHomeworkModal from './components/PublishHomeworkModal';
import styles from './HomeworkPage.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const HomeworkPage = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState({ name: 'list', data: null });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 当用户角色变化时，重置视图到初始状态
    useEffect(() => {
        setView({ name: 'list', data: null });
    }, [user.isAdmin, user.isTeacher]);

    const navigateTo = useCallback((viewName, viewData = null) => {
        setView({ name: viewName, data: viewData });
    }, []);

    const handlePublishSuccess = () => {
        setIsModalOpen(false);
        setRefreshTrigger(t => t + 1);
    };

    const renderContent = () => {
        if (!user) return <Spinner />; // 增加一个加载保护

        if (user.isAdmin) {
            return <AdminDashboard view={view} navigateTo={navigateTo} />;
        }
        if (user.isTeacher) {
            return <TeacherDashboard view={view} navigateTo={navigateTo} refreshTrigger={refreshTrigger} />;
        }
        return <StudentDashboard view={view} navigateTo={navigateTo} />;
    };

    return (
        <div className={styles.appContainer}>
            <header className={styles.appHeader}>
                <h1>作业区</h1>
                {user && user.isTeacher && view.name === 'list' && (
                    <div>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setIsModalOpen(true)}>
                            <FontAwesomeIcon icon={faPlus} />  发布作业
                        </button>
                    </div>
                )}
            </header>

            <main id="app-main-content">
                {renderContent()}
            </main>

            {user && user.isTeacher && (
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