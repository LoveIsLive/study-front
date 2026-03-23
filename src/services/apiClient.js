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