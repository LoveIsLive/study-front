import React, { useState, useEffect, useCallback } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import useAuthStore from '../../../store/authStore'; // 【新增引入】
import HomeworkList from './HomeworkList';
import SubmissionDetailView from './SubmissionDetailView';
import SubmissionList from './SubmissionList';
import SubmissionModal from './SubmissionModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

const StudentDashboard = ({ view, navigateTo, onOpenDiscussion }) => {
    // 【新增】判断用户是否为访客
    const isGuest = useAuthStore((state) => state.isGuest());

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
        // 【修改】拦截：如果角色是访客，不请求 submission 接口以防报错
        if (isGuest) return;

        setIsLoading(true);
        try {
            const response = await submissionApi.get('/student/all');
            setSubmissions(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: "error", title: "加载我的提交失败" });
        } finally {
            setIsLoading(false);
        }
    }, [isGuest]); // 增加依赖项

    useEffect(() => {
        if (view.name === 'list') {
            if (activeTab === 'all-homework') {
                fetchAllHomeworks();
            } else if (!isGuest) {
                // 【修改】仅非访客时允许触发拉取
                fetchMySubmissions();
            }
        }
    }, [view, activeTab, fetchAllHomeworks, fetchMySubmissions, isGuest]);

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
                    {/* 【修改】对于访客，隐藏“我的提交”选项卡 */}
                    {!isGuest && (
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'my-submissions' ? styles.active : ''}`}
                            onClick={() => setActiveTab('my-submissions')}
                        >
                            我的提交
                        </button>
                    )}
                </div>
                {activeTab === 'all-homework' && (
                    <HomeworkList
                        homeworks={homeworks}
                        // 关键：学生点击作业，进入 homeworkDetail 模式，ID 为 homework.id
                        onSelectHomework={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                        onOpenDiscussion={onOpenDiscussion}
                    />
                )}
                {/* 访客由于无法切换到这个tab，所以这个块对于他们不渲染 */}
                {activeTab === 'my-submissions' && !isGuest && (
                    <SubmissionList
                        submissions={submissions}
                        isStudentView={true}
                        onEditSubmission={handleOpenEditModal}
                        onOpenDiscussion={onOpenDiscussion}
                        // 关键：学生查看我的提交详情，本质也是看作业详情页，ID 为 homeworkId
                        onViewDetail={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                    />
                )}
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