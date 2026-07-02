import { create } from 'zustand';
import { mathvisionApi } from '../services/api';

/**
 * MathVision 教学动画生成 - 页面级状态。
 * 只覆盖已实现的后端能力: 任务列表 / 详情 / 创建。
 */
const useMathVisionStore = create((set, get) => ({
    tasks: [],
    total: 0,
    activeTaskId: null,
    taskDetail: null,
    loadingList: false,
    loadingDetail: false,
    filter: { keyword: '', status: '', outputTarget: '' },

    /** 加载任务列表 */
    loadTasks: async () => {
        set({ loadingList: true });
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
            set({ loadingList: false });
        }
    },

    /** 更新筛选条件并重新加载 */
    setFilter: (patch) => {
        set((state) => ({ filter: { ...state.filter, ...patch } }));
        get().loadTasks();
    },

    /** 选中任务并加载详情 */
    selectTask: async (taskId) => {
        set({ activeTaskId: taskId });
        await get().loadDetail(taskId);
    },

    /** 加载任务详情 */
    loadDetail: async (taskId) => {
        if (!taskId) {
            set({ taskDetail: null });
            return;
        }
        set({ loadingDetail: true });
        try {
            const res = await mathvisionApi.get(`/tasks/${taskId}`);
            if (res.data.code === 200) {
                set({ taskDetail: res.data.data });
            }
        } finally {
            set({ loadingDetail: false });
        }
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

    reset: () => set({
        tasks: [], total: 0, activeTaskId: null, taskDetail: null,
        filter: { keyword: '', status: '', outputTarget: '' },
    }),
}));

export default useMathVisionStore;
