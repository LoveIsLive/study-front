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

// 趋势图表项
const TrendItem = ({ homeworkTitle, myScore, classAverage, highestScore, submissionCount, role, onClick }) => {
  return (
    <div className={styles.trendItem} onClick={onClick}>
      <div className={styles.trendHeader}>
        <h4>{homeworkTitle}</h4>
        <div className={styles.trendScores}>
          {role === "STUDENT" && myScore !== null && (
            <span className={styles.myScore}>我的得分: {myScore}</span>
          )}
          <span className={styles.classAverage}>班级均分: {classAverage}</span>
          {role === "TEACHER" && highestScore !== null && (
            <span className={styles.highestScore}>最高分: {highestScore}</span>
          )}
          {role === "TEACHER" && submissionCount !== null && (
            <span className={styles.submissionCount}>提交: {submissionCount}人</span>
          )}
        </div>
      </div>
      <div className={styles.trendBar}>
        <div 
          className={styles.trendBarMy} 
          style={{ width: `${role === "STUDENT" && myScore ? (myScore / 100) * 100 : 0}%` }}
        >
          {role === "STUDENT" && myScore && <span>我</span>}
        </div>
        <div 
          className={styles.trendBarAvg} 
          style={{ width: `${classAverage ? (classAverage / 100) * 100 : 0}%` }}
        >
          <span>均</span>
        </div>
      </div>
    </div>
  );
};

// 雷达图表项
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

  return (
    <div className={styles.radarChart}>
      <div className={styles.radarGrid}>
        {dimensions.map((dim, index) => {
          const angle = (index * 360) / dimensions.length;
          const value = values[index];
          const radius = (value / 100) * 80;
          const x = 50 + radius * Math.cos((angle - 90) * (Math.PI / 180));
          const y = 50 + radius * Math.sin((angle - 90) * (Math.PI / 180));

          return (
            <div key={dim} className={styles.radarDimension}>
              <div className={styles.radarLabel}>{dim}</div>
              <div className={styles.radarValue}>{value}%</div>
              <div 
                className={styles.radarPoint}
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 预警学生列表
const WarningStudents = ({ students }) => {
  if (!students || Object.keys(students).length === 0) {
    return null;
  }

  return (
    <div className={styles.warningSection}>
      <h3><FontAwesomeIcon icon={faExclamationTriangle} /> 异动预警</h3>
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
                <span className={styles.wrongCount}>错误人数: {q.wrongCount}</span>
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

// 成绩分布饼图
const ScoreDistribution = ({ distribution }) => {
  if (!distribution || Object.keys(distribution).length === 0) {
    return null;
  }

  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  let currentAngle = 0;

  return (
    <div className={styles.distributionSection}>
      <h3><FontAwesomeIcon icon={faChartBar} /> 成绩分布</h3>
      <div className={styles.distributionChart}>
        <div className={styles.pieChart}>
          {Object.entries(distribution).map(([category, count], index) => {
            const percentage = (count / total) * 100;
            const angle = (percentage / 100) * 360;
            const color = ["#4CAF50", "#2196F3", "#FFC107", "#F44336"][index % 4];

            return (
              <div
                key={category}
                className={styles.pieSlice}
                style={{
                  backgroundColor: color,
                  transform: `rotate(${currentAngle}deg)`,
                  clipPath: percentage >= 50 
                    ? `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)`
                    : `polygon(50% 50%, 50% 0%, 100% 0%, 100% ${percentage}%, 50% ${percentage}%)`,
                }}
              />
            );
          })}
        </div>
        <div className={styles.distributionLegend}>
          {Object.entries(distribution).map(([category, count], index) => {
            const percentage = ((count / total) * 100).toFixed(1);
            const color = ["#4CAF50", "#2196F3", "#FFC107", "#F44336"][index % 4];

            return (
              <div key={category} className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: color }} />
                <div className={styles.legendText}>
                  <span>{category}</span>
                  <span>{count}人 ({percentage}%)</span>
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

  // 获取课程分析数据
  useEffect(() => {
    if (activeType !== "class" || !currentCourseId) {
      return;
    }

    const fetchCourseAnalysis = async () => {
      setIsLoading(true);
      try {
        const response = await analysisApi.get(`/course/${currentCourseId}`);
        setCourseData(response.data.data);
      } catch (error) {
        console.error("获取课程分析失败:", error);
        Swal.fire({ icon: "error", title: "加载课程分析失败" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseAnalysis();
  }, [activeType, currentCourseId]);

  // 获取作业分析数据
  useEffect(() => {
    if (!selectedHomeworkId) {
      setHomeworkData(null);
      return;
    }

    const fetchHomeworkAnalysis = async () => {
      setIsHomeworkLoading(true);
      try {
        const response = await analysisApi.get(`/homework/${selectedHomeworkId}`);
        setHomeworkData(response.data.data);
      } catch (error) {
        console.error("获取作业分析失败:", error);
        Swal.fire({ icon: "error", title: "加载作业分析失败" });
      } finally {
        setIsHomeworkLoading(false);
      }
    };

    fetchHomeworkAnalysis();
  }, [selectedHomeworkId]);

  // 如果不在班级上下文或没有选择课程，显示提示
  if (activeType !== "class") {
    return (
      <div className={styles.analysisPage}>
        <div className={styles.fileManager}>
          <div className={styles.errorState}>
            <h2>成绩分析仅适用于班级上下文</h2>
            <p>请切换到班级上下文以使用成绩分析功能。</p>
            <button onClick={() => navigate("/")} className={styles.backButton}>
              <FontAwesomeIcon icon={faArrowLeft} /> 返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCourseId) {
    return (
      <div className={styles.analysisPage}>
        <div className={styles.fileManager}>
          <div className={styles.errorState}>
            <h2>请先选择课程</h2>
            <p>使用成绩分析前，请先在课程选择页面选择一门课程。</p>
            <button
              onClick={() => navigate("/courses")}
              className={styles.backButton}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> 前往课程选择
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.analysisPage}>
        <div className={styles.fileManager}>
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <p>加载成绩分析中...</p>
          </div>
        </div>
      </div>
    );
  }

  const role = courseData?.role || "STUDENT";
  const isTeacher = role === "TEACHER";
  const isStudent = role === "STUDENT";

  // 计算趋势图标
  const getTrendIcon = (diff) => {
    if (diff > 0) return { icon: faArrowUp, type: "positive", text: `高于均分${diff}分` };
    if (diff < 0) return { icon: faArrowDown, type: "negative", text: `低于均分${Math.abs(diff)}分` };
    return { icon: faEquals, type: "neutral", text: "等于均分" };
  };

  return (
    <div className={styles.analysisPage}>
      <div className={styles.fileManager}>
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            <h1>
              <FontAwesomeIcon icon={faChartLine} /> 成绩分析
            </h1>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.courseInfo}>
              当前课程: <strong>{currentCourse?.name || "未知课程"}</strong>
              {courseData && (
                <span className={styles.roleBadge}>
                  {isTeacher ? "教师视图" : "学生视图"}
                </span>
              )}
            </div>
          </div>
        </header>
        
        <div className={styles.mainContent}>
          {/* 课程宏观分析 */}
          {courseData && (
            <div className={styles.section}>
              <h2>课程宏观分析</h2>
              
              {/* KPI指标 */}
              <div className={styles.kpiGrid}>
                <KPICard
                  title="提交率"
                  value={courseData.submissionRate}
                  icon={faUsers}
                  color="blue"
                  subtitle={isTeacher ? "全班平均提交率" : "个人提交率"}
                />
                <KPICard
                  title="平均得分"
                  value={courseData.averageScore}
                  icon={faTrophy}
                  color="green"
                  subtitle={isTeacher ? "班级平均分" : "个人平均分"}
                  trend={isStudent && courseData.diffWithClassAverage !== null 
                    ? getTrendIcon(courseData.diffWithClassAverage)
                    : null}
                />
                {isStudent && courseData.diffWithClassAverage !== null && (
                  <KPICard
                    title="与班级均分差"
                    value={courseData.diffWithClassAverage > 0 
                      ? `+${courseData.diffWithClassAverage}` 
                      : courseData.diffWithClassAverage}
                    icon={faUser}
                    color={courseData.diffWithClassAverage > 0 ? "green" : 
                           courseData.diffWithClassAverage < 0 ? "red" : "gray"}
                    subtitle={courseData.diffWithClassAverage > 0 ? "高于班级均分" : 
                             courseData.diffWithClassAverage < 0 ? "低于班级均分" : "持平"}
                  />
                )}
              </div>

              {/* 预警学生（教师视图） */}
              {isTeacher && courseData.warningStudents && (
                <WarningStudents students={courseData.warningStudents} />
              )}

              {/* 历次作业趋势 */}
              {courseData.trends && courseData.trends.length > 0 && (
                <div className={styles.trendsSection}>
                  <h3>历次作业趋势</h3>
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

              {/* 能力雷达图（学生视图） */}
              {isStudent && courseData.radarData && (
                <div className={styles.radarSection}>
                  <h3>能力雷达图</h3>
                  <RadarChart data={courseData.radarData} />
                </div>
              )}
            </div>
          )}

          {/* 作业微观分析 */}
          {selectedHomeworkId && (
            <div className={styles.section}>
              <h2>作业微观分析</h2>
              
              {isHomeworkLoading ? (
                <div className={styles.loading}>
                  <FontAwesomeIcon icon={faSpinner} spin /> 加载作业分析中...
                </div>
              ) : homeworkData ? (
                <>
                  {/* 作业基本信息 */}
                  <div className={styles.homeworkKPIs}>
                    <KPICard
                      title="班级平均分"
                      value={homeworkData.classAverage}
                      icon={faUsers}
                      color="blue"
                    />
                    <KPICard
                      title="班级最高分"
                      value={homeworkData.classHighest}
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

                  {/* 成绩分布（教师视图） */}
                  {isTeacher && homeworkData.scoreDistribution && (
                    <ScoreDistribution distribution={homeworkData.scoreDistribution} />
                  )}

                  {/* 错题集 */}
                  {homeworkData.wrongQuestions && (
                    <WrongQuestions 
                      questions={homeworkData.wrongQuestions} 
                      role={role} 
                    />
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>选择作业以查看详细分析</p>
                </div>
              )}
            </div>
          )}

          {/* 作业选择提示 */}
          {!selectedHomeworkId && courseData?.trends?.length > 0 && (
            <div className={styles.selectionHint}>
              <p>点击上方趋势图中的作业标题，查看该作业的详细分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;