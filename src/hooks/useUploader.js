// src/hooks/useUploader.js

import { useState, useCallback } from 'react';
import { config } from '../utils/config';
import { fileMimeTypeName } from '../utils/helpers';

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

// --- 并发控制辅助函数 (用于单个文件内部的分片并发) ---
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

export const useUploader = (apiClient) => {
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    // 更新单个文件的进度状态
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

    /**
     * 单个大文件处理逻辑：分片上传 -> 合并
     * 注：此函数不再负责初始化，只负责拿到 uploadId 后的传输工作
     */
    const processLargeFile = useCallback(async (file, uploadId) => {
        updateFileProgress(file.name, { percent: 0, status: '准备分片上传...' });

        const totalChunks = Math.ceil(file.size / LARGE_FILE_THRESHOLD);
        const chunkTasks = [];
        const progressMap = new Array(totalChunks).fill(0);

        // 1. 构建分片任务
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

                return apiClient.post('/upload/chunk', formData, {
                    onUploadProgress: progressEvent => {
                        if (progressEvent.lengthComputable) {
                            progressMap[i] = progressEvent.loaded;
                            const totalLoaded = progressMap.reduce((acc, val) => acc + val, 0);
                            const percent = Math.round((totalLoaded * 100) / file.size);
                            // 只有当进度变化明显时才更新状态，避免 React 渲染过于频繁（可选优化）
                            updateFileProgress(file.name, { percent, status: `上传中 (${percent}%)` });
                        }
                    }
                });
            });
        }

        // 2. 执行分片上传 (受配置的并发数限制)
        try {
            await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY);
        } catch (error) {
            updateFileProgress(file.name, { status: '分片上传失败', error: true });
            throw error;
        }

        // 3. 合并文件
        updateFileProgress(file.name, { percent: 100, status: '正在校验合并...' });
        try {
            const mergeFormData = new FormData();
            mergeFormData.append('uploadId', uploadId);
            mergeFormData.append('totalChunks', totalChunks);
            await apiClient.post('/upload/merge', mergeFormData);
            updateFileProgress(file.name, { percent: 100, status: '成功' });
        } catch (error) {
            updateFileProgress(file.name, { status: '合并失败', error: true });
            throw error;
        }

        return uploadId;
    }, [apiClient, updateFileProgress]);

    // --- 主流程 ---
    const startUpload = useCallback(async (files) => {
        if (!files || files.length === 0) {
            return { smallFiles: [], largeFileAttachmentIds: [] };
        }

        if (!apiClient) {
            throw new Error("useUploader: apiClient is required.");
        }

        setIsUploading(true);
        setUploadProgress({}); // 重置旧进度

        const smallFiles = [];
        const largeFiles = [];

        // 1. 文件筛选
        for (const file of files) {
            if (file.size <= LARGE_FILE_THRESHOLD) {
                smallFiles.push(file);
            } else {
                largeFiles.push(file);
            }
        }

        // 如果没有大文件，直接返回
        if (largeFiles.length === 0) {
            return { smallFiles, largeFileAttachmentIds: [] };
        }

        // 2. 批量初始化 (Batch Init)
        // 优化：一次网络请求完成所有大文件的 ID 获取
        let uploadTasks = [];

        try {
            largeFiles.forEach(f => updateFileProgress(f.name, { percent: 0, status: '初始化...' }));

            const initPayload = largeFiles.map(f => ({
                fileName: f.name,
                fileSize: f.size,
                mimeTypeName: fileMimeTypeName(f)
            }));

            // 调用后端接口
            const initResponse = await apiClient.post('/upload/batch-init', {
                files: initPayload
            });

            // 解析后端结果: List<UploadInitResult>
            // 结构: [{ originalFileName: "a.mp4", uploadId: "..." }, ...]
            const initResults = initResponse.data?.data;

            if (!Array.isArray(initResults)) {
                throw new Error("Batch init response format invalid");
            }

            // 3. 构建上传任务列表
            // 使用 Map 提高查找效率，通过 originalFileName 匹配文件
            const resultMap = new Map(initResults.map(r => [r.originalFileName, r.uploadId]));

            uploadTasks = largeFiles.map(file => {
                const uploadId = resultMap.get(file.name);

                if (!uploadId) {
                    const err = new Error(`Initialization failed for ${file.name}`);
                    updateFileProgress(file.name, { status: '初始化失败', error: true });
                    return Promise.reject(err);
                }

                // 返回该文件的上传 Promise
                return processLargeFile(file, uploadId);
            });

        } catch (error) {
            console.error("Batch initialization failed", error);
            largeFiles.forEach(f => updateFileProgress(f.name, { status: '初始化失败', error: true }));
            setIsUploading(false);
            throw error;
        }

        // 4. 并发执行所有大文件的上传
        // 优化：使用 Promise.all 替代 for...of，所有文件同时开始跑
        try {
            const largeFileAttachmentIds = await Promise.all(uploadTasks);

            // 如果需要，可以在这里处理 setIsUploading(false)，或者留给外部调用者处理
            return { smallFiles, largeFileAttachmentIds };
        } catch (error) {
            // Promise.all 会在任何一个文件失败时 reject。
            // 具体的单个文件错误状态已在 processLargeFile 中更新到 uploadProgress
            throw error;
        }

    }, [apiClient, processLargeFile, updateFileProgress]);

    return {
        uploadProgress,
        isUploading,
        startUpload,
        updateFileProgress, // 暴露给小文件上传逻辑使用
        setIsUploading,
        resetUploader
    };
};