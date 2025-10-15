import React, { useState, useEffect } from 'react';
import { submissionApi, homeworkApi } from '../../../services/api';
import Spinner from '../../../components/common/Spinner/Spinner';
import SubmissionCard from './SubmissionCard';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';


const SubmissionList = ({ homeworkId, onBack, isStudentView = false, submissions: studentSubmissions }) => {
    const [submissions, setSubmissions] = useState([]);
    const [homeworkTitle, setHomeworkTitle] = useState('');
    const [isLoading, setIsLoading] = useState(!isStudentView);

    useEffect(() => {
        if (isStudentView) {
            setSubmissions(studentSubmissions || []);
        } else if (homeworkId) {
            const fetchSubmissions = async () => {
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
            };
            fetchSubmissions();
        }
    }, [homeworkId, isStudentView, studentSubmissions]);

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
                        <SubmissionCard key={sub.id} submission={sub} isStudentView={isStudentView} />
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