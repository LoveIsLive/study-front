import React, { useState } from 'react';
import Swal from 'sweetalert2';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import { homeworkApi } from '../../../services/api';
// 假设你有一个文件上传服务
import { uploadFiles } from '../../../services/uploadService';
import styles from '../HomeworkPage.module.css';

const PublishHomeworkModal = ({ isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});

    const resetForm = () => {
        setTitle('');
        setContent('');
        setFiles([]);
        setIsUploading(false);
        setUploadProgress({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            Swal.fire({ icon: 'warning', title: '作业标题不能为空' });
            return;
        }

        setIsUploading(true);

        try {
            // 使用通用的文件上传服务
            const uploadResults = await uploadFiles(files, setUploadProgress);

            const dto = {
                title,
                content,
                attachmentUploadIds: uploadResults.largeFileAttachmentIds
            };

            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
            uploadResults.smallFiles.forEach(file => {
                formData.append('files', file);
            });

            await homeworkApi.post('/publish', formData);

            Swal.fire({ icon: 'success', title: '作业发布成功!' });
            onSuccess();
            handleClose();

        } catch (error) {
            console.error("Failed to publish homework:", error);
            Swal.fire({ icon: 'error', title: '发布失败', text: '请稍后重试' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="发布新作业" size="large">
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="homework-title">作业标题</label>
                    <input
                        type="text"
                        id="homework-title"
                        required
                        placeholder="请输入作业标题"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="homework-content">作业内容</label>
                    <textarea
                        id="homework-content"
                        rows="6"
                        placeholder="请输入详细作业要求..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    ></textarea>
                </div>
                <div className={styles.formGroup}>
                    <label>附件上传</label>
                    <FileUpload files={files} onFilesChange={setFiles} />
                </div>

                {isUploading && (
                    <div className="upload-progress-container">
                        {Object.entries(uploadProgress).map(([fileName, progress]) => (
                            <div key={fileName} className="progress-item">
                                <p>{fileName} - {progress.status}</p>
                                <div className="progress-bar">
                                    <div className="progress-bar-inner" style={{ width: `${progress.percent}%` }}>
                                        {progress.percent}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.formActions}>
                    <button type="submit" className={styles.btnPrimary} disabled={isUploading}>
                        {isUploading ? <><i className="fas fa-spinner fa-spin"></i> 发布中...</> : <><i className="fas fa-paper-plane"></i> 立即发布</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PublishHomeworkModal;