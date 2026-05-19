import React, { useState, useEffect, useCallback, useMemo } from "react";
import useAuthStore from "../../../store/authStore";
import {
  classesApi,
  homeworkApi,
  schoolApi,
  courseApi,
} from "../../../services/api";
import Swal from "sweetalert2";
import Spinner from "../../../components/common/Spinner/Spinner";
import HomeworkList from "./HomeworkList";
import SubmissionList from "./SubmissionList";
import styles from "../HomeworkPage.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

const AdminDashboard = ({
  view,
  navigateTo,
  onEditHomework,
  onOpenDiscussion,
  refreshTrigger,
}) => {
  const { detailInfo } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [homeworks, setHomeworks] = useState([]);

  // 【修复1】：从 localStorage 读取初始值
  const [selectedSchoolId, setSelectedSchoolId] = useState(() => {
    const val = localStorage.getItem("adminSelectedSchoolId");
    return val && val !== "null" && val !== "undefined" ? val : "";
  });

  const [selectedClassId, setSelectedClassId] = useState(() => {
    const val = localStorage.getItem("adminSelectedClassId");
    return val && val !== "null" && val !== "undefined" ? val : "";
  });
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // --- 1. 获取学校列表 ---
  useEffect(() => {
    if (isAdmin) {
      schoolApi
        .get("/all")
        .then((res) => {
          if (res.data?.code === 200 && res.data.data.length > 0) {
            setSchools(res.data.data);
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

  // --- 2. 联动获取班级列表 ---
  useEffect(() => {
    if (isAdmin) {
      if (selectedSchoolId) {
        classesApi
          .get("/all", { params: { schoolId: selectedSchoolId } })
          .then((res) => {
            if (res.data?.code === 200) {
              const data = res.data.data;
              const classArr = Array.isArray(data) ? data : data ? [data] : [];
              setClasses(classArr);

              // 【修复2】：验证缓存的ID
              const cachedClassId = localStorage.getItem(
                "adminSelectedClassId",
              );
              const isValidCache = classArr.some(
                (c) => String(c.id) === String(cachedClassId),
              );
              if (classArr.length > 0 && !isValidCache) {
                setSelectedClassId(classArr[0].id);
              } else if (classArr.length === 0) {
                setSelectedClassId("");
              }
            }
          })
          .catch((err) => console.error("初始化班级选择失败", err));
      } else {
        setClasses([]);
        setSelectedClassId("");
      }
    } else if (isPrincipal) {
      if (detailInfo?.classMembers) {
        const classArr = detailInfo.classMembers
          .flatMap((member) => member.classes || [])
          .filter((cls) => cls !== null);
        setClasses(classArr);

        const cachedClassId = localStorage.getItem("adminSelectedClassId");
        const isValidCache = classArr.some(
          (c) => String(c.id) === String(cachedClassId),
        );
        if (classArr.length > 0 && !isValidCache) {
          setSelectedClassId(classArr[0].id);
        } else if (classArr.length === 0) {
          setSelectedClassId("");
        }
      }
    }
  }, [isAdmin, isPrincipal, selectedSchoolId, detailInfo]);

  // 【新增】：同步数据到 localStorage，保证 WarePage / 仓库路由不受影响
  useEffect(() => {
    if ((isAdmin || isPrincipal) && selectedClassId) {
      if (selectedSchoolId) {
        localStorage.setItem("adminSelectedSchoolId", selectedSchoolId);
      }
      localStorage.setItem("adminSelectedClassId", selectedClassId);

      let schoolName = "未知学校";
      let className = "未知班级";

      if (isAdmin) {
        const school = schools.find(
          (s) => String(s.id) === String(selectedSchoolId),
        );
        if (school) schoolName = school.name;
      } else if (isPrincipal) {
        schoolName = detailInfo?.schoolMembers?.[0]?.schoolName || "未知学校";
      }

      const cls = classes.find((c) => String(c.id) === String(selectedClassId));
      if (cls) className = cls.name;

      localStorage.setItem("adminSelectedSchoolName", schoolName);
      localStorage.setItem("adminSelectedClassName", className);
    }
  }, [
    selectedClassId,
    selectedSchoolId,
    isAdmin,
    isPrincipal,
    schools,
    classes,
    detailInfo,
  ]);

  // --- 3. 联动获取该班级的课程列表 ---
  useEffect(() => {
    if (selectedClassId) {
      courseApi
        .get(`/class/${selectedClassId}`)
        .then((res) => {
          if (res.data?.code === 200) {
            setAvailableCourses(res.data.data || []);
            setSelectedCourseId(""); // 默认展示该班级"全部课程"作业
          }
        })
        .catch((err) => console.error("获取课程失败", err));
    } else {
      setAvailableCourses([]);
      setSelectedCourseId("");
    }
  }, [selectedClassId]);

  // --- 4. 获取所选班级的全部作业 ---
  const fetchHomeworks = useCallback(async (classId) => {
    setIsLoading(true);
    try {
      const response = await homeworkApi.get(`/class/${classId}`);
      setHomeworks(response.data.data || []);
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载作业失败" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 班级改变或者触发刷新时，重新获取作业
  useEffect(() => {
    if (selectedClassId && view.name === "list") {
      fetchHomeworks(selectedClassId);
    }
  }, [selectedClassId, view.name, fetchHomeworks, refreshTrigger]);

  // --- 5. 前端内存过滤：根据所选的课程 ID 过滤作业显示 ---
  const displayHomeworks = useMemo(() => {
    if (!selectedCourseId) return homeworks; // 若为“全部课程”，直接返回
    return homeworks.filter(
      (hw) => String(hw.courseId) === String(selectedCourseId),
    );
  }, [homeworks, selectedCourseId]);

  const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
    const result = await Swal.fire({
      title: `确认删除作业 "${homeworkTitle}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "删除",
    });
    if (result.isConfirmed) {
      try {
        await homeworkApi.delete(`/${homeworkId}`);
        Swal.fire("删除成功", "", "success");
        if (selectedClassId) fetchHomeworks(selectedClassId);
      } catch (e) {
        Swal.fire("删除失败", "", "error");
      }
    }
  };

  if (isLoading && view.name === "list") return <Spinner />;

  // 1. 作业提交列表视图
  if (selectedClassId && view.name === "submissionList") {
    return (
      <SubmissionList
        homeworkId={view.data}
        onBack={() => navigateTo("list")}
        isAdminView={true}
        onOpenDiscussion={onOpenDiscussion}
      />
    );
  }

  // 2. 主面板视图
  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
        </div>

        {/* 学校下拉框 (仅管理员可见) */}
        {isAdmin && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>选择学校：</label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className={styles.filterInput}
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 班级下拉框 (管理员及校长均可见) */}
        {(isAdmin || isPrincipal) && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>选择班级：</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className={styles.filterInput}
            >
              {classes.length > 0 ? (
                classes.map((cls) => (
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

        {/* 课程下拉框 (对该班级下作业进行二次过滤) */}
        {(isAdmin || isPrincipal) && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>选择课程：</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className={styles.filterInput}
            >
              <option value="">全部课程</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.divider} style={{ margin: "24px 0" }}></div>

      {/* 作业列表展示 */}
      {selectedClassId ? (
        <HomeworkList
          homeworks={displayHomeworks} // 使用过滤后的数据
          onViewSubmissions={(homeworkId) =>
            navigateTo("submissionList", homeworkId)
          }
          onDeleteHomework={handleDeleteHomework}
          onEditHomework={onEditHomework}
          onOpenDiscussion={onOpenDiscussion}
        />
      ) : (
        <div style={{ textAlign: "center", padding: "50px", color: "#999" }}>
          请选择班级以查看作业列表
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
