import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faTimes,
  faFolder,
  faFile,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import useAuthStore from "../../../store/authStore";
import { wareApi, discussionApi } from "../../../services/api";
import styles from "../CourseListPage.module.css";

const CourseDetailModal = ({ course, isOpen, onClose }) => {
  const [wareData, setWareData] = useState([]);
  const [discussionData, setDiscussionData] = useState([]);
  const [loadingWare, setLoadingWare] = useState(false);
  const [loadingDiscussion, setLoadingDiscussion] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeTab, setActiveTab] = useState("ware"); // "ware" 或 "discussion"

  // 讨论帖子组件（递归渲染）
  const Post = ({ post, depth = 0 }) => {
    return (
      <div className={styles.discussionPost} style={{ marginLeft: depth * 30 }}>
        <div className={styles.postHeader}>
          <span className={styles.postAuthor}>{post.username}</span>
          <span className={styles.postTime}>
            {new Date(post.createTime).toLocaleString()}
          </span>
        </div>
        <div className={styles.postContent}>{post.content}</div>
        {/* 递归渲染回复 */}
        {post.replies && post.replies.length > 0 && (
          <div className={styles.replies}>
            {post.replies.map((reply) => (
              <Post key={reply.id} post={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen && course) {
      // 保存当前的课程ID
      const store = useAuthStore.getState();
      const previousCourseId = store.currentCourseId;
      const previousCourse = store.currentCourse;
      
      // 临时设置为点击的课程，以便获取正确的仓库数据
      store.setCurrentCourse(course.id, course);
      
      fetchWareData();
      fetchDiscussionData();
      
      // 清理函数：恢复之前的课程
      return () => {
        if (previousCourseId) {
          store.setCurrentCourse(previousCourseId, previousCourse);
        } else {
          // 如果之前没有选择课程，清空当前课程
          store.clearCurrentCourse();
        }
      };
    }
  }, [isOpen, course]);

  // 递归加载文件夹及其所有子项
  const loadFolderRecursively = async (folderPath, parentId = 'root') => {
    try {
      const response = await wareApi.get('/get/dir', { params: { path: folderPath } });
      const items = response.data.data.fileObjectDescs || [];
      
      const itemsWithChildren = await Promise.all(
        items.map(async (item, index) => {
          const itemId = `${parentId}-${item.name}-${index}`;
          const itemPath = folderPath === '/' ? `/${item.name}` : `${folderPath}/${item.name}`;
          
          if (item.type === 0) {
            // 文件夹：递归加载子项
            const children = await loadFolderRecursively(itemPath, itemId);
            return {
              ...item,
              id: itemId,
              path: itemPath,
              children,
              loaded: true, // 已加载所有子项
            };
          } else {
            // 文件：没有子项
            return {
              ...item,
              id: itemId,
              path: itemPath,
              children: null,
              loaded: false,
            };
          }
        })
      );
      
      return itemsWithChildren;
    } catch (error) {
      console.error(`递归加载文件夹 ${folderPath} 失败:`, error);
      return [];
    }
  };

  // 收集所有文件夹ID的函数
  const collectAllFolderIds = (items) => {
    const folderIds = [];
    const traverse = (items) => {
      items.forEach(item => {
        if (item.type === 0) { // 文件夹
          folderIds.push(item.id);
          if (item.children && item.children.length > 0) {
            traverse(item.children);
          }
        }
      });
    };
    traverse(items);
    return folderIds;
  };

  const fetchWareData = async () => {
    setLoadingWare(true);
    try {
      // 递归加载整个仓库树，路径使用 '/'，拦截器会自动添加当前课程ID前缀
      const rootItems = await loadFolderRecursively('/', 'root');
      setWareData(rootItems);
      
      // 默认展开所有文件夹
      const allFolderIds = collectAllFolderIds(rootItems);
      setExpandedFolders(new Set(allFolderIds));
    } catch (error) {
      console.error("获取仓库数据失败:", error);
      Swal.fire({ icon: 'error', title: '加载仓库数据失败' });
    } finally {
      setLoadingWare(false);
    }
  };

  const fetchDiscussionData = async () => {
    setLoadingDiscussion(true);
    try {
      const response = await discussionApi.get('/getall', { params: { ownerId: course.id, ownerType: 'course' } });
      const posts = response.data.data || [];
      setDiscussionData(posts);
    } catch (error) {
      console.error("获取讨论数据失败:", error);
      Swal.fire({ icon: 'error', title: '加载讨论数据失败' });
    } finally {
      setLoadingDiscussion(false);
    }
  };

  const toggleFolder = (item) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      const folderId = item.id;
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
        return newSet;
      } else {
        newSet.add(folderId);
        // 数据已通过递归加载预加载，无需再次加载
        return newSet;
      }
    });
  };

  // 递归渲染树形结构
  const renderTree = (items, depth = 0) => {
    return items.map((item) => (
      <div key={item.id} className={styles.treeNodeWrapper}>
        <div className={styles.treeItem}>
          {item.type === 0 ? (
            <FontAwesomeIcon icon={faFolder} style={{ color: "#f6ad55" }} /> // 文件夹用橙色
          ) : (
            <FontAwesomeIcon icon={faFile} style={{ color: "#63b3ed" }} /> // 文件用蓝色
          )}
          <span>{item.name}</span>
          {item.type === 0 && (
            <button className={styles.treeToggle} onClick={() => toggleFolder(item)}>
              <FontAwesomeIcon icon={expandedFolders.has(item.id) ? faChevronDown : faChevronRight} />
            </button>
          )}
        </div>
        {/* 递归渲染子项 */}
        {item.type === 0 && expandedFolders.has(item.id) && item.children && (
          <div className={styles.treeChildren}>
            {renderTree(item.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '800px' }}>
        <div className={styles.modalHeader}>
          <h3 style={{ textAlign: 'center', textTransform: 'uppercase' }}>
            {course?.name || '课程详情'}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={styles.modalContent}>
          {/* 课程描述 */}
          <div className={styles.detailSection}>
            <h4>课程描述</h4>
            <p>{course?.description || '暂无描述'}</p>
          </div>

          {/* 课程章节和讨论区标签切换 */}
          <div className={styles.detailSection}>
            <div className={styles.tabContainer}>
              <div className={styles.tabHeader}>
                <button
                  className={`${styles.tabButton} ${activeTab === "ware" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("ware")}
                >
                  课程仓库
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === "discussion" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("discussion")}
                >
                  评论区
                </button>
              </div>
              
              <div className={styles.tabContent}>
                {activeTab === "ware" ? (
                  <>
                    {loadingWare ? (
                      <div className={styles.loading}>
                        <FontAwesomeIcon icon={faSpinner} spin /> 加载仓库数据中...
                      </div>
                    ) : wareData.length === 0 ? (
                      <p>暂无仓库数据</p>
                    ) : (
                      <div className={styles.treeContainer}>
                        {renderTree(wareData)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingDiscussion ? (
                      <div className={styles.loading}>
                        <FontAwesomeIcon icon={faSpinner} spin /> 加载讨论数据中...
                      </div>
                    ) : discussionData.length === 0 ? (
                      <p>暂无讨论</p>
                    ) : (
                      <div className={styles.discussionContainer}>
                        {discussionData.map((post) => (
                          <Post key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.primary}`}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailModal;