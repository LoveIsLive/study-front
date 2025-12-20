import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
    faEdit, faInfoCircle,
    faCheckCircle, faExclamationTriangle, faTimesCircle, faBookOpen, faCheck, faSpinner, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader';
import { homeworkApi, submissionApi, attachApi } from '../../../services/api';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import DiscussionBoard from './Discussion/DiscussionBoard';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import Spinner from '../../../components/common/Spinner/Spinner';

import progressStyles from '../../Ware/components/NewItemModal.module.css';
import styles from '../HomeworkPage.module.css';

// 状态显示辅助函数 (匹配中文状态)
const getStatusInfo = (status) => {
    switch (status) {
        case '被退回':
            return { text: '被退回', className: styles.statusReturned, icon: faTimesCircle };
        case '作业有更新':
            return { text: '作业有更新', className: styles.statusUpdated, icon: faExclamationTriangle };
        case '重新提交':
            return { text: '重新提交', className: styles.statusResubmitted, icon: faCheckCircle };
        case '已提交':
        default:
            return { text: '已提交', className: styles.statusSubmitted, icon: faInfoCircle };
    }
};

const SubmissionDetailView = ({ homeworkId, onBack, onEditSubmission, refreshTrigger }) => {
    const [homework, setHomework] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);

    const {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress, // 保留以备将来更复杂的进度处理
        setIsUploading,
        resetUploader
    } = useUploader(attachApi);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 获取作业本身的详细信息
            const hwRes = await homeworkApi.get(`/${homeworkId}`);
            setHomework(hwRes.data.data);
            try {
                // 尝试获取学生对此作业的提交记录
                const subRes = await submissionApi.get(`/student/${homeworkId}/submission`);
                setSubmission(subRes.data.data);
            } catch (error) {
                // 如果返回404，说明学生还未提交，这是正常情况
                if (error.response?.status !== 404) throw error;
                setSubmission(null);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业详情失败' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [homeworkId, refreshTrigger]);

    // 处理首次提交作业的函数
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const { smallFiles, largeFileAttachmentIds } = await startUpload(files);

            const dto = { homeworkId, content, attachmentUploadIds: largeFileAttachmentIds };
            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

            smallFiles.forEach(file => {
                formData.append('files', file);
            });

            await submissionApi.post('/submit', formData);

            Swal.fire({ icon: 'success', title: '作业提交成功!', timer: 1500, showConfirmButton: false });
            resetUploader();
            fetchData(); // 成功后重新加载数据，显示已提交的视图

        } catch (error) {
            console.error("Failed during submission:", error);
            Swal.fire({ icon: 'error', title: '提交失败', text: '请检查网络后重试。' });
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <Spinner />;
    if (!homework) return <p className={styles.placeholderText}>作业加载失败或不存在。</p>;

    const statusInfo = submission ? getStatusInfo(submission.status) : null;
    const cardClasses = submission ? `${styles.submissionDetailCard} ${styles.statusRibbon} ${statusInfo.className}` : styles.submissionDetailCard;

    return (
        <div className={styles.view}>
            <div className={styles.viewHeader}>
                <button onClick={onBack} className={`${styles.btn} ${styles.btnPrimary}`}>
                    <FontAwesomeIcon icon={faArrowLeft} /> 返回作业列表
                </button>
                <h2>{homework.title}</h2>
            </div>

            <div className={styles.homeworkDetailCard}>
                <div className={styles.detailCardHeader}>
                    <h3><FontAwesomeIcon icon={faBookOpen} /> 作业详情</h3>
                    <div className={styles.cardMeta}>
                        发布者: {homework.teacherName || '未知教师'} <br />
                        修改日期: {new Date(homework.updateTime).toLocaleString('zh-CN')}
                    </div>
                </div>
                <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(homework.content) || '<i>教师没有填写具体内容。</i>' }} />
                <AttachmentList attachments={homework.attachments} />
            </div>

            {/* --- 作业公共讨论区 --- */}
            <div className={styles.submissionFormCard} style={{ marginTop: '2rem' }}>
                <h3>公共讨论区</h3>
                <DiscussionBoard ownerId={homeworkId} ownerType="homework" />
            </div>

            {submission ? (
                // --- 已提交作业的视图 ---
                <div className={cardClasses}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h3>我的提交</h3>
                            <div className={`${styles.statusTag} ${statusInfo.className}`}>
                                <FontAwesomeIcon icon={statusInfo.icon} />
                                <span>{statusInfo.text}</span>
                            </div>
                        </div>
                        <div className={styles.cardMeta}>
                            提交者: {submission.studentName} <br />
                            修改时间: {new Date(submission.updateTime).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                    <p><strong>提交内容:</strong></p>
                    <p dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) || '<i>无提交内容</i>' }} />
                    <br />
                    <AttachmentList attachments={submission.attachments} />

                    {/* 如果作业状态为“被退回”，则显示修改按钮 */}
                    {(submission.status === '被退回' || submission.status === '作业有更新') && (
                        <div className={styles.cardFooter}>
                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => onEditSubmission(submission)}
                            >
                                <FontAwesomeIcon icon={faEdit} /> 修改提交
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // --- 首次提交作业的视图 ---
                <div>
                    <div className={styles.submissionFormCard}>
                        <h3>提交作业</h3>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="submission-content">提交内容 (选填)</label>
                                <textarea id="submission-content" rows="5" placeholder="可以在此输入文本内容..."
                                    value={content} onChange={(e) => setContent(e.target.value)} disabled={isUploading} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>附件</label>
                                {!isUploading && <FileUpload files={files} onFilesChange={setFiles} />}
                            </div>

                            {(isUploading || Object.keys(uploadProgress).length > 0) && (
                                <div className={progressStyles.progressContainer}>
                                    {files.map(file => {
                                        const prog = uploadProgress[file.name] || { percent: 0, status: '等待中...' };
                                        const statusClass = prog.error ? progressStyles.statusError : (prog.status === '成功' ? progressStyles.statusSuccess : '');
                                        return (
                                            <div key={file.name} className={progressStyles.progressItem}>
                                                <div className={progressStyles.progressInfo}>
                                                    <span className={progressStyles.progressFileName}>{file.name}</span>
                                                    <span className={`${progressStyles.progressStatus} ${statusClass}`}>{prog.status}</span>
                                                </div>
                                                <div className={progressStyles.progressBarBg}>
                                                    <div className={`${progressStyles.progressBarFg} ${prog.error ? progressStyles.barError : ''}`}
                                                        style={{ width: `${prog.percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button type="submit" className="btn btn-primary" disabled={isUploading || (!content.trim() && files.length === 0)}>
                                    {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                                    {isUploading ? ' 正在提交...' : ' 确认提交'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionDetailView;