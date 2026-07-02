import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck, faSpinner, faClock, faTriangleExclamation,
    faCircle, faRobot, faHand,
} from '@fortawesome/free-solid-svg-icons';
import styles from './StageFlow.module.css';

const STAGES = [
    { code: 'problem_normalization', label: '题目识别与规范化', node: 'ProblemNormalizationNode' },
    { code: 'reasoning_graph', label: '解题图谱与数学增强', node: 'ExplorationNode → MathEnrichmentNode' },
    { code: 'visual_storyboard', label: '视觉设计与 Storyboard 校验', node: 'VisualDesignNode → StoryboardValidationNode' },
    { code: 'code_generation', label: '代码生成与代码评估', node: 'CodeGenerationNode → CodeEvaluationNode' },
    { code: 'render_result', label: '渲染与最终预览', node: 'RenderNode → SceneEvaluationNode' },
];

const STAGE_ORDER = STAGES.map((s) => s.code);

// 依据任务状态 + 当前阶段推断每个阶段卡片的展示状态
function resolveStageState(stageCode, task) {
    if (!task) return 'pending';
    const currentIdx = STAGE_ORDER.indexOf(task.currentStage);
    const stageIdx = STAGE_ORDER.indexOf(stageCode);
    if (task.status === 'completed') return 'done';
    if (stageIdx < currentIdx) return 'done';
    if (stageIdx > currentIdx) return 'pending';
    // 当前阶段
    if (task.status === 'failed') return 'failed';
    if (task.status === 'running' || task.status === 'queued') return 'running';
    if (task.status === 'waiting_confirm') return 'waiting';
    return 'pending';
}

const STATE_META = {
    pending: { icon: faCircle, cls: 'pending', text: '待开始' },
    running: { icon: faSpinner, cls: 'running', text: '生成中', spin: true },
    waiting: { icon: faClock, cls: 'waiting', text: '待确认' },
    failed: { icon: faTriangleExclamation, cls: 'failed', text: '失败' },
    done: { icon: faCircleCheck, cls: 'done', text: '已完成' },
};

const StageFlow = ({ task, loading }) => {
    if (loading) {
        return <div className={styles.placeholder}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>;
    }
    if (!task) {
        return <div className={styles.placeholder}>请选择或新建一个任务</div>;
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <div className={styles.headTitle}>{task.title || '教学动画生成'}</div>
                <div className={styles.headMeta}>
                    <span className={styles.modeTag}>
                        <FontAwesomeIcon icon={task.mode === 'auto' ? faRobot : faHand} />
                        {task.mode === 'auto' ? ' 自动模式' : ' 手动模式'}
                    </span>
                    <span className={styles.targetTag}>
                        {task.outputTarget === 'geogebra' ? 'GeoGebra 交互图' : 'Manim 视频'}
                    </span>
                    <span className={styles.modelTag}>{task.providerCode} / {task.modelName}</span>
                </div>
            </div>

            <div className={styles.cards}>
                {STAGES.map((stage, idx) => {
                    const state = resolveStageState(stage.code, task);
                    const meta = STATE_META[state];
                    const isCurrent = task.currentStage === stage.code;
                    return (
                        <div
                            key={stage.code}
                            className={`${styles.card} ${styles[meta.cls]} ${isCurrent ? styles.current : ''}`}
                        >
                            <div className={styles.cardIndex}>{idx + 1}</div>
                            <div className={styles.cardBody}>
                                <div className={styles.cardTitle}>{stage.label}</div>
                                <div className={styles.cardNode}>{stage.node}</div>
                            </div>
                            <div className={`${styles.cardState} ${styles[meta.cls]}`}>
                                <FontAwesomeIcon icon={meta.icon} spin={meta.spin} /> {meta.text}
                            </div>
                        </div>
                    );
                })}
            </div>

            {task.status === 'failed' && task.errorMessage && (
                <div className={styles.errorBox}>
                    <FontAwesomeIcon icon={faTriangleExclamation} /> {task.errorMessage}
                </div>
            )}
        </div>
    );
};

export default StageFlow;
