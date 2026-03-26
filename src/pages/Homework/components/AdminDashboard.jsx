import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/authStore';
import { classesApi, homeworkApi, schoolApi } from '../../../services/api';
import Swal from 'sweetalert2';
import Spinner from '../../../components/common/Spinner/Spinner';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import styles from '../HomeworkPage.module.css';
import adminStyles from './AdminDashboard.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSearch, faSchool, faChalkboard } from '@fortawesome/free-solid-svg-icons';

const AdminDashboard = ({ view, navigateTo, onEditHomework, onOpenDiscussion, refreshTrigger }) => {
    const { user } = useAuthStore();
    const isAdmin = useAuthStore((state) => state.isAdmin());

    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    const [schools, setSchools] = useState([]);
    const [classes, setClasses] = useState([]);
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 搜索状态：分为学校搜索和班级搜索
    const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
    const [classSearchTerm, setClassSearchTerm] = useState('');

    // --- 1. 获取学校列表 (支持搜索) ---
    const fetchSchools = useCallback(async (key = '') => {
        setIsLoading(true);
        try {
            const endpoint = key ? '/search' : '/all';
            const params = key ? { key } : {};
            const res = await schoolApi.get(endpoint, { params });
            setSchools(res.data.data || []);
        } catch (e) {
            Swal.fire('加载学校失败', '', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 2. 获取班级列表 ---
    const fetchClasses = useCallback(async (key = '') => {
        setIsLoading(true);
        try {
            const params = { detailed: true };
            if (key) params.key = key;
            if (isAdmin && selectedSchool) {
                params.schoolId = selectedSchool.id;
            }

            const endpoint = key ? '/search' : '/all';
            const response = await classesApi.get(endpoint, { params });
            const data = response.data.data;
            setClasses(Array.isArray(data) ? data : (data ? [data] : []));
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载班级列表失败' });
            setClasses([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin, selectedSchool]);

    // --- 3. 获取作业列表 ---
    const fetchHomeworks = useCallback(async (classId) => {
        setIsLoading(true);
        try {
            const response = await homeworkApi.get(`/class/${classId}`);
            setHomeworks(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Effect ---
    useEffect(() => {
        if (selectedClass && view.name === 'list') {
            fetchHomeworks(selectedClass.id);
        } else if (isAdmin && !selectedSchool) {
            fetchSchools(); // 初始无参数
        } else {
            fetchClasses(); // 初始无参数
        }
    }, [selectedClass, selectedSchool, view.name, isAdmin, fetchSchools, fetchClasses, fetchHomeworks, refreshTrigger]);


    // --- Handlers ---
    const handleSchoolSelect = (school) => {
        setSelectedSchool(school);
        setSchoolSearchTerm(''); // 清空学校搜索
        setClassSearchTerm('');  // 准备班级搜索
    };

    const handleClassSelect = (classInfo) => {
        setSelectedClass(classInfo);
    };

    const handleBack = () => {
        if (selectedClass) {
            setSelectedClass(null);
            setHomeworks([]);
            setClassSearchTerm('');
        } else if (isAdmin && selectedSchool) {
            setSelectedSchool(null);
            setClasses([]);
            setSchoolSearchTerm('');
        } else {
            navigateTo('list');
        }
        navigateTo('list');
    };

    const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
        const result = await Swal.fire({
            title: `确认删除作业 "${homeworkTitle}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '删除'
        });
        if (result.isConfirmed) {
            try {
                await homeworkApi.delete(`/${homeworkId}`);
                Swal.fire('删除成功', '', 'success');
                fetchHomeworks(selectedClass.id);
            } catch (e) {
                Swal.fire('删除失败', '', 'error');
            }
        }
    };

    // --- Search Handlers ---
    const handleSchoolSearch = () => {
        fetchSchools(schoolSearchTerm);
    };

    const handleClassSearch = () => {
        fetchClasses(classSearchTerm);
    };

    // --- Render Views ---

    if (isLoading && view.name === 'list') return <Spinner />;

    // 1. 作业提交列表视图
    if (selectedClass && view.name === 'submissionList') {
        return <SubmissionList
            homeworkId={view.data}
            onBack={() => navigateTo('list')}
            isAdminView={true}
            onOpenDiscussion={onOpenDiscussion} />;
    }

    // 2. 作业列表视图 (已选班级)
    if (selectedClass) {
        return (
            <div>
                <div className={adminStyles.homeworkHeader} style={{ justifyContent: 'flex-start', gap: '20px' }}>
                    <button onClick={handleBack} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <FontAwesomeIcon icon={faArrowLeft} /> 返回班级
                    </button>

                    {/* H2 放在后面 */}
                    <h2 style={{ margin: 0 }}>
                        <span className={styles.textSecondary}>{selectedSchool?.name || '本校'} / </span>
                        {selectedClass.name}
                    </h2>
                </div>
                <HomeworkList
                    homeworks={homeworks}
                    onViewSubmissions={(homeworkId) => navigateTo('submissionList', homeworkId)}
                    onDeleteHomework={handleDeleteHomework}
                    onEditHomework={onEditHomework}
                    onOpenDiscussion={onOpenDiscussion}
                />
            </div>
        );
    }

    // 3. 学校列表视图 (Admin Only, 且未选学校)
    if (isAdmin && !selectedSchool) {
        return (
            <div>
                <div className={styles.dashboardHeader}>
                    <h2>选择学校</h2>
                </div>

                {/* --- 学校搜索栏 --- */}
                <div className={adminStyles.searchContainer}>
                    <div className={`${adminStyles.inputWrapper} ${schoolSearchTerm ? adminStyles.hasValue : ''}`}>
                        <FontAwesomeIcon icon={faSearch} className={adminStyles.searchIcon} />
                        <input
                            type="text"
                            placeholder="搜索学校..."
                            className={adminStyles.searchInput}
                            value={schoolSearchTerm}
                            onChange={(e) => setSchoolSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSchoolSearch()}
                        />
                        <button className={adminStyles.clearButton} onClick={() => { setSchoolSearchTerm(''); fetchSchools(''); }}>&times;</button>
                    </div>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSchoolSearch}>搜索</button>
                </div>

                <div className={adminStyles.classListContainer}>
                    {schools.length > 0 ? (
                        schools.map(school => (
                            <div key={school.id} className={adminStyles.classCard} onClick={() => handleSchoolSelect(school)}>
                                <div className={adminStyles.className}>
                                    <FontAwesomeIcon icon={faSchool} style={{ marginRight: '10px', color: 'var(--primary-color)' }} />
                                    {school.name}
                                </div>
                                <div className={adminStyles.classMemberCount}>
                                    {school.classCount || 0} 班级
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className={styles.placeholderText}>未找到学校</p>
                    )}
                </div>
            </div>
        )
    }

    // 4. 班级列表视图 (校长 或 Admin已选学校)
    return (
        <div>
            <div className={adminStyles.homeworkHeader} style={{ justifyContent: 'flex-start', gap: '20px' }}>
                {isAdmin && (
                    <button onClick={handleBack} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <FontAwesomeIcon icon={faArrowLeft} /> 返回学校
                    </button>
                )}
                <h2 style={{ margin: 0 }}>
                    {selectedSchool ? selectedSchool.name : '我的学校'} - 班级列表
                </h2>
            </div>

            {/* --- 班级搜索栏 --- */}
            <div className={adminStyles.searchContainer}>
                <div className={`${adminStyles.inputWrapper} ${classSearchTerm ? adminStyles.hasValue : ''}`}>
                    <FontAwesomeIcon icon={faSearch} className={adminStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="搜索班级..."
                        className={adminStyles.searchInput}
                        value={classSearchTerm}
                        onChange={(e) => setClassSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleClassSearch()}
                    />
                    <button className={adminStyles.clearButton} onClick={() => { setClassSearchTerm(''); fetchClasses(''); }}>&times;</button>
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleClassSearch}>搜索</button>
            </div>

            <div className={adminStyles.classListContainer}>
                {classes.length > 0 ? (
                    classes.map(cls => (
                        <div key={cls.id} className={adminStyles.classCard} onClick={() => handleClassSelect(cls)}>
                            <div className={adminStyles.className}>
                                <FontAwesomeIcon icon={faChalkboard} style={{ marginRight: '10px', color: '#6c757d' }} />
                                {cls.name}
                            </div>
                            <div className={adminStyles.classMemberCount}>
                                {cls.memberCount ?? '--'} 人
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={styles.placeholderText}>未找到班级</p>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;