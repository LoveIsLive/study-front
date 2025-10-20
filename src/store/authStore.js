import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { config } from '../utils/config';

const getInitialClass = () => {
    const classData = localStorage.getItem('selectedClass');
    try {
        return classData ? JSON.parse(classData) : null;
    } catch (e) {
        return null;
    }
};

const useAuthStore = create((set, get) => ({
    token: localStorage.getItem(config.tokenName),
    user: null,
    selectedClass: getInitialClass(),

    isAuthenticated: () => !!get().token,

    setSelectedClass: (classInfo) => {
        if (classInfo) {
            localStorage.setItem('selectedClass', JSON.stringify(classInfo));
        } else {
            localStorage.removeItem('selectedClass');
        }
        set({ selectedClass: classInfo });
    },

    login: (token) => {
        localStorage.setItem(config.tokenName, token);
        set({ token });
        get().decodeToken();
    },

    logout: () => {
        localStorage.removeItem(config.tokenName);
        localStorage.removeItem('selectedClass');
        set({ token: null, user: null, selectedClass: null });
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
                        isAdmin: (decoded.roles || []).includes("ROLE_ADMIN"),
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