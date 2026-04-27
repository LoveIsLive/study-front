import axios from 'axios';
import Swal from 'sweetalert2';
import useAuthStore from '../store/authStore';
import { config } from '../utils/config';

const createApiClient = (baseURL) => {
    const apiClient = axios.create({
        baseURL: `${config.back_base_url}${baseURL}`
    });

    apiClient.interceptors.request.use(
        (axiosConfig) => {
            const state = useAuthStore.getState();
            if (state.token) {
                axiosConfig.headers.Authorization = `Bearer ${state.token}`;
            }

            // 互斥发送：要么发 ClassId，要么发 SchoolId
            if (state.activeType === 'class' && state.activeId) {
                axiosConfig.headers['X-Active-Class-Id'] = state.activeId;
            } else if (state.activeType === 'school' && state.activeId) {
                axiosConfig.headers['X-Active-School-Id'] = state.activeId;
            }

            // 为仓库API的路径参数添加课程ID前缀
            if (baseURL.includes('/ware/home') && state.currentCourseId) {
                const courseIdStr = String(state.currentCourseId);
                console.log('[apiClient] baseURL:', baseURL, 'courseId:', courseIdStr, 'original params:', axiosConfig.params, 'original data:', axiosConfig.data);
                
                // 处理查询参数中的 path
                if (axiosConfig.params && axiosConfig.params.path) {
                    let path = axiosConfig.params.path;
                    console.log('[apiClient] original query path:', path);
                    // 清理路径：移除可能的 /ware/home 前缀
                    if (path.includes('/ware/home')) {
                        path = path.replace(/\/ware\/home/g, '');
                        console.log('[apiClient] cleaned /ware/home from query path:', path);
                    }
                    // 如果路径不是以课程ID开头，则添加前缀
                    if (!path.startsWith(`/${courseIdStr}`)) {
                        if (path === '/' || path === '') {
                            path = `/${courseIdStr}`;
                        } else {
                            // 确保路径以斜杠开头，且不重复斜杠
                            const normalizedPath = path.startsWith('/') ? path : '/' + path;
                            path = `/${courseIdStr}${normalizedPath}`;
                        }
                        axiosConfig.params.path = path;
                        console.log('[apiClient] updated query path:', axiosConfig.params.path);
                    }
                }
                
                // 处理请求体中的 path（JSON 或 FormData）
                if (axiosConfig.data) {
                    // 处理 JSON 对象
                    if (typeof axiosConfig.data === 'object' && !(axiosConfig.data instanceof FormData)) {
                        if (axiosConfig.data.path && typeof axiosConfig.data.path === 'string') {
                            let path = axiosConfig.data.path;
                            console.log('[apiClient] original JSON path:', path);
                            // 清理路径：移除可能的 /ware/home 前缀
                            if (path.includes('/ware/home')) {
                                path = path.replace(/\/ware\/home/g, '');
                                console.log('[apiClient] cleaned /ware/home from JSON path:', path);
                            }
                            if (!path.startsWith(`/${courseIdStr}`)) {
                                if (path === '/' || path === '') {
                                    path = `/${courseIdStr}`;
                                } else {
                                    const normalizedPath = path.startsWith('/') ? path : '/' + path;
                                    path = `/${courseIdStr}${normalizedPath}`;
                                }
                                axiosConfig.data.path = path;
                                console.log('[apiClient] updated JSON path:', axiosConfig.data.path);
                            }
                        }
                    }
                    // 处理 FormData
                    else if (axiosConfig.data instanceof FormData) {
                        // FormData 不能直接修改，需要获取并重新设置
                        const pathValue = axiosConfig.data.get('path');
                        console.log('[apiClient] original FormData path:', pathValue);
                        if (pathValue && typeof pathValue === 'string') {
                            let newPath = pathValue;
                            // 清理路径：移除可能的 /ware/home 前缀
                            if (newPath.includes('/ware/home')) {
                                newPath = newPath.replace(/\/ware\/home/g, '');
                                console.log('[apiClient] cleaned /ware/home from FormData path:', newPath);
                            }
                            if (!newPath.startsWith(`/${courseIdStr}`)) {
                                if (newPath === '/' || newPath === '') {
                                    newPath = `/${courseIdStr}`;
                                } else {
                                    const normalizedPath = newPath.startsWith('/') ? newPath : '/' + newPath;
                                    newPath = `/${courseIdStr}${normalizedPath}`;
                                }
                                axiosConfig.data.set('path', newPath);
                                console.log('[apiClient] updated FormData path:', newPath);
                            }
                        }
                    }
                }
                console.log('[apiClient] final params:', axiosConfig.params, 'final data:', axiosConfig.data);
            } else {
                console.log('[apiClient] baseURL:', baseURL, 'currentCourseId:', state.currentCourseId);
            }

            return axiosConfig;
        },
        (error) => Promise.reject(error)
    );

    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response && [401, 403].includes(error.response.status)) {
                useAuthStore.getState().logout();
                Swal.fire({
                    icon: 'warning',
                    title: '认证失效',
                    text: '您的登录已过期，请重新登录。',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    // 使用 replace 跳转，防止用户后退
                    window.location.href = config.front_AUTH_PREFIX;
                });
            }
            return Promise.reject(error);
        }
    );

    return apiClient;
};

export default createApiClient;