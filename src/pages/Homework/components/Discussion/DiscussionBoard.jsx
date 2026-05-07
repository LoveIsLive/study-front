import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { discussionApi } from "../../../../services/api";
import Spinner from "../../../../components/common/Spinner/Spinner";
import Post from "./Post";
import DiscussionForm from "./DiscussionForm";
import styles from "./Discussion.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments } from "@fortawesome/free-solid-svg-icons";

const countPostsRecursively = (postsArray) => {
  let count = 0;
  if (!postsArray || postsArray.length === 0) return 0;
  for (const post of postsArray) {
    count++;
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
      const response = await discussionApi.get("/getall", {
        params: { ownerId: Number(ownerId), ownerType },
      });
      setPosts(response.data.data || []);
    } catch (error) {
      Swal.fire({ icon: "error", title: "加载讨论失败" });
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId, ownerType]);

  useEffect(() => {
    if (ownerId && ownerType) {
      fetchDiscussion();
    }
  }, [fetchDiscussion, ownerId, ownerType]);

  const handleAction = async (actionType, data) => {
    setIsSubmitting(true);
    try {
      switch (actionType) {
        case "create":
          // 1. 构建普通的 JS 对象
          const createPayload = {
            ownerId: Number(ownerId),
            ownerType: ownerType,
            content: data.content,
            parentId: data.parentId ? Number(data.parentId) : null,
          };

          // 2. 关键修复：手动调用 JSON.stringify()，将其冻结为纯字符串
          // 这样可以彻底防止 apiClient.js 的拦截器错误地将对象转换为数组或表单
          await discussionApi.post("/", JSON.stringify(createPayload), {
            headers: {
              "Content-Type": "application/json",
            },
          });
          break;

        case "update":
          const updatePayload = {
            content: data.content,
          };
          // 同理，更新接口也手动序列化
          await discussionApi.put(
            `/${data.postId}`,
            JSON.stringify(updatePayload),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          break;

        case "delete":
          const result = await Swal.fire({
            title: "确认删除?",
            text: "删除后将显示为“该评论已被删除”，确认吗？",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "确认",
            cancelButtonText: "取消",
          });
          if (!result.isConfirmed) return false;
          await discussionApi.delete(`/${data.postId}`);
          break;

        default:
          throw new Error("Unsupported action type");
      }
      await fetchDiscussion();
      return true;
    } catch (error) {
      console.error("操作失败:", error);
      Swal.fire({
        icon: "error",
        title: "操作失败",
        text: error.response?.data?.message || "请检查网络请求",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const postCount = countPostsRecursively(posts);
  if (isLoading) return <Spinner />;

  return (
    <div className={styles.discussionBoard}>
      <h4 className={styles.postCount}>
        <FontAwesomeIcon icon={faComments} /> {postCount} 条讨论
      </h4>

      <DiscussionForm
        onSubmit={(content) =>
          handleAction("create", { content, parentId: null })
        }
        isSubmitting={isSubmitting}
      />
      <hr
        style={{
          margin: "2rem 0",
          border: "none",
          borderTop: "1px solid #eee",
        }}
      />

      {posts.length > 0 ? (
        posts.map((post) => (
          <Post key={post.id} post={post} onAction={handleAction} />
        ))
      ) : (
        <p className={styles.placeholder}>暂无讨论，快来发起第一条吧！</p>
      )}
    </div>
  );
};

export default DiscussionBoard;
