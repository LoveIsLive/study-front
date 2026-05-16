// src/pages/ClassHome/ClassHomePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faSpinner,
  faImage,
  faSchool,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import useAuthStore from "../../store/authStore";
import { classHomeApi, schoolApi, classesApi } from "../../services/api";
import styles from "./ClassHomePage.module.css";

// 封面图片组件，通过获取流解析
const CoverImage = ({ coverImage, alt, className }) => {
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
        const response = await classHomeApi.get("/getCoverImage", {
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
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();

    return () => {
      active = false;
      if (currentBlobUrl.current) {
        URL.revokeObjectURL(currentBlobUrl.current);
      }
    };
  }, [coverImage]);

  if (loading) {
    return (
      <div className={styles.coverPlaceholder}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      </div>
    );
  }

  if (imgSrc) {
    return <img src={imgSrc} alt={alt} className={className} />;
  }

  return (
    <div className={styles.coverPlaceholder}>
      <FontAwesomeIcon icon={faImage} size="3x" />
      <span>暂无封面图片</span>
    </div>
  );
};

const ClassHomePage = () => {
  const navigate = useNavigate();
  const { activeId, activeType, detailInfo } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [classData, setClassData] = useState(null);

  // 权限控制
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const canEdit = isTeacher || isAdmin || isPrincipal;

  // 管理员/校长 下拉框状态（与 CourseListPage 完全一致）
  const [adminSchoolList, setAdminSchoolList] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    () => localStorage.getItem("adminSelectedSchoolId") || "",
  );
  const [adminClassList, setAdminClassList] = useState([]);
  const [selectedAdminClassId, setSelectedAdminClassId] = useState(
    () => localStorage.getItem("adminSelectedClassId") || "",
  );

  // 编辑模态框状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [previewBase64, setPreviewBase64] = useState("");
  const [saving, setSaving] = useState(false);

  // 1. 获取学校（仅管理员）
  useEffect(() => {
    if (isAdmin) {
      schoolApi.get("/all").then((res) => {
        if (res.data?.code === 200 && res.data.data.length > 0) {
          setAdminSchoolList(res.data.data);
          const cachedSchoolId = localStorage.getItem("adminSelectedSchoolId");
          const isValidCache = res.data.data.some(
            (s) => String(s.id) === String(cachedSchoolId),
          );
          if (!isValidCache) {
            setSelectedSchoolId(res.data.data[0].id);
          }
        }
      });
    }
  }, [isAdmin]);

  // 2. 获取班级（管理员或校长）
  useEffect(() => {
    if (isAdmin && selectedSchoolId) {
      classesApi
        .get("/all", { params: { schoolId: selectedSchoolId } })
        .then((res) => {
          if (res.data?.code === 200) {
            const classes = res.data.data || [];
            setAdminClassList(classes);
            const cachedClassId = localStorage.getItem("adminSelectedClassId");
            const isValidCache = classes.some(
              (c) => String(c.id) === String(cachedClassId),
            );
            if (classes.length > 0 && !isValidCache) {
              setSelectedAdminClassId(classes[0].id);
            } else if (classes.length === 0) {
              setSelectedAdminClassId("");
            }
          }
        });
    } else if (isPrincipal) {
      const schoolId = detailInfo?.schoolMembers?.[0]?.schoolId;
      if (schoolId) {
        classesApi.get("/all", { params: { schoolId } }).then((res) => {
          if (res.data?.code === 200) {
            const classes = res.data.data || [];
            setAdminClassList(classes);
            const cachedClassId = localStorage.getItem("adminSelectedClassId");
            const isValidCache = classes.some(
              (c) => String(c.id) === String(cachedClassId),
            );
            if (classes.length > 0 && !isValidCache) {
              setSelectedAdminClassId(classes[0].id);
            } else if (classes.length === 0) {
              setSelectedAdminClassId("");
            }
          }
        });
      }
    }
  }, [isAdmin, isPrincipal, selectedSchoolId, detailInfo]);

  // 同步缓存
  useEffect(() => {
    if ((isAdmin || isPrincipal) && selectedAdminClassId) {
      if (selectedSchoolId) {
        localStorage.setItem("adminSelectedSchoolId", selectedSchoolId);
      }
      localStorage.setItem("adminSelectedClassId", selectedAdminClassId);
    }
  }, [selectedAdminClassId, selectedSchoolId, isAdmin, isPrincipal]);

  // 确定目标班级ID
  const targetClassId =
    isAdmin || isPrincipal
      ? selectedAdminClassId
      : activeType === "class"
        ? activeId
        : null;

  // 3. 核心：加载班级主页详情
  const loadClassHome = async () => {
    if (!targetClassId) return;
    setLoading(true);
    try {
      const res = await classHomeApi.get(`/detail/${targetClassId}`);
      if (res.data.code === 200 && res.data.data) {
        setClassData(res.data.data);
      } else {
        setClassData(null);
      }
    } catch (error) {
      console.error("加载班级主页失败:", error);
      setClassData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetClassId) {
      loadClassHome();
    } else {
      setClassData(null);
    }
  }, [targetClassId]);

  // 4. 打开编辑框并初始化数据
  const openEditModal = () => {
    setEditDesc(classData?.description || "");
    setEditFile(null);
    setPreviewBase64("");
    setShowEditModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreviewBase64(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // 5. 提交更新表单
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      // 使用 Blob 将 DTO 转化为 JSON 并放入表单中
      const dto = {
        classId: targetClassId,
        description: editDesc,
      };
      formData.append(
        "dto",
        new Blob([JSON.stringify(dto)], { type: "application/json" }),
      );

      if (editFile) {
        formData.append("coverImage", editFile);
      }

      const res = await classHomeApi.post("/update", formData);
      if (res.data?.code === 200 || res.data?.classId) {
        // 兼容返回体
        Swal.fire({ icon: "success", title: "更新成功", timer: 1500 });
        setShowEditModal(false);
        loadClassHome(); // 刷新页面数据
      }
    } catch (error) {
      console.error("更新失败:", error);
      Swal.fire({
        icon: "error",
        title: "更新失败",
        text: error.response?.data?.message || "发生未知错误",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isPrincipal && activeType !== "class") {
    return (
      <div className={styles.classHomePage}>
        <div className={styles.emptyState}>请先在左侧选择班级</div>
      </div>
    );
  }

  return (
    <div className={styles.classHomePage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* <h2>班级主页</h2> */}
        </div>
        <div className={styles.headerRight}>
          {isAdmin && (
            <select
              className={styles.selectBox}
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
              className={styles.selectBox}
              value={selectedAdminClassId}
              onChange={(e) => setSelectedAdminClassId(e.target.value)}
            >
              {adminClassList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {canEdit && targetClassId && (
            <button className={styles.editBtn} onClick={openEditModal}>
              <FontAwesomeIcon icon={faEdit} /> 编辑主页
            </button>
          )}
        </div>
      </header>

      <div className={styles.mainContent}>
        {loading ? (
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            <p>加载中...</p>
          </div>
        ) : !classData ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faSchool} size="4x" />
            <p>班级首页还没有数据</p>
          </div>
        ) : (
          <div className={styles.contentCard}>
            <div className={styles.imageSection}>
              <CoverImage
                coverImage={classData.coverImage}
                alt="班级封面"
                className={styles.mainCoverImage}
              />
            </div>
            <div className={styles.descSection}>
              {/* <h3>班级介绍</h3> */}
              {/* description 中可能包含HTML标签所以用 dangerouslySetInnerHTML 渲染 */}
              <div
                className={styles.richText}
                dangerouslySetInnerHTML={{ __html: classData.description }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>编辑班级主页</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowEditModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className={styles.modalContent}>
                <div className={styles.formGroup}>
                  <label>封面图片</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {previewBase64 && (
                    <div className={styles.previewBox}>
                      <img src={previewBase64} alt="预览" />
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>班级描述</label>
                  <textarea
                    rows={6}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="请输入班级的详细描述..."
                    required
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassHomePage;
