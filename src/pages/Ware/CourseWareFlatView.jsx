// src/pages/Ware/CourseWareFlatView.jsx
import React, { useState, useEffect } from "react";
import { wareApi } from "../../services/api";
import styles from "./CourseWareFlatView.module.css";

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

// 只保留向右箭头，通过CSS旋转来实现展开动画更平滑
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
const TreeNode = ({ node, currentPath }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false); // 记录是否已经请求过数据

  const isDir =
    node.isDir !== undefined ? node.isDir : !node.name.includes(".");

  const handleToggle = async () => {
    if (!isDir) return;

    if (!hasFetched) {
      setIsLoading(true);
      setIsExpanded(true); // 先展开显示加载状态
      try {
        const nextPath =
          currentPath === "/" ? `/${node.name}` : `${currentPath}/${node.name}`;
        const response = await wareApi.get("/get/dir", {
          params: { path: nextPath },
        });
        setChildren(response.data.data.fileObjectDescs || []);
        setHasFetched(true);
      } catch (error) {
        console.error("加载文件夹内容失败:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // 已经请求过，直接切换状态
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <li className={styles.nodeItem}>
      <div className={styles.nodeContent} onClick={handleToggle}>
        <div className={styles.iconCircle}>
          {isDir ? <FolderIcon /> : <FileIcon />}
        </div>
        <span className={styles.nodeName}>{node.name}</span>
        {isDir && (
          <div
            className={`${styles.arrow} ${isExpanded ? styles.arrowExpanded : ""}`}
          >
            <ChevronRight />
          </div>
        )}
      </div>

      {/* 使用 CSS Grid 实现平滑动画的包裹层 */}
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
                      currentPath={
                        currentPath === "/"
                          ? `/${node.name}`
                          : `${currentPath}/${node.name}`
                      }
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

  useEffect(() => {
    const fetchRoot = async () => {
      setIsLoading(true);
      try {
        const response = await wareApi.get("/get/dir", {
          params: { path: "/" },
        });
        setRootNodes(response.data.data.fileObjectDescs || []);
      } catch (error) {
        console.error("加载根目录失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchRoot();
    }
  }, [courseId]);

  if (isLoading) return <div className={styles.loadingMain}>仓库加载中...</div>;

  return (
    <div className={styles.container}>
      <ul className={styles.nodeList}>
        {rootNodes.map((node, index) => (
          <TreeNode key={index} node={node} currentPath="/" />
        ))}
      </ul>
    </div>
  );
};

export default CourseWareFlatView;