import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faFilter,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import DiscussionBoard from "../Homework/components/Discussion/DiscussionBoard";
import { schoolApi, classesApi } from "../../services/api";
import styles from "./DiscussionPage.module.css";

// 定义一个系统级的全局公共讨论区 ID (用于完全没有班级信息时的最终兜底)
const SYSTEM_GLOBAL_ID = 1;

const DiscussionPage = ({ classId: propClassId }) => {
  // 1. 直接从全局 Store 获取已经解析好的上下文数据和状态
  const { detailInfo, activeId, activeType } = useAuthStore();
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  // --- 状态管理 ---
  const [schoolList, setSchoolList] = useState([]);
  const [classList, setClassList] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  // 2. 自动获取当前用户所在的班级 ID (针对教师、学生、访客等无筛选框角色)
  const userClassId = useMemo(() => {
    // 如果当前顶部的学习空间就是"班级" (class)，则直接使用全局记录的 activeId
    if (activeType === "class" && activeId) {
      return activeId;
    }
    return null;
  }, [activeType, activeId]);

  // 3. 初始化管理员的学校筛选数据
  useEffect(() => {
    if (isAdmin) {
      schoolApi.get("/all").then((res) => {
        if (res.data?.code === 200 && res.data.data.length > 0) {
          setSchoolList(res.data.data);
          setSelectedSchoolId(res.data.data[0].id);
        }
      });
    }
  }, [isAdmin]);

  // 4. 联动班级数据 (管理员拉取该学校下所有，校长基于个人管理范围)
  useEffect(() => {
    if (isAdmin && selectedSchoolId) {
      classesApi
        .get("/all", { params: { schoolId: selectedSchoolId } })
        .then((res) => {
          if (res.data?.code === 200) {
            const classes = res.data.data || [];
            setClassList(classes);
            if (classes.length > 0) setSelectedClassId(classes[0].id);
          }
        });
    } else if (isPrincipal) {
      if (detailInfo?.classMembers) {
        const classes = detailInfo.classMembers
          .map((m) => m.classes)
          .filter(Boolean);
        setClassList(classes);
        if (classes.length > 0) setSelectedClassId(classes[0].id);
      }
    }
  }, [isAdmin, isPrincipal, selectedSchoolId, detailInfo]);

  // 【拦截器】利用 authStore 自身的初始化机制，如果 detailInfo 为空，说明全局接口还没拉完，展示 loading 即可
  if (!detailInfo) {
    return (
      <div className={styles.discussionPage}>
        <div className={styles.fileManager}>
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" color="#1890ff" />
            <p style={{ marginTop: "16px" }}>正在同步学习空间信息...</p>
          </div>
        </div>
      </div>
    );
  }

  // 确定最终用于讨论板的 ownerId
  // 优先级：外部传入 > 管理员/校长筛选的 > 全局空间当前的班级(activeId) > 系统默认 ID
  const finalOwnerId =
    propClassId || selectedClassId || userClassId || SYSTEM_GLOBAL_ID;

  return (
    <div className={styles.discussionPage}>
      <div className={styles.fileManager}>
        <header className={styles.fileManagerHeader}>
          <div className={styles.headerLeft}>
            <h1>
              <FontAwesomeIcon icon={faComments} /> 班级交流区
            </h1>
          </div>
        </header>

        {/* 仅管理员和校长显示筛选框，其余身份隐藏 */}
        {(isAdmin || isPrincipal) && !propClassId && (
          <div className={styles.toolbarContainer}>
            <div className={styles.toolbar}>
              <div className={styles.filterGroup}>
                <FontAwesomeIcon
                  icon={faFilter}
                  className={styles.filterIcon}
                />
                <span className={styles.filterLabel}>维度：班级讨论</span>
              </div>

              {isAdmin && (
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>学校：</label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className={styles.filterInput}
                  >
                    {schoolList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>班级：</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className={styles.filterInput}
                >
                  {classList.length > 0 ? (
                    classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="">暂无班级数据</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className={styles.mainContent}>
          {/* 直接传入 finalOwnerId 和 ownerType="global" */}
          <DiscussionBoard
            key={finalOwnerId}
            ownerId={Number(finalOwnerId)}
            ownerType="global"
          />
        </div>
      </div>
    </div>
  );
};

export default DiscussionPage;
