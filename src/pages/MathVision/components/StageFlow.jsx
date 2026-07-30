import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck, faSpinner, faClock, faTriangleExclamation,
    faCircle, faRobot, faHand, faCodeBranch, faPen,
} from '@fortawesome/free-solid-svg-icons';
import ModelSwitchModal from './ModelSwitchModal';
import styles from './StageFlow.module.css';

const STAGES = [
    { code: 'problem_normalization', label: '题目识别' },
    { code: 'reasoning_graph', label: '生成解题步骤' },
    { code: 'visual_storyboard', label: '规划讲解脚本' },
    { code: 'code_generation', label: '代码生成' },
    { code: 'render_result', label: '渲染' },
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

const isStageSelectable = (state, isCurrent, task) => {
    if (!task) return false;
    if (task.status === 'completed') return true;
    return isCurrent || state === 'done' || state === 'waiting' || state === 'failed';
};

const RuntimeSettings = ({ task, onUpdate }) => {
    const [saving, setSaving] = useState('');

    const updateMode = async (mode) => {
        if (!onUpdate || saving || mode === task.mode) return;
        setSaving('mode');
        try {
            const updated = await onUpdate(task.taskId, { mode });
            Swal.fire({
                icon: 'success',
                title: mode === 'auto' ? '已切换为自动模式' : '已切换为手动模式',
                text: updated?.status === 'queued'
                    ? '下一阶段已进入执行队列。'
                    : '设置将在下一阶段运行时生效。',
                timer: 1700,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: '切换运行模式失败',
                text: error.response?.data?.message || error.message || '请稍后重试',
            });
        } finally {
            setSaving('');
        }
    };

    return (
        <div className={styles.runtimeSettings}>
            <div className={styles.settingGroup}>
                <span className={styles.settingLabel}>运行模式</span>
                <div className={styles.modeSwitch}>
                    <button
                        type="button"
                        className={task.mode === 'manual' ? styles.modeActive : ''}
                        disabled={Boolean(saving)}
                        onClick={() => updateMode('manual')}
                    >
                        <FontAwesomeIcon icon={faHand} /> 手动
                    </button>
                    <button
                        type="button"
                        className={task.mode === 'auto' ? styles.modeActive : ''}
                        disabled={Boolean(saving)}
                        onClick={() => updateMode('auto')}
                    >
                        <FontAwesomeIcon icon={faRobot} /> 自动
                    </button>
                </div>
            </div>
            <div className={styles.settingsHint}>自动执行下一阶段或手动确认。</div>
        </div>
    );
};

const StageFlow = ({
    task,
    loading,
    selectedStageCode,
    onSelectStage,
    onOpenVersions,
    onUpdateRuntimeSettings,
    onUpdateTitle,
}) => {
    const [modelSwitchOpen, setModelSwitchOpen] = useState(false);

    if (loading && !task) {
        return <div className={styles.placeholder}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>;
    }
    if (!task) {
        return <div className={styles.placeholder}>请选择或新建一个任务</div>;
    }

    const editTitle = async () => {
        const result = await Swal.fire({
            title: '修改任务标题',
            input: 'text',
            inputValue: task.title || '',
            inputAttributes: {
                maxlength: '255',
                autocapitalize: 'off',
            },
            showCancelButton: true,
            confirmButtonText: '保存',
            cancelButtonText: '取消',
            inputValidator: (value) => (!value?.trim() ? '任务标题不能为空' : undefined),
        });
        if (!result.isConfirmed) return;
        const title = result.value.trim();
        if (title === task.title || !onUpdateTitle) return;
        try {
            await onUpdateTitle(task.taskId, title);
            Swal.fire({ icon: 'success', title: '标题已更新', timer: 1300, showConfirmButton: false });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: '修改标题失败',
                text: error.response?.data?.message || error.message || '请稍后重试',
            });
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <div className={styles.headTitleRow}>
                    <div className={styles.headTitle}>{task.title || '教学动画生成'}</div>
                    <button type="button" className={styles.editTitleButton} onClick={editTitle} title="修改任务标题">
                        <FontAwesomeIcon icon={faPen} />
                    </button>
                </div>
                <RuntimeSettings task={task} onUpdate={onUpdateRuntimeSettings} />
                <div className={styles.headMeta}>
                    <span className={styles.targetTag}>
                        {task.outputTarget === 'geogebra' ? 'GeoGebra 交互图' : 'Manim 视频'}
                    </span>
                    <button
                        type="button"
                        className={`${styles.versionButton} ${styles.modelButton}`}
                        onClick={() => setModelSwitchOpen(true)}
                        title="切换下一阶段使用的模型"
                    >
                        <FontAwesomeIcon icon={faRobot} /> {task.providerCode} / {task.modelName}
                    </button>
                    <button type="button" className={styles.versionButton} onClick={onOpenVersions}>
                        <FontAwesomeIcon icon={faCodeBranch} /> V{task.currentVersion || 1} 版本历史
                    </button>
                </div>
            </div>

            <div className={styles.cards}>
                {STAGES.map((stage, idx) => {
                    const state = resolveStageState(stage.code, task);
                    const meta = STATE_META[state];
                    const isCurrent = task.currentStage === stage.code;
                    const isSelected = selectedStageCode === stage.code;
                    const selectable = isStageSelectable(state, isCurrent, task);
                    return (
                        <button
                            type="button"
                            key={stage.code}
                            className={`${styles.card} ${styles[meta.cls]} ${isCurrent ? styles.current : ''} ${isSelected ? styles.selected : ''} ${selectable ? styles.clickable : ''}`}
                            onClick={() => selectable && onSelectStage?.(stage.code)}
                            aria-pressed={isSelected}
                        >
                            <div className={styles.cardIndex}>{idx + 1}</div>
                            <div className={styles.cardBody}>
                                <div className={styles.cardTitle}>{stage.label}</div>
                            </div>
                            <div className={`${styles.cardState} ${styles[meta.cls]}`}>
                                <FontAwesomeIcon icon={meta.icon} spin={meta.spin} /> {meta.text}
                            </div>
                        </button>
                    );
                })}
            </div>

            {task.status === 'failed' && task.errorMessage && (
                <div className={styles.errorBox}>
                    <FontAwesomeIcon icon={faTriangleExclamation} /> {task.errorMessage}
                </div>
            )}
            <ModelSwitchModal
                show={modelSwitchOpen}
                onClose={() => setModelSwitchOpen(false)}
                task={task}
                onUpdate={onUpdateRuntimeSettings}
            />
        </div>
    );
};

export default StageFlow;
