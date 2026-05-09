import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderPlus, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';

import { wareApi } from '../../../services/api';
import { buildNewPath, fileMimeTypeName } from '../../../utils/helpers';
import { config } from '../../../utils/config';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';

// 必须导入对应的 CSS 模块
import styles from './NewItemModal.module.css';

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

const NewItemModal = ({ isOpen, onClose, currentPath, onSuccess }) => {
    const [view, setView] = useState('options'); // 'options', 'dir', 'upload'
    const [dirName, setDirName] = useState('');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    // 新增：用于管理上传进度
    const [uploadProgress, setUploadProgress] = useState({});
    // 使用 useRef 来存储当前的上传请求，以便在关闭模态框时取消（暂未实现取消，但预留位置）
    const abortControllersRef = useRef([]);

    const resetForm = () => {
        setView('options');
        setDirName('');
        setFiles([]);
        setIsProcessing(false);
        setUploadProgress({});
        abortControllersRef.current = [];
    };

    const handleClose = () => {
        // 实际项目中这里应该取消所有正在进行的请求
        resetForm();
        onClose();
    };

    // 更新单个文件的进度状态
    const updateFileProgress = (fileName, progressData) => {
        setUploadProgress(prev => ({
            ...prev,
            [fileName]: { ...(prev[fileName] || {}), ...progressData }
        }));
    };

    // --- 并发控制辅助函数 ---
    const executeConcurrent = async (tasks, limit) => {
        const results = [];
        const executing = [];
        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);
            if (limit <= tasks.length) {
                const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= limit) {
                    await Promise.race(executing);
                }
            }
        }
        return Promise.all(results);
    };

    // --- 小文件上传逻辑 ---
    const uploadSmallFile = async (file, destPath) => {
        updateFileProgress(file.name, { percent: 0, status: '上传中...' });
        const formData = new FormData();
        formData.append('path', destPath);
        formData.append('file', file);
        formData.append('mimeTypeName', fileMimeTypeName(file));

        try {
            await wareApi.post('/create/files', formData, {
                onUploadProgress: progressEvent => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    updateFileProgress(file.name, { percent, status: '上传中...' });
                }
            });
            updateFileProgress(file.name, { percent: 100, status: '成功' });

            // 新增：触发 AI 生成总结（异步，无需等待返回值）
            wareApi
                .post('/update/summary', null, {
                    params: { path: destPath, summary: 'AI分析中...' },
                })
                .catch((e) => console.error(e));
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            updateFileProgress(file.name, { percent: 0, status: '失败', error: true });
            throw error; // 继续抛出，以便 Promise.allSettled 捕获
        }
    };

    // --- 大文件分片上传逻辑 ---
    const uploadLargeFile = async (file, destPath) => {
        updateFileProgress(file.name, { percent: 0, status: '初始化...' });

        // 1. 初始化
        let uploadId;
        try {
            const initResponse = await wareApi.post('/chunk/init', {
                path: destPath,
                mimeTypeName: fileMimeTypeName(file)
            });
            uploadId = initResponse.data.data.uploadId;
        } catch (error) {
            updateFileProgress(file.name, { status: '初始化失败', error: true });
            throw error;
        }

        // 2. 准备分片任务
        const totalChunks = Math.ceil(file.size / LARGE_FILE_THRESHOLD);
        const chunkTasks = [];
        const progressMap = new Array(totalChunks).fill(0);

        for (let i = 0; i < totalChunks; i++) {
            chunkTasks.push(() => {
                const start = i * LARGE_FILE_THRESHOLD;
                const end = Math.min(start + LARGE_FILE_THRESHOLD, file.size);
                const chunk = file.slice(start, end);
                const formData = new FormData();
                formData.append('uploadId', uploadId);
                formData.append('chunkIndex', i);
                formData.append('totalChunks', totalChunks);
                formData.append('chunk', chunk);

                return wareApi.post('/chunk/upload', formData, {
                    onUploadProgress: progressEvent => {
                        progressMap[i] = progressEvent.loaded;
                        const totalLoaded = progressMap.reduce((acc, val) => acc + val, 0);
                        const percent = Math.round((totalLoaded * 100) / file.size);
                        updateFileProgress(file.name, { percent, status: `分片上传中 (${i + 1}/${totalChunks})` });
                    }
                });
            });
        }

        // 3. 并发上传分片
        try {
            await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY);
        } catch (error) {
            updateFileProgress(file.name, { status: '分片上传失败', error: true });
            throw error;
        }

        // 4. 合并文件
        updateFileProgress(file.name, { percent: 100, status: '合并中...' });
        try {
            const formData = new FormData();
            formData.append('uploadId', uploadId);
            formData.append('totalChunks', totalChunks);
            await wareApi.post('/chunk/merge', formData);
            // TODO: 超大文件会长时间等待
            updateFileProgress(file.name, { percent: 100, status: '成功' });

            // 新增：触发 AI 生成总结（异步，无需等待返回值）
            wareApi
                .post('/update/summary', null, {
                    params: { path: destPath, summary: 'AI分析中...' },
                })
                .catch((e) => console.error(e));
        } catch (error) {
            updateFileProgress(file.name, { status: '合并失败', error: true });
            throw error;
        }
    };

    // --- 主上传处理函数 ---
    const handleUploadFiles = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            Swal.fire({ icon: 'info', title: '请选择文件' });
            return;
        }

        setIsProcessing(true);
        setUploadProgress({}); // 重置进度

        // 为每个文件创建上传任务
        const uploadTasks = files.map(file => {
            const destPath = buildNewPath(currentPath, file.name);
            // 根据文件大小选择上传策略
            if (file.size <= LARGE_FILE_THRESHOLD) {
                return uploadSmallFile(file, destPath);
            } else {
                return uploadLargeFile(file, destPath);
            }
        });

        // 并发执行所有文件的上传任务，并等待全部完成（无论成功或失败）
        const results = await Promise.allSettled(uploadTasks);

        const failedCount = results.filter(r => r.status === 'rejected').length;

        setIsProcessing(false);

        if (failedCount === 0) {
            Swal.fire({ icon: 'success', title: '所有文件上传成功', timer: 1500, showConfirmButton: false });
            onSuccess(); // 刷新父页面的文件列表
            handleClose(); // 关闭模态框
        } else if (failedCount === files.length) {
            Swal.fire({ icon: 'error', title: '所有文件上传失败' });
        } else {
            Swal.fire({ icon: 'warning', title: `部分文件上传失败 (${failedCount}/${files.length})`, text: '请检查进度列表。' });
            onSuccess(); // 刷新列表以显示成功上传的文件
            // 不关闭模态框，让用户看到哪些失败了
        }
    };

    const handleCreateDir = async (e) => {
        e.preventDefault();
        if (!dirName.trim()) return;
        setIsProcessing(true);
        try {
            const path = buildNewPath(currentPath, dirName);
            await wareApi.post('/create/directories', null, { params: { path } });
            Swal.fire({ icon: 'success', title: '目录创建成功', timer: 1500, showConfirmButton: false });
            onSuccess();
            handleClose();
        } catch (error) {
            Swal.fire({ icon: 'error', title: '创建失败', text: error.response?.data?.message || '服务器错误' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="新建">
            {view === 'options' && (
                <div className={styles.newItemOptions}>
                    <button className={styles.optionBtn} onClick={() => setView('dir')}>
                        <FontAwesomeIcon icon={faFolderPlus} />
                        <span>新建目录</span>
                    </button>
                    <button className={styles.optionBtn} onClick={() => setView('upload')}>
                        <FontAwesomeIcon icon={faFileUpload} />
                        <span>上传文件</span>
                    </button>
                </div>
            )}

            {view === 'dir' && (
                <form onSubmit={handleCreateDir} className={styles.formContainer}>
                    <h3 className={styles.formSubtitle}>新建目录</h3>
                    <input
                        type="text"
                        placeholder="目录名称"
                        value={dirName}
                        onChange={(e) => setDirName(e.target.value)}
                        required
                        autoFocus
                        className={styles.dirInput}
                        disabled={isProcessing}
                    />
                    <div className={styles.formActions}>
                        <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                            {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> 创建中...</> : '创建'}
                        </button>
                    </div>
                </form>
            )}

            {view === 'upload' && (
                <form onSubmit={handleUploadFiles} className={styles.formContainer}>
                    <h3 className={styles.formSubtitle}>上传文件</h3>
                    {/* 上传过程中禁用文件选择 */}
                    {!isProcessing && <FileUpload files={files} onFilesChange={setFiles} />}

                    {/* --- 上传进度展示区域 --- */}
                    {(isProcessing || Object.keys(uploadProgress).length > 0) && (
                        <div className={styles.progressContainer}>
                            {files.map(file => {
                                const prog = uploadProgress[file.name] || { percent: 0, status: '等待中...' };
                                const statusClass = prog.error ? styles.statusError : (prog.percent === 100 ? styles.statusSuccess : '');
                                return (
                                    <div key={file.name} className={styles.progressItem}>
                                        <div className={styles.progressInfo}>
                                            <span className={styles.progressFileName}>{file.name}</span>
                                            <span className={`${styles.progressStatus} ${statusClass}`}>{prog.status}</span>
                                        </div>
                                        <div className={styles.progressBarBg}>
                                            <div
                                                className={`${styles.progressBarFg} ${prog.error ? styles.barError : ''}`}
                                                style={{ width: `${prog.percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className={styles.formActions}>
                        <button type="submit" className="btn btn-primary" disabled={isProcessing || files.length === 0}>
                            {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> 上传中...</> : '立即上传'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default NewItemModal;