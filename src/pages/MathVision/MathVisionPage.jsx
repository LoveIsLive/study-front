import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Swal from 'sweetalert2';
import { useShallow } from 'zustand/react/shallow';
import useAuthStore from '../../store/authStore';
import useMathVisionStore from '../../store/mathvisionStore';
import TaskList from './components/TaskList';
import SquareGallery from './components/SquareGallery';
import StageFlow from './components/StageFlow';
import StagePanel from './components/StagePanel';
import CreateTaskModal from './components/CreateTaskModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import styles from './MathVisionPage.module.css';

const STAGE_LABELS = {
    problem_normalization: '题目识别',
    reasoning_graph: '解题步骤',
    visual_storyboard: '讲解脚本',
    code_generation: '代码生成',
    render_result: '渲染结果',
};

const STAGE_REFRESH_EVENTS = new Set([
    'queued',
    'waiting_confirm',
    'completed',
    'stage_saved',
    'version_activated',
]);

const MathVisionPage = () => {
    const {
        tasks, recycleTasks, squareItems, squareTotal, activeTaskId, taskDetail, selectedStageCode, stageData,
        versions, versionDetail,
        loadingList, loadingRecycle, loadingSquare, loadingDetail, loadingStageData,
        loadingVersions, loadingVersionDetail,
        loadTasks, selectTask, setFilter, loadDetail, updateRuntimeSettings, updateTaskTitle,
        startTask, regenerateStage, cancelTask,
        loadRecycleTasks, clearSelection, deleteTask, restoreTask, permanentlyDeleteTask,
        loadVersions, loadVersionDetail, activateVersion,
        selectStage, saveStageContent, autoEditStage, requestQualityReview, confirmStage, applyTaskEvent,
        loadSquare, publishToSquare, loadSquareToWorkbench, unpublishFromSquare,
    } = useMathVisionStore(useShallow((s) => ({
        tasks: s.tasks,
        recycleTasks: s.recycleTasks,
        squareItems: s.squareItems,
        squareTotal: s.squareTotal,
        activeTaskId: s.activeTaskId,
        taskDetail: s.taskDetail,
        selectedStageCode: s.selectedStageCode,
        stageData: s.stageData,
        versions: s.versions,
        versionDetail: s.versionDetail,
        loadingList: s.loadingList,
        loadingRecycle: s.loadingRecycle,
        loadingSquare: s.loadingSquare,
        loadingDetail: s.loadingDetail,
        loadingStageData: s.loadingStageData,
        loadingVersions: s.loadingVersions,
        loadingVersionDetail: s.loadingVersionDetail,
        loadTasks: s.loadTasks,
        loadRecycleTasks: s.loadRecycleTasks,
        selectTask: s.selectTask,
        clearSelection: s.clearSelection,
        setFilter: s.setFilter,
        loadDetail: s.loadDetail,
        updateRuntimeSettings: s.updateRuntimeSettings,
        updateTaskTitle: s.updateTaskTitle,
        startTask: s.startTask,
        regenerateStage: s.regenerateStage,
        cancelTask: s.cancelTask,
        deleteTask: s.deleteTask,
        restoreTask: s.restoreTask,
        permanentlyDeleteTask: s.permanentlyDeleteTask,
        loadVersions: s.loadVersions,
        loadVersionDetail: s.loadVersionDetail,
        activateVersion: s.activateVersion,
        selectStage: s.selectStage,
        saveStageContent: s.saveStageContent,
        autoEditStage: s.autoEditStage,
        requestQualityReview: s.requestQualityReview,
        confirmStage: s.confirmStage,
        applyTaskEvent: s.applyTaskEvent,
        loadSquare: s.loadSquare,
        publishToSquare: s.publishToSquare,
        loadSquareToWorkbench: s.loadSquareToWorkbench,
        unpublishFromSquare: s.unpublishFromSquare,
    })));
    const token = useAuthStore((s) => s.token);

    const [createOpen, setCreateOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [recycleMode, setRecycleMode] = useState(false);
    const [squareMode, setSquareMode] = useState(false);
    const [squareKeyword, setSquareKeyword] = useState('');
    const [squareOutputTarget, setSquareOutputTarget] = useState('');
    const [squareMineOnly, setSquareMineOnly] = useState(false);
    const [squareActionId, setSquareActionId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [versionOpen, setVersionOpen] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [versionActivating, setVersionActivating] = useState(false);
    const activeTaskIdRef = useRef(activeTaskId);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        activeTaskIdRef.current = activeTaskId;
    }, [activeTaskId]);

    const handleSelect = useCallback((taskId) => {
        setSquareMode(false);
        return selectTask(taskId);
    }, [selectTask]);

    const handleToggleSquare = useCallback(async (nextMode) => {
        setSquareMode(nextMode);
        if (!nextMode) return;
        setRecycleMode(false);
        try {
            await loadSquare({ keyword: squareKeyword, outputTarget: squareOutputTarget, mineOnly: squareMineOnly });
        } catch (e) {
            setSquareMode(false);
            Swal.fire({
                icon: 'error',
                title: '加载创作广场失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadSquare, squareKeyword, squareOutputTarget, squareMineOnly]);

    const handleSearchSquare = useCallback(async () => {
        try {
            await loadSquare({ keyword: squareKeyword, outputTarget: squareOutputTarget, mineOnly: squareMineOnly });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '搜索创作广场失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadSquare, squareKeyword, squareOutputTarget, squareMineOnly]);

    const handleSquareOutputTargetChange = useCallback(async (nextOutputTarget) => {
        setSquareOutputTarget(nextOutputTarget);
        try {
            await loadSquare({ keyword: squareKeyword, outputTarget: nextOutputTarget, mineOnly: squareMineOnly });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '筛选创作广场失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadSquare, squareKeyword, squareMineOnly]);

    const handleSquareMineOnlyChange = useCallback(async (nextMineOnly) => {
        setSquareMineOnly(nextMineOnly);
        try {
            await loadSquare({ keyword: squareKeyword, outputTarget: squareOutputTarget, mineOnly: nextMineOnly });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '筛选创作广场失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadSquare, squareKeyword, squareOutputTarget]);

    const handleShareTask = useCallback(async (task) => {
        const result = await Swal.fire({
            icon: 'question',
            title: '分享当前成果到创作广场？',
            text: `将公开“${task.title || '未命名任务'}”当前激活版本的最终成果。`,
            showCancelButton: true,
            confirmButtonText: '确认分享',
            cancelButtonText: '取消',
        });
        if (!result.isConfirmed) return;
        try {
            await publishToSquare(task.taskId);
            Swal.fire({ icon: 'success', title: '已分享至创作广场', timer: 1300, showConfirmButton: false });
            if (squareMode) {
                await loadSquare({ keyword: squareKeyword, outputTarget: squareOutputTarget, mineOnly: squareMineOnly });
            }
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '分享失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [publishToSquare, squareMode, loadSquare, squareKeyword, squareOutputTarget, squareMineOnly]);

    const handleUnshareTask = useCallback(async (task) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '取消分享当前成果？',
            text: '取消后该成果将不再显示在创作广场，已经加载到其他工作台的副本不受影响。',
            showCancelButton: true,
            confirmButtonText: '取消分享',
            cancelButtonText: '保留分享',
            confirmButtonColor: '#dc3545',
        });
        if (!result.isConfirmed) return;
        try {
            await unpublishFromSquare(task.squareShareId, squareMode ? {
                keyword: squareKeyword,
                outputTarget: squareOutputTarget,
                mineOnly: squareMineOnly,
            } : null);
            Swal.fire({ icon: 'success', title: '已取消分享', timer: 1300, showConfirmButton: false });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '取消分享失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [unpublishFromSquare, squareMode, squareKeyword, squareOutputTarget, squareMineOnly]);

    const handleLoadSquareItem = useCallback(async (item) => {
        if (item.mine) {
            const ownResult = await Swal.fire({
                icon: 'info',
                title: '这是你自己分享的成果',
                text: '原任务已经在你的工作台中，无需重复加载。',
                showCancelButton: true,
                confirmButtonText: '返回原任务',
                cancelButtonText: '留在创作广场',
            });
            if (ownResult.isConfirmed) {
                try {
                    setSquareMode(false);
                    await selectTask(item.taskId);
                } catch (e) {
                    Swal.fire({
                        icon: 'error',
                        title: '返回原任务失败',
                        text: e.response?.data?.message || e.message || '请稍后重试',
                    });
                }
            }
            return;
        }
        const result = await Swal.fire({
            icon: 'question',
            title: '加载到我的工作台？',
            text: '系统会复制完整任务版本和成果文件，生成一份可独立编辑的新任务。',
            showCancelButton: true,
            confirmButtonText: '加载到工作台',
            cancelButtonText: '取消',
        });
        if (!result.isConfirmed) return;
        setSquareActionId(item.shareId);
        try {
            await loadSquareToWorkbench(item.shareId);
            setSquareMode(false);
            Swal.fire({ icon: 'success', title: '已加载到工作台', timer: 1400, showConfirmButton: false });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '加载失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        } finally {
            setSquareActionId(null);
        }
    }, [loadSquareToWorkbench, selectTask]);

    const handleUnpublishSquareItem = useCallback(async (item) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '取消分享该成果？',
            text: '已经加载到其他用户工作台的副本不会受到影响。',
            showCancelButton: true,
            confirmButtonText: '取消分享',
            cancelButtonText: '保留',
            confirmButtonColor: '#dc3545',
        });
        if (!result.isConfirmed) return;
        setSquareActionId(item.shareId);
        try {
            await unpublishFromSquare(item.shareId, {
                keyword: squareKeyword,
                outputTarget: squareOutputTarget,
                mineOnly: squareMineOnly,
            });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '取消分享失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        } finally {
            setSquareActionId(null);
        }
    }, [unpublishFromSquare, squareKeyword, squareOutputTarget, squareMineOnly]);

    const handleSelectStage = useCallback(async (stageCode) => {
        if (!taskDetail?.taskId || !stageCode) return;
        try {
            await selectStage(taskDetail.taskId, stageCode);
        } catch (e) {
            window.alert(e.message || '加载阶段失败');
        }
    }, [selectStage, taskDetail]);

    const handleCreated = useCallback((taskId) => {
        setCreateOpen(false);
        // store.createTask 已刷新列表并选中新任务
    }, []);

    const handleSearch = useCallback(() => {
        if (recycleMode) {
            loadRecycleTasks({ keyword });
            return;
        }
        setFilter({ keyword });
    }, [recycleMode, loadRecycleTasks, setFilter, keyword]);

    const handleToggleRecycle = useCallback(async (nextMode) => {
        setRecycleMode(nextMode);
        setSquareMode(false);
        setKeyword('');
        if (nextMode) {
            clearSelection();
            try {
                await loadRecycleTasks({ keyword: '' });
            } catch (e) {
                Swal.fire({ icon: 'error', title: '加载回收站失败', text: e.message || '请稍后重试' });
            }
            return;
        }
        setFilter({ keyword: '' });
    }, [clearSelection, loadRecycleTasks, setFilter]);

    const handleRenameTask = useCallback(async (task) => {
        const result = await Swal.fire({
            title: '修改任务标题',
            input: 'text',
            inputValue: task.title || '',
            inputAttributes: {
                maxlength: '255',
                autocomplete: 'off',
            },
            showCancelButton: true,
            confirmButtonText: '保存',
            cancelButtonText: '取消',
            inputValidator: (value) => {
                const title = value?.trim();
                if (!title) return '任务标题不能为空';
                if (title.length > 255) return '任务标题不能超过 255 个字符';
                return undefined;
            },
        });
        if (!result.isConfirmed) return;

        const title = result.value.trim();
        if (title === (task.title || '').trim()) return;
        try {
            await updateTaskTitle(task.taskId, title);
            Swal.fire({ icon: 'success', title: '标题已修改', timer: 1200, showConfirmButton: false });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '修改标题失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [updateTaskTitle]);

    const handleDeleteTask = useCallback(async (task) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '将任务移入回收站？',
            text: task.title || '该任务可在回收站中恢复。',
            showCancelButton: true,
            confirmButtonText: '移入回收站',
            cancelButtonText: '取消',
            confirmButtonColor: '#dc3545',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteTask(task.taskId);
            Swal.fire({ icon: 'success', title: '已移入回收站', timer: 1200, showConfirmButton: false });
        } catch (e) {
            Swal.fire({ icon: 'error', title: '删除失败', text: e.response?.data?.message || e.message || '请稍后重试' });
        }
    }, [deleteTask]);

    const handleRestoreTask = useCallback(async (task) => {
        try {
            await restoreTask(task.taskId, { keyword });
            Swal.fire({ icon: 'success', title: '任务已恢复', timer: 1200, showConfirmButton: false });
        } catch (e) {
            Swal.fire({ icon: 'error', title: '恢复失败', text: e.response?.data?.message || e.message || '请稍后重试' });
        }
    }, [restoreTask, keyword]);

    const handlePermanentDeleteTask = useCallback(async (task) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: '永久删除该任务？',
            text: '任务版本、阶段产物、对话记录和相关文件将被清理，此操作无法撤销。',
            showCancelButton: true,
            confirmButtonText: '永久删除',
            cancelButtonText: '取消',
            confirmButtonColor: '#dc3545',
        });
        if (!result.isConfirmed) return;
        try {
            await permanentlyDeleteTask(task.taskId);
            Swal.fire({ icon: 'success', title: '已永久删除', timer: 1200, showConfirmButton: false });
        } catch (e) {
            Swal.fire({ icon: 'error', title: '永久删除失败', text: e.response?.data?.message || e.message || '请稍后重试' });
        }
    }, [permanentlyDeleteTask]);

    const handleStart = useCallback(async (stageCode) => {
        if (!taskDetail?.taskId) return;
        setActionLoading(true);
        try {
            await startTask(taskDetail.taskId, taskDetail.status === 'failed' ? stageCode : null);
        } catch (e) {
            window.alert(e.message || '启动失败');
        } finally {
            setActionLoading(false);
        }
    }, [startTask, taskDetail]);

    const handleRegenerateStage = useCallback(async (stageCode) => {
        if (!taskDetail?.taskId || !stageCode) return;
        const stageLabel = STAGE_LABELS[stageCode] || stageCode;
        const result = await Swal.fire({
            icon: 'warning',
            title: `重新生成“${stageLabel}”？`,
            text: taskDetail.mode === 'manual'
                ? '系统会创建新版本，重新执行当前及后续阶段；旧版本仍可查看。手动模式下仍需逐阶段确认。'
                : '系统会创建新版本，重新执行当前及后续阶段；旧版本仍可在版本历史中查看。',
            showCancelButton: true,
            confirmButtonText: '重新生成',
            cancelButtonText: '取消',
            confirmButtonColor: '#f97316',
        });
        if (!result.isConfirmed) return;

        setActionLoading(true);
        try {
            await regenerateStage(taskDetail.taskId, stageCode);
            Swal.fire({
                icon: 'success',
                title: '已开始重新生成',
                text: `正在重新执行“${stageLabel}”及后续阶段。`,
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '重新生成失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        } finally {
            setActionLoading(false);
        }
    }, [regenerateStage, taskDetail]);

    const handleCancel = useCallback(async () => {
        if (!taskDetail?.taskId) return;
        setActionLoading(true);
        try {
            await cancelTask(taskDetail.taskId);
        } catch (e) {
            window.alert(e.message || '取消失败');
        } finally {
            setActionLoading(false);
        }
    }, [cancelTask, taskDetail]);

    const handleSaveStage = useCallback(async (stage, version, content, comment) => {
        if (!taskDetail?.taskId) return;
        setActionLoading(true);
        try {
            return await saveStageContent(taskDetail.taskId, stage, version, content, comment);
        } catch (e) {
            window.alert(e.message || '保存失败');
            throw e;
        } finally {
            setActionLoading(false);
        }
    }, [saveStageContent, taskDetail]);

    const handleConfirmStage = useCallback(async (stage, version, comment) => {
        if (!taskDetail?.taskId) return;
        setActionLoading(true);
        try {
            return await confirmStage(taskDetail.taskId, stage, version, comment);
        } catch (e) {
            window.alert(e.message || '确认失败');
            throw e;
        } finally {
            setActionLoading(false);
        }
    }, [confirmStage, taskDetail]);

    const handleQualityReview = useCallback(async (stage, version) => {
        if (!taskDetail?.taskId) return;
        setActionLoading(true);
        try {
            return await requestQualityReview(taskDetail.taskId, stage, version);
        } catch (e) {
            window.alert(e.message || '智能检查提交失败');
            throw e;
        } finally {
            setActionLoading(false);
        }
    }, [requestQualityReview, taskDetail]);

    const handleAutoEditStage = useCallback(async (stage, baseStageVersion, instruction) => {
        if (!taskDetail?.taskId) return null;
        setActionLoading(true);
        try {
            const result = await autoEditStage(
                taskDetail.taskId,
                stage,
                baseStageVersion,
                instruction,
            );
            Swal.fire({
                icon: 'success',
                title: '自动编辑已提交',
                text: '系统将基于当前阶段产物和修改意见完整重新生成该阶段。',
                timer: 1800,
                showConfirmButton: false,
            });
            return result;
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '自动编辑提交失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
            throw e;
        } finally {
            setActionLoading(false);
        }
    }, [autoEditStage, taskDetail]);

    const handleOpenVersions = useCallback(async () => {
        if (!taskDetail?.taskId) return;
        setVersionOpen(true);
        try {
            const list = await loadVersions(taskDetail.taskId);
            const targetVersion = list.find((item) => item.isCurrent)?.version
                ?? taskDetail.currentVersion
                ?? list[0]?.version;
            setSelectedVersion(targetVersion ?? null);
            if (targetVersion != null) {
                await loadVersionDetail(taskDetail.taskId, targetVersion);
            }
        } catch (e) {
            setVersionOpen(false);
            Swal.fire({
                icon: 'error',
                title: '加载版本历史失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadVersions, loadVersionDetail, taskDetail]);

    const handleSelectVersion = useCallback(async (version) => {
        if (!taskDetail?.taskId || version == null) return;
        setSelectedVersion(version);
        try {
            await loadVersionDetail(taskDetail.taskId, version);
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '加载版本详情失败',
                text: e.response?.data?.message || e.message || '请稍后重试',
            });
        }
    }, [loadVersionDetail, taskDetail]);

    const handleActivateVersion = useCallback(async (version) => {
        if (!taskDetail?.taskId || version == null) return;
        const result = await Swal.fire({
            icon: 'question',
            title: `切换到 V${version}？`,
            text: '任务阶段、状态和最终产物将恢复到该版本的快照，历史版本不会被删除。',
            showCancelButton: true,
            confirmButtonText: '确认切换',
            cancelButtonText: '取消',
        });
        if (!result.isConfirmed) return;

        setVersionActivating(true);
        try {
            await activateVersion(taskDetail.taskId, version);
            setVersionOpen(false);
            Swal.fire({
                icon: 'success',
                title: `已切换到 V${version}`,
                timer: 1300,
                showConfirmButton: false,
            });
        } catch (e) {
            Swal.fire({
                icon: 'error',
                title: '切换版本失败',
                text: e.response?.data?.message || e.message || '请刷新后重试',
            });
        } finally {
            setVersionActivating(false);
        }
    }, [activateVersion, taskDetail]);

    useEffect(() => {
        if (!token) return undefined;
        const client = new Client({
            webSocketFactory: () => new SockJS('/ws/search'),
            connectHeaders: { Authorization: `Bearer ${token}` },
            reconnectDelay: 5000,
            onConnect: () => {
                loadTasks({ showLoading: false });
                if (activeTaskIdRef.current) {
                    const state = useMathVisionStore.getState();
                    if (!state.loadingDetail) {
                        loadDetail(activeTaskIdRef.current, {
                            showLoading: false,
                            loadStage: !state.stageData,
                        });
                    }
                }
                client.subscribe('/user/queue/mathvision-task-events', (message) => {
                    if (!message.body) return;
                    try {
                        const event = JSON.parse(message.body);
                        applyTaskEvent(event);
                        if (String(event.taskId) === String(activeTaskIdRef.current)
                            && STAGE_REFRESH_EVENTS.has(event.event)) {
                            const state = useMathVisionStore.getState();
                            if (state.selectedStageCode) {
                                state.loadStageData(event.taskId, state.selectedStageCode, {
                                    showLoading: false,
                                    skipIfLoading: true,
                                }).catch((error) => {
                                    if (error?.code !== 'ERR_CANCELED') {
                                        console.error('MathVision stage refresh failed:', error);
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.error('MathVision task event parse failed:', e);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('MathVision STOMP error:', frame);
            },
        });
        client.activate();
        return () => {
            client.deactivate();
        };
    }, [token, applyTaskEvent, loadTasks, loadDetail]);

    return (
        <div className={styles.page}>
            <aside className={styles.left} data-mathvision-task-list>
                <TaskList
                    tasks={recycleMode ? recycleTasks : tasks}
                    activeTaskId={activeTaskId}
                    loading={recycleMode ? loadingRecycle : loadingList}
                    keyword={keyword}
                    recycleMode={recycleMode}
                    squareMode={squareMode}
                    onKeyword={setKeyword}
                    onSearch={handleSearch}
                    onSelect={handleSelect}
                    onCreate={() => setCreateOpen(true)}
                    onToggleRecycle={handleToggleRecycle}
                    onToggleSquare={handleToggleSquare}
                    onRename={handleRenameTask}
                    onShare={handleShareTask}
                    onUnshare={handleUnshareTask}
                    onDelete={handleDeleteTask}
                    onRestore={handleRestoreTask}
                    onPermanentDelete={handlePermanentDeleteTask}
                />
            </aside>

            {squareMode ? (
                <section className={styles.squareArea}>
                    <SquareGallery
                        items={squareItems}
                        total={squareTotal}
                        loading={loadingSquare}
                        keyword={squareKeyword}
                        outputTarget={squareOutputTarget}
                        mineOnly={squareMineOnly}
                        actionId={squareActionId}
                        onKeyword={setSquareKeyword}
                        onOutputTarget={handleSquareOutputTargetChange}
                        onMineOnly={handleSquareMineOnlyChange}
                        onSearch={handleSearchSquare}
                        onLoad={handleLoadSquareItem}
                        onUnpublish={handleUnpublishSquareItem}
                    />
                </section>
            ) : (
                <>
                    <section className={styles.center}>
                        {recycleMode ? (
                            <div className={styles.recyclePlaceholder}>
                                <strong>任务回收站</strong>
                                <span>已删除任务不会继续执行。恢复后可重新查看阶段内容和产物。</span>
                            </div>
                        ) : (
                            <StageFlow
                                task={taskDetail}
                                loading={loadingDetail}
                                selectedStageCode={selectedStageCode}
                                onSelectStage={handleSelectStage}
                                onOpenVersions={handleOpenVersions}
                                onUpdateRuntimeSettings={updateRuntimeSettings}
                                onUpdateTitle={updateTaskTitle}
                            />
                        )}
                    </section>

                    <section className={styles.right}>
                        {recycleMode ? (
                            <div className={styles.recyclePlaceholder}>
                                <strong>恢复或永久删除</strong>
                                <span>恢复会保留原状态、版本和阶段产物；永久删除无法撤销。</span>
                            </div>
                        ) : (
                            <StagePanel
                                task={taskDetail}
                                selectedStageCode={selectedStageCode}
                                stageData={stageData}
                                loading={loadingDetail}
                                loadingStageData={loadingStageData}
                                actionLoading={actionLoading}
                                onStart={handleStart}
                                onRegenerateStage={handleRegenerateStage}
                                onCancel={handleCancel}
                                onSaveStage={handleSaveStage}
                                onAutoEditStage={handleAutoEditStage}
                                onQualityReview={handleQualityReview}
                                onConfirmStage={handleConfirmStage}
                            />
                        )}
                    </section>
                </>
            )}

            <CreateTaskModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />
            <VersionHistoryModal
                show={versionOpen}
                onClose={() => setVersionOpen(false)}
                task={taskDetail}
                versions={versions}
                detail={versionDetail}
                selectedVersion={selectedVersion}
                loadingVersions={loadingVersions}
                loadingDetail={loadingVersionDetail}
                activating={versionActivating}
                onSelect={handleSelectVersion}
                onActivate={handleActivateVersion}
            />
        </div>
    );
};

export default MathVisionPage;
