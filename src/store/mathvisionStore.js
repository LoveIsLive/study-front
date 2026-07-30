import { create } from 'zustand';
import { mathvisionApi } from '../services/api';

let detailRequestController = null;
let stageRequestController = null;

const isCanceledRequest = (error) => (
    error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError'
    || error?.name === 'AbortError'
);

const eventToTaskItem = (event) => ({
    taskId: event.taskId,
    sessionId: event.sessionId,
    title: event.title,
    status: event.status,
    currentStage: event.currentStage,
    mode: event.mode,
    outputTarget: event.outputTarget,
    providerCode: event.providerCode,
    modelName: event.modelName,
    cancelRequested: event.cancelRequested,
    finalArtifactPath: event.finalArtifactPath,
    finalArtifactType: event.finalArtifactType,
    createTime: event.createTime,
    updateTime: event.updateTime,
});

const matchesFilter = (task, filter) => {
    if (!task) return false;
    if (filter.status && task.status !== filter.status) return false;
    if (filter.outputTarget && task.outputTarget !== filter.outputTarget) return false;
    if (filter.keyword) {
        const title = task.title || '';
        if (!title.toLowerCase().includes(filter.keyword.toLowerCase())) {
            return false;
        }
    }
    return true;
};

const mergeTaskDetailEvent = (detail, event) => {
    if (!detail || String(detail.taskId) !== String(event.taskId)) {
        return detail;
    }
    return {
        ...detail,
        title: event.title ?? detail.title,
        status: event.status ?? detail.status,
        currentStage: event.currentStage ?? detail.currentStage,
        failedStage: event.failedStage ?? detail.failedStage,
        errorType: event.errorType ?? detail.errorType,
        errorMessage: event.errorMessage ?? detail.errorMessage,
        mode: event.mode ?? detail.mode,
        outputTarget: event.outputTarget ?? detail.outputTarget,
        providerCode: event.providerCode ?? detail.providerCode,
        modelName: event.modelName ?? detail.modelName,
        currentVersion: event.currentVersion ?? detail.currentVersion,
        lastConfirmedStage: event.lastConfirmedStage ?? detail.lastConfirmedStage,
        cancelRequested: event.cancelRequested ?? detail.cancelRequested,
        finalArtifactPath: event.finalArtifactPath ?? detail.finalArtifactPath,
        finalArtifactType: event.finalArtifactType ?? detail.finalArtifactType,
        updateTime: event.updateTime ?? detail.updateTime,
    };
};

const STAGE_ORDER = [
    'problem_normalization',
    'reasoning_graph',
    'visual_storyboard',
    'code_generation',
    'render_result',
];

const defaultStageForTask = (task) => {
    if (!task) return null;
    if (STAGE_ORDER.includes(task.currentStage)) {
        return task.currentStage;
    }
    if (task.currentStage === 'completed' || task.status === 'completed') {
        return 'render_result';
    }
    return 'problem_normalization';
};

/**
 * MathVision 教学动画生成 - 页面级状态。
 * 覆盖已实现的后端能力: 任务列表 / 详情 / 创建 / 启动 / 取消。
 */
const useMathVisionStore = create((set, get) => ({
    tasks: [],
    total: 0,
    recycleTasks: [],
    recycleTotal: 0,
    squareItems: [],
    squareTotal: 0,
    activeTaskId: null,
    taskDetail: null,
    selectedStageCode: null,
    stageData: null,
    versions: [],
    versionDetail: null,
    loadingList: false,
    loadingRecycle: false,
    loadingSquare: false,
    loadingDetail: false,
    loadingStageData: false,
    loadingVersions: false,
    loadingVersionDetail: false,
    filter: { keyword: '', status: '', outputTarget: '' },

    /** 加载任务列表 */
    loadTasks: async (options = {}) => {
        const showLoading = options.showLoading !== false;
        if (showLoading) {
            set({ loadingList: true });
        }
        try {
            const { keyword, status, outputTarget } = get().filter;
            const res = await mathvisionApi.get('/tasks', {
                params: { keyword, status, outputTarget, page: 1, size: 50 },
            });
            if (res.data.code === 200) {
                const data = res.data.data || {};
                set({ tasks: data.records || [], total: data.total || 0 });
            }
        } finally {
            if (showLoading) {
                set({ loadingList: false });
            }
        }
    },

    /** 加载回收站任务列表。 */
    loadRecycleTasks: async (options = {}) => {
        const showLoading = options.showLoading !== false;
        if (showLoading) {
            set({ loadingRecycle: true });
        }
        try {
            const res = await mathvisionApi.get('/tasks/recycle-bin', {
                params: {
                    keyword: options.keyword || '',
                    page: options.page || 1,
                    size: options.size || 50,
                },
            });
            if (res.data.code !== 200) {
                throw new Error(res.data.message || '加载回收站失败');
            }
            const data = res.data.data || {};
            set({ recycleTasks: data.records || [], recycleTotal: data.total || 0 });
            return data;
        } finally {
            if (showLoading) {
                set({ loadingRecycle: false });
            }
        }
    },

    /** 加载广场中的公开成果。 */
    loadSquare: async (options = {}) => {
        set({ loadingSquare: true });
        try {
            const res = await mathvisionApi.get('/square', {
                params: {
                    keyword: options.keyword || '',
                    outputTarget: options.outputTarget || '',
                    mineOnly: Boolean(options.mineOnly),
                    page: options.page || 1,
                    size: options.size || 24,
                },
            });
            if (res.data.code !== 200) {
                throw new Error(res.data.message || '加载创作广场失败');
            }
            const data = res.data.data || {};
            set({ squareItems: data.records || [], squareTotal: data.total || 0 });
            return data;
        } finally {
            set({ loadingSquare: false });
        }
    },

    /** 将当前任务的激活版本发布到广场。 */
    publishToSquare: async (taskId) => {
        const res = await mathvisionApi.post(`/square/tasks/${taskId}`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '分享至创作广场失败');
        }
        await get().loadTasks({ showLoading: false });
        return res.data.data;
    },

    /** 将广场成果复制为当前用户的独立工作台任务。 */
    loadSquareToWorkbench: async (shareId) => {
        const res = await mathvisionApi.post(`/square/${shareId}/load`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '加载到工作台失败');
        }
        const loaded = res.data.data;
        await get().loadTasks({ showLoading: false });
        if (loaded?.taskId) {
            await get().selectTask(loaded.taskId);
        }
        return loaded;
    },

    /** 取消当前用户发布的广场成果。 */
    unpublishFromSquare: async (shareId, options = null) => {
        const res = await mathvisionApi.delete(`/square/${shareId}`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '取消分享失败');
        }
        await get().loadTasks({ showLoading: false });
        if (options) {
            await get().loadSquare(options);
        }
    },

    /** 更新筛选条件并重新加载 */
    setFilter: (patch) => {
        set((state) => ({ filter: { ...state.filter, ...patch } }));
        get().loadTasks();
    },

    /** 选中任务并加载详情 */
    selectTask: async (taskId) => {
        detailRequestController?.abort();
        stageRequestController?.abort();
        set({
            activeTaskId: taskId,
            taskDetail: null,
            selectedStageCode: null,
            stageData: null,
            versions: [],
            versionDetail: null,
        });
        const detail = await get().loadDetail(taskId, { loadStage: false });
        const selectedStageCode = get().selectedStageCode;
        if (detail && selectedStageCode) {
            await get().loadStageData(taskId, selectedStageCode);
        }
    },

    clearSelection: () => {
        detailRequestController?.abort();
        stageRequestController?.abort();
        set({
            activeTaskId: null,
            taskDetail: null,
            selectedStageCode: null,
            stageData: null,
            versions: [],
            versionDetail: null,
            loadingDetail: false,
            loadingStageData: false,
        });
    },

    /** 加载任务的用户可见版本列表。 */
    loadVersions: async (taskId, options = {}) => {
        if (!taskId) {
            set({ versions: [], versionDetail: null });
            return [];
        }
        const showLoading = options.showLoading !== false;
        if (showLoading) {
            set({ loadingVersions: true });
        }
        try {
            const res = await mathvisionApi.get(`/tasks/${taskId}/versions`);
            if (res.data.code !== 200) {
                throw new Error(res.data.message || '加载版本列表失败');
            }
            const versions = res.data.data || [];
            set({ versions });
            return versions;
        } finally {
            if (showLoading) {
                set({ loadingVersions: false });
            }
        }
    },

    /** 加载指定任务版本的阶段快照。 */
    loadVersionDetail: async (taskId, version, options = {}) => {
        if (!taskId || version == null) {
            set({ versionDetail: null });
            return null;
        }
        const showLoading = options.showLoading !== false;
        if (showLoading) {
            set({ loadingVersionDetail: true, versionDetail: null });
        }
        try {
            const res = await mathvisionApi.get(`/tasks/${taskId}/artifacts/${version}`);
            if (res.data.code !== 200) {
                throw new Error(res.data.message || '加载版本详情失败');
            }
            const detail = res.data.data;
            set({ versionDetail: detail });
            return detail;
        } finally {
            if (showLoading) {
                set({ loadingVersionDetail: false });
            }
        }
    },

    /** 激活历史版本，并刷新任务详情和阶段面板。 */
    activateVersion: async (taskId, version) => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/versions/${version}/activate`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '切换版本失败');
        }
        const detail = res.data.data;
        const selectedStageCode = defaultStageForTask(detail);
        set({
            taskDetail: detail,
            activeTaskId: detail?.taskId || taskId,
            selectedStageCode,
            stageData: null,
            versionDetail: null,
        });
        await Promise.all([
            get().loadTasks({ showLoading: false }),
            get().loadVersions(taskId, { showLoading: false }),
        ]);
        if (selectedStageCode) {
            await get().loadStageData(taskId, selectedStageCode, { showLoading: false });
        }
        return detail;
    },

    /** 加载任务详情 */
    loadDetail: async (taskId, options = {}) => {
        if (!taskId) {
            set({ taskDetail: null, selectedStageCode: null, stageData: null });
            return null;
        }
        const showLoading = options.showLoading !== false;
        const shouldLoadStage = options.loadStage !== false;
        detailRequestController?.abort();
        const controller = new AbortController();
        detailRequestController = controller;
        set({ loadingDetail: showLoading });
        let detail = null;
        let selectedStageCode = null;
        try {
            const res = await mathvisionApi.get(`/tasks/${taskId}`, { signal: controller.signal });
            if (res.data.code === 200) {
                detail = res.data.data;
                const current = get();
                const sameTask = String(current.activeTaskId) === String(taskId);
                selectedStageCode = sameTask && current.selectedStageCode
                    ? current.selectedStageCode
                    : defaultStageForTask(detail);
                set({ taskDetail: detail, selectedStageCode });
            }
        } catch (error) {
            if (!isCanceledRequest(error)) {
                throw error;
            }
            return null;
        } finally {
            if (detailRequestController === controller) {
                detailRequestController = null;
                set({ loadingDetail: false });
            }
        }
        if (detail && shouldLoadStage && selectedStageCode) {
            await get().loadStageData(taskId, selectedStageCode, { showLoading: false });
        }
        return detail;
    },

    updateRuntimeSettings: async (taskId, settings) => {
        const res = await mathvisionApi.put(`/tasks/${taskId}/runtime-settings`, settings);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '更新运行设置失败');
        }
        const detail = res.data.data;
        set({ taskDetail: detail });
        await get().loadTasks({ showLoading: false });
        return detail;
    },

    updateTaskTitle: async (taskId, title) => {
        const res = await mathvisionApi.put(`/tasks/${taskId}/title`, { title });
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '修改任务标题失败');
        }
        const detail = res.data.data;
        if (String(get().activeTaskId) === String(taskId)) {
            set({ taskDetail: detail });
        }
        await get().loadTasks({ showLoading: false });
        return detail;
    },

    loadStageData: async (taskId, stageCode, options = {}) => {
        if (!taskId || !stageCode) {
            set({ stageData: null, selectedStageCode: null, loadingStageData: false });
            return null;
        }
        const showLoading = options.showLoading !== false || !get().stageData;
        if (options.skipIfLoading && stageRequestController) {
            return null;
        }
        stageRequestController?.abort();
        const controller = new AbortController();
        stageRequestController = controller;
        set({ loadingStageData: showLoading });
        try {
            const res = await mathvisionApi.get(`/tasks/${taskId}/stages/${stageCode}`, {
                signal: controller.signal,
            });
            if (res.data.code !== 200) {
                throw new Error(res.data.message || '加载阶段失败');
            }
            const stageData = res.data.data;
            const current = get();
            if (String(current.activeTaskId) !== String(taskId)
                || current.selectedStageCode !== stageCode) {
                return null;
            }
            set({ stageData, selectedStageCode: stageCode });
            return stageData;
        } catch (error) {
            if (!isCanceledRequest(error)) {
                throw error;
            }
            return null;
        } finally {
            if (stageRequestController === controller) {
                stageRequestController = null;
                set({ loadingStageData: false });
            }
        }
    },

    selectStage: async (taskId, stageCode) => {
        set({ selectedStageCode: stageCode, stageData: null });
        return get().loadStageData(taskId, stageCode);
    },

    /** 创建任务 (multipart), 成功后刷新列表并选中新任务 */
    createTask: async (formData) => {
        const res = await mathvisionApi.post('/tasks/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '创建失败');
        }
        const created = res.data.data;
        await get().loadTasks();
        if (created?.taskId) {
            await get().selectTask(created.taskId);
        }
        return created;
    },

    /** 启动或继续一个用户可见阶段 */
    startTask: async (taskId, retryStage) => {
        const url = retryStage
            ? `/tasks/${taskId}/stages/${retryStage}/retry`
            : `/tasks/${taskId}/start`;
        const res = await mathvisionApi.post(url);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '启动失败');
        }
        const detail = res.data.data;
        const selectedStageCode = defaultStageForTask(detail);
        set({ taskDetail: detail, activeTaskId: detail?.taskId || taskId, selectedStageCode, stageData: null });
        if (selectedStageCode) {
            await get().loadStageData(detail?.taskId || taskId, selectedStageCode, { showLoading: false });
        }
        await Promise.all([
            get().loadTasks({ showLoading: false }),
            get().loadVersions(detail?.taskId || taskId, { showLoading: false }),
        ]);
        return detail;
    },

    /** 从已有阶段产物重新生成，并重新执行该阶段及其后续阶段。 */
    regenerateStage: async (taskId, stage) => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/stages/${stage}/regenerate`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '重新生成阶段失败');
        }
        const detail = res.data.data;
        const selectedStageCode = stage || defaultStageForTask(detail);
        set({
            taskDetail: detail,
            activeTaskId: detail?.taskId || taskId,
            selectedStageCode,
            stageData: null,
        });
        await Promise.all([
            get().loadTasks({ showLoading: false }),
            get().loadVersions(detail?.taskId || taskId, { showLoading: false }),
        ]);
        if (selectedStageCode) {
            await get().loadStageData(
                detail?.taskId || taskId,
                selectedStageCode,
                { showLoading: false },
            );
        }
        return detail;
    },

    /** 取消任务; running 状态由后端收敛为终止中/已取消 */
    cancelTask: async (taskId) => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/cancel`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '取消失败');
        }
        const detail = res.data.data;
        const selectedStageCode = defaultStageForTask(detail);
        set({ taskDetail: detail, activeTaskId: detail?.taskId || taskId, selectedStageCode, stageData: null });
        if (selectedStageCode) {
            await get().loadStageData(detail?.taskId || taskId, selectedStageCode, { showLoading: false });
        }
        await get().loadTasks();
        return detail;
    },

    /** 将任务移入回收站。 */
    deleteTask: async (taskId) => {
        const res = await mathvisionApi.delete(`/tasks/${taskId}`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '删除失败');
        }
        set((state) => {
            const deletingActive = String(state.activeTaskId) === String(taskId);
            return {
                tasks: state.tasks.filter((task) => String(task.taskId) !== String(taskId)),
                total: Math.max(0, state.total - 1),
                activeTaskId: deletingActive ? null : state.activeTaskId,
                taskDetail: deletingActive ? null : state.taskDetail,
                selectedStageCode: deletingActive ? null : state.selectedStageCode,
                stageData: deletingActive ? null : state.stageData,
                versions: deletingActive ? [] : state.versions,
                versionDetail: deletingActive ? null : state.versionDetail,
            };
        });
        await get().loadRecycleTasks({ showLoading: false });
    },

    /** 从回收站恢复任务。 */
    restoreTask: async (taskId, options = {}) => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/restore`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '恢复失败');
        }
        await Promise.all([
            get().loadTasks({ showLoading: false }),
            get().loadRecycleTasks({ showLoading: false, keyword: options.keyword || '' }),
        ]);
        return res.data.data;
    },

    /** 永久删除回收站任务。 */
    permanentlyDeleteTask: async (taskId) => {
        const res = await mathvisionApi.delete(`/tasks/${taskId}/permanent`);
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '永久删除失败');
        }
        set((state) => ({
            recycleTasks: state.recycleTasks.filter((task) => String(task.taskId) !== String(taskId)),
            recycleTotal: Math.max(0, state.recycleTotal - 1),
        }));
    },

    saveStageContent: async (taskId, stage, version, content, comment = '') => {
        const res = await mathvisionApi.put(`/tasks/${taskId}/stages/${stage}/content`, {
            version,
            content,
            comment,
        });
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '保存失败');
        }
        const saved = res.data.data;
        if (saved?.stage) {
            set({ selectedStageCode: saved.stage });
        }
        await get().loadDetail(taskId, { showLoading: false, loadStage: false });
        if (saved?.stage) {
            await get().loadStageData(taskId, saved.stage, { showLoading: false });
        }
        await get().loadTasks({ showLoading: false });
        return saved;
    },

    /** 根据用户意见自动编辑题目识别、解题步骤、Storyboard 或代码阶段产物。 */
    autoEditStage: async (taskId, stage, baseStageVersion, instruction) => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/stages/${stage}/auto-edit`, {
            baseStageVersion,
            instruction,
        });
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '自动编辑提交失败');
        }
        await Promise.all([
            get().loadDetail(taskId, { showLoading: false }),
            get().loadTasks({ showLoading: false }),
            get().loadVersions(taskId, { showLoading: false }),
        ]);
        return res.data.data;
    },

    confirmStage: async (taskId, stage, version, comment = '') => {
        const res = await mathvisionApi.post(`/tasks/${taskId}/stages/${stage}/confirm`, {
            version,
            comment,
        });
        if (res.data.code !== 200) {
            throw new Error(res.data.message || '确认失败');
        }
        const detail = res.data.data;
        const selectedStageCode = defaultStageForTask(detail);
        set({ taskDetail: detail, activeTaskId: detail?.taskId || taskId, selectedStageCode, stageData: null });
        if (selectedStageCode) {
            await get().loadStageData(detail?.taskId || taskId, selectedStageCode, { showLoading: false });
        }
        await get().loadTasks({ showLoading: false });
        return detail;
    },

    applyTaskEvent: (event) => {
        if (!event || event.type !== 'MATHVISION_TASK' || !event.taskId) {
            return;
        }
        const incoming = eventToTaskItem(event);
        set((state) => {
            const tasks = [...state.tasks];
            const index = tasks.findIndex((t) => String(t.taskId) === String(event.taskId));
            const shouldKeep = matchesFilter(incoming, state.filter);
            let total = state.total;

            if (index >= 0) {
                if (shouldKeep) {
                    tasks[index] = { ...tasks[index], ...incoming };
                } else {
                    tasks.splice(index, 1);
                    total = Math.max(0, total - 1);
                }
            } else if (shouldKeep) {
                tasks.unshift(incoming);
                total += 1;
            }

            return {
                tasks,
                total,
                taskDetail: mergeTaskDetailEvent(state.taskDetail, event),
            };
        });
    },

    reset: () => set({
        tasks: [], total: 0, recycleTasks: [], recycleTotal: 0,
        squareItems: [], squareTotal: 0,
        activeTaskId: null, taskDetail: null,
        selectedStageCode: null, stageData: null,
        versions: [], versionDetail: null,
        filter: { keyword: '', status: '', outputTarget: '' },
    }),
}));

export default useMathVisionStore;
