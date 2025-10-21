import React, { useState, useEffect, useRef } from 'react'; // 1. 导入 useEffect 和 useRef
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faEdit, faTrashAlt, faUsers } from '@fortawesome/free-solid-svg-icons';
import styles from './ClassCard.module.css';

const ClassCard = ({ classInfo, isAdmin, onSelect, onEdit, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // 2. 创建一个 ref 来引用菜单容器
    const menuRef = useRef(null);

    // 3. 使用 useEffect 来添加和移除全局点击事件监听器
    useEffect(() => {
        // 如果菜单没有打开，则不执行任何操作
        if (!isMenuOpen) return;

        // 定义点击事件的处理函数
        const handleClickOutside = (event) => {
            // 如果点击的目标不在菜单容器内部，则关闭菜单
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        // 在 document 上添加事件监听
        document.addEventListener('mousedown', handleClickOutside);

        // 清理函数：在组件卸载或 isMenuOpen 变为 false 时，移除事件监听
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]); // 这个 effect 只在 isMenuOpen 状态变化时运行


    const handleMenuToggle = (e) => {
        e.stopPropagation();
        setIsMenuOpen(prev => !prev);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        onEdit();
        setIsMenuOpen(false);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete();
        setIsMenuOpen(false);
    };

    return (
        <div className={styles.card} onClick={onSelect}>
            <div className={styles.cardHeader}>
                <h3 className={styles.className}>{classInfo.name}</h3>
                {isAdmin && (
                    // 4. 将 ref 附加到菜单容器上
                    <div className={styles.menuContainer} ref={menuRef}>
                        <button className={styles.menuButton} onClick={handleMenuToggle}>
                            <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                        {isMenuOpen && (
                            <div className={styles.dropdownMenu}>
                                <button onClick={handleEdit}><FontAwesomeIcon icon={faEdit} /> 编辑</button>
                                <button onClick={handleDelete} className={styles.deleteButton}><FontAwesomeIcon icon={faTrashAlt} /> 删除</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className={styles.cardBody}>
                <FontAwesomeIcon icon={faUsers} />
                <span>{classInfo.memberCount ?? 0} 名成员</span>
            </div>
        </div>
    );
};

export default ClassCard;