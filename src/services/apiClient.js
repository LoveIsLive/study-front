// src/services/apiClient.js
import axios from "axios";
import Swal from "sweetalert2";
import useAuthStore from "../store/authStore";
import { config } from "../utils/config";

const createApiClient = (baseURL) => {
  const apiClient = axios.create({
    baseURL: `${config.back_base_url}${baseURL}`,
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          if (headers) {
            const deleteHeader = (h) => {
              if (typeof h.delete === "function") {
                h.delete("Content-Type");
                h.delete("content-type");
              } else {
                Object.keys(h).forEach((key) => {
                  if (key.toLowerCase() === "content-type") delete h[key];
                });
              }
            };
            deleteHeader(headers);
          }
          return data;
        }

        if (data && typeof data === "object" && !(data instanceof FormData)) {
          if (headers) {
            if (typeof headers.set === "function") {
              headers.set("Content-Type", "application/json");
            } else {
              headers["Content-Type"] = "application/json";
            }
          }
          return JSON.stringify(data);
        }

        return data;
      },
    ],
  });

  apiClient.interceptors.request.use(
    (axiosConfig) => {
      const state = useAuthStore.getState();
      if (state.token) {
        axiosConfig.headers.Authorization = `Bearer ${state.token}`;
      }

      if (state.activeType === "class" && state.activeId) {
        axiosConfig.headers["X-Active-Class-Id"] = state.activeId;
      } else if (state.activeType === "school" && state.activeId) {
        axiosConfig.headers["X-Active-School-Id"] = state.activeId;
      }

      if (baseURL.includes("/ware/home") && state.currentCourseId) {
        if (!state.isAdmin() && !state.isPrincipal()) {
          const courseIdStr = String(state.currentCourseId);

          if (axiosConfig.params && axiosConfig.params.path) {
            let path = axiosConfig.params.path;
            if (path.includes("/ware/home"))
              path = path.replace(/\/ware\/home/g, "");
            if (!path.startsWith(`/${courseIdStr}`)) {
              const normalizedPath = path.startsWith("/") ? path : "/" + path;
              axiosConfig.params.path = `/${courseIdStr}${normalizedPath}`;
            }
          }

          if (axiosConfig.data) {
            if (
              typeof axiosConfig.data === "object" &&
              !(axiosConfig.data instanceof FormData)
            ) {
              if (
                axiosConfig.data.path &&
                typeof axiosConfig.data.path === "string"
              ) {
                let path = axiosConfig.data.path;
                if (path.includes("/ware/home"))
                  path = path.replace(/\/ware\/home/g, "");
                if (!path.startsWith(`/${courseIdStr}`)) {
                  const normalizedPath = path.startsWith("/")
                    ? path
                    : "/" + path;
                  axiosConfig.data.path = `/${courseIdStr}${normalizedPath}`;
                }
              }
            } else if (axiosConfig.data instanceof FormData) {
              const pathValue = axiosConfig.data.get("path");
              if (pathValue && typeof pathValue === "string") {
                let newPath = pathValue;
                if (newPath.includes("/ware/home"))
                  newPath = newPath.replace(/\/ware\/home/g, "");
                if (!newPath.startsWith(`/${courseIdStr}`)) {
                  const normalizedPath = newPath.startsWith("/")
                    ? newPath
                    : "/" + newPath;
                  axiosConfig.data.set(
                    "path",
                    `/${courseIdStr}${normalizedPath}`,
                  );
                }
              }
            }
          }
        }
      }

      if (axiosConfig.data instanceof FormData) {
        axiosConfig.headers["Content-Type"] = false;
      }
      return axiosConfig;
    },
    (error) => Promise.reject(error),
  );

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // 【核心修改】：专门捕获 40301 状态码 (强制改密)
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 403 && data && data.code === 40301) {
          localStorage.setItem("needPasswordChange", "true");
          Swal.fire({
            icon: "warning",
            title: "安全提示",
            text: "检测到您的账号需要强制修改密码。",
            allowOutsideClick: false,
            confirmButtonText: "去修改",
          }).then(() => {
            window.location.href = "/force-change-password";
          });
          return Promise.reject(error);
        }

        // 处理常规认证失效 (排除 40301 的情况)
        if (status === 401 || status === 403) {
          useAuthStore.getState().logout();
          Swal.fire({
            icon: "warning",
            title: "认证失效",
            text: "您的登录已过期或无权限，请重新登录。",
            showConfirmButton: false,
            timer: 2000,
          }).then(() => {
            window.location.href = config.front_AUTH_PREFIX;
          });
        }
      }
      return Promise.reject(error);
    },
  );

  return apiClient;
};

export default createApiClient;
