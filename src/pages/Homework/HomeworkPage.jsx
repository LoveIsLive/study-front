import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../store/authStore';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import styles from './HomeworkPage.module.css';

const HomeworkPage = () => {
    const { user } = useAuthStore();
    const [view, setView] = useState({ name: 'list', data: null });
    // view: { name: 'list' | 'submissionList' | 'submissionDetail', data: any }

    const navigateTo = useCallback((viewName, viewData = null) => {
        setView({ name: viewName, data: viewData });
    }, []);

    useEffect(() => {
        // 重置视图状态当用户角色变化时 (虽然不太可能在一个会话中发生)
        setView({ name: 'list', data: null });
    }, [user.isTeacher]);

    const renderContent = () => {
        if (user.isTeacher) {
            return <TeacherDashboard view={view} navigateTo={navigateTo} />;
        }
        return <StudentDashboard view={view} navigateTo={navigateTo} />;
    };

    return (
        <div className={styles.appContainer}>
            <header className={styles.appHeader}>
                <h1>作业区</h1>
                {/* 动态按钮区域留给子组件渲染 */}
            </header>
            <main id="app-main-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default HomeworkPage;