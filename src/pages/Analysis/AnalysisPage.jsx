import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faSpinner,
  faUsers,
  faChartBar,
  faExclamationTriangle,
  faTrophy,
  faUser,
  faArrowUp,
  faArrowDown,
  faEquals,
  faBookOpen,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import styles from "./AnalysisPage.module.css";
import {
  analysisApi,
  homeworkApi,
  courseApi,
  schoolApi,
  classesApi,
} from "../../services/api";

// --- 内部组件保持不变 ---
const KPICard = ({ title, value, icon, color, subtitle, trend }) => (
  <div className={styles.kpiCard}>
    <div className={styles.kpiHeader}>
      <div className={`${styles.kpiIcon} ${styles[color]}`}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className={styles.kpiInfo}>
        <h3>{title}</h3>
        <div className={styles.kpiValue}>{value}</div>
        {subtitle && <div className={styles.kpiSubtitle}>{subtitle}</div>}
      </div>
    </div>
    {trend && (
      <div className={`${styles.kpiTrend} ${styles[trend.type]}`}>
        <FontAwesomeIcon icon={trend.icon} />
        <span>{trend.text}</span>
      </div>
    )}
  </div>
);

const TrendItem = ({
  homeworkTitle,
  myScore,
  classAverage,
  highestScore,
  submissionCount,
  role,
  fullScore = 100,
  onClick,
}) => (
  <div className={styles.trendItem} onClick={onClick}>
    <div className={styles.trendHeader}>
      <h4>
        <FontAwesomeIcon
          icon={faBookOpen}
          style={{ marginRight: "8px", color: "#1890ff" }}
        />
        {homeworkTitle}
      </h4>
      <div className={styles.trendScores}>
        {role === "STUDENT" && myScore !== null && (
          <span className={styles.myScore}>我的得分: {myScore}</span>
        )}
        <span className={styles.classAverage}>班级均分: {classAverage}</span>
        {role === "TEACHER" && highestScore !== null && (
          <span className={styles.highestScore}>最高分: {highestScore}</span>
        )}
        {role === "TEACHER" && submissionCount !== null && (
          <span className={styles.submissionCount}>
            提交: {submissionCount}人
          </span>
        )}
        <span className={styles.fullScore}>满分: {fullScore}</span>
      </div>
    </div>
    <div className={styles.trendBar}>
      <div
        className={styles.trendBarMy}
        style={{
          width: `${role === "STUDENT" && myScore != null ? (myScore / fullScore) * 100 : 0}%`,
        }}
      >
        {role === "STUDENT" && myScore != null && <span>我</span>}
      </div>
      <div
        className={styles.trendBarAvg}
        style={{
          width: `${classAverage != null ? (classAverage / fullScore) * 100 : 0}%`,
        }}
      >
        <span>均</span>
      </div>
    </div>
  </div>
);

const RadarChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0)
    return (
      <div className={styles.radarEmpty}>
        <p>暂无雷达图数据</p>
      </div>
    );
  const dimensions = Object.keys(data);
  const values = Object.values(data);
  const numDimensions = dimensions.length;
  const size = 320;
  const center = size / 2;
  const radius = 100;
  const levels = 5;

  const getPointCoordinates = (value, index) => {
    const angle = (index * 2 * Math.PI) / numDimensions - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const dataPoints = values.map((val, i) => getPointCoordinates(val, i));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.radarChartWrapper}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className={styles.svgRadar}
      >
        {[...Array(levels)].map((_, levelIndex) => {
          const levelRadius = (radius / levels) * (levelIndex + 1);
          const gridPoints = dimensions
            .map((_, i) => {
              const angle = (i * 2 * Math.PI) / numDimensions - Math.PI / 2;
              const x = center + levelRadius * Math.cos(angle);
              const y = center + levelRadius * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={`grid-${levelIndex}`}
              points={gridPoints}
              fill={levelIndex % 2 === 0 ? "#fafafa" : "#ffffff"}
              stroke="#e8e8e8"
              strokeWidth="1"
            />
          );
        })}
        {dimensions.map((_, index) => {
          const { x, y } = getPointCoordinates(100, index);
          return (
            <line
              key={`spoke-${index}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e8e8e8"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={polygonPoints}
          fill="rgba(24, 144, 255, 0.25)"
          stroke="#1890ff"
          strokeWidth="2"
          className={styles.radarDataPolygon}
        />
        {dataPoints.map((p, i) => (
          <circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#ffffff"
            stroke="#1890ff"
            strokeWidth="2"
            className={styles.radarDataPoint}
          />
        ))}
        {dimensions.map((dim, index) => {
          const labelPoint = getPointCoordinates(120, index);
          const val = values[index];
          let textAnchor = "middle";
          if (Math.cos(labelPoint.angle) > 0.1) textAnchor = "start";
          else if (Math.cos(labelPoint.angle) < -0.1) textAnchor = "end";
          return (
            <g
              key={`label-${index}`}
              transform={`translate(${labelPoint.x}, ${labelPoint.y})`}
            >
              <text
                textAnchor={textAnchor}
                dy="-0.2em"
                fontSize="12"
                fontWeight="600"
                fill="#595959"
              >
                {dim}
              </text>
              <text
                textAnchor={textAnchor}
                dy="1.2em"
                fontSize="12"
                fill="#1890ff"
                fontWeight="500"
              >
                {val}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const WarningStudents = ({ students }) => {
  if (!students || Object.keys(students).length === 0) return null;
  return (
    <div className={styles.warningSection}>
      <h3>
        <FontAwesomeIcon icon={faExclamationTriangle} /> 异动预警
      </h3>
      <div className={styles.warningList}>
        {Object.entries(students).map(([name, reason]) => (
          <div key={name} className={styles.warningItem}>
            <div className={styles.warningStudent}>{name}</div>
            <div className={styles.warningReason}>{reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WrongQuestions = ({ questions, role }) => {
  if (!questions || questions.length === 0)
    return (
      <div className={styles.wrongQuestionsEmpty}>
        <p>暂无错题数据</p>
      </div>
    );
  return (
    <div className={styles.wrongQuestions}>
      <h3>{role === "STUDENT" ? "我的错题" : "高频错题"}</h3>
      <div className={styles.wrongQuestionsList}>
        {questions.map((q) => (
          <div key={q.questionId} className={styles.wrongQuestionItem}>
            <div className={styles.questionHeader}>
              <span className={styles.questionTitle}>{q.title}</span>
              <span className={styles.questionType}>{q.type}</span>
            </div>
            <div className={styles.questionScores}>
              <span>满分: {q.fullScore}</span>
              {role === "STUDENT" && q.myScore !== null && (
                <span className={styles.myScore}>我的得分: {q.myScore}</span>
              )}
              {role === "TEACHER" && q.wrongCount !== null && (
                <span className={styles.wrongCount}>
                  错误人数: {q.wrongCount}
                </span>
              )}
              {role === "TEACHER" && q.errorRate !== null && (
                <span className={styles.errorRate}>错误率: {q.errorRate}</span>
              )}
            </div>
            {role === "STUDENT" && q.aiComment && (
              <div className={styles.aiComment}>
                <strong>AI批语:</strong> {q.aiComment}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ScoreDistribution = ({ distribution }) => {
  if (!distribution || Object.keys(distribution).length === 0) return null;
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const colors = ["#52c41a", "#1890ff", "#faad14", "#ff4d4f"];
  let cumulativePercent = 0;
  const gradientStops =
    total === 0
      ? "#f5f5f5 0% 100%"
      : Object.entries(distribution)
          .map(([category, count], index) => {
            const percentage = (count / total) * 100;
            const color = colors[index % 4];
            const start = cumulativePercent;
            const end = cumulativePercent + percentage;
            cumulativePercent = end;
            return `${color} ${start}% ${end}%`;
          })
          .join(", ");

  return (
    <div className={styles.distributionSection}>
      <h3>
        <FontAwesomeIcon icon={faChartBar} /> 成绩分布
      </h3>
      <div className={styles.distributionChart}>
        <div
          className={styles.pieChart}
          style={{ background: `conic-gradient(${gradientStops})` }}
        />
        <div className={styles.distributionLegend}>
          {Object.entries(distribution).map(([category, count], index) => {
            const percentage =
              total === 0 ? "0.0" : ((count / total) * 100).toFixed(1);
            const color = colors[index % 4];
            return (
              <div key={category} className={styles.legendItem}>
                <div
                  className={styles.legendColor}
                  style={{ backgroundColor: color }}
                />
                <div className={styles.legendText}>
                  <span>{category}</span>
                  <span>
                    {count}人 ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- 7. 主页面组件 ---
const AnalysisPage = () => {
  const navigate = useNavigate();
  // 【修复1】：引入 activeId
  const { detailInfo, courseList, activeId } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isStudent = useAuthStore((state) => state.isStudent());

  // 下拉框状态管理
  const [schoolList, setSchoolList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);

  // 【修复2】：初始化优先从缓存或全局 activeId 读取
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    () => localStorage.getItem("adminSelectedSchoolId") || "",
  );
  const [selectedClassId, setSelectedClassId] = useState(
    () => localStorage.getItem("adminSelectedClassId") || activeId || "",
  );
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // 数据分析状态管理
  const [courseData, setCourseData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHomeworkLoading, setIsHomeworkLoading] = useState(false);

  // 1. 初始化学校 (仅管理员可见)
  useEffect(() => {
    if (isAdmin) {
      schoolApi
        .get("/all")
        .then((res) => {
          if (res.data?.code === 200 && res.data.data.length > 0) {
            setSchoolList(res.data.data);
            const cachedSchoolId = localStorage.getItem(
              "adminSelectedSchoolId",
            );
            const isValidCache = res.data.data.some(
              (s) => String(s.id) === String(cachedSchoolId),
            );
            if (!isValidCache) {
              setSelectedSchoolId(res.data.data[0].id);
            }
          }
        })
        .catch((err) => console.error("获取学校列表失败", err));
    }
  }, [isAdmin]);

  // 2. 初始化班级
  useEffect(() => {
    if (isAdmin) {
      if (selectedSchoolId) {
        classesApi
          .get("/all", { params: { schoolId: selectedSchoolId } })
          .then((res) => {
            if (res.data?.code === 200) {
              const data = res.data.data;
              const classes = Array.isArray(data) ? data : data ? [data] : [];
              setClassList(classes);

              // 【修复3】：验证缓存的ID是否存在于列表中
              const cachedClassId = localStorage.getItem(
                "adminSelectedClassId",
              );
              const isValidCache = classes.some(
                (c) => String(c.id) === String(cachedClassId),
              );
              if (classes.length > 0 && !isValidCache) {
                setSelectedClassId(classes[0].id);
              } else if (classes.length === 0) {
                setSelectedClassId("");
              }
            }
          })
          .catch((err) => console.error("初始化班级选择失败", err));
      } else {
        setClassList([]);
        setSelectedClassId("");
      }
    } else if (isPrincipal) {
      if (detailInfo?.classMembers) {
        const classes = detailInfo.classMembers
          .flatMap((member) => member.classes || [])
          .filter((cls) => cls !== null);
        setClassList(classes);

        const cachedClassId = localStorage.getItem("adminSelectedClassId");
        const isValidCache = classes.some(
          (c) => String(c.id) === String(cachedClassId),
        );
        if (classes.length > 0 && !isValidCache) {
          setSelectedClassId(classes[0].id);
        } else if (classes.length === 0) {
          setSelectedClassId("");
        }
      }
    } else if (isTeacher) {
      // 教师没有下拉框，强绑定全局切换的 activeId
      setSelectedClassId(activeId);
    }
  }, [isAdmin, isPrincipal, isTeacher, selectedSchoolId, detailInfo, activeId]);

  // 【新增】：同步缓存数据（与CourseListPage保持一致，确保联动及路由安全）
  useEffect(() => {
    if ((isAdmin || isPrincipal) && selectedClassId) {
      if (selectedSchoolId) {
        localStorage.setItem("adminSelectedSchoolId", selectedSchoolId);
      }
      localStorage.setItem("adminSelectedClassId", selectedClassId);

      let schoolName = "未知学校";
      let className = "未知班级";

      if (isAdmin) {
        const school = schoolList.find(
          (s) => String(s.id) === String(selectedSchoolId),
        );
        if (school) schoolName = school.name;
      } else if (isPrincipal) {
        schoolName = detailInfo?.schoolMembers?.[0]?.schoolName || "未知学校";
      }

      const cls = classList.find(
        (c) => String(c.id) === String(selectedClassId),
      );
      if (cls) className = cls.name;

      localStorage.setItem("adminSelectedSchoolName", schoolName);
      localStorage.setItem("adminSelectedClassName", className);
    }
  }, [
    selectedClassId,
    selectedSchoolId,
    isAdmin,
    isPrincipal,
    schoolList,
    classList,
    detailInfo,
  ]);

  // 3. 初始化/更新课程
  useEffect(() => {
    if (isAdmin || isPrincipal || isTeacher) {
      // 只要有了选中的班级，就调用班级查询课程接口
      if (selectedClassId) {
        courseApi
          .get(`/class/${selectedClassId}`)
          .then((res) => {
            if (res.data && res.data.code === 200) {
              const courses = res.data.data || [];
              setAvailableCourses(courses);
              if (courses.length > 0) {
                setSelectedCourseId(courses[0].id);
              } else {
                setSelectedCourseId("");
                setCourseData(null);
              }
            }
          })
          .catch((err) => console.error("获取课程失败", err));
      } else {
        setAvailableCourses([]);
        setSelectedCourseId("");
        setCourseData(null);
      }
    } else {
      // 学生或访客：直接使用全局的 courseList
      if (courseList && courseList.length > 0) {
        setAvailableCourses(courseList);
        setSelectedCourseId(courseList[0].id);
      } else {
        setAvailableCourses([]);
        setSelectedCourseId("");
        setCourseData(null);
      }
    }
  }, [isAdmin, isPrincipal, isTeacher, selectedClassId, courseList]);

  // 4. 当选中的课程ID改变时，请求该课程的成绩大盘数据
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchCourseAnalysis = async () => {
      setIsLoading(true);
      try {
        const response = await analysisApi.get(`/course/${selectedCourseId}`);
        if (response.data && response.data.code === 200) {
          setCourseData(response.data.data);
          // 默认选中趋势列表中的第一个作业用于展示微观分析
          if (
            response.data.data.trends &&
            response.data.data.trends.length > 0
          ) {
            setSelectedHomeworkId(response.data.data.trends[0].homeworkId);
          } else {
            setSelectedHomeworkId(null);
          }
        } else {
          throw new Error(response.data.message || "接口返回错误");
        }
      } catch (error) {
        console.error("获取课程分析失败:", error);
        Swal.fire({
          icon: "error",
          title: "加载课程分析失败",
          text: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseAnalysis();
  }, [selectedCourseId]);

  // 5. 加载单次作业微观诊断数据
  useEffect(() => {
    if (!selectedHomeworkId) {
      setHomeworkData(null);
      return;
    }
    const fetchHomeworkAnalysis = async () => {
      setIsHomeworkLoading(true);
      try {
        const response = await analysisApi.get(
          `/homework/${selectedHomeworkId}`,
        );
        if (response.data && response.data.code === 200) {
          setHomeworkData(response.data.data);
        } else {
          throw new Error(response.data.message || "接口返回错误");
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "加载作业分析失败",
          text: error.message,
        });
      } finally {
        setIsHomeworkLoading(false);
      }
    };
    fetchHomeworkAnalysis();
  }, [selectedHomeworkId]);

  const role = courseData?.role || "STUDENT";
  const isTeacherView = role === "TEACHER";
  const isStudentView = role === "STUDENT";

  const getTrendIcon = (diff) => {
    if (diff > 0)
      return { icon: faArrowUp, type: "positive", text: `高于均分${diff}分` };
    if (diff < 0)
      return {
        icon: faArrowDown,
        type: "negative",
        text: `低于均分${Math.abs(diff)}分`,
      };
    return { icon: faEquals, type: "neutral", text: "等于均分" };
  };

  return (
    <div className={styles.detailContainer}>
      <div className={styles.headerSection}>
        {/* <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faChartLine} />
            成绩与数据分析
          </h1>
        </div> */}

        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
          </div>

          {/* 仅管理员可见：学校筛选 */}
          {isAdmin && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>选择学校：</label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className={styles.filterInput}
              >
                {schoolList.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 仅管理员和校长可见：班级筛选 */}
          {(isAdmin || isPrincipal) && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>选择班级：</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className={styles.filterInput}
              >
                {classList.length > 0 ? (
                  classList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
                ) : (
                  <option value="">暂无班级数据</option>
                )}
              </select>
            </div>
          )}

          {/* 所有人可见：课程筛选 */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>选择课程：</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className={styles.filterInput}
            >
              {availableCourses.length > 0 ? (
                availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value="">无可选课程</option>
              )}
            </select>
          </div>
        </div>

        {/* <div className={styles.divider} style={{ marginTop: "24px" }}></div> */}
      </div>

      <div className={styles.contentSection}>
        {isLoading ? (
          <div
            className={styles.loading}
            style={{ textAlign: "center", padding: "50px" }}
          >
            <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#1890ff" />
            <p style={{ marginTop: "16px" }}>加载成绩分析中...</p>
          </div>
        ) : courseData ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              宏观课程分析 -{" "}
              {availableCourses.find(
                (c) => String(c.id) === String(selectedCourseId),
              )?.name || "未知课程"}
            </h2>

            <div className={styles.kpiGrid}>
              <KPICard
                title="提交率"
                value={courseData.submissionRate ?? "-"}
                icon={faUsers}
                color="blue"
                subtitle={isTeacherView ? "全班平均提交率" : "个人提交率"}
              />
              <KPICard
                title="平均得分"
                value={courseData.averageScore ?? "-"}
                icon={faTrophy}
                color="green"
                subtitle={isTeacherView ? "班级平均分" : "个人平均分"}
                trend={
                  isStudentView && courseData.diffWithClassAverage !== null
                    ? getTrendIcon(courseData.diffWithClassAverage)
                    : null
                }
              />
              {isStudentView && courseData.diffWithClassAverage !== null && (
                <KPICard
                  title="与班级均分差"
                  value={
                    courseData.diffWithClassAverage > 0
                      ? `+${courseData.diffWithClassAverage}`
                      : courseData.diffWithClassAverage
                  }
                  icon={faUser}
                  color={
                    courseData.diffWithClassAverage > 0
                      ? "green"
                      : courseData.diffWithClassAverage < 0
                        ? "red"
                        : "gray"
                  }
                  subtitle={
                    courseData.diffWithClassAverage > 0
                      ? "高于班级均分"
                      : courseData.diffWithClassAverage < 0
                        ? "低于班级均分"
                        : "持平"
                  }
                />
              )}
            </div>

            {isTeacherView && courseData.warningStudents && (
              <WarningStudents students={courseData.warningStudents} />
            )}

            {courseData.trends && courseData.trends.length > 0 && (
              <div className={styles.trendsSection}>
                <h3>历次作业趋势分析</h3>
                <div className={styles.trendsList}>
                  {courseData.trends.map((trend) => (
                    <TrendItem
                      key={trend.homeworkId}
                      {...trend}
                      role={role}
                      onClick={() => setSelectedHomeworkId(trend.homeworkId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {isStudentView && courseData.radarData && (
              <div className={styles.radarSection}>
                <h3>个人能力雷达图</h3>
                <RadarChart data={courseData.radarData} />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{ textAlign: "center", color: "#999", padding: "50px 0" }}
          >
            请在上方选择一个有数据的课程进行分析
          </div>
        )}

        {courseData && (
          <>
            <div className={styles.divider} style={{ margin: "24px 0" }}></div>
            <div className={styles.section} id="micro-analysis">
              <h2 className={styles.sectionTitle}>作业微观诊断</h2>

              {!selectedHomeworkId && courseData?.trends?.length > 0 ? (
                <div className={styles.selectionHint}>
                  <p>
                    👆
                    点击上方的趋势图中的单次作业，即可在此处查看其详细微观诊断。
                  </p>
                </div>
              ) : isHomeworkLoading ? (
                <div className={styles.loading}>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    size="2x"
                    color="#1890ff"
                  />
                  <p style={{ marginTop: "12px" }}>抽取诊断数据中...</p>
                </div>
              ) : homeworkData ? (
                <>
                  <div
                    className={styles.filterGroup}
                    style={{
                      marginBottom: "20px",
                      background: "#f9f9f9",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  >
                    <label className={styles.filterLabel}>分析目标作业：</label>
                    <select
                      value={selectedHomeworkId || ""}
                      onChange={(e) =>
                        setSelectedHomeworkId(Number(e.target.value))
                      }
                      className={styles.filterInput}
                      style={{ minWidth: "240px" }}
                    >
                      {courseData?.trends?.map((t) => (
                        <option key={t.homeworkId} value={t.homeworkId}>
                          {t.homeworkTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.homeworkKPIs}>
                    <KPICard
                      title="班级平均分"
                      value={homeworkData.classAverage ?? "-"}
                      icon={faUsers}
                      color="blue"
                    />
                    <KPICard
                      title="班级最高分"
                      value={homeworkData.classHighest ?? "-"}
                      icon={faTrophy}
                      color="green"
                    />
                    {isStudentView && homeworkData.myScore !== null && (
                      <KPICard
                        title="我的得分"
                        value={homeworkData.myScore}
                        icon={faUser}
                        color="purple"
                      />
                    )}
                  </div>
                  {isTeacherView && homeworkData.scoreDistribution && (
                    <ScoreDistribution
                      distribution={homeworkData.scoreDistribution}
                    />
                  )}
                  {homeworkData.wrongQuestions && (
                    <WrongQuestions
                      questions={homeworkData.wrongQuestions}
                      role={role}
                    />
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>暂无相关作业诊断数据</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
