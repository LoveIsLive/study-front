import React, { useState, useEffect, useCallback } from 'react';
import { homeworkApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import Spinner from '../../../components/common/Spinner/Spinner';
import withReactContent from 'sweetalert2-react-content';
import Swal from 'sweetalert2';
import styles from '../HomeworkPage.module.css'; // 引入样式
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

// 接收 onOpenCreateModal, onEditHomework 和 refreshTrigger props
const TeacherDashboard = ({ view, navigateTo, onOpenCreateModal, onEditHomework, onOpenDiscussion, refreshTrigger }) => {
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHomeworks = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await homeworkApi.get('/teacher/all');
            setHomeworks(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch homeworks:", error);
            MySwal.fire({ icon: 'error', title: '加载作业失败' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
        const result = await MySwal.fire({
            title: `确认删除作业 "${homeworkTitle}"?`,
            text: "此操作将一并删除所有学生的提交记录，且无法恢复！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: '取消',
            confirmButtonText: '确认删除'
        });

        if (result.isConfirmed) {
            try {
                await homeworkApi.delete(`/${homeworkId}`);
                MySwal.fire({ icon: 'success', title: '作业已删除', timer: 1500, showConfirmButton: false });
                fetchHomeworks();
            } catch (error) {
                MySwal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    useEffect(() => {
        if (view.name === 'list') {
            fetchHomeworks();
        }
    }, [view.name, fetchHomeworks, refreshTrigger]);

    if (isLoading && view.name === 'list') {
        return <Spinner />;
    }

    if (view.name === 'submissionList') {
        return <SubmissionList
            homeworkId={view.data}
            onBack={() => navigateTo('list')}
            onOpenDiscussion={onOpenDiscussion} />;
    }

    return (
        <div>
            <div className={styles.dashboardHeader}>
                <h2>我发布的</h2>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onOpenCreateModal}>
                    <FontAwesomeIcon icon={faPlus} /> 发布作业
                </button>
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
};

export default TeacherDashboard;