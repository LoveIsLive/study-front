import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faSpinner, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import { discussionApi } from "../../services/api";
import styles from "./DiscussionPage.module.css";

// 讨论帖子组件
const Post = ({ post, depth = 0, onReply, onEdit, onDelete, isTeacher, isStudent, currentUserId }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(post.content);

  const canEdit = post.userId === currentUserId;
  const canDelete = post.userId === currentUserId || isTeacher;

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      Swal.fire({ icon: "warning", title: "回复内容不能为空" });
      return;
    }

    try {
      await onReply(post.id, replyContent);
      setReplyContent("");
      setIsReplying(false);
    } catch (error) {
      console.error("回复失败:", error);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) {
      Swal.fire({ icon: "warning", title: "内容不能为空" });
      return;
    }

    try {
      await onEdit(post.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error("编辑失败:", error);
    }
  };

  return (
    <div className={styles.post} style={{ marginLeft: depth * 30 }}>
      <div className={styles.postHeader}>
        <div className={styles.postAuthor}>
          <span className={styles.authorName}>{post.username}</span>
          <span className={styles.postTime}>
            {new Date(post.createTime).toLocaleString()}
          </span>
        </div>
        <div className={styles.postActions}>
          {!isEditing && (
            <>
              <button
                className={styles.actionButton}
                onClick={() => setIsReplying(!isReplying)}
              >
                回复
              </button>
              {canEdit && (
                <button
                  className={styles.actionButton}
                  onClick={() => setIsEditing(true)}
                >
                  编辑
                </button>
              )}
              {canDelete && (
                <button
                  className={styles.actionButton}
                  onClick={() => onDelete(post.id)}
                >
                  删除
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmitEdit} className={styles.editForm}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows="3"
            className={styles.editTextarea}
          />
          <div className={styles.formButtons}>
            <button type="submit" className={styles.submitButton}>
              保存
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsEditing(false)}
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.postContent}>{post.content}</div>
      )}

      {isReplying && (
        <form onSubmit={handleSubmitReply} className={styles.replyForm}>
          <textarea
            placeholder="输入回复内容..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows="3"
            className={styles.replyTextarea}
          />
          <div className={styles.formButtons}>
            <button type="submit" className={styles.submitButton}>
              发送回复
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsReplying(false)}
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 递归渲染回复 */}
      {post.replies && post.replies.length > 0 && (
        <div className={styles.replies}>
          {post.replies.map((reply) => (
            <Post
              key={reply.id}
              post={reply}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              isTeacher={isTeacher}
              isStudent={isStudent}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 讨论板组件
const DiscussionBoard = ({ courseId }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isStudent = useAuthStore((state) => state.isStudent());

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await discussionApi.get('/getall', { params: { ownerId: courseId, ownerType: 'course' } });
      setPosts(response.data.data || []);
    } catch (error) {
      console.error("获取讨论失败:", error);
      Swal.fire({ icon: "error", title: "加载讨论失败" });
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchPosts();
    }
  }, [courseId]);

  const handleSubmitNewPost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      Swal.fire({ icon: "warning", title: "帖子内容不能为空" });
      return;
    }

    setIsSubmitting(true);
    try {
      await discussionApi.post("/", {
        ownerId: courseId,
        ownerType: "course",
        parentId: null,
        content: newPostContent,
      });
      setNewPostContent("");
      Swal.fire({ icon: "success", title: "发布成功" });
      fetchPosts();
    } catch (error) {
      console.error("发布失败:", error);
      Swal.fire({ icon: "error", title: "发布失败" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId, content) => {
    try {
      await discussionApi.post("/", {
        ownerId: courseId,
        ownerType: "course",
        parentId,
        content,
      });
      Swal.fire({ icon: "success", title: "回复成功" });
      fetchPosts();
    } catch (error) {
      console.error("回复失败:", error);
      Swal.fire({ icon: "error", title: "回复失败" });
      throw error;
    }
  };

  const handleEdit = async (postId, content) => {
    try {
      await discussionApi.put(`/${postId}`, { content });
      Swal.fire({ icon: "success", title: "编辑成功" });
      fetchPosts();
    } catch (error) {
      console.error("编辑失败:", error);
      Swal.fire({ icon: "error", title: "编辑失败" });
      throw error;
    }
  };

  const handleDelete = async (postId) => {
    const result = await Swal.fire({
      icon: "question",
      title: "确定删除这条帖子吗？",
      text: "删除后无法恢复。",
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      try {
        await discussionApi.delete(`/${postId}`);
        Swal.fire({ icon: "success", title: "删除成功" });
        fetchPosts();
      } catch (error) {
        console.error("删除失败:", error);
        Swal.fire({ icon: "error", title: "删除失败" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>加载讨论中...</p>
      </div>
    );
  }

  return (
    <div className={styles.discussionBoard}>
      <div className={styles.newPost}>
        <h3>发表新帖子</h3>
        <form onSubmit={handleSubmitNewPost}>
          <textarea
            placeholder="输入帖子内容..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows="4"
            className={styles.newPostTextarea}
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              "发布帖子"
            )}
          </button>
        </form>
      </div>

      <div className={styles.postsList}>
        <h3>讨论区 ({posts.length} 条帖子)</h3>
        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faComments} size="3x" />
            <p>暂无讨论，快来发表第一个帖子吧！</p>
          </div>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isTeacher={isTeacher}
              isStudent={isStudent}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

// 主页面组件
const DiscussionPage = () => {
  const navigate = useNavigate();
  const { activeType, currentCourseId, currentCourse } = useAuthStore();

  // 如果不在班级上下文或没有选择课程，显示提示
  if (activeType !== "class") {
    return (
      <div className={styles.discussionPage}>
        <div className={styles.fileManager}>
          <div className={styles.errorState}>
            <h2>讨论区仅适用于班级上下文</h2>
            <p>请切换到班级上下文以使用讨论区功能。</p>
            <button onClick={() => navigate("/")} className={styles.backButton}>
              <FontAwesomeIcon icon={faArrowLeft} /> 返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCourseId) {
    return (
      <div className={styles.discussionPage}>
        <div className={styles.fileManager}>
          <div className={styles.errorState}>
            <h2>请先选择课程</h2>
            <p>使用讨论区前，请先在课程选择页面选择一门课程。</p>
            <button
              onClick={() => navigate("/courses")}
              className={styles.backButton}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> 前往课程选择
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.discussionPage}>
      <div className={styles.fileManager}>
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            <h1>
              <FontAwesomeIcon icon={faComments} /> 课程讨论区
            </h1>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.courseInfo}>
              当前课程: <strong>{currentCourse?.name || "未知课程"}</strong>
            </div>
          </div>
        </header>
        
        <div className={styles.mainContent}>
          <DiscussionBoard courseId={currentCourseId} />
        </div>
      </div>
    </div>
  );
};

export default DiscussionPage;