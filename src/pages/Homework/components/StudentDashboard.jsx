import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import useAuthStore from '../../../store/authStore';
import HomeworkList from './HomeworkList';
import SubmissionDetailView from './SubmissionDetailView';
import SubmissionList from './SubmissionList';
import SubmissionModal from './SubmissionModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

// 【修复核心 1】: 智能提取课程ID，兼容平铺或嵌套的实体类
const extractCourseId = (obj) => {
    if (!obj) return null;
    // 直接在当前对象上
    if (obj.courseId !== undefined && obj.courseId !== null) return String(obj.courseId);
    // 嵌套在 course 对象中
    if (obj.course && obj.course.id !== undefined && obj.course.id !== null) return String(obj.course.id);
    // 嵌套在 homework 对象中 (常见于 Submission 提交记录)
    if (obj.homework) {
        if (obj.homework.courseId !== undefined && obj.homework.courseId !== null) return String(obj.homework.courseId);
        if (obj.homework.course && obj.homework.course.id !== undefined && obj.homework.course.id !== null) return String(obj.homework.course.id);
    }
    return null;
};

// 【修复核心 2】: 状态归一化，兼容后端的数字枚举或中文字符串
const normalizeStatus = (statusVal) => {
    if (statusVal === null || statusVal === undefined) return 'UNSUBMITTED';
    const s = String(statusVal).toUpperCase();
    if (s === '0' || s === '未提交' || s === 'UNSUBMITTED') return 'UNSUBMITTED';
    if (s === '1' || s === '已提交' || s === '提交' || s === 'SUBMITTED') return 'SUBMITTED';
    if (s === '2' || s === '已批改' || s === '批改' || s === 'GRADED') return 'GRADED';
    return s;
};

const StudentDashboard = ({ context = 'class', contextId = null, view, navigateTo, onOpenDiscussion }) => {
    const isGuest = useAuthStore((state) => state.isGuest());

    const [activeTab, setActiveTab] = useState('all-homework');
    const [rawHomeworks, setRawHomeworks] = useState([]);
    const [rawSubmissions, setRawSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [filters, setFilters] = useState({
        status: '', 
        courseId: context === 'course' ? contextId : '',
        scoreRange: ''
    });
    const { courseList } = useAuthStore();

    // 加载作业列表
    const fetchAllHomeworks = useCallback(async () => {
      setIsLoading(true);
      try {
        let response;

        // 【核心修复】：如果是访客，且不在单一课程上下文中，拦截并改为按课程并发获取
        if (isGuest && context !== "course") {
          if (!courseList || courseList.length === 0) {
            setRawHomeworks([]);
            setIsLoading(false);
            return;
          }

          // 仅针对访客：并发请求所有其有权限查看的课程的作业
          const fetchPromises = courseList.map((course) =>
            homeworkApi.get(`/course/${course.id}`).catch((err) => {
              console.warn(`获取课程 ${course.id} 作业失败`, err);
              return null; // 捕获单个课程的错误，防止阻断整体加载
            }),
          );

          const results = await Promise.all(fetchPromises);
          let aggregatedHws = [];

          // 遍历拼接所有结果
          results.forEach((res) => {
            if (
              res &&
              res.data &&
              res.data.code === 200 &&
              Array.isArray(res.data.data)
            ) {
              aggregatedHws.push(...res.data.data);
            }
          });

          // 按更新时间降序排列，保证最新的作业在最上面
          aggregatedHws.sort(
            (a, b) =>
              new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime(),
          );
          setRawHomeworks(aggregatedHws);
          setIsLoading(false);
          return;
        }

        // 原有的非访客逻辑 或 明确的单课程逻辑
        if (context === "course" && contextId) {
          response = await homeworkApi.get(`/course/${contextId}`);
        } else if (context === "class" && contextId) {
          response = await homeworkApi.get(`/class/${contextId}`);
        } else {
          response = await homeworkApi.get("/student/all");
        }

        if (response && response.data) {
          setRawHomeworks(response.data.data || []);
        }
      } catch (error) {
        Swal.fire({ icon: "error", title: "加载作业列表失败" });
      } finally {
        setIsLoading(false);
      }
    }, [context, contextId, isGuest, courseList]); // 【重要】：依赖项里必须加入 courseList

    // 加载我的提交记录
    const loadSubmissions = useCallback(async () => {
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
    }, [isGuest]); 

    useEffect(() => {
        if (view.name === 'list') {
            if (activeTab === 'all-homework') {
                fetchAllHomeworks();
            } else if (!isGuest) {
                loadSubmissions();
            }
        }
    }, [view, activeTab, fetchAllHomeworks, loadSubmissions, isGuest, refreshTrigger]);

    // 【修正】使用安全提取器过滤所有作业
    const filteredHomeworks = useMemo(() => {
        return rawHomeworks.filter(item => {
            const itemCourseId = extractCourseId(item);
            const matchCourse = !filters.courseId || itemCourseId === String(filters.courseId);
            
            const rawStatus = item.submissionStatus || item.status; 
            const normalizedStatus = normalizeStatus(rawStatus);
            const matchStatus = !filters.status || normalizedStatus === filters.status;
            
            return matchCourse && matchStatus;
        });
    }, [rawHomeworks, filters.courseId, filters.status]);

    // 【修正】使用安全提取器过滤提交记录
    const filteredSubmissions = useMemo(() => {
        return rawSubmissions.filter(sub => {
            const subCourseId = extractCourseId(sub);
            const matchCourse = !filters.courseId || subCourseId === String(filters.courseId);

            const normalizedStatus = normalizeStatus(sub.status);
            const matchStatus = !filters.status || normalizedStatus === filters.status;
            
            // 修复0分无法被包含筛选的隐藏bug
            const scoreStr = sub.score !== null && sub.score !== undefined ? String(sub.score) : '';
            const matchScore = !filters.scoreRange || scoreStr.includes(filters.scoreRange);
            
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
        if (view.name === 'submissionDetail') {
            setRefreshTrigger(t => t + 1);
        } else {
            loadSubmissions();
        }
    };

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

        return (
            <>
                <div className={styles.tabsContainer}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'all-homework' ? styles.active : ''}`}
                        onClick={() => setActiveTab('all-homework')}
                    >
                        所有作业
                    </button>
                    {!isGuest && (
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'my-submissions' ? styles.active : ''}`}
                            onClick={() => setActiveTab('my-submissions')}
                        >
                            我的提交
                        </button>
                    )}
                </div>

                <div className="student-filters" style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* {!isGuest && (
                        <select 
                            value={filters.status} 
                            onChange={e => setFilters({...filters, status: e.target.value})}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="">全部状态</option>
                            <option value="UNSUBMITTED">未提交</option>
                            <option value="SUBMITTED">已提交</option>
                            <option value="GRADED">已批改</option>
                        </select>
                    )} */}
                    
                    {context !== 'course' && (
                        <select 
                            value={filters.courseId} 
                            onChange={e => setFilters({...filters, courseId: e.target.value})}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="">全部课程</option>
                            {courseList?.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    )}

                    {activeTab === 'my-submissions' && !isGuest && (
                        <input 
                            type="text" 
                            placeholder="分数包含 (如: 90)" 
                            value={filters.scoreRange} 
                            onChange={e => setFilters({...filters, scoreRange: e.target.value})}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d9d9d9', outline: 'none', width: '160px' }}
                        />
                    )}
                </div>

                {activeTab === 'all-homework' && (
                    <HomeworkList
                        homeworks={filteredHomeworks}
                        onSelectHomework={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                        onOpenDiscussion={onOpenDiscussion}
                    />
                )}

                {activeTab === 'my-submissions' && !isGuest && (
                    <SubmissionList
                        submissions={filteredSubmissions}
                        isStudentView={true}
                        onEditSubmission={handleOpenEditModal}
                        onOpenDiscussion={onOpenDiscussion}
                        onViewDetail={(homeworkId) => navigateTo('homeworkDetail', homeworkId)}
                    />
                )}
            </>
        );
    };

    return (
        <div>
            {renderCurrentView()}
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