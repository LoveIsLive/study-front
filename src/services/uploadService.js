import { attachApi } from './api';
import { config } from '../utils/config';

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

// 并发控制器
const executeConcurrent = async (tasks, limit, onProgress) => {
    const results = [];
    const executing = [];
    let completed = 0;
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task.action());
        results.push(p);

        if (onProgress) {
            p.then(() => {
                completed++;
                onProgress(completed, tasks.length, task.chunkIndex);
            });
        }

        if (limit > 0) {
            const e = p.finally(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
};

// 分片上传单个大文件
const uploadFileInChunks = async (file, updateProgress) => {
    updateProgress(file.name, { percent: 0, status: '初始化...' });

    // 1. 初始化
    const initResponse = await attachApi.post('/upload/batch-init', {
        files: [{ fileName: file.name, fileSize: file.size, mimeTypeName: file.type }]
    });
    const { uploadId } = initResponse.data.data[0];
    if (!uploadId) throw new Error('Failed to initialize chunk upload.');

    // 2. 创建分片任务
    const totalChunks = Math.ceil(file.size / LARGE_FILE_THRESHOLD);
    const chunkTasks = [];
    for (let i = 0; i < totalChunks; i++) {
        const start = i * LARGE_FILE_THRESHOLD;
        const end = Math.min(start + LARGE_FILE_THRESHOLD, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('chunk', chunk);

        chunkTasks.push({
            chunkIndex: i,
            action: () => attachApi.post('/upload/chunk', formData)
        });
    }

    // 3. 并发上传
    const onChunkProgress = (completed) => {
        const percent = Math.round((completed * 100) / totalChunks);
        updateProgress(file.name, { percent, status: `上传中 ${completed}/${totalChunks}` });
    };
    await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY, onChunkProgress);

    // 4. 合并
    updateProgress(file.name, { percent: 100, status: '合并中...' });
    const mergeFormData = new FormData();
    mergeFormData.append('uploadId', uploadId);
    mergeFormData.append('totalChunks', totalChunks);
    await attachApi.post('/upload/merge', mergeFormData);

    updateProgress(file.name, { percent: 100, status: '完成' });
    return uploadId;
};

// 主上传函数
export const uploadFiles = async (files, setProgress) => {
    if (!files || files.length === 0) {
        return { smallFiles: [], largeFileAttachmentIds: [] };
    }

    const smallFiles = files.filter(f => f.size <= LARGE_FILE_THRESHOLD);
    const largeFiles = files.filter(f => f.size > LARGE_FILE_THRESHOLD);

    const updateProgress = (fileName, progress) => {
        setProgress(prev => ({ ...prev, [fileName]: progress }));
    };

    const largeFileUploadTasks = largeFiles.map(file => ({
        action: () => uploadFileInChunks(file, updateProgress)
    }));

    // 这里我们不并发上传多个大文件，而是让每个大文件内部的分片并发
    // 如果需要同时上传多个大文件，需要更复杂的并发控制
    const largeFileAttachmentIds = [];
    for (const task of largeFileUploadTasks) {
        const uploadId = await task.action();
        largeFileAttachmentIds.push(uploadId);
    }

    // 标记小文件状态
    smallFiles.forEach(file => {
        updateProgress(file.name, { percent: 100, status: '等待提交' });
    });

    return { smallFiles, largeFileAttachmentIds };
};