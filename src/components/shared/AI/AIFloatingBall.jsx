import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';
import AIChatWindow from './AIChatWindow';
import { baseApi } from '../../../services/api';
import { useDraggable } from '../../../hooks/useDraggable';
import styles from './AIFloatingBall.module.css';

const AIFloatingBall = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    // 悬浮球拖拽
    const { position, dragRef, handleMouseDown, isDragging } = useDraggable({
        x: window.innerWidth - 100,
        y: window.innerHeight - 100
    });

    const handleOpen = async () => {
        // 如果正在拖拽，不要触发点击打开
        if (isDragging) return;

        // 修复逻辑：每次点击都重新获取最新的会话列表
        // 不要使用 if(!sessionId) 缓存，因为用户可能在窗口内新建了会话，导致列表顺序变化
        try {
            // 1. 获取列表
            const listRes = await baseApi.get('/llm/sessions');
            if (listRes.data.code === 200 && listRes.data.data && listRes.data.data.length > 0) {
                // 2. 总是取最新的一个（后端按 update_time DESC 排序）
                setSessionId(listRes.data.data[0].sessionId);
            } else {
                // 3. 如果没有历史记录，创建新的
                const newRes = await baseApi.get('/llm/session/new');
                if (newRes.data.code === 200) {
                    setSessionId(newRes.data.data);
                }
            }
            // 数据准备好后再显示窗口
            setIsOpen(true);
        } catch (error) {
            console.error("Failed to init session", error);
            // 降级：如果接口失败，也允许打开，窗口内部会处理空状态
            setIsOpen(true);
        }
    };

    return (
        <>
            <div
                ref={dragRef}
                className={`${styles.floatingBall} ${isOpen ? styles.hide : ''}`}
                onMouseDown={handleMouseDown}
                onClick={handleOpen}
                style={{ left: position.x, top: position.y }}
                title="Ask AI"
            >
                <div className={styles.ballContent}>
                    <FontAwesomeIcon icon={faRobot} className={styles.icon} />
                </div>
                <div className={styles.pulseRing}></div>
            </div>

            {isOpen && (
                <AIChatWindow
                    onClose={() => setIsOpen(false)}
                    initialSessionId={sessionId}
                />
            )}
        </>
    );
};

export default AIFloatingBall;