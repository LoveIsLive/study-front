import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faSpinner, faVideo, faShapes } from '@fortawesome/free-solid-svg-icons';
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

const TaskList = ({ tasks, activeTaskId, loading, keyword, onKeyword, onSearch, onSelect, onCreate }) => {
    return (
        <div className={styles.wrap}>
            <div className={styles.head}>
                <span className={styles.title}>任务列表</span>
                <button className={styles.newBtn} onClick={onCreate}>
                    <FontAwesomeIcon icon={faPlus} /> 新建任务
                </button>
            </div>

            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    placeholder="搜索任务标题"
                    value={keyword}
                    onChange={(e) => onKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
                <button className={styles.searchBtn} onClick={onSearch} title="搜索">
                    <FontAwesomeIcon icon={faSearch} />
                </button>
            </div>

            <div className={styles.list}>
                {loading ? (
                    <div className={styles.empty}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>
                ) : tasks.length === 0 ? (
                    <div className={styles.empty}>暂无任务，点击「新建任务」开始</div>
                ) : (
                    tasks.map((t) => {
                        const status = STATUS_LABEL[t.status] || STATUS_LABEL.created;
                        const active = String(t.taskId) === String(activeTaskId);
                        const isGeo = t.outputTarget === 'geogebra';
                        return (
                            <div
                                key={t.taskId}
                                className={`${styles.item} ${active ? styles.active : ''}`}
                                onClick={() => onSelect(t.taskId)}
                            >
                                <div className={styles.itemTop}>
                                    <span className={styles.typeIcon}>
                                        <FontAwesomeIcon icon={isGeo ? faShapes : faVideo} />
                                    </span>
                                    <span className={styles.itemTitle}>{t.title || '未命名任务'}</span>
                                </div>
                                <div className={styles.itemMeta}>
                                    <span className={styles.typeTag}>{isGeo ? '交互图生成' : '教学动画生成'}</span>
                                    <span className={`${styles.badge} ${styles[status.cls]}`}>{status.text}</span>
                                </div>
                                <div className={styles.itemTime}>{t.updateTime || ''}</div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TaskList;
