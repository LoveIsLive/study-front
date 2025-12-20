import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import { homeworkApi, attachApi } from '../../../services/api';
import { getFileIcon } from '../../../utils/helpers';

import progressStyles from '../../Ware/components/NewItemModal.module.css';
import styles from '../HomeworkPage.module.css';

// 接收一个新的 prop: editingHomework
const HomeworkModal = ({ isOpen, onClose, onSuccess, editingHomework }) => {
    // 表单基础字段
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // 附件管理状态
    const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]); // 存储通过 FileUpload 组件新选择的文件
    const [existingAttachments, setExistingAttachments] = useState([]); // 编辑模式下，已存在的附件
    const [attachmentIdsToDelete, setAttachmentIdsToDelete] = useState([]); // 编辑模式下，标记要删除的附件ID

    // 调用自定义的上传 Hook
    const {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress,
        setIsUploading,
        resetUploader
    } = useUploader(attachApi);

    // 判断当前是创建模式还是编辑模式
    const isEditMode = !!editingHomework;

    // Effect: 当模态框打开时，根据模式初始化表单数据
    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                // 编辑模式：填充已有数据
                setTitle(editingHomework.title || '');
                setContent(editingHomework.content || '');
                setExistingAttachments(editingHomework.attachments || []);
            } else {
                // 创建模式：确保所有状态都是空的
                resetFormStates();
            }
        }
    }, [isOpen, isEditMode, editingHomework]);

    // 重置所有组件内部状态的函数
    const resetFormStates = () => {
        setTitle('');
        setContent('');
        setNewlyUploadedFiles([]);
        setExistingAttachments([]);
        setAttachmentIdsToDelete([]);
        resetUploader(); // 重置上传 Hook 的状态
    };

    // 关闭模态框时的处理函数
    const handleClose = () => {
        resetFormStates();
        onClose();
    };

    // 处理删除已有附件的点击事件
    const handleRemoveExistingAttachment = (attachmentId) => {
        // 从显示的列表中移除该附件
        setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
        // 将该附件的 ID 添加到待删除列表中
        setAttachmentIdsToDelete(prev => [...prev, attachmentId]);
    };

    // 表单提交处理函数
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            Swal.fire({ icon: 'warning', title: '作业标题不能为空' });
            return;
        }

        try {
            // 1. 调用上传 Hook 处理新选择的文件（大文件分片上传）
            const { smallFiles, largeFileAttachmentIds } = await startUpload(newlyUploadedFiles);

            // 2. 准备要发送给后端的 DTO
            const dto = {
                title,
                content,
                attachmentUploadIds: largeFileAttachmentIds, // 新上传的大文件ID
                attachmentIdsToDelete: attachmentIdsToDelete // 标记要删除的旧文件ID
            };

            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

            // 3. 将新上传的小文件附加到 FormData 中
            smallFiles.forEach(file => {
                formData.append('files', file);
            });

            // 4. 根据模式（编辑/创建）调用不同的 API 接口
            if (isEditMode) {
                await homeworkApi.put(`/${editingHomework.id}`, formData);
            } else {
                await homeworkApi.post('/publish', formData);
            }

            // 5. 显示成功提示，并执行回调
            Swal.fire({ icon: 'success', title: '保存成功!', timer: 1500, showConfirmButton: false });
            onSuccess(); // 通知父组件刷新列表
            handleClose(); // 关闭并重置模态框

        } catch (error) {
            console.error("Failed to save homework:", error);
            Swal.fire({ icon: 'error', title: '保存失败', text: error.response?.data?.message || '服务器发生未知错误' });
        } finally {
            // 6. 无论成功失败，最终都将上传状态设置为 false
            setIsUploading(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title={isEditMode ? '修改作业' : '发布新作业'} size="large">
            <form onSubmit={handleSubmit}>
                {/* --- 作业标题和内容输入框 --- */}
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

                {/* --- 编辑模式下显示“已有附件”列表 --- */}
                {isEditMode && existingAttachments.length > 0 && (
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

                {/* --- 上传新附件区域 --- */}
                <div className={styles.formGroup}>
                    <label>{isEditMode ? '上传新附件' : '附件上传'}</label>
                    {!isUploading && <FileUpload files={newlyUploadedFiles} onFilesChange={setNewlyUploadedFiles} />}
                </div>

                {/* --- 上传进度条显示区域 --- */}
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

                {/* --- 表单操作按钮 --- */}
                <div className={styles.formActions}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isUploading || !title.trim()}
                    >
                        {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                        {isUploading ? ' 保存中...' : (isEditMode ? ' 确认修改' : ' 立即发布')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default HomeworkModal;