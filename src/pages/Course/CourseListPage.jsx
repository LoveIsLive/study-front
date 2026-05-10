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
import { wareApi, discussionApi, courseApi } from "../../services/api";
import styles from "./CourseListPage.module.css";

/**
 * 压缩图片到指定最大大小（单位：字节）
 * @param {File} file - 图片文件
 * @param {number} maxSize - 最大大小（字节），默认1MB
 * @returns {Promise<string>} base64字符串
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

        // 如果图片尺寸过大，先缩小尺寸
        const maxDimension = 2048; // 最大边长
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // 根据文件类型选择输出格式
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

          // 如果文件仍然太大，尝试降低质量（对于JPEG）或缩小尺寸
          if (!isPng && quality > 0.1) {
            // JPEG：降低质量
            await tryCompress(currentWidth, currentHeight, quality - 0.1);
          } else {
            // PNG或JPEG质量已最低：缩小尺寸
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

  // 管理 body 的 overflow 以防止布局偏移
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

    // 检查文件类型是否为图片
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "文件类型错误",
        text: "请选择图片文件。",
      });
      e.target.value = "";
      return;
    }

    // 检查文件大小（1MB） - 大于1MB禁止上传
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

    // 文件小于等于1MB，允许上传
    // 保存 File 对象用于上传，生成 base64 用于预览
    setCoverImageFile(file);
    setFormData({ ...formData, coverImage: file });

    // 生成预览
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
      // 如果用户没有选择新文件，coverImage 保持原值（可能是 URL 或 base64）
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
              {/* {coverImagePreview && (
                <div className={styles.coverImagePreview}>
                  <p>预览：</p>
                  <img
                    src={coverImagePreview}
                    alt="预览"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      marginTop: "8px",
                    }}
                  />
                </div>
              )}
              {!coverImagePreview && (
                <p className={styles.helpText}>未选择图片</p>
              )} */}
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

  // 管理 body 的 overflow 以防止布局偏移
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

    // 检查文件类型是否为图片
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "文件类型错误",
        text: "请选择图片文件。",
      });
      e.target.value = "";
      return;
    }

    // 检查文件大小（1MB） - 大于1MB禁止上传
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

    // 文件小于等于1MB，允许上传
    // 保存 File 对象用于上传
    setFormData({ ...formData, coverImage: file });

    // 生成预览
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
      // 重置表单
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
              {/* {coverImagePreview && (
                <div className={styles.coverImagePreview}>
                  <p>预览：</p>
                  <img
                    src={coverImagePreview}
                    alt="预览"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      marginTop: "8px",
                    }}
                  />
                </div>
              )}
              {!coverImagePreview && (
                <p className={styles.helpText}>未选择图片</p>
              )} */}
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

  // 搜索和分页状态
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // 确保当前上下文是班级
  useEffect(() => {
    if (activeType !== "class") {
      Swal.fire({
        icon: "warning",
        title: "提示",
        text: "只有在班级上下文中才能管理课程。",
      });
      navigate("/");
    }
  }, [activeType, navigate]);

  // 加载课程列表
  useEffect(() => {
    if (activeType === "class" && activeId) {
      loadCourses();
    }
  }, [activeId, activeType]);

  const loadCourses = async (force = false) => {
    setLoading(true);
    try {
      await fetchCourseList(force);
      setCurrentPage(1); // 加载后重置到第一页
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

  // 课程封面图片组件（通过axios获取图片）
  const CourseCoverImage = ({ coverImage, alt, className }) => {
    const [imgSrc, setImgSrc] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (!coverImage) {
        setImgSrc("");
        return;
      }

      // 如果已经是 data URL，直接使用
      if (coverImage.startsWith("data:")) {
        setImgSrc(coverImage);
        return;
      }

      // 如果是路径，通过 axios 获取图片
      let active = true;
      const currentBlobUrl = { current: null };

      const fetchImage = async () => {
        setLoading(true);
        try {
          // 使用 courseApi 获取图片，注意添加 responseType: 'blob'
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

      // 清理函数：组件卸载或依赖项变化时释放 blob URL
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

    // 默认占位符
    return (
      <div className={styles.courseCoverPlaceholder}>
        <FontAwesomeIcon icon={faBookOpen} />
        <span>加载失败</span>
      </div>
    );
  };

  // 过滤课程列表（基于搜索词）
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

  // 分页计算
  const totalCourses = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalCourses / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCourses);
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  // 处理创建课程
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

  // 处理更新课程
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
        // 如果删除的是当前选中的课程，清空选择
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

  // 1. "选择"按钮：仅更新全局持久化状态
  const handleSelectCourse = (course) => {
    setCurrentCourse(course.id, course);
    // 可以加个简单的提示
    Swal.fire({
      icon: "success",
      title: `已选中课程：${course.name}`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // 2. "卡片"点击：打开新标签页浏览详情，不改变全局"选中"的课程
  // 2. "卡片"点击：打开新标签页浏览详情，不改变全局"选中"的课程
  const handleCourseCardClick = (courseId) => {
    window.open(`/course/${courseId}`, "_blank");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (activeType !== "class") {
    return null;
  }

  return (
    <div className={styles.courseListPage}>
      <div className={styles.fileManager}>
        {/* 头部区域：左侧新增课程按钮，右侧搜索框，再右侧分页条数下拉框 */}
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            <button
              className={styles.topCreateButton}
              onClick={() => setShowCreateModal(true)}
            >
              <FontAwesomeIcon icon={faPlus} /> 新增课程
            </button>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchContainer}>
              <FontAwesomeIcon icon={faSearch} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="搜索课程名称"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // 搜索时重置到第一页
                }}
              />
            </div>
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1); // 切换每页条数时重置到第一页
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
          {/* 课程列表区域 */}
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
                <p>点击上方"新增课程"按钮添加第一个课程。</p>
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
                      {/* 左侧：课程参考图 */}
                      <div className={styles.courseCoverContainer}>
                        <CourseCoverImage
                          coverImage={course.coverImage}
                          alt={course.name}
                          className={styles.courseCoverImage}
                        />
                      </div>

                      {/* 右侧：课程信息区域 */}
                      <div className={styles.courseInfoContainer}>
                        {/* 第一行：课程名称 + 操作按钮 */}
                        <div className={styles.courseHeader}>
                          <h3 className={styles.courseTitle}>{course.name}</h3>
                          <div className={styles.courseListItemActions}>
                            {/* <button
                              className={styles.listSelectButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCourse(course);
                              }}
                              title="选择课程"
                            >
                              <FontAwesomeIcon icon={faCheck} /> 选择
                            </button> */}
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
                          </div>
                        </div>

                        {/* 第二行：课程描述 */}
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

                        {/* 第三行：教师、创建时间、修改时间 */}
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

          {/* 分页组件 - 常态化存在 */}
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

          {/* 底部信息栏 */}
          {/* <div className={styles.footer}>
          <p>共 {totalCourses} 门课程（已过滤）</p>
          <p>当前选中课程: {currentCourseId ? courseList.find(c => c.id === currentCourseId)?.name : '无'}</p>
        </div> */}
        </div>

        {/* 创建课程模态框 */}
        <CreateCourseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCourse}
        />

        {/* 编辑课程模态框 */}
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
