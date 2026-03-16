import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { config } from '../utils/config';
import { userApi } from '../services/api';

const useAuthStore = create((set, get) => ({
    token: localStorage.getItem(config.tokenName),
    user: null, // 存储来自 Token 的核心信息 (name, roles)
    detailInfo: null, // 存储来自 /detailInfo 的额外信息 (classMember, etc.)

    isAuthenticated: () => !!get().token,

    // --- 新增：获取并设置用户详细信息 ---
    fetchDetailInfo: async () => {
        if (!get().token) return; // 如果没有 token，不执行
        try {
            const response = await userApi.get('/detailInfo');
            const info = response.data.data;

            // 注意：我们只取需要的数据，避免覆盖 token 中的权威信息
            set({
                detailInfo: {
                    classMember: info.classMember,
                    schoolMember: info.schoolMember
                    // 可以在这里扩展其他额外信息，如 age, gender 等
                }
            });

        } catch (error) {
            console.error("Failed to fetch user detail info:", error);
            // 可选：如果获取失败，可以决定是否登出用户
        }
    },

    login: async (token) => {
        localStorage.setItem(config.tokenName, token);
        set({ token });
        get().decodeToken();
        await get().fetchDetailInfo(); // 登录后立即获取详细信息
    },

    logout: () => {
        localStorage.removeItem(config.tokenName);
        set({ token: null, user: null, detailInfo: null });
    },

    decodeToken: () => {
        const token = get().token;
        if (token) {
            try {
                const decoded = jwtDecode(token);
                set({
                    user: {
                        // 只存储 Token 中的权威信息
                        name: decoded.sub.split('_').pop() || "",
                        roles: decoded.roles || [],
                        isTeacher: (decoded.roles || []).includes("ROLE_TEACHER"),
                        isAdmin: (decoded.roles || []).includes("ROLE_ADMIN"),
                        isPrincipal: (decoded.roles || []).includes("ROLE_PRINCIPAL"),
                    }
                });
            } catch (error) {
                console.error("Failed to decode JWT:", error);
                get().logout(); // 如果token无效则登出
            }
        }
    }
}));

// 初始化时执行
const initializeAuth = async () => {
    const state = useAuthStore.getState();
    state.decodeToken();
    // 如果 token 存在，则获取详细信息
    if (state.token) {
        await state.fetchDetailInfo();
    }
};
initializeAuth();


export default useAuthStore;