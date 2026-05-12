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

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

// 智能提取课程ID
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

// 【修复点】：增加并完善作业状态解析
const normalizeStatus = (statusVal) => {
  if (statusVal === null || statusVal === undefined) return "UNSUBMITTED";
  const s = String(statusVal).toUpperCase();
  if (s === "0" || s === "未提交" || s === "UNSUBMITTED") return "UNSUBMITTED";
  if (s === "1" || s === "已提交" || s === "提交" || s === "SUBMITTED")
    return "SUBMITTED";
  if (s === "RETURNED" || s === "被退回") return "RETURNED";
  if (s === "HAVE_UPDATED" || s === "作业有更新") return "HAVE_UPDATED";
  if (s === "RE_SUBMITTED" || s === "重新提交") return "RE_SUBMITTED";
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

  // 【修复点】：将单一 scoreRange 拆分成 minScore 和 maxScore
  const [filters, setFilters] = useState({
    status: "",
    courseId: context === "course" ? contextId : "",
    minScore: "",
    maxScore: "",
    creatorName: "",
    date: "",
  });
  const { courseList } = useAuthStore();

  useEffect(() => {
    if (activeTab === "all-homework" && filters.status !== "") {
      setFilters((prev) => ({ ...prev, status: "" }));
    }
  }, [activeTab]);

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

  // 【修复点】：修改我的提交 API 接口请求路径
  const loadSubmissions = useCallback(async () => {
    if (isGuest) return;

    setIsLoading(true);
    try {
      // 判断如果是当前在特定课程详情页内，则使用特化接口
      let url = "/student/all";
      if (context === "course" && contextId) {
        url = `/student/${contextId}/all`;
      }

      const res = await submissionApi.get(url);
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
  }, [isGuest, context, contextId]);

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

  const filteredHomeworks = useMemo(() => {
    return rawHomeworks.filter((item) => {
      // 【关键修复行】：防空保护
      if (!item) return false;

      const itemCourseId = extractCourseId(item);
      const matchCourse =
        !filters.courseId || itemCourseId === String(filters.courseId);

      const rawStatus = item.submissionStatus || item.status;
      const normalizedStatus = normalizeStatus(rawStatus);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      const matchCreator =
        !filters.creatorName ||
        (item.teacherName && item.teacherName.includes(filters.creatorName));

      const matchDate =
        !filters.date ||
        (item.createTime && item.createTime.substring(0, 10) === filters.date);

      return matchCourse && matchStatus && matchCreator && matchDate;
    });
  }, [rawHomeworks, filters]);

  // 【修复点】：使用双输入框（最大值最小值）拦截分数过滤
  // 【修复】：加入 !sub 空值拦截
  const filteredSubmissions = useMemo(() => {
    return rawSubmissions.filter((sub) => {
      // 【关键修复行】：防御性检查，如果数组里混入了 null 元素则直接过滤掉，防止崩溃
      if (!sub) return false;

      const normalizedStatus = normalizeStatus(sub.status);
      const matchStatus =
        !filters.status || normalizedStatus === filters.status;

      // 双输入分数区间判定
      let matchScore = true;
      const hasMin = filters.minScore !== "";
      const hasMax = filters.maxScore !== "";
      if ((hasMin || hasMax) && sub.score !== null && sub.score !== undefined) {
        const min = hasMin ? Number(filters.minScore) : -Infinity;
        const max = hasMax ? Number(filters.maxScore) : Infinity;
        matchScore = sub.score >= min && sub.score <= max;
      } else if (
        (hasMin || hasMax) &&
        (sub.score === null || sub.score === undefined)
      ) {
        matchScore = false;
      }

      const matchDate =
        !filters.date ||
        (sub.updateTime && sub.updateTime.substring(0, 10) === filters.date);

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

            {/* 【修复点】：扩展作业状态枚举 */}
            {activeTab === "my-submissions" && (
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className={styles.filterInput}
              >
                <option value="">全部状态</option>
                {/* <option value="UNSUBMITTED">未提交</option> */}
                <option value="SUBMITTED">已提交</option>
                <option value="RETURNED">被退回</option>
                <option value="HAVE_UPDATED">作业有更新</option>
                <option value="RE_SUBMITTED">重新提交</option>
                <option value="GRADED">已批改</option>
              </select>
            )}

            <input
              type="text"
              placeholder="发布教师"
              value={filters.creatorName}
              onChange={(e) =>
                setFilters({ ...filters, creatorName: e.target.value })
              }
              className={styles.filterInput}
            />

            {/* 【修复点】：双输入框的分数区间 */}
            {activeTab === "my-submissions" && !isGuest && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#fff",
                  border: "1px solid #ced4da",
                  padding: "0 8px",
                  borderRadius: "6px",
                }}
              >
                <input
                  type="number"
                  placeholder="最低分"
                  value={filters.minScore}
                  onChange={(e) =>
                    setFilters({ ...filters, minScore: e.target.value })
                  }
                  style={{
                    border: "none",
                    outline: "none",
                    width: "60px",
                    background: "transparent",
                    padding: "8px 0",
                  }}
                />
                <span style={{ color: "#6c757d" }}>-</span>
                <input
                  type="number"
                  placeholder="最高分"
                  value={filters.maxScore}
                  onChange={(e) =>
                    setFilters({ ...filters, maxScore: e.target.value })
                  }
                  style={{
                    border: "none",
                    outline: "none",
                    width: "60px",
                    background: "transparent",
                    padding: "8px 0",
                  }}
                />
              </div>
            )}

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
