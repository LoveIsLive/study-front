import createApiClient from './apiClient';
import { config } from '../utils/config';

// 为每个模块创建API客户端实例
export const authApi = createApiClient(config.back_AUTH_PREFIX);
export const indexApi = createApiClient(config.back_INDEX_PREFIX);
export const homeworkApi = createApiClient(config.back_HOMEWORK_PREFIX);
export const submissionApi = createApiClient(config.back_SUBMISSION_PREFIX);
export const attachApi = createApiClient(config.back_ATTACH_PREFIX);
export const wareApi = createApiClient(config.back_WARE_PREFIX);

// 如果有不带前缀的API，也可以创建一个基础客户端
export const baseApi = createApiClient('');