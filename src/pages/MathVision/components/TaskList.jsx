import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faEllipsisH, faGlobe, faPen, faPlus, faRotateLeft, faSearch,
    faShareNodes, faSpinner, faTrash, faVideo, faShapes,
} from '@fortawesome/free-solid-svg-icons';
import styles from './TaskList.module.css';

const STATUS_LABEL = {
    created: { text: '待开始', cls: 'created' },
    queued: { text: '排队中', cls: 'queued' },
    running: { text: '生成中', cls: 'running' },
    waiting_confirm: { text: '待确认', cls: 'waiting' },
    failed: { text: '失败', cls: 'failed' },
    completed: { text: '已完成', cls: 'completed' },
    canceled: { text: '已取消', cls: 'canceled' },
};

const TaskList = ({
    tasks,
    activeTaskId,
    loading,
    keyword,
    recycleMode,
    squareMode,
    onKeyword,
    onSearch,
    onSelect,
    onCreate,
    onToggleRecycle,
    onToggleSquare,
    onRename,
    onShare,
    onUnshare,
    onDelete,
    onRestore,
    onPermanentDelete,
}) => {
    const [openMenuTaskId, setOpenMenuTaskId] = useState(null);

    useEffect(() => {
        const closeMenu = (event) => {
            if (!event.target.closest('[data-task-actions-menu]')) {
                setOpenMenuTaskId(null);
            }
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setOpenMenuTaskId(null);
        };
        document.addEventListener('mousedown', closeMenu);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeMenu);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, []);

    useEffect(() => {
        setOpenMenuTaskId(null);
    }, [recycleMode]);

    const runMenuAction = (event, action) => {
        event.stopPropagation();
        setOpenMenuTaskId(null);
        action();
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.head}>
                <span className={styles.title}>{recycleMode ? '回收站' : '工作台'}</span>
                <div className={styles.headActions}>
                    {!recycleMode && (
                        <button className={styles.navBtn} onClick={() => onToggleSquare(!squareMode)}>
                            <FontAwesomeIcon icon={squareMode ? faArrowLeft : faGlobe} />
                            {squareMode ? '返回' : '创作广场'}
                        </button>
                    )}
                    <button className={styles.navBtn} onClick={() => onToggleRecycle(!recycleMode)}>
                        <FontAwesomeIcon icon={recycleMode ? faArrowLeft : faTrash} />
                        {recycleMode ? '返回' : '回收站'}
                    </button>
                    {!recycleMode && (
                        <button className={styles.newBtn} onClick={onCreate}>
                            <FontAwesomeIcon icon={faPlus} /> 新建
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    placeholder={recycleMode ? '搜索已删除任务' : '搜索任务标题'}
                    value={keyword}
                    onChange={(e) => onKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
                <button className={styles.searchBtn} onClick={onSearch} title="搜索">
                    <FontAwesomeIcon icon={faSearch} />
                </button>
            </div>

            <div className={styles.list}>
                {loading && tasks.length === 0 ? (
                    <div className={styles.empty}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>
                ) : tasks.length === 0 ? (
                    <div className={styles.empty}>
                        {recycleMode ? '回收站为空' : '暂无任务，点击「新建任务」开始'}
                    </div>
                ) : (
                    tasks.map((t) => {
                        const status = STATUS_LABEL[t.status] || STATUS_LABEL.created;
                        const active = String(t.taskId) === String(activeTaskId);
                        const isGeo = t.outputTarget === 'geogebra';
                        return (
                            <div
                                key={t.taskId}
                                className={`${styles.item} ${active ? styles.active : ''} ${recycleMode ? styles.recycleItem : ''}`}
                                onClick={() => {
                                    setOpenMenuTaskId(null);
                                    if (!recycleMode) onSelect(t.taskId);
                                }}
                            >
                                <div className={styles.itemTop}>
                                    <span className={styles.typeIcon}>
                                        <FontAwesomeIcon icon={isGeo ? faShapes : faVideo} />
                                    </span>
                                    <span className={styles.itemTitle}>{t.title || '未命名任务'}</span>
                                    {!recycleMode && (
                                        <div className={styles.itemMenuWrap} data-task-actions-menu>
                                            <button
                                                type="button"
                                                className={styles.moreBtn}
                                                aria-label={`管理任务：${t.title || '未命名任务'}`}
                                                aria-haspopup="menu"
                                                aria-expanded={String(openMenuTaskId) === String(t.taskId)}
                                                title="更多操作"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setOpenMenuTaskId((current) => (
                                                        String(current) === String(t.taskId) ? null : t.taskId
                                                    ));
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEllipsisH} />
                                            </button>
                                            {String(openMenuTaskId) === String(t.taskId) && (
                                                <div className={styles.itemMenu} role="menu" onClick={(event) => event.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className={styles.menuItem}
                                                        role="menuitem"
                                                        onClick={(event) => runMenuAction(event, () => onRename(t))}
                                                    >
                                                        <FontAwesomeIcon icon={faPen} /> 重命名
                                                    </button>
                                                    {t.status === 'completed' && t.finalArtifactType && (
                                                        <button
                                                            type="button"
                                                            className={`${styles.menuItem} ${t.squareShareId ? styles.menuDanger : ''}`}
                                                            role="menuitem"
                                                            onClick={(event) => runMenuAction(event, () => (
                                                                t.squareShareId ? onUnshare(t) : onShare(t)
                                                            ))}
                                                        >
                                                            <FontAwesomeIcon icon={faShareNodes} />
                                                            {t.squareShareId ? '取消分享' : '分享'}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={`${styles.menuItem} ${styles.menuDanger}`}
                                                        role="menuitem"
                                                        disabled={t.status === 'queued' || t.status === 'running'}
                                                        title={t.status === 'queued' || t.status === 'running' ? '请先取消任务' : '移入回收站'}
                                                        onClick={(event) => runMenuAction(event, () => onDelete(t))}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.itemMeta}>
                                    <span className={styles.typeTag}>{isGeo ? '交互图生成' : '教学动画生成'}</span>
                                    <span className={`${styles.badge} ${styles[status.cls]}`}>{status.text}</span>
                                </div>
                                <div className={styles.itemTime}>{t.updateTime || ''}</div>
                                {recycleMode && (
                                    <div className={styles.itemActions}>
                                            <button
                                                type="button"
                                                className={`${styles.itemActionBtn} ${styles.restoreBtn}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onRestore(t);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faRotateLeft} /> 恢复
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.itemActionBtn} ${styles.deleteForeverBtn}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onPermanentDelete(t);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faTrash} /> 永久删除
                                            </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TaskList;
