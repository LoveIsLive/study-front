import React, { useState, useEffect, useCallback } from "react";
import useAuthStore from "../../../store/authStore";
// 【补充】引入 classesApi 来获取班级详细信息
import { classMemberApi, classesApi } from "../../../services/api";
import Swal from "sweetalert2";
import MemberTable from "./MemberTable";
import AddMemberModal from "./AddMemberModal";
import Spinner from "../../../components/common/Spinner/Spinner";
import styles from "./ClassDetailView.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUserPlus,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const ClassDetailView = ({ classId, className, onBack }) => {
  const { user } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const [members, setMembers] = useState([]);
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 【新增状态】存储班级详细信息
  const [classDetail, setClassDetail] = useState(null);

  const canManageMembers = user && (isAdmin || isTeacher || isPrincipal);

  // 【新增方法】利用闲置的 API 获取单个班级详细信息
  const fetchClassDetail = useCallback(async () => {
    try {
      // 调用 ClassesController 的 GET /{classId}?detailed=true
      const res = await classesApi.get(`/${classId}`, {
        params: { detailed: true },
      });
      setClassDetail(res.data.data);
    } catch (error) {
      console.error("加载班级详情失败", error);
    }
  }, [classId]);

  // 【恢复】使用旧版的并发请求获取全部成员和访客
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, guestsRes] = await Promise.all([
        classMemberApi.get(`/${classId}/all`),
        classMemberApi.get(`/${classId}/guests`),
      ]);
      setMembers(membersRes.data.data || []);
      setGuests(guestsRes.data.data || []);
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载成员列表失败" });
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchMembers();
    fetchClassDetail(); // 【新增】组件加载时同步获取班级详情
  }, [fetchMembers, fetchClassDetail]);

  // 【修复核心】路径恢复为 /add，确保 memberData 是对象格式（解决400错误）
  const handleAddMembers = async (memberData) => {
    console.log("即将发送的 memberData:", memberData);
    if (Array.isArray(memberData)) {
      Swal.fire({
        icon: "error",
        title: "检测到旧版缓存！",
        text: "前端仍在向后端发送旧版的数组 [ ]，而非对象 { }。请强制刷新页面或重启前端服务！",
      });
      return; // 阻止发送错误请求
    }
    try {
      const res = await classMemberApi.post(`/${classId}/add`, memberData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const feedbacks = res.data.data;

      setIsModalOpen(false);
      fetchMembers();

      if (feedbacks && feedbacks.length > 0) {
        Swal.fire({
          title: "添加成功（部分账号已调整）",
          icon: "info",
          html: `
                    <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f39c12; max-height: 200px; overflow-y: auto;">
                        ${feedbacks.map((msg) => `<p style="margin-bottom: 5px; font-size: 14px;">⚠️ ${msg}</p>`).join("")}
                    </div>
                    <p style="margin-top: 10px; font-weight: bold;">请记录上述变更并告知相关用户。</p>
                `,
          confirmButtonText: "我知道了",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "成功添加所有成员",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "添加失败",
        text: error.response?.data?.message || "服务器格式错误",
      });
    }
  };

  // 【恢复】路径恢复为 /remove
  const handleDeleteMembers = async (userIds) => {
    const result = await Swal.fire({
      title: `确认移除这 ${userIds.length} 位成员吗?`,
      text: "此操作无法撤销。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "确认移除",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      try {
        await classMemberApi.delete(`/${classId}/remove`, {
          data: { userIds },
          headers: { "Content-Type": "application/json" },
        });
        Swal.fire({
          icon: "success",
          title: "移除成功",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchMembers();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "移除失败",
          text: error.response?.data?.message || "服务器错误",
        });
      }
    }
  };

  // 【修复】路径恢复为 /guest/xx/courses，并传对象避免报错
  const handleModifyGuestCourses = async (guest) => {
    const courseList = useAuthStore.getState().courseList;
    if (!courseList || courseList.length === 0) {
      Swal.fire("提示", "当前班级尚无课程，无法分配", "info");
      return;
    }

    let htmlContent =
      '<div style="text-align: left; max-height: 200px; overflow-y: auto;">';
    courseList.forEach((course) => {
      const isChecked = guest.allowedCourseIds?.includes(course.id)
        ? "checked"
        : "";
      htmlContent += `
                <div style="margin-bottom: 8px;">
                    <label style="cursor: pointer;">
                        <input type="checkbox" class="guest-course-checkbox" value="${course.id}" ${isChecked} style="margin-right: 8px;" />
                        ${course.name}
                    </label>
                </div>
            `;
    });
    htmlContent += "</div>";

    const { isConfirmed, value: selectedIds } = await Swal.fire({
      title: `修改 ${guest.user?.username || "访客"} 的可见课程`,
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: "保存",
      cancelButtonText: "取消",
      preConfirm: () => {
        const checkboxes = document.querySelectorAll(
          ".guest-course-checkbox:checked",
        );
        return Array.from(checkboxes).map((cb) => parseInt(cb.value, 10));
      },
    });

    if (isConfirmed && selectedIds) {
      try {
        // 关键：根据 5.md 格式，包装成 DTO 对象 {"courseIds": [...]}
        const payload = { courseIds: selectedIds };
        await classMemberApi.put(
          `/${classId}/guest/${guest.userId}/courses`,
          payload,
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        Swal.fire({
          icon: "success",
          title: "修改成功",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchMembers();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "修改失败",
          text: error.response?.data?.message || "服务器错误",
        });
      }
    }
  };

  const teachers = members.filter((m) => m.role === "ROLE_TEACHER");
  const students = members.filter((m) => m.role === "ROLE_STUDENT");

  return (
    <div className={styles.detailContainer}>
      {/* ...下方渲染结构完全保持原样不变... */}
      <div className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-primary">
              <FontAwesomeIcon icon={faArrowLeft} /> 返回班级列表
            </button>
          )}
          {/* 【修改】渲染来自后端的真实班级详情信息 */}
          <h2 style={{ margin: 0 }}>
            {classDetail ? classDetail.name : className}
          </h2>
          {classDetail && (
            <span
              style={{
                color: "#666",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FontAwesomeIcon icon={faUsers} />
              总人数:{" "}
              {classDetail.memberCount || members.length + guests.length}
            </span>
          )}
        </div>

        {canManageMembers && (
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <FontAwesomeIcon icon={faUserPlus} /> 添加成员
          </button>
        )}
      </div>

      <div className={styles.memberSection}>
        <div className={styles.sectionHeader}>
          <h3>教师 ({teachers.length})</h3>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <MemberTable
            members={teachers}
            canDelete={canManageMembers}
            onDelete={handleDeleteMembers}
          />
        )}
      </div>

      <div className={styles.memberSection}>
        <div className={styles.sectionHeader}>
          <h3>学生 ({students.length})</h3>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <MemberTable
            members={students}
            canDelete={canManageMembers}
            onDelete={handleDeleteMembers}
          />
        )}
      </div>

      <div className={styles.memberSection}>
        <div className={styles.sectionHeader}>
          <h3>访客 ({guests.length})</h3>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <MemberTable
            members={guests}
            canDelete={canManageMembers}
            onDelete={handleDeleteMembers}
            onModifyCourses={
              canManageMembers ? handleModifyGuestCourses : undefined
            }
          />
        )}
      </div>

      {canManageMembers && (
        <AddMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddMembers}
        />
      )}
    </div>
  );
};

export default ClassDetailView;
