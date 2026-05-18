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
          // 使用 String() 转换，避免 '1' !== 1 的判断失败
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
      isGuest: () => get().getActiveIdentity()?.role === "ROLE_GUEST", // 【新增】判断是否为访客

      // --- 操作方法 ---

      // 核心：解析 Token (同步)
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

      // 核心：拉取组织架构 (异步)
      fetchDetailInfo: async () => {
        if (!get().token) return;
        try {
          const response = await userApi.get("/detailInfo");
          const info = response.data.data;

          // --- 核心修改：先计算正确的上下文，再统一 set ---
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

          // 统一更新，避免 React 多次重绘导致的中间态
          localStorage.setItem("activeType", finalType);
          localStorage.setItem("activeId", finalId);

          // 【修复 Bug 3】：在加载用户数据确立上下文时，同步管理端缓存
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

        // 【修复 Bug 3】：用户主动在顶部 Header 切换班级/学校时，同步管理端缓存
        if (type === "class") {
          localStorage.setItem("adminSelectedClassId", id);
        } else if (type === "school") {
          localStorage.setItem("adminSelectedSchoolId", id);
        }

        set({ activeType: type, activeId: id });
        // 切换上下文时清空课程选择
        set({
          currentCourseId: null,
          currentCourse: null,
          courseList: [],
          courseListFetched: false,
        });
      },

      switchContext: (type, id) => {
        // 1. 同步底层数据源 (LocalStorage)
        localStorage.setItem("activeType", type);
        localStorage.setItem("activeId", id);

        // 同步管理端缓存
        if (type === "class") {
          localStorage.setItem("adminSelectedClassId", id);
        } else if (type === "school") {
          localStorage.setItem("adminSelectedSchoolId", id);
        }

        // 2. 【核心修改】：精准清理持久化状态，但不更新 activeType 和 activeId
        // 这样做可以清除 localStorage 中的旧课程缓存，同时又不会触发旧页面发起非法的 API 请求
        set({
          currentCourseId: null,
          currentCourse: null,
          courseList: [],
          courseListFetched: false,
        });

        // 3. 执行硬跳转，让系统以干净的身份和状态重新启动
        const homeUrl = config.front_HOME_PAGE_URL || "/";
        window.location.href = homeUrl;
      },

      // 课程相关方法
      setCurrentCourse: (courseId, course = null) => {
        set({ currentCourseId: courseId, currentCourse: course });
      },

      clearCurrentCourse: () => {
        set({ currentCourseId: null, currentCourse: null });
      },

      setCourseList: (courses) => {
        set({ courseList: courses, courseListFetched: true });
        // 如果有课程列表，确保有一个选中的课程
        if (courses.length > 0) {
          const { currentCourseId } = get();
          // 如果当前没有选择课程，或者当前选择的课程不在新的课程列表中，选择第一门课程
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
        // 只有在班级上下文才能获取课程列表
        if (
          activeType !== "class" ||
          !activeId ||
          activeId === "null" ||
          activeId === "undefined"
        ) {
          set({ courseList: [] });
          return;
        }

        // 如果已经获取过且不是强制刷新，直接返回
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

      login: async (token) => {
        localStorage.setItem(config.tokenName, token);
        set({ token });
        get().decodeToken();
        await get().fetchDetailInfo();
      },

      logout: () => {
        localStorage.clear();
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
    state.fetchDetailInfo().then(() => {
      // 3. 获取课程列表
      state.fetchCourseList();
    });
  }
};

initStore();

export default useAuthStore;
