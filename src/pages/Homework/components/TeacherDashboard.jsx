import React, { useState, useEffect } from 'react';
import { homeworkApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionList from './SubmissionList';
import PublishHomeworkModal from './PublishHomeworkModal';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import withReactContent from 'sweetalert2-react-content';
import Swal from 'sweetalert2';

const MySwal = withReactContent(Swal);

const TeacherDashboard = ({ view, navigateTo }) => {
    const [homeworks, setHomeworks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchHomeworks = async () => {
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
    };

    useEffect(() => {
        if (view.name === 'list') {
            fetchHomeworks();
        }
    }, [view]);

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
                MySwal.fire({ icon: 'success', title: '作业已删除' });
                fetchHomeworks(); // 重新加载列表
            } catch (error) {
                MySwal.fire({ icon: 'error', title: '删除失败' });
            }
        }
    };

    if (isLoading) {
        return <Spinner />;
    }

    if (view.name === 'submissionList') {
        return <SubmissionList homeworkId={view.data} onBack={() => navigateTo('list')} />;
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem', textAlign: 'right' }}>
                <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
                    <i className="fas fa-plus"></i> 发布作业
                </button>
            </div>
            <HomeworkList
                homeworks={homeworks}
                onViewSubmissions={(homeworkId) => navigateTo('submissionList', homeworkId)}
                onDeleteHomework={handleDeleteHomework}
                isTeacher={true}
            />
            <PublishHomeworkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    fetchHomeworks();
                }}
            />
        </div>
    );
};

export default TeacherDashboard;