import React, { useState, useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../../../store/authStore';
import { classesApi, homeworkApi } from '../../../services/api';
import Swal from 'sweetalert2';
import Spinner from '../../../components/common/Spinner/Spinner';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import styles from '../HomeworkPage.module.css';
import adminStyles from './AdminDashboard.module.css';

const AdminDashboard = ({ view, navigateTo }) => {
    const { selectedClass, setSelectedClass } = useAuthStore();
    const [classes, setClasses] = useState([]);
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debounceTimeout = useRef(null);

    const fetchClasses = useCallback(async (key = '') => {
        setIsLoading(true);
        try {
            const params = key ? { key, detailed: true } : { detailed: true };
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
    }, []);

    const fetchHomeworks = useCallback(async (classId) => {
        setIsLoading(true);
        try {
            // 使用您已有的接口 /class/{classId}
            const response = await homeworkApi.get(`/class/${classId}`);
            setHomeworks(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载班级作业失败' });
            setHomeworks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedClass && view.name === 'list') {
            fetchHomeworks(selectedClass.id);
        } else if (!selectedClass) {
            fetchClasses();
        }
    }, [selectedClass, view.name, fetchClasses, fetchHomeworks]);

    // 1. 输入框内容变化时，只更新 state
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // 2. 按下回车键时触发搜索
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            fetchClasses(searchTerm);
        }
    };

    // 3. 点击搜索按钮时触发搜索
    const handleSearchClick = () => {
        fetchClasses(searchTerm);
    };

    // 4. 点击清除按钮时，清空输入并获取全部班级
    const handleClearSearch = () => {
        setSearchTerm('');
        fetchClasses(''); // 传入空字符串获取全部
    };

    const handleClassSelect = (classInfo) => {
        setSelectedClass(classInfo);
    };

    const handleBackToClasses = () => {
        setSelectedClass(null);
        setHomeworks([]);
        setSearchTerm(''); // 清空搜索词
        navigateTo('list');
    };

    const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
        const result = await Swal.fire({
            title: `确认删除作业 "${homeworkTitle}"?`,
            text: "将一并删除所有提交，此操作无法恢复！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确认删除',
            cancelButtonColor: '#d33',
            cancelButtonText: '取消',
        });
        if (result.isConfirmed) {
            try {
                await homeworkApi.delete(`/${homeworkId}`);
                Swal.fire({ icon: 'success', title: '删除成功', timer: 1500, showConfirmButton: false });
                fetchHomeworks(selectedClass.id);
            } catch (error) {
                Swal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    if (isLoading && view.name === 'list') { // 只在列表视图显示主加载动画
        return <Spinner />;
    }

    if (selectedClass && view.name === 'submissionList') {
        return <SubmissionList homeworkId={view.data} onBack={() => navigateTo('list')} isAdminView={true} />;
    }

    if (selectedClass) {
        return (
            <div>
                <div className={adminStyles.homeworkHeader}>
                    <h2>{selectedClass.name} - 作业列表</h2>
                    <button onClick={handleBackToClasses} className={`${styles.btn} ${styles.btnSecondary}`}>
                        <i className="fas fa-arrow-left"></i> 返回班级列表
                    </button>
                </div>
                <HomeworkList
                    homeworks={homeworks}
                    isTeacher={true} // 管理员复用教师卡片的可操作性
                    onViewSubmissions={(homeworkId) => navigateTo('submissionList', homeworkId)}
                    onDeleteHomework={handleDeleteHomework}
                />
            </div>
        );
    }

    return (
        <div>
            <div className={adminStyles.searchContainer}>
                {/* 1. 包裹输入框和图标 */}
                <div className={`${adminStyles.inputWrapper} ${searchTerm ? adminStyles.hasValue : ''}`}>
                    <i className={`fas fa-search ${adminStyles.searchIcon}`}></i>
                    <input
                        type="text"
                        placeholder="按名称模糊搜索班级...回车"
                        className={adminStyles.searchInput}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                    />
                    {/* 2. 添加清除按钮 */}
                    <button className={adminStyles.clearButton} onClick={handleClearSearch}>&times;</button>
                </div>
                {/* 3. 添加搜索按钮 */}
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSearchClick}>
                    搜索
                </button>
            </div>
            {isLoading ? <Spinner /> : (
                <div className={adminStyles.classListContainer}>
                    {classes.length > 0 ? (
                        classes.map(cls => (
                            <div key={cls.id} className={adminStyles.classCard} onClick={() => handleClassSelect(cls)}>
                                <div className={adminStyles.className}>{cls.name}</div>
                                <div className={adminStyles.classMemberCount}>
                                    {cls.memberCount ?? '--'} 人
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className={styles.placeholderText}>未找到匹配的班级</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;