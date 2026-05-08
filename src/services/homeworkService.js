import { homeworkApi, submissionApi } from "./api";

export const homeworkService = {
  // 获取班级作业 (用于左侧固定栏进入的 HomeworkPage)
  getByClass: (classId, params) =>
    homeworkApi.get(`/class/${classId}`, { params }),

  // 获取课程作业 (用于 CourseHomeworkView)
  getByCourse: (courseId, params) =>
    homeworkApi.get(`/course/${courseId}`, { params }),

  // 学生获取自己的提交记录 (支持状态、分数等过滤)
  getStudentSubmissions: (params) =>
    submissionApi.get("/student/all", { params }),
};