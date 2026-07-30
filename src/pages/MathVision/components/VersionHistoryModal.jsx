import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight,
    faCircleCheck,
    faClock,
    faCodeBranch,
    faFileCode,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import Modal from '../../../components/common/Modal/Modal';
import styles from './VersionHistoryModal.module.css';

const STAGES = [
    {
        code: 'problem_normalization',
        label: '题目识别',
        versionKey: 'problemNormalizationVersion',
        contentKey: 'problemBundleJson',
        format: 'json',
    },
    {
        code: 'reasoning_graph',
        label: '解题步骤',
        versionKey: 'reasoningGraphVersion',
        contentKey: 'dagGraphJson',
        format: 'json',
    },
    {
        code: 'visual_storyboard',
        label: '讲解脚本',
        versionKey: 'visualStoryboardVersion',
        contentKey: 'narrativeJson',
        format: 'json',
    },
    {
        code: 'code_generation',
        label: '生成代码',
        versionKey: 'codeGenerationVersion',
        contentKey: 'codeText',
        format: 'code',
    },
    {
        code: 'render_result',
        label: '渲染结果',
        versionKey: 'renderResultVersion',
        contentKey: 'renderResultJson',
        format: 'json',
    },
];

const SOURCE_LABELS = {
    initial_generation: '首次生成',
    user_revision: '用户修订',
    manual_edit: '手动编辑',
    regenerate: '重新生成',
    auto_fix: '自动修复',
    retry: '失败重试',
};

const stageLabel = (code) => STAGES.find((stage) => stage.code === code)?.label || '尚未生成';

const prettyContent = (content, format) => {
    if (!content) return '';
    if (format !== 'json') return content;
    try {
        return JSON.stringify(JSON.parse(content), null, 2);
    } catch (e) {
        return content;
    }
};

const VersionHistoryModal = ({
    show,
    onClose,
    task,
    versions,
    detail,
    selectedVersion,
    loadingVersions,
    loadingDetail,
    activating,
    onSelect,
    onActivate,
}) => {
    const [activeStage, setActiveStage] = useState('problem_normalization');

    useEffect(() => {
        if (!detail) return;
        const preferred = [...STAGES]
            .reverse()
            .find((stage) => detail[stage.versionKey] != null);
        setActiveStage(preferred?.code || 'problem_normalization');
    }, [detail?.version]);

    const selectedStage = useMemo(
        () => STAGES.find((stage) => stage.code === activeStage) || STAGES[0],
        [activeStage],
    );
    const preview = prettyContent(detail?.[selectedStage.contentKey], selectedStage.format);
    const taskBusy = task?.status === 'queued'
        || task?.status === 'running'
        || Boolean(task?.cancelRequested);
    const canActivate = detail && !detail.isCurrent && !taskBusy && !activating;

    return (
        <Modal show={show} onClose={onClose} title="版本历史" size="large">
            <div className={styles.layout}>
                <aside className={styles.versionList}>
                    <div className={styles.listTitle}>用户可见版本</div>
                    {loadingVersions ? (
                        <div className={styles.loading}>
                            <FontAwesomeIcon icon={faSpinner} spin /> 加载版本列表...
                        </div>
                    ) : versions.length === 0 ? (
                        <div className={styles.empty}>暂无版本记录</div>
                    ) : versions.map((version) => (
                        <button
                            type="button"
                            key={version.version}
                            className={`${styles.versionItem} ${selectedVersion === version.version ? styles.selected : ''}`}
                            onClick={() => onSelect?.(version.version)}
                        >
                            <div className={styles.versionItemTop}>
                                <strong>V{version.version}</strong>
                                {version.isCurrent && (
                                    <span className={styles.currentBadge}>
                                        <FontAwesomeIcon icon={faCircleCheck} /> 当前
                                    </span>
                                )}
                            </div>
                            <span className={styles.source}>
                                {SOURCE_LABELS[version.changeSource] || version.changeSource || '版本更新'}
                            </span>
                            <span className={styles.summary}>{version.changeSummary || '无变更说明'}</span>
                            <span className={styles.time}>
                                <FontAwesomeIcon icon={faClock} /> {version.createTime || '--'}
                            </span>
                        </button>
                    ))}
                </aside>

                <section className={styles.detailPanel}>
                    {loadingDetail ? (
                        <div className={styles.detailLoading}>
                            <FontAwesomeIcon icon={faSpinner} spin /> 加载版本详情...
                        </div>
                    ) : !detail ? (
                        <div className={styles.detailLoading}>请选择一个版本查看详情</div>
                    ) : (
                        <>
                            <div className={styles.detailHeader}>
                                <div>
                                    <div className={styles.detailTitle}>
                                        <FontAwesomeIcon icon={faCodeBranch} /> V{detail.version}
                                        {detail.isCurrent && <span className={styles.currentBadge}>当前版本</span>}
                                    </div>
                                    <div className={styles.detailMeta}>
                                        <span>来源：{SOURCE_LABELS[detail.changeSource] || detail.changeSource || '版本更新'}</span>
                                        <span>最新阶段：{stageLabel(detail.latestStage)}</span>
                                        {detail.baseVersion != null && <span>基于：V{detail.baseVersion}</span>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles.activateButton}
                                    disabled={!canActivate}
                                    onClick={() => onActivate?.(detail.version)}
                                    title={taskBusy ? '任务执行或取消期间不能切换版本' : ''}
                                >
                                    {activating ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin /> 切换中...</>
                                    ) : detail.isCurrent ? (
                                        <><FontAwesomeIcon icon={faCircleCheck} /> 当前版本</>
                                    ) : (
                                        <>切换到此版本 <FontAwesomeIcon icon={faArrowRight} /></>
                                    )}
                                </button>
                            </div>

                            <div className={styles.changeSummary}>
                                {detail.changeSummary || '该版本未填写变更说明。'}
                            </div>

                            <div className={styles.stageTabs}>
                                {STAGES.map((stage) => {
                                    const stageVersion = detail[stage.versionKey];
                                    const available = stageVersion != null;
                                    return (
                                        <button
                                            type="button"
                                            key={stage.code}
                                            disabled={!available}
                                            className={`${styles.stageTab} ${activeStage === stage.code ? styles.activeStage : ''}`}
                                            onClick={() => available && setActiveStage(stage.code)}
                                        >
                                            <span>{stage.label}</span>
                                            <small>{available ? `阶段 V${stageVersion}` : '未生成'}</small>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className={styles.previewHeader}>
                                <span><FontAwesomeIcon icon={faFileCode} /> {selectedStage.label}快照</span>
                                {selectedStage.code === 'code_generation' && detail.codeFormat && (
                                    <span className={styles.formatBadge}>{detail.codeFormat}</span>
                                )}
                            </div>
                            {preview ? (
                                <pre className={styles.preview}>{preview}</pre>
                            ) : (
                                <div className={styles.emptyPreview}>该阶段没有可展示的快照内容</div>
                            )}

                            {detail.artifactPath && (
                                <div className={styles.artifactInfo}>
                                    <strong>最终产物</strong>
                                    <span>{detail.finalArtifactType || '文件'}：{detail.artifactPath}</span>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </Modal>
    );
};

export default VersionHistoryModal;
