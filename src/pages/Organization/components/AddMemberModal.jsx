import React, { useState, useEffect } from "react";
import Modal from "../../../components/common/Modal/Modal";
import styles from "./AddMemberModal.module.css";
import useAuthStore from "../../../store/authStore";
import { courseApi } from "../../../services/api"; // 【新增引入 courseApi】

// 【修改】接收来自父组件的 classId
const AddMemberModal = ({ isOpen, onClose, onAdd, classId }) => {
  const [userNames, setUserNames] = useState("");
  const [role, setRole] = useState("ROLE_STUDENT");
  const [selectedCourses, setSelectedCourses] = useState([]);

  // 【新增】本地维护用于展示的课程列表
  const [displayCourseList, setDisplayCourseList] = useState([]);

  const courseList = useAuthStore((state) => state.courseList);
  const fetchCourseList = useAuthStore((state) => state.fetchCourseList);

  // 【新增】获取当前用户角色身份
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  // 【修复逻辑】当弹窗打开并且角色切换为访客时，主动拉取课程数据
  useEffect(() => {
    if (isOpen && role === "ROLE_GUEST") {
      if (isAdmin || isPrincipal) {
        // 如果是管理员或校长，直接通过 courseApi 获取当前选中班级的真实课程
        if (classId) {
          courseApi
            .get(`/class/${classId}`)
            .then((res) => {
              if (res.data?.code === 200) {
                setDisplayCourseList(res.data.data || []);
              }
            })
            .catch((e) => console.error("加载班级课程失败", e));
        }
      } else {
        // 教师等普通角色，走原有的状态管理逻辑
        fetchCourseList();
      }
    }
  }, [isOpen, role, fetchCourseList, isAdmin, isPrincipal, classId]);

  // 【新增】如果是普通教师角色，同步全局状态里的 courseList 到用于展示的列表
  useEffect(() => {
    if (!(isAdmin || isPrincipal)) {
      setDisplayCourseList(courseList || []);
    }
  }, [courseList, isAdmin, isPrincipal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const namesArray = userNames.split(/[\s,，\n]+/).filter(Boolean);
    if (namesArray.length === 0) return;

    const payload = { userNames: namesArray, role: role };
    if (role === "ROLE_GUEST") {
      payload.allowedCourseIds = selectedCourses;
    }

    onAdd(payload);
  };

  const handleClose = () => {
    setUserNames("");
    setRole("ROLE_STUDENT");
    setSelectedCourses([]);
    onClose();
  };

  const handleCourseToggle = (courseId) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  return (
    <Modal show={isOpen} onClose={handleClose} title="添加成员">
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="userNamesInput">用户名</label>
          <textarea
            id="userNamesInput"
            className={styles.formControl}
            rows="4"
            placeholder="输入一个或多个用户名，用空格、逗号或换行隔开"
            value={userNames}
            onChange={(e) => setUserNames(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>要添加的角色</label>
          <div className={styles.roleSelector}>
            <label>
              <input
                type="radio"
                value="ROLE_STUDENT"
                checked={role === "ROLE_STUDENT"}
                onChange={(e) => setRole(e.target.value)}
              />
              学生 (Student)
            </label>
            <label>
              <input
                type="radio"
                value="ROLE_TEACHER"
                checked={role === "ROLE_TEACHER"}
                onChange={(e) => setRole(e.target.value)}
              />
              教师 (Teacher)
            </label>
            <label>
              <input
                type="radio"
                value="ROLE_GUEST"
                checked={role === "ROLE_GUEST"}
                onChange={(e) => setRole(e.target.value)}
              />
              访客 (Guest)
            </label>
          </div>
        </div>

        {/* 【修改】渲染时使用 displayCourseList 替代 courseList */}
        {role === "ROLE_GUEST" && (
          <div className={styles.formGroup}>
            <label>配置访客可见课程：</label>
            <div
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              {displayCourseList && displayCourseList.length > 0 ? (
                displayCourseList.map((c) => (
                  <div key={c.id} style={{ marginBottom: "6px" }}>
                    <label style={{ cursor: "pointer", fontWeight: "normal" }}>
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(c.id)}
                        onChange={() => handleCourseToggle(c.id)}
                        style={{ marginRight: "8px" }}
                      />
                      {c.name}
                    </label>
                  </div>
                ))
              ) : (
                <span style={{ color: "#999", fontSize: "14px" }}>
                  当前班级暂无课程供分配
                </span>
              )}
            </div>
          </div>
        )}

        <div className={styles.formActions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
          >
            取消
          </button>
          <button type="submit" className="btn btn-primary">
            确认添加
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMemberModal;
