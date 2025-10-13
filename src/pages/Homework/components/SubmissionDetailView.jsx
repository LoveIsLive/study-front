import React, { useState, useEffect, useCallback } from 'react';
import { homeworkApi, submissionApi } from '../../../services/api';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import Spinner from '../../../components/common/Spinner/Spinner';
import { uploadFiles } from '../../../services/uploadService';
import styles from '../HomeworkPage.module.css';
import Swal from 'sweetalert2';

const SubmissionDetailView = ({ homeworkId, onBack }) => {
    const [homework, setHomework] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const hwRes = await homeworkApi.get(`/${homeworkId}`);
            setHomework(hwRes.data.data);

            try {
                const subRes = await submissionApi.get(`/student/${homeworkId}/submission`);
                setSubmission(subRes.data.data);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    setSubmission(null); // 404表示未提交，是正常情况
                } else {
                    throw error;
                }
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载作业详情失败' });
        } finally {
            setIsLoading(false);
        }
    }, [homeworkId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const uploadResults = await uploadFiles(files, setUploadProgress);
            const dto = {
                homeworkId,
                content,
                attachmentUploadIds: uploadResults.largeFileAttachmentIds
            };

            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
            uploadResults.smallFiles.forEach(file => {
                formData.append('files', file);
            });

            await submissionApi.post('/submit', formData);
            Swal.fire({ icon: 'success', title: '作业提交成功!' });
            fetchData(); // 重新加载数据以显示已提交内容

        } catch (error) {
            Swal.fire({ icon: 'error', title: '提交失败' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <Spinner />;
    if (!homework) return <p>作业加载失败或不存在。</p>;

    return (
        <div className={styles.view}>
            <div className={styles.viewHeader}>
                <button onClick={onBack} className={styles.btnSecondary}><i className="fas fa-arrow-left"></i> 返回作业列表</button>
                <h2>{homework.title}</h2>
            </div>

            {submission ? (
                // 已提交视图
                <div className={styles.submissionDetailCard}>
                    <h3>我的提交</h3>
                    <p><strong>提交内容:</strong></p>
                    <p dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) || '<i>无提交内容</i>' }} />
                    <br />
                    <AttachmentList attachments={submission.attachments} />
                </div>
            ) : (
                // 未提交视图（包含作业详情和提交表单）
                <div>
                    <div className={styles.homeworkDetailCard}>
                        <div className={styles.detailCardHeader}>
                            <h3><i className="fas fa-book-open"></i> 作业详情</h3>
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
                                <textarea
                                    id="submission-content"
                                    rows="5"
                                    placeholder="可以在此输入文本内容..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                ></textarea>
                            </div>
                            <div className={styles.formGroup}>
                                <label>附件</label>
                                <FileUpload files={files} onFilesChange={setFiles} />
                            </div>

                            {isSubmitting && (
                                <div className="upload-progress-container">
                                    {/* 进度条UI */}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> 正在提交...</> : <><i className="fas fa-check"></i> 确认提交</>}
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