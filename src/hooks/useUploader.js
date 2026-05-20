// src/hooks/useUploader.js

import { useState, useCallback } from "react";
import { config } from "../utils/config";
import { fileMimeTypeName } from "../utils/helpers";

const { LARGE_FILE_THRESHOLD, CHUNK_UPLOAD_CONCURRENCY } = config;

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

  const updateFileProgress = useCallback((fileName, progressData) => {
    setUploadProgress((prev) => ({
      ...prev,
      [fileName]: { ...(prev[fileName] || {}), ...progressData },
    }));
  }, []);

  const resetUploader = useCallback(() => {
    setUploadProgress({});
    setIsUploading(false);
  }, []);

  // 修改点：接收整个 initResult (包含 uploadId 和 filePath)
  const processLargeFile = useCallback(
    async (file, initResult) => {
      const { uploadId, filePath } = initResult;
      updateFileProgress(file.name, { percent: 0, status: "准备分片上传..." });

      const totalChunks = Math.ceil(file.size / LARGE_FILE_THRESHOLD);
      const chunkTasks = [];
      const progressMap = new Array(totalChunks).fill(0);

      for (let i = 0; i < totalChunks; i++) {
        chunkTasks.push(() => {
          const start = i * LARGE_FILE_THRESHOLD;
          const end = Math.min(start + LARGE_FILE_THRESHOLD, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append("uploadId", uploadId);
          formData.append("chunkIndex", i);
          formData.append("totalChunks", totalChunks);
          formData.append("chunk", chunk);

          return apiClient.post("/upload/chunk", formData, {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.lengthComputable) {
                progressMap[i] = progressEvent.loaded;
                const totalLoaded = progressMap.reduce(
                  (acc, val) => acc + val,
                  0,
                );
                const percent = Math.round((totalLoaded * 100) / file.size);
                updateFileProgress(file.name, {
                  percent,
                  status: `上传中 (${percent}%)`,
                });
              }
            },
          });
        });
      }

      try {
        await executeConcurrent(chunkTasks, CHUNK_UPLOAD_CONCURRENCY);
      } catch (error) {
        updateFileProgress(file.name, { status: "分片上传失败", error: true });
        throw error;
      }

      updateFileProgress(file.name, {
        percent: 100,
        status: "正在校验合并...",
      });
      try {
        const mergeFormData = new FormData();
        mergeFormData.append("uploadId", uploadId);
        mergeFormData.append("totalChunks", totalChunks);
        await apiClient.post("/upload/merge", mergeFormData);
        updateFileProgress(file.name, { percent: 100, status: "成功" });
      } catch (error) {
        updateFileProgress(file.name, { status: "合并失败", error: true });
        throw error;
      }

      // 修改点：返回包含 filePath 的完整对象
      return { fileName: file.name, uploadId, filePath };
    },
    [apiClient, updateFileProgress],
  );

  const startUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) {
        return { smallFiles: [], largeFileAttachmentIds: [] };
      }

      if (!apiClient) {
        throw new Error("useUploader: apiClient is required.");
      }

      setIsUploading(true);
      setUploadProgress({});

      const smallFiles = [];
      const largeFiles = [];

      for (const file of files) {
        if (file.size <= LARGE_FILE_THRESHOLD) {
          smallFiles.push(file);
        } else {
          largeFiles.push(file);
        }
      }

      if (largeFiles.length === 0) {
        // 【修复点 1】：全是小文件时，重置上传状态
        setIsUploading(false);
        return { smallFiles, largeFileAttachmentIds: [] };
      }

      let uploadTasks = [];

      try {
        largeFiles.forEach((f) =>
          updateFileProgress(f.name, { percent: 0, status: "初始化..." }),
        );

        const initPayload = largeFiles.map((f) => ({
          fileName: f.name,
          fileSize: f.size,
          mimeTypeName: fileMimeTypeName(f),
        }));

        const initResponse = await apiClient.post("/upload/batch-init", {
          files: initPayload,
        });

        const initResults = initResponse.data?.data;
        if (!Array.isArray(initResults)) {
          throw new Error("Batch init response format invalid");
        }

        // 修改点：直接将完整的对象放入 Map 中
        const resultMap = new Map(
          initResults.map((r) => [r.originalFileName, r]),
        );

        uploadTasks = largeFiles.map((file) => {
          const initResult = resultMap.get(file.name);

          if (!initResult || !initResult.uploadId) {
            const err = new Error(`Initialization failed for ${file.name}`);
            updateFileProgress(file.name, {
              status: "初始化失败",
              error: true,
            });
            return Promise.reject(err);
          }

          // 修改点：传入完整的 initResult
          return processLargeFile(file, initResult);
        });
      } catch (error) {
        console.error("Batch initialization failed", error);
        largeFiles.forEach((f) =>
          updateFileProgress(f.name, { status: "初始化失败", error: true }),
        );
        setIsUploading(false);
        throw error;
      }

      try {
        const largeFileAttachmentIds = await Promise.all(uploadTasks);
        // 【修复点 2】：大文件分片合并成功后，重置上传状态
        setIsUploading(false);
        return { smallFiles, largeFileAttachmentIds };
      } catch (error) {
        throw error;
      }
    },
    [apiClient, processLargeFile, updateFileProgress],
  );

  return {
    uploadProgress,
    isUploading,
    startUpload,
    updateFileProgress,
    setIsUploading,
    resetUploader,
  };
};