// src/pages/Homework/components/PublishHomeworkModal.jsx (使用 Hook 的最终版)

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader'; // 1. 导入 Hook
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import { homeworkApi } from '../../../services/api';

import progressStyles from '../../Ware/components/NewItemModal.module.css';
import styles from '../HomeworkPage.module.css';

const PublishHomeworkModal = ({ isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);

    // 2. 调用 Hook，获取所有上传相关的状态和方法
    const {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress,
        setIsUploading,
        resetUploader
    } = useUploader();

    // 当模态框关闭时，重置上传器状态
    useEffect(() => {
        if (!isOpen) {
            resetUploader();
        }
    }, [isOpen, resetUploader]);

    const handleClose = () => {
        setTitle('');
        setContent('');
        setFiles([]);
        onClose(); // resetUploader 会在 useEffect 中被调用
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            Swal.fire({ icon: 'warning', title: '作业标题不能为空' });
            return;
        }

        try {
            // 3. 调用 Hook 的方法开始上传流程
            const { smallFiles, largeFileAttachmentIds } = await startUpload(files);

            // 剩下的业务逻辑保持不变
            updateFileProgress('form', { status: '提交作业信息...' });

            const dto = { title, content, attachmentUploadIds: largeFileAttachmentIds };
            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

            smallFiles.forEach(file => {
                updateFileProgress(file.name, { percent: 0, status: '上传中...' });
                formData.append('files', file);
            });

            await homeworkApi.post('/publish', formData, {
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    smallFiles.forEach(file => updateFileProgress(file.name, { percent, status: '上传中...' }));
                }
            });

            files.forEach(file => updateFileProgress(file.name, { percent: 100, status: '成功' }));

            Swal.fire({ icon: 'success', title: '作业发布成功!', timer: 1500, showConfirmButton: false });
            onSuccess();
            handleClose();

        } catch (error) {
            console.error("Failed during publish process:", error);
            Swal.fire({ icon: 'error', title: '发布失败', text: '请检查进度列表后重试。' });
        } finally {
            // 4. 手动设置 isUploading 为 false
            setIsUploading(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="发布新作业" size="large">
            <form onSubmit={handleSubmit}>
                {/* JSX 部分保持完全相同，它现在由 Hook 驱动 */}
                <div className={styles.formGroup}>
                    <label htmlFor="homework-title">作业标题</label>
                    <input
                        type="text" id="homework-title" required placeholder="请输入作业标题"
                        value={title} onChange={(e) => setTitle(e.target.value)}
                        disabled={isUploading}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="homework-content">作业内容</label>
                    <textarea
                        id="homework-content" rows="6" placeholder="请输入详细作业要求..."
                        value={content} onChange={(e) => setContent(e.target.value)}
                        disabled={isUploading}
                    ></textarea>
                </div>

                <div className={styles.formGroup}>
                    <label>附件上传</label>
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
                                        <div
                                            className={`${progressStyles.progressBarFg} ${prog.error ? progressStyles.barError : ''}`}
                                            style={{ width: `${prog.percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={styles.formActions}>
                    <button type="submit" className="btn btn-primary" disabled={isUploading || (!title.trim() && files.length === 0)}>
                        {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                        {isUploading ? ' 发布中...' : ' 立即发布'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PublishHomeworkModal;