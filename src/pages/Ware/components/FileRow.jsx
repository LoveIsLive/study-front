import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// 【新增】引入 faEllipsisV (三个点) 和 faEyeSlash (隐藏) 图标
import {
  faFolder,
  faCopy,
  faEye,
  faDownload,
  faInfoCircle,
  faEdit,
  faTrashAlt,
  faEllipsisV,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import {
  formatFileSize,
  buildNewPath,
  isPreviewable,
  getFileIcon,
} from "../../../utils/helpers";
import useAuthStore from "../../../store/authStore";
import { wareApi } from "../../../services/api";
import styles from "../WarePage.module.css";
import Swal from "sweetalert2";
import { useCopyToClipboard } from "../../../hooks/useCopyToClipboard";

const FileRow = ({ node, currentPath, onDoubleClick, refresh }) => {
  const { icon, className } =
    node.type === 0
      ? { icon: faFolder, className: "folder-icon" }
      : getFileIcon(node.name);

  const { user, currentCourseId } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isStudent = useAuthStore((state) => state.isStudent());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  // 【新增】控制“更多操作”菜单的状态和引用
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const fullPath = buildNewPath(currentPath, node.name);
  const [isCopied, handleCopy] = useCopyToClipboard();

  // 【新增】点击外部区域自动关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRename = async () => {
    if (newName && newName !== node.name) {
      try {
        if (node.type === 0) {
          // Directory
          await wareApi.post("/update/dir", null, {
            params: { path: fullPath, newName },
          });
        } else {
          // File
          await wareApi.post("/update/file", { path: fullPath, newName });
        }
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "重命名成功",
          showConfirmButton: false,
          timer: 2000,
        });
        refresh(currentPath);
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

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: `确定要删除 "${node.name}" 吗?`,
      text:
        node.type === 0
          ? "警告：删除目录将永久删除其所有内容！"
          : "此操作无法撤销。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "取消",
      confirmButtonText: "是的，删除",
    });

    if (result.isConfirmed) {
      try {
        const url = node.type === 0 ? "/delete/dir" : "/delete/file";
        await wareApi.delete(url, { params: { path: fullPath } });
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `"${node.name}" 已删除`,
          showConfirmButton: false,
          timer: 2000,
        });
        refresh(currentPath);
      } catch (error) {
        Swal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  // 【新增】隐藏文件/目录处理函数
  const handleHide = async () => {
    const result = await Swal.fire({
      title: `确定要隐藏 "${node.name}" 吗?`,
      text: "隐藏后，学生和访客将无法看到此内容。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f39c12",
      cancelButtonText: "取消",
      confirmButtonText: "是的，隐藏",
    });

    if (result.isConfirmed) {
      try {
        // TODO: 这里假设后端通过传入 isHidden 参数来更新隐藏状态，你需要根据后端实际的API结构进行调整
        const url = node.type === 0 ? "/update/dir" : "/update/file";
        await wareApi.post(url, { path: fullPath, isHidden: true });

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "已成功隐藏",
          showConfirmButton: false,
          timer: 2000,
        });
        refresh(currentPath);
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "隐藏失败",
          text: error.response?.data?.message || "接口调用失败",
        });
      }
    }
  };

  const handleAction = async (action) => {
    try {
      if (action === "copy") {
        await handleCopy(fullPath);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "路径已复制",
          showConfirmButton: false,
          timer: 1500,
        });
      }
      if (action === "details") {
        const response = await wareApi.get("/get/node", {
          params: { path: fullPath },
        });
        const details = response.data.data;
        Swal.fire({
          title: `<strong>属性: ${details.name}</strong>`,
          html: `<div style="text-align: left; margin-left: 2rem;">
                               <p><strong>类型:</strong> ${details.type === 0 ? "目录" : "文件"}</p>
                               <p><strong>大小:</strong> ${formatFileSize(details.size)}</p>
                               <p><strong>MIME类型:</strong> ${details.mimeTypeName || "N/A"}</p>
                               <p><strong>路径:</strong> ${fullPath}</p>
                               <p><strong>创建时间:</strong> ${new Date(details.createTime).toLocaleString()}</p>
                               <p><strong>修改时间:</strong> ${new Date(details.modifyTime).toLocaleString()}</p>
                           </div>`,
          showCloseButton: true,
        });
      }
      if (action === "preview" || action === "download") {
        const res = await wareApi.get("/get/downloadId", {
          params: { path: fullPath },
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
    } catch (error) {
      Swal.fire({ icon: "error", title: "操作失败" });
    }
  };

  return (
    <tr onDoubleClick={onDoubleClick}>
      <td className={styles.colIcon}>
        <FontAwesomeIcon
          icon={icon}
          className={`${styles.nodeIcon} ${className}`}
        />
      </td>
      <td className={styles.colName}>
        <div className={styles.nodeName}>
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              className={styles.renameInput}
            />
          ) : (
            <span>{node.name}</span>
          )}
        </div>
      </td>
      <td className={styles.colSize}>
        {node.type === 1 ? formatFileSize(node.size) : "--"}
      </td>
      <td className={styles.colModified}>
        {new Date(node.modifyTime).toLocaleString()}
      </td>
      <td className={styles.colActions}>
        <div
          className={styles.actionsContainer}
          onClick={(e) => e.stopPropagation()}
        >
          <FontAwesomeIcon
            icon={faCopy}
            className={styles.actionIcon}
            title="复制路径"
            onClick={() => handleAction("copy")}
          />
          {node.type === 1 && isPreviewable(node.mimeTypeName) && (
            <FontAwesomeIcon
              icon={faEye}
              className={styles.actionIcon}
              title="预览"
              onClick={() => handleAction("preview")}
            />
          )}
          {node.type === 1 && (
            <FontAwesomeIcon
              icon={faDownload}
              className={styles.actionIcon}
              title="下载"
              onClick={() => handleAction("download")}
            />
          )}

          {/* 其他教师/管理员级别的快捷操作保留在外边 */}
          {(isTeacher || isAdmin || isPrincipal) && (
            <>
              <FontAwesomeIcon
                icon={faEdit}
                className={styles.actionIcon}
                title="重命名"
                onClick={() => setIsRenaming(true)}
              />
              <FontAwesomeIcon
                icon={faTrashAlt}
                className={`${styles.actionIcon} ${styles.deleteIcon}`}
                title="删除"
                onClick={handleDelete}
              />
            </>
          )}

          {/* 【核心修改】更多操作菜单（...） */}
          <div className={styles.moreMenuWrapper} ref={menuRef}>
            <FontAwesomeIcon
              icon={faEllipsisV}
              className={styles.actionIcon}
              title="更多操作"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            />
            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                {/* 所有角色均可查看属性 */}
                <div
                  className={styles.menuItem}
                  onClick={() => {
                    handleAction("details");
                    setIsMenuOpen(false);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className={styles.menuItemIcon}
                  />{" "}
                  查看属性
                </div>

                {/* 教师以上权限可以隐藏文件/目录 */}
                {(isTeacher || isAdmin || isPrincipal) && (
                  <div
                    className={styles.menuItem}
                    onClick={() => {
                      handleHide();
                      setIsMenuOpen(false);
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faEyeSlash}
                      className={styles.menuItemIcon}
                    />{" "}
                    隐藏
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default FileRow;
