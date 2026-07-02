import React, { useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useMathVisionStore from '../../store/mathvisionStore';
import TaskList from './components/TaskList';
import StageFlow from './components/StageFlow';
import StagePanel from './components/StagePanel';
import CreateTaskModal from './components/CreateTaskModal';
import styles from './MathVisionPage.module.css';

const MathVisionPage = () => {
    const {
        tasks, activeTaskId, taskDetail, loadingList, loadingDetail,
        loadTasks, selectTask, setFilter,
    } = useMathVisionStore(useShallow((s) => ({
        tasks: s.tasks,
        activeTaskId: s.activeTaskId,
        taskDetail: s.taskDetail,
        loadingList: s.loadingList,
        loadingDetail: s.loadingDetail,
        loadTasks: s.loadTasks,
        selectTask: s.selectTask,
        setFilter: s.setFilter,
    })));

    const [createOpen, setCreateOpen] = useState(false);
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleSelect = useCallback((taskId) => selectTask(taskId), [selectTask]);

    const handleCreated = useCallback((taskId) => {
        setCreateOpen(false);
        // store.createTask 已刷新列表并选中新任务
    }, []);

    const handleSearch = useCallback(() => setFilter({ keyword }), [setFilter, keyword]);

    return (
        <div className={styles.page}>
            <aside className={styles.left}>
                <TaskList
                    tasks={tasks}
                    activeTaskId={activeTaskId}
                    loading={loadingList}
                    keyword={keyword}
                    onKeyword={setKeyword}
                    onSearch={handleSearch}
                    onSelect={handleSelect}
                    onCreate={() => setCreateOpen(true)}
                />
            </aside>

            <section className={styles.center}>
                <StageFlow task={taskDetail} loading={loadingDetail} />
            </section>

            <section className={styles.right}>
                <StagePanel task={taskDetail} loading={loadingDetail} />
            </section>

            <CreateTaskModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    );
};

export default MathVisionPage;
