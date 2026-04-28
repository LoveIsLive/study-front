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
    const formData = new FormData();
    
    // 构建 DTO 对象（排除 coverImage 字段）
    const { coverImage, ...dtoFields } = courseData;
    const dto = JSON.stringify(dtoFields);
    formData.append('dto', dto);
    
    // 如果 coverImage 是 File 对象，则添加
    if (coverImage && coverImage instanceof File) {
      formData.append('coverImage', coverImage);
    } else if (coverImage && typeof coverImage === 'string' && coverImage.startsWith('data:')) {
      // 如果是 base64 字符串，转换为 File 对象
      const base64Data = coverImage.split(',')[1];
      const mimeType = coverImage.match(/^data:(.*?);/)[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const fileName = `cover_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
      const file = new File([blob], fileName, { type: mimeType });
      formData.append('coverImage', file);
    }
    // 如果 coverImage 是其他类型（如路径字符串），不添加
    
    const response = await courseApi.post("/create", formData);
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
    const formData = new FormData();
    
    // 构建 DTO 对象（排除 coverImage 字段）
    const { coverImage, ...dtoFields } = courseData;
    const dto = JSON.stringify(dtoFields);
    formData.append('dto', dto);
    
    // 如果 coverImage 是 File 对象，则添加
    if (coverImage && coverImage instanceof File) {
      formData.append('coverImage', coverImage);
    } else if (coverImage && typeof coverImage === 'string' && coverImage.startsWith('data:')) {
      // 如果是 base64 字符串，转换为 File 对象
      const base64Data = coverImage.split(',')[1];
      const mimeType = coverImage.match(/^data:(.*?);/)[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const fileName = `cover_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
      const file = new File([blob], fileName, { type: mimeType });
      formData.append('coverImage', file);
    }
    // 如果 coverImage 是其他类型（如路径字符串），不添加
    
    const response = await courseApi.put(`/${courseId}`, formData);
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
