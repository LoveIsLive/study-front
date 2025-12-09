import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';
import AIChatWindow from './AIChatWindow';
import { baseApi } from '../../../services/api';
import { useDraggable } from '../../../hooks/useDraggable'; // 导入
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

        if (!sessionId) {
            try {
                // 1. 获取列表
                const listRes = await baseApi.get('/llm/sessions');
                if (listRes.data.code === 200 && listRes.data.data && listRes.data.data.length > 0) {
                    // 2. 取第一个（最新的，后端 Mapper 已按 update_time DESC 排序）
                    setSessionId(listRes.data.data[0].sessionId);
                    setIsOpen(true);
                } else {
                    // 3. 如果没有历史记录，创建新的
                    const newRes = await baseApi.get('/llm/session/new');
                    if (newRes.data.code === 200) {
                        setSessionId(newRes.data.data);
                        setIsOpen(true);
                    }
                }
            } catch (error) {
                console.error("Failed to init session", error);
                // 降级：允许打开，内部可能会报错或显示空
                setIsOpen(true);
            }
        } else {
            setIsOpen(true);
        }
    };

    return (
        <>
            <div
                ref={dragRef}
                className={`${styles.floatingBall} ${isOpen ? styles.hide : ''}`}
                onMouseDown={handleMouseDown}
                onClick={handleOpen} // Note: click fires after mouseup, isDragging check prevents conflict
                style={{ left: position.x, top: position.y }} // 应用位置
                title="Ask AI"
            >
                {/* ... existing content ... */}
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