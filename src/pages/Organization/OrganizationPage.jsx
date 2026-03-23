import React from 'react';
import useAuthStore from '../../store/authStore';
import AdminView from './components/AdminView';
import MemberView from './components/MemberView';
import Spinner from '../../components/common/Spinner/Spinner';
import styles from './OrganizationPage.module.css';
import { useSceneAwareness } from '../../hooks/useSceneAwareness';

const OrganizationPage = () => {
    const { user } = useAuthStore();
    const isAdmin = useAuthStore((state) => state.isAdmin());
    const isPrincipal = useAuthStore((state) => state.isPrincipal());

    const activeIdentity = useAuthStore(state => state.getActiveIdentity());

    useSceneAwareness('organization');

    const isManager = isAdmin || isPrincipal;

    return (
        <div className={styles.pageContainer}>
            <main className={styles.pageContent}>
                {/* 修复：校长也使用 AdminView，但视图被限制 */}
                {isManager ? (
                    <AdminView />
                ) : (
                    <MemberView classInfo={activeIdentity?.classes} />
                )}
            </main>
        </div>
    );
};

export default OrganizationPage;