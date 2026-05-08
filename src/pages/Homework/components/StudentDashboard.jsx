import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import useAuthStore from '../../../store/authStore'; // 【新增引入】
import HomeworkList from './HomeworkList';
import SubmissionDetailView from './SubmissionDetailView';
import SubmissionList from './SubmissionList';
import SubmissionModal from './SubmissionModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

const StudentDashboard = ({ context = 'class', contextId = null, view, navigateTo, onOpenDiscussion }) => {
    // 【新增】判断用户是否为访客
    const isGuest = useAuthStore((state) => state.isGuest());

    const [activeTab, setActiveTab] = useState('all-homework');
    // 原始数据
    const [rawHomeworks, setRawHomeworks] = useState([]);
    const [rawSubmissions, setRawSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [filters, setFilters] = useState({
        status: '', // 对应 HomeworkSubmissionStatusEnum
        courseId: context === 'course' ? contextId : '',
        scoreRange: ''
    });
    const { courseList } = useAuthStore();

    // 加载作业列表（一次性）
    const fetchAllHomeworks = useCallback(async () => {
        setIsLoading(true);
        try {
            let response;
            if (context === 'course' && contextId) {
                response = await homeworkApi.get(`/course/${contextId}`);
            } else if (context === 'class' && contextId) {
                response = await homeworkApi.get(`/class/${contextId}`);
            } else {
                // 回退到全局查询（例如学生所有作业）
                response = await homeworkApi.get('/student/all');
            }
            setRawHomeworks(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业列表失败' });
        } finally {
            setIsLoading(false);
        }
    }, [context, contextId]);

    // 加载提交记录（一次性）
    const loadSubmissions = useCallback(async () => {
        // 【修改】拦截：如果角色是访客，不请求 submission 接口以防报错
        if (isGuest) return;

        setIsLoading(true);
        try {
            const res = await submissionApi.get('/student/all');
            if (res.data.code === 200) {
                setRawSubmissions(res.data.data || []);
            } else {
                Swal.fire({ icon: "error", title: "加载我的提交失败" });
            }
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
                loadSubmissions();
            }
        }
    }, [view, activeTab, fetchAllHomeworks, loadSubmissions, isGuest, refreshTrigger]);

    // 前端即时筛选 - 作业列表
    const filteredHomeworks = useMemo(() => {
        return rawHomeworks.filter(item => {
            // 课程筛选（如果需要在作业列表也筛选课程）
            const matchCourse = !filters.courseId || String(item.courseId) === String(filters.courseId);
            return matchCourse;
        });
    }, [rawHomeworks, filters.courseId]);

    // 前端即时筛选 - 提交记录
    const filteredSubmissions = useMemo(() => {
        return rawSubmissions.filter(sub => {
            const matchStatus = !filters.status || sub.status === filters.status;
            const matchCourse = !filters.courseId || String(sub.courseId) === String(filters.courseId);
            // 分数范围筛选（简单文本匹配）
            const matchScore = !filters.scoreRange || String(sub.score || '').includes(filters.scoreRange);
            return matchStatus && matchCourse && matchScore;
        });
    }, [rawSubmissions, filters]);

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
            loadSubmissions();
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
                    {/* 【修改】对于访客，隐藏"我的提交"选项卡 */}
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
                        homeworks={filteredHomeworks}
                        // 关键：学生点击作业，进入 homeworkDetail 模式，ID 为 homework.id
                        onSelectHomework={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                        onOpenDiscussion={onOpenDiscussion}
                    />
                )}
                {/* 访客由于无法切换到这个tab，所以这个块对于他们不渲染 */}
                {activeTab === 'my-submissions' && !isGuest && (
                    <>
                        <div className="student-filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select 
                                value={filters.status} 
                                onChange={e => setFilters({...filters, status: e.target.value})}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="">作业状态</option>
                                <option value="SUBMITTED">已提交</option>
                                <option value="GRADED">已批改</option>
                            </select>
                            {/* 其他筛选条件，如课程、发布者等 */}
                            {context !== 'course' && (
                                <select 
                                    value={filters.courseId} 
                                    onChange={e => setFilters({...filters, courseId: e.target.value})}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                >
                                    <option value="">全部课程</option>
                                    {courseList?.map(course => (
                                        <option key={course.id} value={course.id}>{course.name}</option>
                                    ))}
                                </select>
                            )}
                            <input 
                                type="text" 
                                placeholder="分数范围" 
                                value={filters.scoreRange} 
                                onChange={e => setFilters({...filters, scoreRange: e.target.value})}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>
                        <SubmissionList
                            submissions={filteredSubmissions}
                            isStudentView={true}
                            onEditSubmission={handleOpenEditModal}
                            onOpenDiscussion={onOpenDiscussion}
                            // 关键：学生查看我的提交详情，本质也是看作业详情页，ID 为 homeworkId
                            onViewDetail={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                        />
                    </>
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