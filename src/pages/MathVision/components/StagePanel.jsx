import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faFileImage, faLock } from '@fortawesome/free-solid-svg-icons';
import styles from './StagePanel.module.css';

const STAGE_TITLE = {
    problem_normalization: '题目识别与规范化',
    reasoning_graph: '解题图谱与数学增强',
    visual_storyboard: '视觉设计与 Storyboard',
    code_generation: '代码生成与代码评估',
    render_result: '渲染与最终预览',
    completed: '已完成',
};

const StagePanel = ({ task, loading }) => {
    if (loading) {
        return <div className={styles.placeholder}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>;
    }
    if (!task) {
        return <div className={styles.placeholder}>选择任务后在此查看当前阶段内容</div>;
    }

    const stageTitle = STAGE_TITLE[task.currentStage] || task.currentStage || '-';

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <span className={styles.stageLabel}>当前阶段</span>
                <h3 className={styles.stageTitle}>{stageTitle}</h3>
            </div>

            {/* 只读展示：输入信息。五阶段的结构化编辑待后端接口就绪后接入 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>输入内容</div>
                <div className={styles.inputText}>{task.inputText || '（无文本输入）'}</div>
            </div>

            {task.inputAssets && task.inputAssets.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>附件</div>
                    <ul className={styles.assetList}>
                        {task.inputAssets.map((a, i) => (
                            <li key={i}>
                                <FontAwesomeIcon icon={faFileImage} /> {a.fileName}
                                <span className={styles.assetMeta}>{a.mimeTypeName}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>模型</div>
                <div className={styles.kv}>
                    <span>{task.providerCode}</span>
                    <span>{task.modelName}</span>
                </div>
            </div>

            <div className={styles.locked}>
                <FontAwesomeIcon icon={faLock} />
                <div>
                    <div className={styles.lockedTitle}>结构化编辑待接入</div>
                    <div className={styles.lockedDesc}>
                        题目规范化 / DAG / Storyboard / 代码 / 渲染的编辑、确认、重新生成功能，
                        将在对应后端阶段接口就绪后开放。
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StagePanel;
