import React from 'react';
import useAuthStore from '../../store/authStore';
import AdminView from './components/AdminView';
import MemberView from './components/MemberView';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './OrganizationPage.module.css';

const OrganizationPage = () => {
    const { user, detailInfo } = useAuthStore();

    // 在 detailInfo 加载完成前，显示加载动画
    // 管理员不需要等待 detailInfo
    if (user && !user.isAdmin && !detailInfo) {
        return <Spinner />;
    }

    return (
        <div className={styles.pageContainer}>
            <header className={styles.pageHeader}>
                <h1>{user?.isAdmin ? '组织管理' : '我的班级'}</h1>
            </header>
            <main className={styles.pageContent}>
                {user?.isAdmin ? (
                    <AdminView />
                ) : (
                    // 直接将 detailInfo 中的班级信息传递给 MemberView
                    <MemberView classInfo={detailInfo?.classMember?.classes} />
                )}
            </main>
        </div>
    );
};

export default OrganizationPage;