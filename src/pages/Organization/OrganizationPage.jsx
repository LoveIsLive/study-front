import React from 'react';
import useAuthStore from '../../store/authStore';
import AdminView from './components/AdminView';
import MemberView from './components/MemberView';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './OrganizationPage.module.css';

const OrganizationPage = () => {
    const { user, detailInfo } = useAuthStore();

    // 教师和学生需要等待 detailInfo 加载完成才能显示班级
    // 管理员和校长(AdminView) 使用自己的 API 加载，所以不需要强制等待 detailInfo
    const isManager = user?.isAdmin || user?.isPrincipal;

    if (user && !isManager && !detailInfo) {
        return <Spinner />;
    }

    return (
        <div className={styles.pageContainer}>
            <main className={styles.pageContent}>
                {/* 修复：校长也使用 AdminView，但视图被限制 */}
                {isManager ? (
                    <AdminView />
                ) : (
                    <MemberView classInfo={detailInfo?.classMember?.classes} />
                )}
            </main>
        </div>
    );
};

export default OrganizationPage;