import React, { useState, useEffect } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import HomeworkList from './HomeworkList';
import SubmissionDetailView from './SubmissionDetailView';
import SubmissionList from './SubmissionList'; // 复用 SubmissionList 显示“我的提交”
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

const StudentDashboard = ({ view, navigateTo }) => {
    const [activeTab, setActiveTab] = useState('all-homework');
    const [homeworks, setHomeworks] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAllHomeworks = async () => {
        setIsLoading(true);
        try {
            const response = await homeworkApi.get('/student/all');
            setHomeworks(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业列表失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMySubmissions = async () => {
        setIsLoading(true);
        try {
            const response = await submissionApi.get('/student/all');
            setSubmissions(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载我的提交失败' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (view.name === 'list') {
            if (activeTab === 'all-homework') {
                fetchAllHomeworks();
            } else {
                fetchMySubmissions();
            }
        }
    }, [view, activeTab]);

    if (view.name === 'submissionDetail') {
        return <SubmissionDetailView homeworkId={view.data} onBack={() => navigateTo('list')} />;
    }

    return (
        <div>
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

            {isLoading ? <Spinner /> : (
                <>
                    {activeTab === 'all-homework' &&
                        <HomeworkList
                            homeworks={homeworks}
                            onSelectHomework={(homeworkId) => navigateTo('submissionDetail', homeworkId)}
                            isTeacher={false}
                        />}
                    {activeTab === 'my-submissions' &&
                        <SubmissionList submissions={submissions} isStudentView={true} />}
                </>
            )}
        </div>
    );
};

export default StudentDashboard;