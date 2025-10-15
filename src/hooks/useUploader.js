// src/hooks/useUploader.js (新文件)

import { useState, useCallback } from 'react';
import { attachApi } from '../services/api';
import { config } from '../utils/config';
import { fileMimeTypeName } from '../utils/helpers';

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

// --- 并发控制辅助函数 (现在是 Hook 的一部分) ---
const executeConcurrent = async (tasks, limit) => {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (limit > 0 && limit <= tasks.length) {
            const e = p.finally(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
};


export const useUploader = () => {
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    const updateFileProgress = useCallback((fileName, progressData) => {
        setUploadProgress(prev => ({
            ...prev,
            [fileName]: { ...(prev[fileName] || {}), ...progressData }
        }));
    }, []);

    const resetUploader = useCallback(() => {
        setUploadProgress({});
        setIsUploading(false);
    }, []);

    // --- 大文件分片上传逻辑 ---
    const uploadLargeFile = useCallback(async (file) => {
        updateFileProgress(file.name, { percent: 0, status: '初始化...' });

        let uploadId;
        try {
            const initResponse = await attachApi.post('/upload/batch-init', {
                files: [{ fileName: file.name, fileSize: file.size, mimeTypeName: fileMimeTypeName(file) }]
            });
            uploadId = initResponse.data.data[0]?.uploadId;
            if (!uploadId) throw new Error("Initialization failed.");
        } catch (error) {
            updateFileProgress(file.name, { status: '初始化失败', error: true });
            throw error;
        }

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

                return attachApi.post('/upload/chunk', formData, {
                    onUploadProgress: progressEvent => {
                        progressMap[i] = progressEvent.loaded;
                        const totalLoaded = progressMap.reduce((acc, val) => acc + val, 0);
                        const percent = Math.round((totalLoaded * 100) / file.size);
                        updateFileProgress(file.name, { percent, status: `分片上传中 (${i + 1}/${totalChunks})` });
                    }
                });
            });
        }

        try {
            await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY);
        } catch (error) {
            updateFileProgress(file.name, { status: '分片上传失败', error: true });
            throw error;
        }

        updateFileProgress(file.name, { percent: 100, status: '正在合并文件，请稍候...' });
        try {
            const mergeFormData = new FormData();
            mergeFormData.append('uploadId', uploadId);
            mergeFormData.append('totalChunks', totalChunks);
            await attachApi.post('/upload/merge', mergeFormData);
            updateFileProgress(file.name, { percent: 100, status: '成功' });
        } catch (error) {
            updateFileProgress(file.name, { status: '合并失败', error: true });
            throw error;
        }

        return uploadId;
    }, [updateFileProgress]);

    // --- 主上传流程编排函数 ---
    const startUpload = useCallback(async (files) => {
        if (!files || files.length === 0) {
            return { smallFiles: [], largeFileAttachmentIds: [] };
        }

        setIsUploading(true);
        setUploadProgress({});

        const smallFiles = files.filter(f => f.size <= LARGE_FILE_THRESHOLD);
        const largeFiles = files.filter(f => f.size > LARGE_FILE_THRESHOLD);

        const largeFileAttachmentIds = [];
        // 使用 for...of 保证大文件按顺序上传，避免并发问题
        for (const file of largeFiles) {
            const uploadId = await uploadLargeFile(file);
            largeFileAttachmentIds.push(uploadId);
        }

        return { smallFiles, largeFileAttachmentIds };

    }, [uploadLargeFile]);

    return {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress, // 暴露出来以便处理小文件进度
        setIsUploading, // 暴露出来以便在外部流程结束后重置
        resetUploader
    };
};