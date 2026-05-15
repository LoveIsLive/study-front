// src/components/shared/AI/AIFloatingBall.jsx
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import AIChatWindow from "./AIChatWindow";
import { baseApi } from "../../../services/api";
import { useDraggable } from "../../../hooks/useDraggable";
import useAIStore from "../../../store/aiStore";
import styles from "./AIFloatingBall.module.css";
import robotIcon from '../../../assets/科牛.png';

const AIFloatingBall = () => {
  const [sessionId, setSessionId] = useState(null);

  // 【修复点】：使用全局 aiStore 中的状态，而不是局部的 isOpen
  const { isChatOpen, toggleChat } = useAIStore();

  // 悬浮球拖拽
  const { position, dragRef, handleMouseDown, isDragging } = useDraggable({
    x: window.innerWidth - 100,
    y: window.innerHeight - 100,
  });

  // 独立出初始化和打开窗口的逻辑
  const initAndOpenChat = async () => {
    try {
      // 1. 获取列表
      const listRes = await baseApi.get("/llm/sessions");
      if (
        listRes.data.code === 200 &&
        listRes.data.data &&
        listRes.data.data.length > 0
      ) {
        // 2. 取最新的一个
        setSessionId(listRes.data.data[0].sessionId);
      } else {
        // 3. 如果没有历史记录，创建新的
        const newRes = await baseApi.get("/llm/session/new");
        if (newRes.data.code === 200) {
          setSessionId(newRes.data.data);
        }
      }
      // 数据准备好后再显示窗口
      toggleChat(true);
    } catch (error) {
      console.error("Failed to init session", error);
      // 降级：如果接口失败，也允许打开，窗口内部会处理空状态
      toggleChat(true);
    }
  };

  const handleOpen = () => {
    if (isDragging) return;
    initAndOpenChat();
  };

  // 【修复点】：监听外部（例如 CourseWareFlatView ）派发的唤醒事件
  useEffect(() => {
    const handleCustomOpen = () => {
      initAndOpenChat();
    };
    window.addEventListener("open-ai-chat", handleCustomOpen);
    return () => window.removeEventListener("open-ai-chat", handleCustomOpen);
  }, []);

  return (
    <>
      <div
        ref={dragRef}
        className={`${styles.floatingBall} ${isChatOpen ? styles.hide : ""}`}
        onMouseDown={handleMouseDown}
        onClick={handleOpen}
        style={{ left: position.x, top: position.y }}
        title="Ask AI"
      >
        <div className={styles.ballContent}>
          <img src={robotIcon} alt="Robot Icon" className={styles.icon} />
        </div>
        <div className={styles.pulseRing}></div>
      </div>

      {isChatOpen && (
        <AIChatWindow
          onClose={() => toggleChat(false)}
          initialSessionId={sessionId}
        />
      )}
    </>
  );
};

export default AIFloatingBall;
