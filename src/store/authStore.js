// src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { config } from "../utils/config";
import { userApi, courseApi } from "../services/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: localStorage.getItem(config.tokenName),
      user: null,
      detailInfo: null,

      // 身份上下文
      activeType: localStorage.getItem("activeType") || "class",
      activeId: localStorage.getItem("activeId"),

      // 课程上下文
      currentCourseId: null,
      currentCourse: null,
      courseList: [],
      courseListFetched: false,

      isAuthenticated: () => !!get().token,

      // --- 计算属性 (函数化调用) ---
      isAdmin: () => get().user?.isAdmin || false,

      getActiveIdentity: () => {
        const { detailInfo, activeType, activeId } = get();
        if (!detailInfo) return null;
        if (activeType === "school") {
          return detailInfo.schoolMembers?.find(
            (m) => String(m.schoolId) === String(activeId),
          );
        } else {
          return detailInfo.classMembers?.find(
            (m) => String(m.classId) === String(activeId),
          );
        }
      },

      isTeacher: () => get().getActiveIdentity()?.role === "ROLE_TEACHER",
      isStudent: () => get().getActiveIdentity()?.role === "ROLE_STUDENT",
      isPrincipal: () => get().getActiveIdentity()?.role === "ROLE_PRINCIPAL",
      isGuest: () => get().getActiveIdentity()?.role === "ROLE_GUEST",

      // --- 操作方法 ---

      decodeToken: () => {
        const token = get().token;
        if (!token) return;
        try {
          const decoded = jwtDecode(token);
          set({
            user: {
              name: decoded.sub || "",
              isAdmin: (decoded.roles || []).includes("ROLE_ADMIN"),
            },
          });
        } catch (e) {
          get().logout();
        }
      },

      fetchDetailInfo: async () => {
        if (!get().token) return;
        try {
          const response = await userApi.get("/detailInfo");
          const info = response.data.data;

          const { activeType, activeId } = get();
          let finalType = activeType;
          let finalId = activeId;

          let isValid = false;
          if (activeType === "school") {
            isValid = info.schoolMembers?.some(
              (m) => String(m.schoolId) === String(activeId),
            );
          } else {
            isValid = info.classMembers?.some(
              (m) => String(m.classId) === String(activeId),
            );
          }

          if (!isValid) {
            if (info.schoolMembers?.length > 0) {
              finalType = "school";
              finalId = info.schoolMembers[0].schoolId;
            } else if (info.classMembers?.length > 0) {
              finalType = "class";
              finalId = info.classMembers[0].classId;
            }
          }

          localStorage.setItem("activeType", finalType);
          localStorage.setItem("activeId", finalId);

          if (finalType === "class") {
            localStorage.setItem("adminSelectedClassId", finalId);
          } else if (finalType === "school") {
            localStorage.setItem("adminSelectedSchoolId", finalId);
          }

          set({
            detailInfo: info,
            activeType: finalType,
            activeId: finalId,
          });
        } catch (error) {
          if (error.response?.status === 401) get().logout();
        }
      },

      setContext: (type, id) => {
        localStorage.setItem("activeType", type);
        localStorage.setItem("activeId", id);

        if (type === "class") {
          localStorage.setItem("adminSelectedClassId", id);
        } else if (type === "school") {
          localStorage.setItem("adminSelectedSchoolId", id);
        }

        set({ activeType: type, activeId: id });
        set({
          currentCourseId: null,
          currentCourse: null,
          courseList: [],
          courseListFetched: false,
        });
      },

      switchContext: (type, id) => {
        localStorage.setItem("activeType", type);
        localStorage.setItem("activeId", id);

        if (type === "class") {
          localStorage.setItem("adminSelectedClassId", id);
        } else if (type === "school") {
          localStorage.setItem("adminSelectedSchoolId", id);
        }

        set({
          currentCourseId: null,
          currentCourse: null,
          courseList: [],
          courseListFetched: false,
        });

        const homeUrl = config.front_HOME_PAGE_URL || "/";
        window.location.href = homeUrl;
      },

      setCurrentCourse: (courseId, course = null) => {
        set({ currentCourseId: courseId, currentCourse: course });
      },

      clearCurrentCourse: () => {
        set({ currentCourseId: null, currentCourse: null });
      },

      setCourseList: (courses) => {
        set({ courseList: courses, courseListFetched: true });
        if (courses.length > 0) {
          const { currentCourseId } = get();
          if (
            !currentCourseId ||
            !courses.some((course) => course.id === currentCourseId)
          ) {
            const firstCourse = courses[0];
            get().setCurrentCourse(firstCourse.id, firstCourse);
          }
        }
      },

      fetchCourseList: async (force = false) => {
        const { activeId, activeType, courseListFetched } = get();
        if (
          activeType !== "class" ||
          !activeId ||
          activeId === "null" ||
          activeId === "undefined"
        ) {
          set({ courseList: [] });
          return;
        }

        if (courseListFetched && !force) {
          return;
        }
        try {
          const response = await courseApi.get(`/class/${activeId}`);
          const courses = response.data.data || [];
          get().setCourseList(courses);
        } catch (error) {
          console.error("Failed to fetch course list:", error);
          set({ courseList: [], courseListFetched: false });
        }
      },

      // 【核心修改】：处理登录数据并判断 needPasswordChange
      login: async (loginData) => {
        // 兼容旧版仅返回 Token 字符串的情况，以及新版返回对象的情况
        const token =
          typeof loginData === "object" ? loginData.token : loginData;
        const needPasswordChange =
          typeof loginData === "object"
            ? loginData.needPasswordChange === true
            : false;

        localStorage.setItem(config.tokenName, token);

        if (needPasswordChange) {
          localStorage.setItem("needPasswordChange", "true");
        } else {
          localStorage.removeItem("needPasswordChange");
        }

        set({ token });
        get().decodeToken();

        // 如果需要强制改密，则不要立即拉取用户组织详情，防止触发 40301
        if (!needPasswordChange) {
          await get().fetchDetailInfo();
        }
      },

      logout: () => {
        localStorage.clear(); // 这里会自动清除 needPasswordChange 标记
        set({
          token: null,
          user: null,
          detailInfo: null,
          activeId: null,
          currentCourseId: null,
          currentCourse: null,
          courseList: [],
          courseListFetched: false,
        });
        window.location.href = "/auth";
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentCourseId: state.currentCourseId,
        currentCourse: state.currentCourse,
      }),
    },
  ),
);

const initStore = () => {
  const state = useAuthStore.getState();
  if (state.token) {
    state.decodeToken();
    // 强制改密时不自动获取信息
    if (localStorage.getItem("needPasswordChange") !== "true") {
      state.fetchDetailInfo().then(() => {
        state.fetchCourseList();
      });
    }
  }
};

initStore();

export default useAuthStore;
