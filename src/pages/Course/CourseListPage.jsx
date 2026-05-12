// src/pages/Course/CourseListPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faPlus,
  faTrash,
  faEdit,
  faSpinner,
  faArrowLeft,
  faSearch,
  faTimes,
  faChevronLeft,
  faChevronRight,
  faCheck,
  faFolder,
  faFile,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import useAuthStore from "../../store/authStore";
import {
  createCourse,
  deleteCourse,
  updateCourse,
  getCoursesByClassId,
} from "../../services/courseService";
import {
  wareApi,
  discussionApi,
  courseApi,
  classesApi,
  schoolApi,
} from "../../services/api";
import styles from "./CourseListPage.module.css";

/**
 * 压缩图片到指定最大大小（单位：字节）
 */
const compressImage = (file, maxSize = 1024 * 1024) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxDimension = 2048;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const mimeType = file.type || "image/jpeg";
        const isPng = mimeType === "image/png";
        const outputType = isPng ? "image/png" : "image/jpeg";

        const compress = (targetWidth, targetHeight, quality) => {
          return new Promise((resolveBlob) => {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            canvas.toBlob(
              (blob) => resolveBlob(blob),
              outputType,
              isPng ? undefined : quality,
            );
          });
        };

        const tryCompress = async (
          currentWidth = width,
          currentHeight = height,
          quality = 0.9,
        ) => {
          const blob = await compress(currentWidth, currentHeight, quality);
          if (
            blob.size <= maxSize ||
            quality <= 0.1 ||
            currentWidth <= 100 ||
            currentHeight <= 100
          ) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
            return;
          }

          if (!isPng && quality > 0.1) {
            await tryCompress(currentWidth, currentHeight, quality - 0.1);
          } else {
            const newWidth = Math.floor(currentWidth * 0.8);
            const newHeight = Math.floor(currentHeight * 0.8);
            await tryCompress(newWidth, newHeight, quality);
          }
        };

        tryCompress();
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 编辑课程模态框组件
const EditCourseModal = ({ course, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: course?.name || "",
    description: course?.description || "",
    coverImage: course?.coverImage || "",
  });
  const [saving, setSaving] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(
    course?.coverImage || "",
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || "",
        description: course.description || "",
        coverImage: course.coverImage || "",
      });
      setCoverImagePreview(course.coverImage || "");
    }
  }, [course]);

  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "文件类型错误",
        text: "请选择图片文件。",
      });
      e.target.value = "";
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      Swal.fire({
        icon: "warning",
        title: "文件过大",
        text: "图片大小不能超过1MB，请选择其他图片。",
      });
      e.target.value = "";
      return;
    }

    setCoverImageFile(file);
    setFormData({ ...formData, coverImage: file });

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setCoverImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire({ icon: "warning", title: "请输入课程名称" });
      return;
    }

    setSaving(true);
    try {
      await onSave(course.id, formData);
      onClose();
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>编辑课程</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            <div className={styles.formGroup}>
              <label>
                课程名称 <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入课程名称"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>课程描述</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请输入课程描述"
                rows="3"
              />
            </div>
            <div className={styles.formGroup}>
              <label>封面图片（可选，最大1MB）</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.modalButton} ${styles.secondary}`}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className={`${styles.modalButton} ${styles.primary}`}
              disabled={saving}
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 创建课程模态框组件
const CreateCourseModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coverImage: "",
  });
  const [creating, setCreating] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleCoverImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "文件类型错误",
        text: "请选择图片文件。",
      });
      e.target.value = "";
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      Swal.fire({
        icon: "warning",
        title: "文件过大",
        text: "图片大小不能超过1MB，请选择其他图片。",
      });
      e.target.value = "";
      return;
    }

    setFormData({ ...formData, coverImage: file });

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setCoverImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire({ icon: "warning", title: "请输入课程名称" });
      return;
    }

    setCreating(true);
    try {
      await onCreate(formData);
      setFormData({ name: "", description: "", coverImage: "" });
      setCoverImagePreview("");
      onClose();
    } catch (error) {
      console.error("创建失败:", error);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>创建新课程</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            <div className={styles.formGroup}>
              <label>
                课程名称 <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入课程名称"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>课程描述</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请输入课程描述"
                rows="3"
              />
            </div>
            <div className={styles.formGroup}>
              <label>封面图片（可选，最大1MB）</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.modalButton} ${styles.secondary}`}
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="submit"
              className={`${styles.modalButton} ${styles.primary}`}
              disabled={creating}
            >
              {creating ? <FontAwesomeIcon icon={faSpinner} spin /> : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CourseListPage = () => {
  const navigate = useNavigate();
  const {
    activeId,
    activeType,
    currentCourseId,
    setCurrentCourse,
    courseList,
    fetchCourseList,
  } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [adminSchoolList, setAdminSchoolList] = useState([]); // 新增学校状态
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [adminClassList, setAdminClassList] = useState([]);
  const [selectedAdminClassId, setSelectedAdminClassId] = useState("");

  // 【修复点 2】：引入权限判断，防止学生和访客看到管理按钮
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const canManageCourse = isTeacher || isAdmin || isPrincipal; // 除了老师外，管理员和校长也有管理权限，学生和访客不会匹配
  const detailInfo = useAuthStore((state) => state.detailInfo);

  // 搜索和分页状态
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // 【核心修改点】获取学校（仅管理员）
  useEffect(() => {
    if (isAdmin) {
      schoolApi.get("/all").then((res) => {
        if (res.data?.code === 200 && res.data.data.length > 0) {
          setAdminSchoolList(res.data.data);
          setSelectedSchoolId(res.data.data[0].id);
        }
      });
    }
  }, [isAdmin]);

  // 在获取班级的 useEffect 中
  useEffect(() => {
    if (isAdmin && selectedSchoolId) {
      // 管理员逻辑保持不变...
      classesApi
        .get("/all", { params: { schoolId: selectedSchoolId } })
        .then((res) => {
          if (res.data?.code === 200) {
            setAdminClassList(res.data.data || []);
            if (res.data.data.length > 0)
              setSelectedAdminClassId(res.data.data[0].id);
          }
        });
    } else if (isPrincipal) {
      // 【优化】校长逻辑：获取所属学校的所有班级
      const schoolId = detailInfo?.schoolMembers?.[0]?.schoolId;
      if (schoolId) {
        classesApi.get("/all", { params: { schoolId } }).then((res) => {
          if (res.data?.code === 200) {
            const classes = res.data.data || [];
            setAdminClassList(classes);
            // 默认选中第一个班级，从而触发 loadCourses
            if (classes.length > 0) {
              setSelectedAdminClassId(classes[0].id);
            } else {
              setSelectedAdminClassId("");
            }
          }
        });
      }
    }
  }, [isAdmin, isPrincipal, selectedSchoolId, detailInfo]);

  // 监听下拉框改变，校长和管理员选择班级后自动加载课程
  // 监听下拉框改变，校长和管理员选择班级后自动加载课程
  useEffect(() => {
    if ((isAdmin || isPrincipal) && selectedAdminClassId) {
      loadCourses(true);

      // 【新增逻辑】：不仅获取ID，还从列表中匹配出对应的名字
      let schoolName = "未知学校";
      let className = "未知班级";

      if (isAdmin) {
        const school = adminSchoolList.find(
          (s) => String(s.id) === String(selectedSchoolId),
        );
        if (school) schoolName = school.name;
      } else if (isPrincipal) {
        // 校长默认从 detailInfo 中获取自己所在的学校名
        schoolName = detailInfo?.schoolMembers?.[0]?.schoolName || "未知学校";
      }

      const cls = adminClassList.find(
        (c) => String(c.id) === String(selectedAdminClassId),
      );
      if (cls) className = cls.name;

      // 存入 localStorage，供仓库页面跨组件读取
      if (selectedSchoolId) {
        localStorage.setItem("adminSelectedSchoolId", selectedSchoolId);
      } else if (isPrincipal && detailInfo?.schoolMembers?.[0]?.schoolId) {
        localStorage.setItem(
          "adminSelectedSchoolId",
          detailInfo.schoolMembers[0].schoolId,
        );
      }
      localStorage.setItem("adminSelectedClassId", selectedAdminClassId);

      // 【核心修复1】：将名字也存入 localStorage
      localStorage.setItem("adminSelectedSchoolName", schoolName);
      localStorage.setItem("adminSelectedClassName", className);
    }
  }, [
    selectedAdminClassId,
    selectedSchoolId,
    isAdmin,
    isPrincipal,
    detailInfo,
    adminSchoolList, // 记得在依赖数组中加上这两个列表
    adminClassList,
  ]);

  // 1. 修改拦截器：增加 detailInfo 存在性判断，防止刷新时误拦截
  useEffect(() => {
    // 只有在用户信息已加载，且确定既不是管理员也不是校长，且不在班级上下文时才拦截
    if (detailInfo && !isAdmin && !isPrincipal && activeType !== "class") {
      Swal.fire({
        icon: "warning",
        title: "提示",
        text: "只有在班级上下文中才能管理课程。",
      });
      navigate("/");
    }
  }, [activeType, navigate, isAdmin, isPrincipal, detailInfo]);

  useEffect(() => {
    if (activeType === "class" && activeId) {
      loadCourses();
    }
  }, [activeId, activeType]);

  // 【核心修改点】加载课程后“默认选中第一项”防止详情报错
  const loadCourses = async (force = false) => {
    setLoading(true);
    try {
      if (isAdmin || isPrincipal) {
        if (!selectedAdminClassId) {
          useAuthStore.getState().setCourseList([]);
          return;
        }
        const res = await courseApi.get(`/class/${selectedAdminClassId}`);
        const courses = res.data.data || [];
        useAuthStore.getState().setCourseList(courses);
        // 如果有课且当前没选中，默认选第一个
        if (courses.length > 0 && !currentCourseId) {
          useAuthStore.getState().setCurrentCourse(courses[0].id, courses[0]);
        }
      } else {
        await fetchCourseList(force);
        const courses = useAuthStore.getState().courseList || [];
        if (courses.length > 0 && !useAuthStore.getState().currentCourseId) {
          useAuthStore.getState().setCurrentCourse(courses[0].id, courses[0]);
        }
      }
      setCurrentPage(1);
    } catch (error) {
      console.error("加载课程列表失败:", error);
      Swal.fire({
        icon: "error",
        title: "加载失败",
        text: "无法加载课程列表，请稍后重试。",
      });
    } finally {
      setLoading(false);
    }
  };

  const CourseCoverImage = ({ coverImage, alt, className }) => {
    const [imgSrc, setImgSrc] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (!coverImage) {
        setImgSrc("");
        return;
      }

      if (coverImage.startsWith("data:")) {
        setImgSrc(coverImage);
        return;
      }

      let active = true;
      const currentBlobUrl = { current: null };

      const fetchImage = async () => {
        setLoading(true);
        try {
          const response = await courseApi.get("/getCoverImage", {
            params: { path: coverImage },
            responseType: "blob",
          });
          if (!active) return;
          const blob = response.data;
          const url = URL.createObjectURL(blob);
          currentBlobUrl.current = url;
          setImgSrc(url);
        } catch (error) {
          console.error("获取封面图片失败:", error);
          if (active) {
            setImgSrc(""); // 显示默认占位符
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      fetchImage();

      return () => {
        active = false;
        if (currentBlobUrl.current) {
          URL.revokeObjectURL(currentBlobUrl.current);
          currentBlobUrl.current = null;
        }
      };
    }, [coverImage]);

    if (!coverImage) {
      return (
        <div className={styles.courseCoverPlaceholder}>
          <FontAwesomeIcon icon={faBookOpen} />
          <span>暂无封面</span>
        </div>
      );
    }

    if (loading) {
      return (
        <div className={styles.courseCoverPlaceholder}>
          <FontAwesomeIcon icon={faSpinner} spin />
          <span>加载中...</span>
        </div>
      );
    }

    if (imgSrc) {
      return <img src={imgSrc} alt={alt} className={className} />;
    }

    return (
      <div className={styles.courseCoverPlaceholder}>
        <FontAwesomeIcon icon={faBookOpen} />
        <span>加载失败</span>
      </div>
    );
  };

  const filteredCourses = useMemo(() => {
    if (!courseList) return [];
    if (!searchTerm.trim()) return courseList;
    const term = searchTerm.toLowerCase();
    return courseList.filter((course) => {
      const name = course.name || "";
      const description = course.description || "";
      return (
        name.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term)
      );
    });
  }, [courseList, searchTerm]);

  const totalCourses = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalCourses / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCourses);
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  const handleCreateCourse = async (courseData) => {
    try {
      await createCourse(courseData);
      Swal.fire({ icon: "success", title: "创建成功", text: "课程已创建。" });
      await loadCourses(true);
      return true;
    } catch (error) {
      console.error("创建课程失败:", error);
      Swal.fire({
        icon: "error",
        title: "创建失败",
        text: error.response?.data?.message || "未知错误",
      });
      return false;
    }
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      await updateCourse(courseId, courseData);
      Swal.fire({
        icon: "success",
        title: "更新成功",
        text: "课程信息已更新。",
      });
      await loadCourses(true);
      return true;
    } catch (error) {
      console.error("更新课程失败:", error);
      Swal.fire({
        icon: "error",
        title: "更新失败",
        text: error.response?.data?.message || "未知错误",
      });
      return false;
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    const result = await Swal.fire({
      icon: "question",
      title: `确定删除课程 "${courseName}" 吗？`,
      text: "删除后课程将无法恢复，但关联资源会保留。",
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      try {
        await deleteCourse(courseId);
        Swal.fire({ icon: "success", title: "删除成功", text: "课程已删除。" });
        await loadCourses(true);
        if (currentCourseId === courseId) {
          useAuthStore.getState().clearCurrentCourse();
        }
      } catch (error) {
        console.error("删除课程失败:", error);
        Swal.fire({
          icon: "error",
          title: "删除失败",
          text: error.response?.data?.message || "未知错误",
        });
      }
    }
  };

  const handleCourseCardClick = (courseId) => {
    window.open(`/course/${courseId}`, "_blank");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // 2. 修改组件末尾的渲染守卫：允许管理员和校长在非 class 模式下渲染
  if (!isAdmin && !isPrincipal && activeType !== "class") {
    return null;
  }

  return (
    <div className={styles.courseListPage}>
      <div className={styles.fileManager}>
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            {/* 权限判断：学生、访客隐藏新增按钮 */}
            {canManageCourse && (
              <button
                className={styles.topCreateButton}
                onClick={() => setShowCreateModal(true)}
              >
                <FontAwesomeIcon icon={faPlus} /> 新增课程
              </button>
            )}
          </div>

          <div className={styles.headerRight}>
            {/* 新增的下拉筛选框 */}
            {isAdmin && (
              <select
                className={styles.pageSizeSelect}
                style={{ marginRight: "10px", width: "160px" }} // 【修改】：固定学校下拉框宽度
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
              >
                {adminSchoolList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {(isAdmin || isPrincipal) && (
              <select
                className={styles.pageSizeSelect}
                style={{ marginRight: "10px", width: "160px" }} // 【修改】：固定班级下拉框宽度
                value={selectedAdminClassId}
                onChange={(e) => setSelectedAdminClassId(e.target.value)}
              >
                {/* 【核心修复 2】：删除了多余的 <option value="">请选择班级</option>，直接遍历实际班级即可 */}
                {adminClassList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <div className={styles.searchContainer}>
              <FontAwesomeIcon icon={faSearch} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="搜索课程名称"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 条/页</option>
              <option value={10}>10 条/页</option>
              <option value={15}>15 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={25}>25 条/页</option>
            </select>
          </div>
        </header>

        <div className={styles.mainContent}>
          <div className={styles.listContainer}>
            {loading ? (
              <div className={styles.loading}>
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                <p>加载课程列表中...</p>
              </div>
            ) : totalCourses === 0 ? (
              <div className={styles.emptyState}>
                <FontAwesomeIcon icon={faBookOpen} size="3x" />
                <h3>当前班级暂无课程</h3>
                {canManageCourse && (
                  <p>点击上方"新增课程"按钮添加第一个课程。</p>
                )}
              </div>
            ) : (
              <div className={styles.courseList}>
                {paginatedCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`${styles.courseListItem} ${currentCourseId === course.id ? styles.selected : ""}`}
                    onClick={() => handleCourseCardClick(course.id)}
                  >
                    <div className={styles.courseListItemContent}>
                      <div className={styles.courseCoverContainer}>
                        <CourseCoverImage
                          coverImage={course.coverImage}
                          alt={course.name}
                          className={styles.courseCoverImage}
                        />
                      </div>

                      <div className={styles.courseInfoContainer}>
                        <div className={styles.courseHeader}>
                          <h3 className={styles.courseTitle}>{course.name}</h3>
                          <div className={styles.courseListItemActions}>
                            {/* 权限判断：学生、访客隐藏编辑和删除按钮 */}
                            {canManageCourse && (
                              <>
                                <button
                                  className={styles.listEditButton}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCourse(course);
                                  }}
                                  title="编辑课程"
                                >
                                  <FontAwesomeIcon icon={faEdit} /> 编辑
                                </button>
                                <button
                                  className={styles.listDeleteButton}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCourse(course.id, course.name);
                                  }}
                                  title="删除课程"
                                >
                                  <FontAwesomeIcon icon={faTrash} /> 删除
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <p
                          className={styles.courseDescription}
                          data-full-text={course.description || "暂无描述"}
                        >
                          {course.description
                            ? course.description.length > 30
                              ? course.description.substring(0, 30) + "..."
                              : course.description
                            : "暂无描述"}
                        </p>

                        <div className={styles.courseMeta}>
                          <span>教师: {course.teacherName || "未知"}</span>
                          <span>
                            创建时间:{" "}
                            {new Date(course.createTime).toLocaleDateString()}
                          </span>
                          <span>
                            修改时间:{" "}
                            {new Date(course.updateTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || totalPages <= 1}
            >
              <FontAwesomeIcon icon={faChevronLeft} /> 上一页
            </button>

            {Array.from(
              { length: Math.max(1, totalPages) },
              (_, i) => i + 1,
            ).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={currentPage === page ? styles.activePage : ""}
                disabled={totalPages <= 1 && page === 1}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages <= 1}
            >
              下一页 <FontAwesomeIcon icon={faChevronRight} />
            </button>

            <span className={styles.paginationInfo}>
              第 {currentPage} 页，共 {Math.max(1, totalPages)} 页
            </span>
          </div>
        </div>

        <CreateCourseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCourse}
        />

        <EditCourseModal
          course={editingCourse}
          isOpen={!!editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={handleUpdateCourse}
        />
      </div>
    </div>
  );
};

export default CourseListPage;
