import React, { useState } from 'react';
import useAuthStore from '../../../../store/authStore';
import DiscussionForm from './DiscussionForm';
import styles from './Discussion.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReply, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { sanitizeHTML } from '../../../../utils/helpers'; // 确保内容安全

/**
 * 根据字符串生成一个固定的颜色。
 * 用于为不同用户创建独特的头像颜色。
 * @param {string} str 输入字符串 (例如, 用户名)。
 * @returns {string} 一个十六进制颜色代码。
 */
const stringToColor = (str) => {
    let hash = 0;
    if (str.length === 0) return '#cccccc';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

const Post = ({ post, onAction }) => {
    const { user } = useAuthStore();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 任何用户（教师或学生）都可以修改自己的帖子。管理员可以修改任何帖子。
    const canModify = user?.name === post.username || user?.isAdmin;

    // 从用户名生成头像信息
    const authorInitial = post.username ? post.username.charAt(0).toUpperCase() : '?';
    const avatarColor = post.username ? stringToColor(post.username) : '#cccccc';

    /**
     * 处理创建回复或更新当前帖子的操作。
     * 它会调用父组件的处理器，并在完成后关闭相关的表单。
     */
    const handleAction = async (actionType, data) => {
        // DiscussionBoard中的onAction是异步的，我们等待它完成再改变本地状态。
        await onAction(actionType, data);

        // 操作成功处理后关闭表单
        if (actionType === 'create') {
            setIsReplying(false);
        }
        if (actionType === 'update') {
            setIsEditing(false);
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
                        <span className={styles.postAuthor}>{post.username || '匿名用户'}</span>
                        <span className={styles.postTimestamp}>
                            {new Date(post.createTime).toLocaleDateString('zh-CN')}
                            {post.updateTime > post.createTime && ' (已编辑)'}
                        </span>
                    </div>

                    {!isEditing ? (
                        <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }} />
                    ) : (
                        <DiscussionForm
                            initialText={post.content}
                            onSubmit={(content) => handleAction('update', { postId: post.id, content })}
                            onCancel={() => setIsEditing(false)}
                            submitLabel="保存"
                        />
                    )}

                    {/* 操作按钮由CSS绝对定位，在悬停时出现 */}
                    {!isEditing && !post.isDeleted && (
                        <div className={styles.postActions}>
                            <button title="回复" className={styles.actionButton} onClick={() => setIsReplying(!isReplying)}>
                                <FontAwesomeIcon icon={faReply} />
                            </button>
                            {canModify && (
                                <>
                                    <button title="编辑" className={styles.actionButton} onClick={() => setIsEditing(true)}>
                                        <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button title="删除" className={styles.actionButton} onClick={() => onAction('delete', { postId: post.id })}>
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 回复表单在激活时显示在主帖子气泡下方 */}
                {isReplying && !isEditing && (
                    <DiscussionForm
                        placeholder={`回复 ${post.username}...`}
                        onSubmit={(content) => handleAction('create', { parentId: post.id, content })}
                        onCancel={() => setIsReplying(false)}
                    />
                )}

                {/* ▼▼▼▼▼ HERE IS THE FIX ▼▼▼▼▼ */}
                {/* 递归渲染回复 (replies) */}
                {/* Bug Fix: Changed post.children back to post.replies to match the data structure */}
                {post.replies && post.replies.length > 0 && (
                    <div className={styles.replies}>
                        {post.replies.map(reply => (
                            <Post key={reply.id} post={reply} onAction={onAction} />
                        ))}
                    </div>
                )}
                {/* ▲▲▲▲▲ HERE IS THE FIX ▲▲▲▲▲ */}
            </div>
        </div>
    );
};

export default Post;