import { useState, useEffect, useRef } from 'react';

export const useDraggable = (initialPosition = { x: 0, y: 0 }) => {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef(null); // 绑定的拖拽手柄
    const offset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        // 只有左键点击才触发
        if (e.button !== 0) return;

        // 如果点击的是 resize 手柄或内部按钮，不触发拖拽
        if (e.target.closest('.no-drag')) return;

        setIsDragging(true);
        const rect = dragRef.current.getBoundingClientRect();
        // 计算鼠标相对于元素的偏移
        offset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        document.body.style.userSelect = 'none'; // 防止拖拽时选中文字
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            // 计算新位置（基于视口）
            const newX = e.clientX - offset.current.x;
            const newY = e.clientY - offset.current.y;

            // 简单的边界检查 (可选)
            const maxX = window.innerWidth - dragRef.current.offsetWidth;
            const maxY = window.innerHeight - dragRef.current.offsetHeight;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)), // 防止拖出屏幕左/右
                y: Math.max(0, Math.min(newY, maxY))  // 防止拖出屏幕上/下
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return { position, setPosition, dragRef, handleMouseDown, isDragging };
};