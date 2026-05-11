// src/pages/Homework/components/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { homeworkApi, submissionApi } from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import HomeworkList from "./HomeworkList";
import SubmissionDetailView from "./SubmissionDetailView";
import SubmissionList from "./SubmissionList";
import SubmissionModal from "./SubmissionModal";
import Spinner from "../../../components/common/Spinner/Spinner";
import styles from "../HomeworkPage.module.css";
import Swal from "sweetalert2";

// 【修复点 1】：引入缺失的 FontAwesomeIcon 和 faFilter
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

// 智能提取课程ID，兼容平铺或嵌套的实体类
const extractCourseId = (obj) => {
  if (!obj) return null;
  if (obj.courseId !== undefined && obj.courseId !== null)
    return String(obj.courseId);
  if (obj.course && obj.course.id !== undefined && obj.course.id !== null)
    return String(obj.course.id);
  if (obj.homework) {
    if (obj.homework.courseId !== undefined && obj.homework.courseId !== null)
      return String(obj.homework.courseId);
    if (
      obj.homework.course &&
      obj.homework.course.id !== undefined &&
      obj.homework.course.id !== null
    )
      return String(obj.homework.course.id);
  }
  return null;
};

// 状态归一化，兼容后端的数字枚举或中文字符串
const normalizeStatus = (statusVal) => {
  if (statusVal === null || statusVal === undefined) return "UNSUBMITTED";
  const s = String(statusVal).toUpperCase();
  if (s === "0" || s === "未提交" || s === "UNSUBMITTED") return "UNSUBMITTED";
  if (s === "1" || s === "已提交" || s === "提交" || s === "SUBMITTED")
    return "SUBMITTED";
  if (s === "2" || s === "已批改" || s === "批改" || s === "GRADED")
    return "GRADED";
  return s;
};

const StudentDashboard = ({
  context = "class",
  contextId = null,
  view,
  navigateTo,
  onOpenDiscussion,
}) => {
  const isGuest = useAuthStore((state) => state.isGuest());

  const [activeTab, setActiveTab] = useState("all-homework");
  const [rawHomeworks, setRawHomeworks] = useState([]);
  const [rawSubmissions, setRawSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 包含发布者姓名的筛选条件
  const [filters, setFilters] = useState({
    status: "", // 保持为空字符串，默认展示全集
    courseId: context === "course" ? contextId : "",
    scoreRange: "",
    creatorName: "",
    date: "",
  });
  const { courseList } = useAuthStore();

  // 当切换到"所有作业"时，清空状态筛选，防止隐形过滤
  useEffect(() => {
    if (activeTab === "all-homework" && filters.status !== "") {
      setFilters((prev) => ({ ...prev, status: "" }));
    }
  }, [activeTab]);

  // 加载作业列表
  const fetchAllHomeworks = useCallback(async () => {
    setIsLoading(true);
    try {
      let response;

      if (isGuest && context !== "course") {
        if (!courseList || courseList.length === 0) {
          setRawHomeworks([]);
          setIsLoading(false);
          return;
        }

        const fetchPromises = courseList.map((course) =>
          homeworkApi.get(`/course/${course.id}`).catch((err) => {
            console.warn(`获取课程 ${course.id} 作业失败`, err);
            return null;
          }),
        );

        const results = await Promise.all(fetchPromises);
        let aggregatedHws = [];

        results.forEach((res) => {
          if (
            res &&
            res.data &&
            res.data.code === 200 &&
            Array.isArray(res.data.data)
          ) {
            aggregatedHws.push(...res.data.data);
          }
        });

        aggregatedHws.sort(
          (a, b) =>
            new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime(),
        );
        setRawHomeworks(aggregatedHws);
        setIsLoading(false);
        return;
      }

      if (context === "course" && contextId) {
        response = await homeworkApi.get(`/course/${contextId}`);
      } else if (context === "class" && contextId) {
        response = await homeworkApi.get(`/class/${contextId}`);
      } else {
        response = await homeworkApi.get("/student/all");
      }

      if (response && response.data) {
        setRawHomeworks(response.data.data || []);
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载作业列表失败" });
    } finally {
      setIsLoading(false);
    }
  }, [context, contextId, isGuest, courseList]);

  // 加载我的提交记录
  const loadSubmissions = useCallback(async () => {
    if (isGuest) return;

    setIsLoading(true);
    try {
      const res = await submissionApi.get("/student/all");
      if (res.data.code === 200) {
        setRawSubmissions(res.data.data || []);
      } else {
        Swal.fire({ icon: "error", title: "加载我的提交失败" });
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载我的提交失败" });
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (view.name === "list") {
      if (activeTab === "all-homework") {
        fetchAllHomeworks();
      } else if (!isGuest) {
        loadSubmissions();
      }
    }
  }, [
    view,
    activeTab,
    fetchAllHomeworks,
    loadSubmissions,
    isGuest,
    refreshTrigger,
  ]);

  // 使用安全提取器过滤所有作业，并加入发布者筛选
  const filteredHomeworks = useMemo(() => {
    return rawHomeworks.filter((item) => {
      const itemCourseId = extractCourseId(item);
      const matchCourse =
        !filters.courseId || itemCourseId === String(filters.courseId);

      const rawStatus = item.submissionStatus || item.status;
      const normalizedStatus = normalizeStatus(rawStatus);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      // 匹配发布教师 teacherName
      const matchCreator =
        !filters.creatorName ||
        (item.teacherName && item.teacherName.includes(filters.creatorName));

      // 使用 substring 截取 "YYYY-MM-DD" 进行发布时间精准匹配
      const matchDate =
        !filters.date ||
        (item.createTime && item.createTime.substring(0, 10) === filters.date);

      return matchCourse && matchStatus && matchCreator && matchDate;
    });
  }, [rawHomeworks, filters]);

  // 使用安全提取器过滤提交记录
  const filteredSubmissions = useMemo(() => {
    return rawSubmissions.filter((sub) => {
      const normalizedStatus = normalizeStatus(sub.status);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      // 支持分数区间 (例如输入 "80-100" 或 "90")
      let matchScore = true;
      if (filters.scoreRange && sub.score !== null && sub.score !== undefined) {
        if (filters.scoreRange.includes("-")) {
          const [min, max] = filters.scoreRange.split("-").map(Number);
          if (!isNaN(min) && !isNaN(max)) {
            matchScore = sub.score >= min && sub.score <= max;
          }
        } else {
          matchScore = String(sub.score).includes(filters.scoreRange);
        }
      } else if (
        filters.scoreRange &&
        (sub.score === null || sub.score === undefined)
      ) {
        matchScore = false;
      }

      // 提交时间匹配 updateTime，并且提取 "YYYY-MM-DD"
      const matchDate =
        !filters.date ||
        (sub.updateTime && sub.updateTime.substring(0, 10) === filters.date);

      // 匹配发布教师（从 sub.homework.teacherName 中提取）
      const matchCreator =
        !filters.creatorName ||
        (sub.homework &&
          sub.homework.teacherName &&
          sub.homework.teacherName.includes(filters.creatorName));

      return matchStatus && matchScore && matchDate && matchCreator;
    });
  }, [rawSubmissions, filters]);

  const handleOpenEditModal = (submission) => {
    setEditingSubmission(submission);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSubmission(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    if (view.name === "submissionDetail") {
      setRefreshTrigger((t) => t + 1);
    } else {
      loadSubmissions();
    }
  };

  const renderCurrentView = () => {
    if (isLoading) {
      return <Spinner />;
    }

    if (view.name === "submissionDetail") {
      return (
        <SubmissionDetailView
          homeworkId={view.data}
          onBack={() => navigateTo("list")}
          onEditSubmission={handleOpenEditModal}
          refreshTrigger={refreshTrigger}
        />
      );
    }

    return (
      <>
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === "all-homework" ? styles.active : ""}`}
            onClick={() => setActiveTab("all-homework")}
          >
            所有作业
          </button>
          {!isGuest && (
            <button
              className={`${styles.tabBtn} ${activeTab === "my-submissions" ? styles.active : ""}`}
              onClick={() => setActiveTab("my-submissions")}
            >
              我的提交
            </button>
          )}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <div className={styles.filterIcon}>
              <FontAwesomeIcon icon={faFilter} />
            </div>

            {/* 课程筛选（仅在“所有作业”选项卡且非单课程环境下显示） */}
            {context !== "course" && activeTab === "all-homework" && (
              <select
                value={filters.courseId}
                onChange={(e) =>
                  setFilters({ ...filters, courseId: e.target.value })
                }
                className={styles.filterInput}
              >
                <option value="">全部课程</option>
                {courseList?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}

            {/* 【修改点】：提交状态下拉框仅在“我的提交”下完整显示 */}
            {activeTab === "my-submissions" && (
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className={styles.filterInput}
              >
                <option value="">全部状态</option>
                <option value="UNSUBMITTED">未提交</option>
                <option value="SUBMITTED">已提交</option>
                <option value="GRADED">已批改</option>
              </select>
            )}

            {/* 发布教师（共有） */}
            <input
              type="text"
              placeholder="发布教师"
              value={filters.creatorName}
              onChange={(e) =>
                setFilters({ ...filters, creatorName: e.target.value })
              }
              className={styles.filterInput}
            />

            {/* 分数筛选 (仅在“我的提交”下显示) */}
            {activeTab === "my-submissions" && !isGuest && (
              <input
                type="text"
                placeholder="分数区间 (如: 80-100)"
                value={filters.scoreRange}
                onChange={(e) =>
                  setFilters({ ...filters, scoreRange: e.target.value })
                }
                className={styles.filterInput}
              />
            )}

            {/* 日期过滤 (显式标记发布时间和提交时间) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                border: "1px solid #ced4da",
                padding: "0 12px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  color: "#6c757d",
                  whiteSpace: "nowrap",
                }}
              >
                {activeTab === "all-homework" ? "发布时间" : "提交时间"}
              </span>
              <input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                style={{
                  border: "none",
                  padding: "8px 0",
                  outline: "none",
                  background: "transparent",
                  color: "#495057",
                }}
              />
            </div>
          </div>
        </div>

        {activeTab === "all-homework" && (
          <HomeworkList
            homeworks={filteredHomeworks}
            onSelectHomework={(homeworkId) =>
              navigateTo("homeworkDetail", homeworkId)
            }
            onOpenDiscussion={onOpenDiscussion}
          />
        )}

        {activeTab === "my-submissions" && !isGuest && (
          <SubmissionList
            submissions={filteredSubmissions}
            isStudentView={true}
            onEditSubmission={handleOpenEditModal}
            onOpenDiscussion={onOpenDiscussion}
            onViewDetail={(homeworkId) =>
              navigateTo("homeworkDetail", homeworkId)
            }
          />
        )}
      </>
    );
  };

  return (
    <div>
      {renderCurrentView()}
      <SubmissionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingSubmission={editingSubmission}
      />
    </div>
  );
};

export default StudentDashboard;
