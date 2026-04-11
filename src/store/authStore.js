import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { config } from '../utils/config';
import { userApi } from '../services/api';

const useAuthStore = create((set, get) => ({
    token: localStorage.getItem(config.tokenName),
    user: null,
    detailInfo: null,

    // 身份上下文
    activeType: localStorage.getItem('activeType') || 'class',
    activeId: localStorage.getItem('activeId'),

    isAuthenticated: () => !!get().token,

    // --- 计算属性 (函数化调用) ---
    isAdmin: () => get().user?.isAdmin || false,

    getActiveIdentity: () => {
        const { detailInfo, activeType, activeId } = get();
        if (!detailInfo) return null;
        if (activeType === 'school') {
            // 使用 String() 转换，避免 '1' !== 1 的判断失败
            return detailInfo.schoolMembers?.find(m => String(m.schoolId) === String(activeId));
        } else {
            return detailInfo.classMembers?.find(m => String(m.classId) === String(activeId));
        }
    },

    isTeacher: () => get().getActiveIdentity()?.role === 'ROLE_TEACHER',
    isStudent: () => get().getActiveIdentity()?.role === 'ROLE_STUDENT',
    isPrincipal: () => get().getActiveIdentity()?.role === 'ROLE_PRINCIPAL',

    // --- 操作方法 ---

    // 核心：解析 Token (同步) — 支持写死的 fake token
    decodeToken: () => {
        const token = get().token;
        if (!token) return;

        // 处理写死的 fake token
        if (token.startsWith('fake-token-')) {
            const username = token.replace('fake-token-', '');
            const roleMap = {
                admin: { name: 'admin', isAdmin: true, role: 'ROLE_ADMIN' },
                teacher: { name: 'teacher', isAdmin: false, role: 'ROLE_TEACHER' },
                master: { name: 'master', isAdmin: false, role: 'ROLE_PRINCIPAL' },
                student: { name: 'student', isAdmin: false, role: 'ROLE_STUDENT' },
            };
            const userInfo = roleMap[username] || { name: username, isAdmin: false, role: 'ROLE_STUDENT' };
            set({ user: userInfo });
            return;
        }

        try {
            const decoded = jwtDecode(token);
            set({
                user: {
                    name: decoded.sub || "",
                    isAdmin: (decoded.roles || []).includes("ROLE_ADMIN"),
                }
            });
        } catch (e) {
            get().logout();
        }
    },

    // 核心：拉取组织架构 (异步) — 支持写死的 fake token
    fetchDetailInfo: async () => {
        if (!get().token) return;

        // 处理写死的 fake token，不请求后端
        const token = get().token;
        if (token.startsWith('fake-token-')) {
            const username = token.replace('fake-token-', '');
            // 根据角色模拟组织架构数据
            const fakeDetailMap = {
                admin: {
                    schoolMembers: [{ schoolId: '1', schoolName: '管理学校', role: 'ROLE_ADMIN' }],
                    classMembers: []
                },
                teacher: {
                    schoolMembers: [],
                    classMembers: [{ classId: '1', className: '一年级一班', role: 'ROLE_TEACHER' }]
                },
                master: {
                    schoolMembers: [{ schoolId: '1', schoolName: '示范学校', role: 'ROLE_PRINCIPAL' }],
                    classMembers: []
                },
                student: {
                    schoolMembers: [],
                    classMembers: [{ classId: '1', className: '一年级一班', role: 'ROLE_STUDENT' }]
                }
            };
            const info = fakeDetailMap[username] || { schoolMembers: [], classMembers: [] };

            let finalType = 'class';
            let finalId = null;
            if (info.schoolMembers?.length > 0) {
                finalType = 'school';
                finalId = info.schoolMembers[0].schoolId;
            } else if (info.classMembers?.length > 0) {
                finalType = 'class';
                finalId = info.classMembers[0].classId;
            }

            localStorage.setItem('activeType', finalType);
            localStorage.setItem('activeId', finalId);
            set({
                detailInfo: info,
                activeType: finalType,
                activeId: finalId
            });
            return;
        }

        try {
            const response = await userApi.get('/detailInfo');
            const info = response.data.data;

            // --- 核心修改：先计算正确的上下文，再统一 set ---
            const { activeType, activeId } = get();
            let finalType = activeType;
            let finalId = activeId;

            let isValid = false;
            if (activeType === 'school') {
                isValid = info.schoolMembers?.some(m => String(m.schoolId) === String(activeId));
            } else {
                isValid = info.classMembers?.some(m => String(m.classId) === String(activeId));
            }

            if (!isValid) {
                if (info.schoolMembers?.length > 0) {
                    finalType = 'school';
                    finalId = info.schoolMembers[0].schoolId;
                } else if (info.classMembers?.length > 0) {
                    finalType = 'class';
                    finalId = info.classMembers[0].classId;
                }
            }

            // 统一更新，避免 React 多次重绘导致的中间态
            localStorage.setItem('activeType', finalType);
            localStorage.setItem('activeId', finalId);
            set({
                detailInfo: info,
                activeType: finalType,
                activeId: finalId
            });

        } catch (error) {
            if (error.response?.status === 401) get().logout();
        }
    },

    setContext: (type, id) => {
        localStorage.setItem('activeType', type);
        localStorage.setItem('activeId', id);
        set({ activeType: type, activeId: id });
    },

    switchContext: (type, id) => {
        get().setContext(type, id);
        const homeUrl = config.front_HOME_PAGE_URL || '/';
        window.location.href = homeUrl;
    },

    login: async (token) => {
        localStorage.setItem(config.tokenName, token);
        set({ token });
        get().decodeToken();
        await get().fetchDetailInfo();
    },

    logout: () => {
        localStorage.clear();
        set({ token: null, user: null, detailInfo: null, activeId: null });
        window.location.href = '/auth';
    }
}));

/**
 * 【重点】自初始化逻辑
 * 当外部首次 import 此文件时，立即执行以下代码
 */
const initStore = () => {
    const state = useAuthStore.getState();
    if (state.token) {
        // 1. 立即同步解析 Token，这样 user 对象瞬间就有值了
        state.decodeToken();
        // 2. 异步获取详细信息，不阻塞主线程
        state.fetchDetailInfo();
    }
};

initStore();

export default useAuthStore;