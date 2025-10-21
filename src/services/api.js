import createApiClient from './apiClient';
import { config } from '../utils/config';
import axios from 'axios';

// 为每个模块创建API客户端实例
export const authApi = axios.create({ baseURL: `${config.back_base_url}${config.back_AUTH_PREFIX}` });
export const userApi = createApiClient(config.back_USER_PREFIX);
export const indexApi = createApiClient(config.back_INDEX_PREFIX);
export const homeworkApi = createApiClient(config.back_HOMEWORK_PREFIX);
export const submissionApi = createApiClient(config.back_SUBMISSION_PREFIX);
export const attachApi = createApiClient(config.back_ATTACH_PREFIX);
export const wareApi = createApiClient(config.back_WARE_PREFIX);
export const classesApi = createApiClient(config.back_CLASS_PREFIX);
export const classMemberApi = createApiClient(config.back_CLASSMEMBER_PREFIX);

// 如果有不带前缀的API，也可以创建一个基础客户端
export const baseApi = createApiClient('');