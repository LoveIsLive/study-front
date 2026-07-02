import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import { submissionApi, attachApi } from '../../../services/api';
import { getFileIcon } from '../../../utils/helpers';

import progressStyles from '../../Ware/components/NewItemModal.module.css';
import styles from '../HomeworkPage.module.css';

const SubmissionModal = ({ isOpen, onClose, onSuccess, editingSubmission }) => {
    // 表单基础字段
    const [content, setContent] = useState('');

    // 附件管理状态
    const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [attachmentIdsToDelete, setAttachmentIdsToDelete] = useState([]);

    const {
        isUploading,
        uploadProgress,
        startUpload,
        setIsUploading,
        resetUploader
    } = useUploader(attachApi);

    const isEditMode = !!editingSubmission;

    useEffect(() => {
        if (isOpen && isEditMode) {
            setContent(editingSubmission.content || '');
            setExistingAttachments(editingSubmission.attachments || []);
        }
    }, [isOpen, isEditMode, editingSubmission]);

    const resetFormStates = () => {
        setContent('');
        setNewlyUploadedFiles([]);
        setExistingAttachments([]);
        setAttachmentIdsToDelete([]);
        resetUploader();
    };

    const handleClose = () => {
        resetFormStates();
        onClose();
    };

    const handleRemoveExistingAttachment = (attachmentId) => {
        setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
        setAttachmentIdsToDelete(prev => [...prev, attachmentId]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const { smallFiles, largeFileAttachmentIds } = await startUpload(newlyUploadedFiles);

            const dto = {
                homeworkId: editingSubmission.homework.id,
                content,
                attachmentUploadIds: largeFileAttachmentIds.map((f) => f.uploadId),
                attachmentIdsToDelete: attachmentIdsToDelete
            };

            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

            smallFiles.forEach(file => {
                formData.append('files', file);
            });

            await submissionApi.put(`/${editingSubmission.id}`, formData);

            Swal.fire({ icon: 'success', title: '修改成功!', timer: 1500, showConfirmButton: false });
            onSuccess();
            handleClose();

        } catch (error) {
            console.error("Failed to update submission:", error);
            Swal.fire({ icon: 'error', title: '保存失败', text: error.response?.data?.message || '服务器发生未知错误' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="修改作业提交" size="large">
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="submission-content">提交内容</label>
                    <textarea
                        id="submission-content" rows="6" placeholder="请输入详细作业要求..."
                        value={content} onChange={(e) => setContent(e.target.value)}
                        disabled={isUploading}
                    ></textarea>
                </div>

                {existingAttachments.length > 0 && (
                    <div className={styles.formGroup}>
                        <label>已有附件 (点击 <FontAwesomeIcon icon={faTimes} /> 可移除)</label>
                        <ul className={styles.existingAttachmentList}>
                            {existingAttachments.map(att => (
                                <li key={att.id}>
                                    <FontAwesomeIcon icon={getFileIcon(att.fileName).icon} className={getFileIcon(att.fileName).className} />
                                    <span>{att.fileName}</span>
                                    <button
                                        type="button"
                                        className={styles.deleteAttachmentBtn}
                                        onClick={() => handleRemoveExistingAttachment(att.id)}
                                        disabled={isUploading}
                                        title={`移除 ${att.fileName}`}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label>上传新附件</label>
                    {!isUploading && <FileUpload files={newlyUploadedFiles} onFilesChange={setNewlyUploadedFiles} />}
                </div>

                {(isUploading || Object.keys(uploadProgress).length > 0) && (
                    <div className={progressStyles.progressContainer}>
                        {newlyUploadedFiles.map(file => {
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
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isUploading}
                    >
                        {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                        {isUploading ? ' 保存中...' : ' 确认修改'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SubmissionModal;