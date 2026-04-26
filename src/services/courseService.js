import { courseApi } from "./api";

/**
 * 课程管理服务
 * 对应1.md文档中的课程管理接口
 */

/**
 * 创建课程
 * @param {Object} courseData - 课程数据 { name, description, coverImage }
 * @returns {Promise} 包含课程数据的响应
 */
export const createCourse = async (courseData) => {
  try {
    const response = await courseApi.post("/create", courseData);
    return response.data;
  } catch (error) {
    console.error("创建课程失败:", error);
    throw error;
  }
};

/**
 * 更新课程
 * @param {number|string} courseId - 课程ID
 * @param {Object} courseData - 课程数据 { name, description, coverImage }
 * @returns {Promise} 包含课程数据的响应
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    const response = await courseApi.put(`/${courseId}`, courseData);
    return response.data;
  } catch (error) {
    console.error("更新课程失败:", error);
    throw error;
  }
};

/**
 * 删除课程
 * @param {number|string} courseId - 课程ID
 * @returns {Promise} 响应数据
 */
export const deleteCourse = async (courseId) => {
  try {
    const response = await courseApi.delete(`/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("删除课程失败:", error);
    throw error;
  }
};

/**
 * 查询单个课程
 * @param {number|string} courseId - 课程ID
 * @returns {Promise} 包含课程数据的响应
 */
export const getCourse = async (courseId) => {
  try {
    const response = await courseApi.get(`/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("获取课程失败:", error);
    throw error;
  }
};

/**
 * 根据班级ID查询课程列表
 * @param {number|string} classId - 班级ID
 * @returns {Promise} 包含课程列表的响应
 */
export const getCoursesByClassId = async (classId) => {
  try {
    const response = await courseApi.get(`/class/${classId}`);
    return response.data;
  } catch (error) {
    console.error("获取课程列表失败:", error);
    throw error;
  }
};

/**
 * 导出所有函数
 */
export default {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourse,
  getCoursesByClassId,
};
