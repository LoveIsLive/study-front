import React, { useState } from 'react';
import useAuthStore from '../../../../store/authStore';
import DiscussionForm from './DiscussionForm';
import styles from './Discussion.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReply, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { sanitizeHTML } from '../../../../utils/helpers'; // 引入 sanitizeHTML 确保内容安全

const Post = ({ post, onAction }) => {
    const { user } = useAuthStore();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 关键修复：确保任何用户（教师或学生）都可以修改自己发布的帖子
    const canModify = user?.name === post.username || user?.isAdmin;
    const authorInitial = post.userName ? post.userName.charAt(0).toUpperCase() : '?';

    const handleAction = async (actionType, data) => {
        // 确保异步操作完成后才关闭表单
        const success = await onAction(actionType, data);
        if (success) {
            if (actionType === 'create') setIsReplying(false);
            if (actionType === 'update') setIsEditing(false);
        }
    };

    return (
        <div className={styles.post}>
            <div className={styles.avatar}>{authorInitial}</div>
            <div style={{ width: '100%' }}>
                <div className={styles.postContent}>
                    <div className={styles.postHeader}>
                        {/* 问题修复: 明确显示 userName */}
                        <span className={styles.postAuthor}>{post.username || '匿名用户'}</span>
                        <span className={styles.postTimestamp}>
                            {new Date(post.createTime).toLocaleString('zh-CN')}
                            {post.updateTime > post.createTime && ' (已编辑)'}
                        </span>
                    </div>

                    {!isEditing ? (
                        // 使用 dangerouslySetInnerHTML 来渲染HTML内容，确保内容被净化
                        <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }} />
                    ) : (
                        <DiscussionForm
                            initialText={post.content}
                            onSubmit={(content) => handleAction('update', { postId: post.id, content })}
                            onCancel={() => setIsEditing(false)}
                            submitLabel="保存"
                        />
                    )}

                    {!isEditing && (
                        <div className={styles.postActions}>
                            <button className={styles.actionButton} onClick={() => setIsReplying(!isReplying)}>
                                <FontAwesomeIcon icon={faReply} /> {isReplying ? '取消回复' : '回复'}
                            </button>
                            {canModify && (
                                <>
                                    <button className={styles.actionButton} onClick={() => setIsEditing(true)}>
                                        <FontAwesomeIcon icon={faEdit} /> 编辑
                                    </button>
                                    <button className={styles.actionButton} onClick={() => handleAction('delete', { postId: post.id })}>
                                        <FontAwesomeIcon icon={faTrashAlt} /> 删除
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {isReplying && !isEditing && (
                    <DiscussionForm
                        placeholder={`回复 ${post.username}...`}
                        onSubmit={(content) => handleAction('create', { parentId: post.id, content })}
                        onCancel={() => setIsReplying(false)}
                    />
                )}

                {post.replies && post.replies.length > 0 && (
                    <div className={styles.replies}>
                        {post.replies.map(reply => (
                            <Post key={reply.id} post={reply} onAction={onAction} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Post;