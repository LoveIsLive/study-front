import React, { useState, useEffect, useCallback } from 'react';
import { submissionApi, homeworkApi } from '../../../services/api';
import Spinner from '../../../components/common/Spinner/Spinner';
import SubmissionCard from './SubmissionCard';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const SubmissionList = ({ homeworkId, onBack, isStudentView = false,
    submissions: studentSubmissions, onEditSubmission, onOpenDiscussion }) => {
    const [submissions, setSubmissions] = useState([]);
    const [homeworkTitle, setHomeworkTitle] = useState('');
    const [isLoading, setIsLoading] = useState(!isStudentView);

    const fetchSubmissions = useCallback(async () => {
        if (isStudentView) {
            setSubmissions(studentSubmissions || []);
            return;
        }
        if (homeworkId) {
            setIsLoading(true);
            try {
                const hwRes = await homeworkApi.get(`/${homeworkId}`);
                setHomeworkTitle(hwRes.data.data.title);

                const subRes = await submissionApi.get(`/${homeworkId}/submissions`);
                setSubmissions(subRes.data.data || []);
            } catch (error) {
                Swal.fire({ icon: 'error', title: '加载提交列表失败' });
            } finally {
                setIsLoading(false);
            }
        }
    }, [homeworkId, isStudentView, studentSubmissions]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleReturnSubmission = async (submissionId, studentName) => {
        const result = await Swal.fire({
            title: `确认退回 ${studentName} 的作业吗?`,
            text: "学生将可以重新修改并提交此作业。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '确认退回',
            cancelButtonText: '取消',
            confirmButtonColor: '#dc3545',
        });

        if (result.isConfirmed) {
            try {
                // 根据后端代码，这个API在HomeworkController里
                await homeworkApi.post(`/returnSubmission/${submissionId}`);
                Swal.fire({ icon: 'success', title: '操作成功', text: '该作业已被退回', timer: 1500, showConfirmButton: false });
                fetchSubmissions(); // 刷新列表以更新状态
            } catch (error) {
                Swal.fire({ icon: 'error', title: '操作失败' });
                console.error("Failed to return submission:", error);
            }
        }
    };

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <div className={styles.view}>
            {!isStudentView && (
                <div className={styles.viewHeader}>
                    <button onClick={onBack} className={`${styles.btn} ${styles.btnSecondary}`}>
                        <FontAwesomeIcon icon={faArrowLeft} /> 返回作业列表
                    </button>
                    <h2>{homeworkTitle} 的提交列表</h2>
                </div>
            )}

            <div className={styles.listContainer}>
                {submissions.length > 0 ? (
                    submissions.map(sub => (
                        <SubmissionCard
                            key={sub.id}
                            submission={sub}
                            isStudentView={isStudentView}
                            onReturn={handleReturnSubmission}
                            onEdit={onEditSubmission}
                            onOpenDiscussion={onOpenDiscussion}
                        />
                    ))
                ) : (
                    <p className={styles.placeholderText}>
                        {isStudentView ? '你还没有提交过任何作业' : '暂无学生提交'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SubmissionList;