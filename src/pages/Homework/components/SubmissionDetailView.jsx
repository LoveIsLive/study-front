// src/pages/Homework/components/SubmissionDetailView.jsx (最终修正版)

import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faCheck, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader';
import { homeworkApi, submissionApi } from '../../../services/api';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import Spinner from '../../../components/common/Spinner/Spinner';

import progressStyles from '../../Ware/components/NewItemModal.module.css';
import styles from '../HomeworkPage.module.css';

const SubmissionDetailView = ({ homeworkId, onBack }) => {
    const [homework, setHomework] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);

    const {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress,
        setIsUploading,
        resetUploader
    } = useUploader();

    // --- 关键修正部分 ---
    // 1. fetchData 不再需要 useCallback 包装，因为它只在 useEffect 内部被调用。
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const hwRes = await homeworkApi.get(`/${homeworkId}`);
            setHomework(hwRes.data.data);
            try {
                const subRes = await submissionApi.get(`/student/${homeworkId}/submission`);
                setSubmission(subRes.data.data);
            } catch (error) {
                if (error.response?.status !== 404) throw error;
                setSubmission(null);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业详情失败' });
        } finally {
            setIsLoading(false);
        }
    };

    // 2. useEffect 直接依赖于 homeworkId。
    //    这样，只有当 homeworkId 真正发生变化时（例如从一个作业详情页切换到另一个），
    //    才会重新获取数据，同时也保证了组件首次加载时一定会执行。
    useEffect(() => {
        fetchData();
    }, [homeworkId]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const { smallFiles, largeFileAttachmentIds } = await startUpload(files);

            updateFileProgress('form', { status: '提交作业...' });
            const dto = { homeworkId, content, attachmentUploadIds: largeFileAttachmentIds };
            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

            smallFiles.forEach(file => {
                updateFileProgress(file.name, { percent: 0, status: '上传中...' });
                formData.append('files', file);
            });

            await submissionApi.post('/submit', formData, {
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    smallFiles.forEach(file => updateFileProgress(file.name, { percent, status: '上传中...' }));
                }
            });

            files.forEach(file => updateFileProgress(file.name, { percent: 100, status: '成功' }));
            Swal.fire({ icon: 'success', title: '作业提交成功!', timer: 1500, showConfirmButton: false });
            resetUploader();
            fetchData();

        } catch (error) {
            console.error("Failed during submission:", error);
            Swal.fire({ icon: 'error', title: '提交失败', text: '请检查进度列表后重试。' });
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <Spinner />;
    if (!homework) return <p>作业加载失败或不存在。</p>;

    return (
        <div className={styles.view}>
            <div className={styles.viewHeader}>
                <button onClick={onBack} className={`${styles.btn} ${styles.btnSecondary}`}>
                    <FontAwesomeIcon icon={faArrowLeft} /> 返回作业列表
                </button>
                <h2>{homework.title}</h2>
            </div>

            {submission ? (
                <div className={styles.submissionDetailCard}>
                    <h3>我的提交</h3>
                    <p><strong>提交内容:</strong></p>
                    <p dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) || '<i>无提交内容</i>' }} />
                    <br />
                    <AttachmentList attachments={submission.attachments} />
                </div>
            ) : (
                <div>
                    <div className={styles.homeworkDetailCard}>
                        <div className={styles.detailCardHeader}>
                            <h3><FontAwesomeIcon icon={faBookOpen} /> 作业详情</h3>
                            <div className={styles.cardMeta}>
                                发布者: {homework.teacherName || '未知教师'} <br />
                                发布于: {new Date(homework.createTime).toLocaleString('zh-CN')}
                            </div>
                        </div>
                        <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(homework.content) || '<i>教师没有填写具体内容。</i>' }} />
                        <AttachmentList attachments={homework.attachments} />
                    </div>
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