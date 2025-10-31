import React, { useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import styles from './Drawer.module.css';

const Drawer = ({ isOpen, onClose, title, children }) => {
    const drawerRef = useRef(null);
    const resizerRef = useRef(null);

    // ESC键关闭抽屉的逻辑
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        const drawerNode = drawerRef.current;
        if (!drawerNode) return;

        // ▼▼▼ 开始拖动时，给body添加样式 ▼▼▼
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // 防止拖动时选中页面文字

        const startX = e.clientX;
        const startWidth = drawerNode.offsetWidth;

        const handleMouseMove = (moveEvent) => {
            // ... (宽度计算逻辑保持不变) ...
            const dx = startX - moveEvent.clientX;
            const newWidth = startWidth + dx;
            const minWidth = 400;
            const maxWidth = window.innerWidth * 0.9;
            if (newWidth > minWidth && newWidth < maxWidth) {
                drawerNode.style.width = `${newWidth}px`;
            }
        };

        const handleMouseUp = () => {
            // ▼▼▼ 拖动结束时，恢复body样式 ▼▼▼
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    return (
        <div className={`${styles.drawerContainer} ${isOpen ? styles.open : ''}`}>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.drawer} ref={drawerRef}>
                {/* ▼▼▼ 新增可拖动手柄 ▼▼▼ */}
                <div
                    className={styles.resizer}
                    ref={resizerRef}
                    onMouseDown={handleMouseDown}
                />
                {/* ▲▲▲ 新增可拖动手柄 ▲▲▲ */}

                <div className={styles.header}>
                    <h3 className={styles.title}>{title}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Drawer;