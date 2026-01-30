import React, { useState, useEffect, useCallback } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionDetailView from './SubmissionDetailView';
import SubmissionList from './SubmissionList';
import SubmissionModal from './SubmissionModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

const StudentDashboard = ({ view, navigateTo, onOpenDiscussion }) => {
    const [activeTab, setActiveTab] = useState('all-homework');
    const [homeworks, setHomeworks] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchAllHomeworks = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await homeworkApi.get('/student/all');
            setHomeworks(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业列表失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchMySubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await submissionApi.get('/student/all');
            setSubmissions(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载我的提交失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view.name === 'list') {
            if (activeTab === 'all-homework') {
                fetchAllHomeworks();
            } else {
                fetchMySubmissions();
            }
        }
    }, [view, activeTab, fetchAllHomeworks, fetchMySubmissions]);

    const handleOpenEditModal = (submission) => {
        setEditingSubmission(submission);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingSubmission(null);
    };

    const handleModalSuccess = () => {
        handleModalClose();
        // 如果当前在详情页，我们不导航，而是更新触发器来刷新子组件
        if (view.name === 'submissionDetail') {
            setRefreshTrigger(t => t + 1); // 递增触发器
        } else {
            // 如果是在列表页（例如将来可能在列表页直接修改），则刷新列表
            fetchMySubmissions();
        }
    };

    // 已修复：重构渲染逻辑，将视图切换和模态框渲染分离
    const renderCurrentView = () => {
        if (isLoading) {
            return <Spinner />;
        }

        if (view.name === 'submissionDetail') {
            return <SubmissionDetailView
                homeworkId={view.data}
                onBack={() => navigateTo('list')}
                onEditSubmission={handleOpenEditModal}
                refreshTrigger={refreshTrigger}
            />;
        }

        // 默认显示列表视图
        return (
            <>
                <div className={styles.tabsContainer}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'all-homework' ? styles.active : ''}`}
                        onClick={() => setActiveTab('all-homework')}
                    >
                        所有作业
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'my-submissions' ? styles.active : ''}`}
                        onClick={() => setActiveTab('my-submissions')}
                    >
                        我的提交
                    </button>
                </div>
                {activeTab === 'all-homework' &&
                    <HomeworkList
                        homeworks={homeworks}
                        // 关键：学生点击作业，进入 homeworkDetail 模式，ID 为 homework.id
                        onSelectHomework={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                        onOpenDiscussion={onOpenDiscussion}
                    />}
                {activeTab === 'my-submissions' &&
                    <SubmissionList
                        submissions={submissions}
                        isStudentView={true}
                        onEditSubmission={handleOpenEditModal}
                        onOpenDiscussion={onOpenDiscussion}
                        // 关键：学生查看我的提交详情，本质也是看作业详情页，ID 为 homeworkId
                        onViewDetail={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                    />}
            </>
        );
    };

    return (
        <div>
            {/* 视图内容 */}
            {renderCurrentView()}

            {/* 模态框始终在组件树中，仅通过 isOpen 控制可见性 */}
            <SubmissionModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                editingSubmission={editingSubmission}
            />
        </div>
    );
};

export default StudentDashboard;