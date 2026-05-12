// src/pages/Ware/CourseWareFlatView.jsx
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// 修复：将 faFileAlt 替换为 faClipboardList 确保图标正常渲染
import {
  faTrashAlt,
  faEllipsisH,
  faPlus,
  faDownload,
  faEdit,
  faRobot,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { wareApi } from "../../services/api";
import { isPreviewable } from "../../utils/helpers";
import useAuthStore from "../../store/authStore";
import useAIStore from "../../store/aiStore";
import Swal from "sweetalert2";
import NewItemModal from "./components/NewItemModal";
import styles from "./CourseWareFlatView.module.css";

// 【新增】：根据身份重写完整后端实际仓库路径的包装器
// 【新增】：根据身份重写完整后端实际仓库路径的包装器（基于名称拼接）
const getWareApiPath = (path, courseId) => {
  if (!courseId) return path;
  const state = useAuthStore.getState();
  const isAdmin = state.isAdmin();
  const isPrincipal = state.isPrincipal();

  // 剥离可能存在的原有 /courseId 前缀，获取干净的相对路径
  let cleanPath = path || "/";
  const prefix = `/${courseId}`;
  if (cleanPath === prefix) {
    cleanPath = "";
  } else if (cleanPath.startsWith(prefix + "/")) {
    cleanPath = cleanPath.slice(prefix.length);
  }
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  if (cleanPath === "/") cleanPath = "";

  // 仅针对管理视角的绝对路径重写
  if (isAdmin || isPrincipal) {
    // 【核心修复2】：从 localStorage 中提取在 CourseListPage 中选定的真实【名称】而不是ID
    let schoolName = localStorage.getItem("adminSelectedSchoolName") || "未知学校";
    let className = localStorage.getItem("adminSelectedClassName") || "未知班级";

    // 强制转换为带前缀的绝对路径 (按照要求的 {学校名}/{班级名}/{courseid} 结构)
    if (isAdmin) {
      return `/${schoolName}/${className}/${courseId}${cleanPath}`;
    } else if (isPrincipal) {
      return `/${className}/${courseId}${cleanPath}`;
    }
  }
  
  // 普通用户保持原样
  return path;
};
// --- 自定义 SVG 图标 ---
const FolderIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const FileIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// --- 递归的树节点组件 ---
const TreeNode = ({ node, currentPath, onRefresh, openModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);

  // 权限控制：严格区分师生权限
  const { currentCourseId } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  // 仅教师、管理员、校长拥有上传、重命名、删除权限
  const hasFullAccess = isTeacher || isAdmin || isPrincipal;

  const isDir =
    node.isDir !== undefined ? node.isDir : !node.name.includes(".");
  const fullPath =
    currentPath === "/" ? `/${node.name}` : `${currentPath}/${node.name}`;

  const fetchChildren = async () => {
    try {
      const reqPath = getWareApiPath(fullPath, currentCourseId); // 【新增】
      const response = await wareApi.get("/get/dir", {
        params: { path: reqPath }, // 【修改】
      });
      setChildren(response.data.data.fileObjectDescs || []);
      setHasFetched(true);
    } catch (error) {
      console.error("加载文件夹内容失败:", error);
    }
  };

  const handleToggle = async (e) => {
    if (!isDir) return;
    if (!hasFetched) {
      setIsLoading(true);
      setIsExpanded(true);
      await fetchChildren();
      setIsLoading(false);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // 双击触发预览功能
  const handleItemClick = (e) => {
    if (isDir) {
      handleToggle(e); // 文件夹则展开/收起
    } else {
      // 文件则进行预览判定（单击预览）
      if (isPreviewable(node.mimeTypeName || node.name)) {
        handleAction("preview", e);
      }
    }
  };

  const handleRename = async () => {
    if (newName && newName !== node.name) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId); // 【新增】
        if (isDir) {
          await wareApi.post("/update/dir", null, {
            params: { path: reqPath, newName }, // 【修改】
          });
        } else {
          await wareApi.post("/update/file", { path: reqPath, newName }); // 【修改】
        }
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "重命名成功",
          showConfirmButton: false,
          timer: 2000,
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "重命名失败",
          text: error.response?.data?.message,
        });
      }
    }
    setIsRenaming(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: `确定要删除 "${node.name}" 吗?`,
      text: isDir ? "警告：删除目录将永久删除其所有内容！" : "此操作无法撤销。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "取消",
      confirmButtonText: "是的，删除",
    });

    if (result.isConfirmed) {
      try {
        const reqPath = getWareApiPath(fullPath, currentCourseId); // 【新增】
        const url = isDir ? "/delete/dir" : "/delete/file";
        await wareApi.delete(url, { params: { path: reqPath } }); // 【修改】
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `"${node.name}" 已删除`,
          showConfirmButton: false,
          timer: 2000,
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        Swal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  const handleAction = async (action, e) => {
    e.stopPropagation();
    try {
      if (action === "preview" || action === "download") {
        const reqPath = getWareApiPath(fullPath, currentCourseId); // 【新增】
        const res = await wareApi.get("/get/downloadId", {
          params: { path: reqPath }, // 【修改】
        });
        const token = res.data.data;
        const baseUrl = wareApi.defaults.baseURL;

        let apiPath = fullPath;
        if (currentCourseId) {
          const courseIdStr = String(currentCourseId);
          if (!apiPath.startsWith(`/${courseIdStr}`)) {
            if (apiPath === "/" || apiPath === "") {
              apiPath = `/${courseIdStr}`;
            } else {
              const normalizedPath = apiPath.startsWith("/")
                ? apiPath
                : "/" + apiPath;
              apiPath = `/${courseIdStr}${normalizedPath}`;
            }
          }
        }
        apiPath = getWareApiPath(apiPath, currentCourseId); // 【新增：再次拦截确保拼接】
        const url = `${baseUrl}/download?path=${encodeURIComponent(apiPath)}&token=${token}`;

        if (action === "preview") {
          window.open(`${url}&mode=inline`, "_blank");
        } else {
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", node.name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      // --- 终极修改点：AI一键总结 ---
      if (action === "ai-summary") {
        const aiStore = useAIStore.getState();
        const authStore = useAuthStore.getState();

        let apiPath = fullPath;
        if (authStore.currentCourseId) {
          const courseIdStr = String(authStore.currentCourseId);
          if (!apiPath.startsWith(`/${courseIdStr}`)) {
            if (apiPath === "/" || apiPath === "") {
              apiPath = `/${courseIdStr}`;
            } else {
              const normalizedPath = apiPath.startsWith("/")
                ? apiPath
                : "/" + apiPath;
              apiPath = `/${courseIdStr}${normalizedPath}`;
            }
          }
        }

        aiStore.setContext("file-summary", {
          path: apiPath,
          autoSendMsg: `请帮我总结一下这个文件：${node.name}`,
        });

        window.dispatchEvent(new CustomEvent("open-ai-chat"));

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "已唤醒AI",
          text: "正在生成总结，请在对话框中查看...",
          showConfirmButton: false,
          timer: 2000,
        });
      }

      // --- 修改点：查看并修改AI总结，对接 /get/summary 接口 ---
      if (action === "view-summary") {
        const reqPath = getWareApiPath(fullPath, currentCourseId); // 【新增】
        const response = await wareApi.get("/get/summary", {
          params: { path: reqPath }, // 【修改】
        });

        const currentSummary = response.data.data?.aiSummary || "";

        // 【新增修改 1】：根据是否有管理权限来决定是“可编辑”还是“只读”
        if (hasFullAccess) {
          // 教师、管理员、校长的可编辑视图
          const { value: newSummary, isConfirmed } = await Swal.fire({
            title: "AI 文件总结",
            input: "textarea",
            inputValue: currentSummary,
            inputPlaceholder:
              "暂无AI总结内容，您可以使用【AI一键总结】生成，也可以直接在此编辑...",
            showCancelButton: true,
            confirmButtonText: "保存修改",
            cancelButtonText: "关闭",
            customClass: {
              input: "custom-swal-textarea",
            },
          });

          if (isConfirmed && newSummary !== currentSummary) {
            await wareApi.post("/update/summary", null, {
              params: {
                path: reqPath, // 【修改】
                summary: newSummary,
              },
            });
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "总结已保存",
              showConfirmButton: false,
              timer: 2000,
            });
          }
        } else {
          // 学生和访客的只读视图
          await Swal.fire({
            title: "AI 文件总结",
            // 使用 html 进行友好的文本排版，支持换行且不可编辑
            html: `<div style="text-align: left; white-space: pre-wrap; line-height: 1.6; font-size: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; max-height: 400px; overflow-y: auto;">${currentSummary || "暂无AI总结内容"}</div>`,
            showConfirmButton: false, // 隐藏确认按钮（即保存按钮）
            showCancelButton: true,
            cancelButtonText: "关闭",
            cancelButtonColor: "#6c757d",
          });
        }
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "操作失败" });
    }
  };

  return (
    <li className={styles.nodeItem}>
      <div className={styles.nodeContent} onClick={handleItemClick}>
        <div className={styles.iconCircle}>
          {isDir ? <FolderIcon /> : <FileIcon />}
        </div>

        <div className={styles.nodeNameWrapper}>
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className={styles.renameInput}
            />
          ) : (
            <span className={styles.nodeName}>{node.name}</span>
          )}
        </div>

        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {/* 所有人可见的高频按钮：下载 */}
          {!isDir && (
            <FontAwesomeIcon
              icon={faDownload}
              className={styles.actionBtn}
              title="下载"
              onClick={(e) => handleAction("download", e)}
            />
          )}

          {/* 所有人可见的功能：针对可预览文件开放的 AI 处理按钮 */}
          {!isDir && isPreviewable(node.mimeTypeName || node.name) && (
            <>
              <FontAwesomeIcon
                icon={faRobot}
                className={styles.actionBtn}
                title="AI一键总结"
                onClick={(e) => handleAction("ai-summary", e)}
              />
              <FontAwesomeIcon
                icon={faClipboardList}
                className={styles.actionBtn}
                title="查看AI总结"
                onClick={(e) => handleAction("view-summary", e)}
              />
            </>
          )}

          {/* 仅教师及管理员可见的操作 */}
          {hasFullAccess && (
            <FontAwesomeIcon
              icon={faTrashAlt}
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              title="删除"
              onClick={handleDelete}
            />
          )}

          {/* 【新增修改 2】：完全隐藏非管理员角色的 '...' 更多菜单 */}
          {/* 之前是 (!isDir || hasFullAccess)，这会导致学生在文件节点上也能看到空的 "..." 按钮。现在改为必须具备管理权限才渲染 */}
          {hasFullAccess && (
            <div
              className={styles.moreMenuWrapper}
              onMouseLeave={() => setShowMenu(false)}
            >
              <FontAwesomeIcon
                icon={faEllipsisH}
                className={styles.actionBtn}
                title="更多"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              />
              {showMenu && (
                <div className={styles.dropdownMenu}>
                  {/* 重命名：必须有管理权限 */}
                  {hasFullAccess && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(true);
                        setShowMenu(false);
                      }}
                    >
                      重命名
                    </div>
                  )}

                  {/* 上传到此文件夹：必须是目录且有管理权限 */}
                  {hasFullAccess && isDir && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(fullPath, fetchChildren);
                        setShowMenu(false);
                      }}
                    >
                      上传到此文件夹
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isDir && (
          <div
            className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}
          >
            <ChevronRight />
          </div>
        )}
      </div>

      {isDir && (
        <div
          className={`${styles.childrenWrapper} ${isExpanded ? styles.expanded : ""}`}
        >
          <div className={styles.childrenInner}>
            <div className={styles.childrenContainer}>
              {isLoading ? (
                <div className={styles.loading}>数据加载中...</div>
              ) : (
                <ul className={styles.nodeList}>
                  {children.map((child, index) => (
                    <TreeNode
                      key={index}
                      node={child}
                      currentPath={fullPath}
                      onRefresh={fetchChildren}
                      openModal={openModal}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
};

// --- 主组件 ---
const CourseWareFlatView = ({ courseId }) => {
  const [rootNodes, setRootNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    path: "/",
    onRefresh: null,
  });

  // 确保只有特定角色的教师及管理员才会显示全局“上传到根目录”按钮
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());
  const hasFullAccess = isTeacher || isAdmin || isPrincipal;

  const fetchRoot = async () => {
    setIsLoading(true);
    try {
      const reqPath = getWareApiPath("/", courseId); // 【新增】
      const response = await wareApi.get("/get/dir", {
        params: { path: reqPath }, // 【修改】
      });
      setRootNodes(response.data.data.fileObjectDescs || []);
    } catch (error) {
      console.error("加载根目录失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchRoot();
  }, [courseId]);

  const openModal = (path, onRefresh) => {
    setModalConfig({ isOpen: true, path, onRefresh });
  };

  if (isLoading) return <div className={styles.loadingMain}>仓库加载中...</div>;

  return (
    <div className={styles.container}>
      {/* 根目录新建/上传，严格保护 */}
      {hasFullAccess && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>课程资料</span>
          <button
            className={styles.newBtn}
            onClick={() => openModal("/", fetchRoot)}
          >
            <FontAwesomeIcon icon={faPlus} /> 上传到根目录
          </button>
        </div>
      )}

      <ul className={styles.nodeList}>
        {rootNodes.map((node, index) => (
          <TreeNode
            key={index}
            node={node}
            currentPath="/"
            onRefresh={fetchRoot}
            openModal={openModal}
          />
        ))}
      </ul>

      {/* 复用新建/上传弹窗组件 */}
      {/* 复用新建/上传弹窗组件 */}
      <NewItemModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        currentPath={getWareApiPath(modalConfig.path, courseId)} // 【修改点】
        onSuccess={() => {
          if (modalConfig.onRefresh) {
            modalConfig.onRefresh();
          }
        }}
      />
    </div>
  );
};

export default CourseWareFlatView;
