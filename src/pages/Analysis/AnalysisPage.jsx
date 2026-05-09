import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faSpinner,
  faArrowLeft,
  faUsers,
  faChartBar,
  faExclamationTriangle,
  faTrophy,
  faUser,
  faArrowUp,
  faArrowDown,
  faEquals,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import { analysisApi } from "../../services/api";
import styles from "./AnalysisPage.module.css";

// KPI卡片组件
const KPICard = ({ title, value, icon, color, subtitle, trend }) => {
  return (
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
};

// 趋势图表项 (修复：引入 fullScore，动态计算百分比)
const TrendItem = ({
  homeworkTitle,
  myScore,
  classAverage,
  highestScore,
  submissionCount,
  role,
  fullScore = 100,
  onClick,
}) => {
  return (
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
};

// 雷达图表项
// 改进版：SVG 原生高颜值雷达图
const RadarChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className={styles.radarEmpty}>
        <p>暂无雷达图数据</p>
      </div>
    );
  }

  const dimensions = Object.keys(data);
  const values = Object.values(data);
  const numDimensions = dimensions.length;

  // SVG 画布配置
  const size = 320; // 画布大小
  const center = size / 2; // 圆心坐标
  const radius = 100; // 雷达图最大半径 (留出空间给外围文字)
  const levels = 5; // 背景网格层数 (例如 20%, 40%, 60%, 80%, 100%)

  // 工具函数：极坐标转直角坐标 (减去 Math.PI/2 是为了让第一个点在正上方)
  const getPointCoordinates = (value, index) => {
    const angle = (index * 2 * Math.PI) / numDimensions - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // 生成实际数据的多边形顶点坐标
  const dataPoints = values.map((val, i) => getPointCoordinates(val, i));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={styles.radarChartWrapper}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className={styles.svgRadar}>
        
        {/* 1. 绘制背景雷达网格 (五层同心多边形) */}
        {[...Array(levels)].map((_, levelIndex) => {
          const levelRadius = (radius / levels) * (levelIndex + 1);
          const gridPoints = dimensions.map((_, i) => {
            const angle = (i * 2 * Math.PI) / numDimensions - Math.PI / 2;
            const x = center + levelRadius * Math.cos(angle);
            const y = center + levelRadius * Math.sin(angle);
            return `${x},${y}`;
          }).join(" ");
          
          return (
            <polygon
              key={`grid-${levelIndex}`}
              points={gridPoints}
              fill={levelIndex % 2 === 0 ? "#fafafa" : "#ffffff"} // 斑马纹填充
              stroke="#e8e8e8"
              strokeWidth="1"
            />
          );
        })}

        {/* 2. 绘制从圆心向外的射线骨架 */}
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

        {/* 3. 绘制能力值覆盖多边形 */}
        <polygon
          points={polygonPoints}
          fill="rgba(24, 144, 255, 0.25)" // 半透明科技蓝填充
          stroke="#1890ff"
          strokeWidth="2"
          className={styles.radarDataPolygon}
        />

        {/* 4. 绘制数据锚点 */}
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

        {/* 5. 绘制外围文本标签 (智能对齐防重叠) */}
        {dimensions.map((dim, index) => {
          // 将文字推到最大半径之外 20px 的位置
          const labelPoint = getPointCoordinates(120, index); 
          const val = values[index];
          
          // 智能文本对齐：左侧靠右对齐，右侧靠左对齐，正上正下居中对齐
          let textAnchor = "middle";
          if (Math.cos(labelPoint.angle) > 0.1) textAnchor = "start";
          else if (Math.cos(labelPoint.angle) < -0.1) textAnchor = "end";

          return (
            <g key={`label-${index}`} transform={`translate(${labelPoint.x}, ${labelPoint.y})`}>
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

// 预警学生列表
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

// 错题集组件
const WrongQuestions = ({ questions, role }) => {
  if (!questions || questions.length === 0) {
    return (
      <div className={styles.wrongQuestionsEmpty}>
        <p>暂无错题数据</p>
      </div>
    );
  }

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

// 成绩分布饼图 (修复：使用现代 conic-gradient 完美绘制饼图)
// 成绩分布饼图 (修复：处理 total 为 0 导致的 NaN 问题，增加零数据视觉兜底)
const ScoreDistribution = ({ distribution }) => {
  if (!distribution || Object.keys(distribution).length === 0) return null;

  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const colors = ["#52c41a", "#1890ff", "#faad14", "#ff4d4f"];

  let cumulativePercent = 0;

  // 动态构建 conic-gradient 字符串
  // 【修复】：如果 total 为 0，直接赋予一个纯灰色的渐变底色，避免 0/0 导致渲染错误
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
            // 【修复】：使用三元运算符，当 total 为 0 时直接返回 "0.0"，否则正常计算
            const percentage =
              total === 0 ? "0.0" : ((count / total) * 100).toFixed(1);
            const color = colors[index % 4];

            return (
              <div key={category} className={styles.legendItem}>
                {/* 增加一个细节：如果全为0，图例颜色也可以选择变灰，或者保持原有颜色，这里保持原有颜色作为分类标识 */}
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

// 主页面组件
const AnalysisPage = () => {
  const navigate = useNavigate();
  const { activeType, currentCourseId, currentCourse } = useAuthStore();
  const [courseData, setCourseData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHomeworkLoading, setIsHomeworkLoading] = useState(false);

  useEffect(() => {
    if (activeType !== "class" || !currentCourseId) return;

    const fetchCourseAnalysis = async () => {
      setIsLoading(true);
      try {
        const response = await analysisApi.get(`/course/${currentCourseId}`);
        if (response.data && response.data.code === 200) {
          setCourseData(response.data.data);
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
  }, [activeType, currentCourseId]);

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
        console.error("获取作业分析失败:", error);
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

  if (activeType !== "class" || !currentCourseId) {
    return (
      <div className={styles.detailContainer}>
        <div className={styles.contentSection}>
          <div className={styles.errorState}>
            <h2>
              {activeType !== "class"
                ? "成绩分析仅适用于班级上下文"
                : "请先选择课程"}
            </h2>
            <p>
              {activeType !== "class"
                ? "请切换到班级上下文以使用成绩分析功能。"
                : "使用成绩分析前，请先在课程选择页面选择一门课程。"}
            </p>
            <button
              onClick={() =>
                navigate(activeType !== "class" ? "/" : "/courses")
              }
              className={styles.backButton}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> 返回
              {activeType !== "class" ? "首页" : "课程选择"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.detailContainer}>
        <div
          className={styles.contentSection}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#1890ff" />
            <p style={{ marginTop: "16px" }}>加载成绩分析中...</p>
          </div>
        </div>
      </div>
    );
  }

  const role = courseData?.role || "STUDENT";
  const isTeacher = role === "TEACHER";
  const isStudent = role === "STUDENT";

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
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faChartLine} />
            成绩与数据分析
          </h1>
        </div>
        <div className={styles.divider}></div>
        {/* <div className={styles.descriptionSection}>
          <h2 className={styles.descriptionHeader}>分析概览</h2>
          <p className={styles.descriptionText}>
            当前课程: <strong>{currentCourse?.name || "未知课程"}</strong>
            {courseData && (
              <span className={styles.roleBadge}>
                {isTeacher ? "教师视图" : "学生视图"}
              </span>
            )}
            <br/>
            基于您当前的角色，为您提供准确的成绩大盘、学习情况诊断与针对性作业分析。您可以点击下方的宏观趋势图以获取详细的微观诊断。
          </p>
        </div> */}
      </div>

      <div className={styles.contentSection}>
        {courseData && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>宏观课程分析</h2>

            <div className={styles.kpiGrid}>
              {/* 修复：增加 ?? "-" 进行兜底 */}
              <KPICard
                title="提交率"
                value={courseData.submissionRate ?? "-"}
                icon={faUsers}
                color="blue"
                subtitle={isTeacher ? "全班平均提交率" : "个人提交率"}
              />
              <KPICard
                title="平均得分"
                value={courseData.averageScore ?? "-"}
                icon={faTrophy}
                color="green"
                subtitle={isTeacher ? "班级平均分" : "个人平均分"}
                trend={
                  isStudent && courseData.diffWithClassAverage !== null
                    ? getTrendIcon(courseData.diffWithClassAverage)
                    : null
                }
              />
              {isStudent && courseData.diffWithClassAverage !== null && (
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

            {isTeacher && courseData.warningStudents && (
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

            {isStudent && courseData.radarData && (
              <div className={styles.radarSection}>
                <h3>个人能力雷达图</h3>
                <RadarChart data={courseData.radarData} />
              </div>
            )}
          </div>
        )}

        <div className={styles.divider} style={{ margin: "24px 0" }}></div>

        <div className={styles.section} id="micro-analysis">
          <h2 className={styles.sectionTitle}>作业微观诊断</h2>

          {!selectedHomeworkId && courseData?.trends?.length > 0 ? (
            <div className={styles.selectionHint}>
              <p>
                👆 点击上方的趋势图中的单次作业，即可在此处查看其详细微观诊断。
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
                {isStudent && homeworkData.myScore !== null && (
                  <KPICard
                    title="我的得分"
                    value={homeworkData.myScore}
                    icon={faUser}
                    color="purple"
                  />
                )}
              </div>

              {isTeacher && homeworkData.scoreDistribution && (
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
      </div>
    </div>
  );
};

export default AnalysisPage;
