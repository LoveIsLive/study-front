import React, { useState } from "react";
import useAuthStore from "../../../../store/authStore";
import DiscussionForm from "./DiscussionForm";
import styles from "./Discussion.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReply, faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { sanitizeHTML } from "../../../../utils/helpers";

const stringToColor = (str) => {
  let hash = 0;
  if (!str || str.length === 0) return "#cccccc";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
};

const Post = ({ post, onAction }) => {
const { user, isTeacher, isPrincipal } = useAuthStore();
const [isReplying, setIsReplying] = useState(false);
const [isEditing, setIsEditing] = useState(false);

// 修改权限：只能本人修改
const canEdit = user?.name === post.username;
// 删除权限：本人，或者管理员、教师、校长可以删除
const canDelete =
  canEdit ||
  user?.isAdmin ||
  (isTeacher && isTeacher()) ||
  (isPrincipal && isPrincipal());
  const authorInitial = post.username
    ? post.username.charAt(0).toUpperCase()
    : "?";
  const avatarColor = post.username ? stringToColor(post.username) : "#cccccc";

  // 只有当服务端成功响应时，才将回复或编辑框关闭
  const handleAction = async (actionType, data) => {
    const success = await onAction(actionType, data);
    if (success) {
      if (actionType === "create") setIsReplying(false);
      if (actionType === "update") setIsEditing(false);
    }
  };

  return (
    <div className={styles.post}>
      <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
        {authorInitial}
      </div>

      <div className={styles.postWrapper}>
        <div className={styles.postBubble}>
          <div className={styles.postHeader}>
            <span className={styles.postAuthor}>
              {post.username || "匿名用户"}
            </span>
            <span className={styles.postTimestamp}>
              {new Date(post.createTime).toLocaleDateString("zh-CN")}
              {post.updateTime > post.createTime && " (已编辑)"}
            </span>
          </div>

          {!isEditing ? (
            <div
              className={styles.postBody}
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }}
            />
          ) : (
            <DiscussionForm
              initialText={post.content}
              onSubmit={(content) =>
                handleAction("update", { postId: post.id, content })
              }
              onCancel={() => setIsEditing(false)}
              submitLabel="保存"
            />
          )}

          {!isEditing && !post.isDeleted && (
            <div className={styles.postActions}>
              <button
                title="回复"
                className={styles.actionButton}
                onClick={() => setIsReplying(!isReplying)}
              >
                <FontAwesomeIcon icon={faReply} />
              </button>
              {/* 原来的 canModify 逻辑替换为分开的权限判断 */}
              {canEdit && (
                <button
                  title="编辑"
                  className={styles.actionButton}
                  onClick={() => setIsEditing(true)}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
              )}
              {canDelete && (
                <button
                  title="删除"
                  className={styles.actionButton}
                  onClick={() => onAction("delete", { postId: post.id })}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              )}
            </div>
          )}
        </div>

        {isReplying && !isEditing && (
          <DiscussionForm
            placeholder={`回复 ${post.username}...`}
            onSubmit={(content) =>
              handleAction("create", { parentId: post.id, content })
            }
            onCancel={() => setIsReplying(false)}
          />
        )}

        {post.replies && post.replies.length > 0 && (
          <div className={styles.replies}>
            {post.replies.map((reply) => (
              <Post key={reply.id} post={reply} onAction={onAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Post;