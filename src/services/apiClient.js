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
            const token = useAuthStore.getState().token;
            if (token) {
                axiosConfig.headers.Authorization = `Bearer ${token}`;
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