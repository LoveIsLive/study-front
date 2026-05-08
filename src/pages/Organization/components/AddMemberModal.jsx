import React, { useState } from "react";
import Modal from "../../../components/common/Modal/Modal";
import styles from "./AddMemberModal.module.css";
import useAuthStore from "../../../store/authStore"; // 【新增引入】

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
  const [userNames, setUserNames] = useState("");
  const [role, setRole] = useState("ROLE_STUDENT");
  const [selectedCourses, setSelectedCourses] = useState([]); // 【新增】勾选的课程ID

  const courseList = useAuthStore((state) => state.courseList); // 【新增】获取当前班级下的课程

  const handleSubmit = (e) => {
    e.preventDefault();
    const namesArray = userNames.split(/[\s,，\n]+/).filter(Boolean);
    if (namesArray.length === 0) return;

    // 【修改】如果是访客，附带 allowedCourseIds 数组
    const payload = { userNames: namesArray, role: role };
    if (role === "ROLE_GUEST") {
      payload.allowedCourseIds = selectedCourses;
    }

    onAdd(payload);
  };

  const handleClose = () => {
    setUserNames("");
    setRole("ROLE_STUDENT");
    setSelectedCourses([]); // 【修改】重置课程勾选
    onClose();
  };

  // 【新增】处理课程勾选切换
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
            {/* 【新增】访客选项 */}
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

        {/* 【新增】仅当角色为访客时，渲染课程多选列表 */}
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
              {courseList && courseList.length > 0 ? (
                courseList.map((c) => (
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
