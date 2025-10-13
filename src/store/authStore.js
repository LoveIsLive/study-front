import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { config } from '../utils/config';

const useAuthStore = create((set, get) => ({
    token: localStorage.getItem(config.tokenName),
    user: null,

    isAuthenticated: () => !!get().token,

    login: (token) => {
        localStorage.setItem(config.tokenName, token);
        set({ token });
        get().decodeToken();
    },

    logout: () => {
        localStorage.removeItem(config.tokenName);
        set({ token: null, user: null });
    },

    decodeToken: () => {
        const token = get().token;
        if (token) {
            try {
                const decoded = jwtDecode(token);
                set({
                    user: {
                        name: decoded.sub || "",
                        roles: decoded.roles || [],
                        isTeacher: (decoded.roles || []).includes("ROLE_TEACHER"),
                    }
                });
            } catch (error) {
                console.error("Failed to decode JWT:", error);
                get().logout(); // 如果token无效则登出
            }
        }
    }
}));

// 初始化时解码一次token
useAuthStore.getState().decodeToken();

export default useAuthStore;