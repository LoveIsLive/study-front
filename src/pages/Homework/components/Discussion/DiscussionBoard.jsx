import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { discussionApi } from '../../../../services/api';
import Spinner from '../../../../components/common/Spinner/Spinner';
import Post from './Post';
import DiscussionForm from './DiscussionForm';
import styles from './Discussion.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';

const countPostsRecursively = (postsArray) => {
    let count = 0;
    if (!postsArray || postsArray.length === 0) {
        return 0;
    }

    for (const post of postsArray) {
        count++; // 加上帖子本身
        // 如果帖子有回复，则递归地加上回复的数量
        if (post.replies && post.replies.length > 0) {
            count += countPostsRecursively(post.replies);
        }
    }
    return count;
};

const DiscussionBoard = ({ ownerId, ownerType }) => {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDiscussion = useCallback(async () => {
        setIsLoading(true);
        try {
            const endpoint = ownerType === 'homework' ? `/homework/${ownerId}` : `/submission/${ownerId}`;
            const response = await discussionApi.get(endpoint);
            setPosts(response.data.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: '加载讨论失败' });
            setPosts([]);
        } finally {
            setIsLoading(false);
        }
    }, [ownerId, ownerType]);

    useEffect(() => {
        fetchDiscussion();
    }, [fetchDiscussion]);

    const handleAction = async (actionType, data) => {
        setIsSubmitting(true);
        try {
            switch (actionType) {
                case 'create':
                    await discussionApi.post('/', { ...data, ownerId, ownerType });
                    break;
                case 'update':
                    await discussionApi.put(`/${data.postId}`, { content: data.content });
                    break;
                case 'delete':
                    const result = await Swal.fire({
                        title: "确认删除?",
                        text: "此操作无法恢复！",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: '确认',
                        cancelButtonText: '取消'
                    });
                    if (!result.isConfirmed) return;
                    await discussionApi.delete(`/${data.postId}`);
                    break;
                default:
                    throw new Error('Unsupported action type');
            }
            await fetchDiscussion(); // 成功后刷新数据
        } catch (error) {
            Swal.fire({ icon: 'error', title: '操作失败', text: error.response?.data?.message || '' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const postCount = countPostsRecursively(posts);
    if (isLoading) return <Spinner />;

    return (
        <div className={styles.discussionBoard}>
            <h4 className={styles.postCount}><FontAwesomeIcon icon={faComments} /> {postCount} 条讨论</h4>

            {/* --- 发布新帖子的表单 --- */}
            <DiscussionForm
                onSubmit={(content) => handleAction('create', { content, parentId: null })}
                isSubmitting={isSubmitting}
            />
            <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />

            {/* --- 帖子列表 --- */}
            {posts.length > 0 ? (
                posts.map(post => <Post key={post.id} post={post} onAction={handleAction} />)
            ) : (
                <p className={styles.placeholder}>暂无讨论，快来发起第一条吧！</p>
            )}
        </div>
    );
};

export default DiscussionBoard;