import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPaperPlane, faPaperclip, faTimes, faRobot, faCheck,
    faFileAlt, faSpinner, faPlus, faPen, faTrashAlt, faMagic,
    faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import Swal from 'sweetalert2';
import { baseApi } from '../../../../services/api';
import styles from './AIAssistantPanel.module.css';

// =========================================================================
// 子组件：HomeworkDiffViewer (差异对比与合并控制器)
// =========================================================================
const HomeworkDiffViewer = ({ aiData, snapshot, onConfirm }) => {
    // snapshot: AI 生成建议那一刻的作业数据快照（静态的，不会随主编辑区变化）

    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [hasApplied, setHasApplied] = useState(false);

    // 使用 useMemo 计算 Diff，只依赖于 aiData 和 snapshot
    const diffList = useMemo(() => {
        const diffs = [];
        // 建立快照的 Map，用于查找"当时"的题目状态
        const originalQMap = new Map(snapshot.questions?.map(q => [q.id, q]) || []);

        // --- A. 全局属性对比 ---
        if (aiData.title && aiData.title !== snapshot.title) {
            diffs.push({
                type: 'MODIFIED', target: 'global', id: 'global-title', title: '作业标题',
                changes: [{ field: '标题', old: snapshot.title, new: aiData.title }],
                data: { title: aiData.title }
            });
        }
        if (aiData.content && aiData.content !== snapshot.content) {
            diffs.push({
                type: 'MODIFIED', target: 'global', id: 'global-content', title: '作业导语',
                changes: [{ field: '导语', old: snapshot.content || '(空)', new: aiData.content }],
                data: { content: aiData.content }
            });
        }

        // --- B. 处理题目删除 ---
        if (aiData.deleteQuestions && Array.isArray(aiData.deleteQuestions)) {
            aiData.deleteQuestions.forEach(id => {
                const target = originalQMap.get(id);
                if (target) {
                    diffs.push({
                        type: 'DELETED', target: 'question',
                        data: target, original: target, id: target.id
                    });
                }
            });
        }

        // --- C. 处理题目新增与修改 ---
        if (aiData.questions && Array.isArray(aiData.questions)) {
            aiData.questions.forEach(q => {
                // 如果 ID 为空，或者 ID 在快照中找不到，视为新增
                if (!q.id || !originalQMap.has(q.id)) {
                    diffs.push({
                        type: 'ADDED', target: 'question',
                        data: q, id: q.id || `new-${crypto.randomUUID()}`
                    });
                } else {
                    // 修改现有题目 (对比快照中的旧数据)
                    const target = originalQMap.get(q.id);
                    const changes = [];

                    // 逐字段对比
                    if (q.title && q.title !== target.title) changes.push({ field: '题干', old: target.title, new: q.title });
                    if (q.score !== null && q.score !== undefined && q.score !== target.score) changes.push({ field: '分值', old: target.score, new: q.score });
                    if (q.type && q.type !== target.type) changes.push({ field: '类型', old: target.type, new: q.type });

                    if (q.analysis && q.analysis !== target.analysis) changes.push({ field: '解析', new: '更新' });
                    if (q.aiGradingCriteria && q.aiGradingCriteria !== target.aiGradingCriteria) changes.push({ field: 'AI评分标准', new: '更新' });

                    // 选项对比
                    if (q.options && q.options.length > 0) {
                        const oldOpts = JSON.stringify(target.options.map(o => ({ l: o.label, t: o.text })));
                        const newOpts = JSON.stringify(q.options.map(o => ({ l: o.label, t: o.text })));
                        if (oldOpts !== newOpts) changes.push({ field: '选项内容', new: '已重写' });
                    }

                    // 答案对比
                    if (q.correctAnswer && JSON.stringify(q.correctAnswer) !== JSON.stringify(target.correctAnswer)) {
                        changes.push({ field: '参考答案', new: '更新' });
                    }

                    if (changes.length > 0) {
                        diffs.push({
                            type: 'MODIFIED', target: 'question',
                            data: q, original: target, changes, id: target.id
                        });
                    }
                }
            });
        }
        return diffs;
    }, [aiData, snapshot]);

    // 初始化全选 (当 diffList 计算完成后)
    useEffect(() => {
        if (diffList.length > 0) {
            setSelectedIndices(new Set(diffList.map((_, i) => i)));
        }
    }, [diffList]);

    const toggleSelect = (index) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIndices.size === diffList.length) setSelectedIndices(new Set());
        else setSelectedIndices(new Set(diffList.map((_, i) => i)));
    };

    const handleConfirm = () => {
        const selectedDiffs = diffList.filter((_, i) => selectedIndices.has(i));
        onConfirm(selectedDiffs);
        setHasApplied(true);
    };

    if (diffList.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>AI 认为当前作业已符合要求，未提出修改建议。</div>;
    }

    return (
        <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
                <div className={styles.previewTitleMain}>
                    <FontAwesomeIcon icon={faMagic} style={{ color: '#6C5CE7' }} />
                    <span>AI 修改建议 ({selectedIndices.size}/{diffList.length})</span>
                </div>
                {hasApplied && <span className={styles.statusBadge} style={{ background: '#E8FFEA', color: '#00B42A' }}>已应用</span>}
            </div>

            {/* 如果已经应用过，可以考虑禁用列表或显示视觉提示，这里保持可查看但提示已应用 */}
            <div className={styles.diffContainer} style={{ opacity: hasApplied ? 0.6 : 1 }}>
                {diffList.map((diff, idx) => (
                    <div key={idx} className={`${styles.diffItem} ${styles[diff.type.toLowerCase()]}`}>
                        <input
                            type="checkbox"
                            className={styles.diffCheck}
                            checked={selectedIndices.has(idx)}
                            onChange={() => toggleSelect(idx)}
                            disabled={hasApplied}
                        />
                        <div className={styles.diffContent}>
                            <div className={styles.diffHeader}>
                                <div className={styles.diffTitle}>
                                    {diff.type === 'ADDED' && (diff.data.title || '新增题目')}
                                    {diff.type === 'DELETED' && (diff.original.title || '题目删除')}
                                    {diff.type === 'MODIFIED' && (diff.title || diff.original.title)}
                                </div>
                                <span className={`${styles.diffTag} ${styles[`tag${diff.type === 'MODIFIED' ? 'Mod' : (diff.type === 'ADDED' ? 'Added' : 'Del')}`]}`}>
                                    {diff.type === 'ADDED' && <><FontAwesomeIcon icon={faPlus} /> 新增</>}
                                    {diff.type === 'MODIFIED' && <><FontAwesomeIcon icon={faPen} /> 修改</>}
                                    {diff.type === 'DELETED' && <><FontAwesomeIcon icon={faTrashAlt} /> 删除</>}
                                </span>
                            </div>

                            {diff.type === 'MODIFIED' && (
                                <div className={styles.diffDetails}>
                                    {diff.changes.map((change, cIdx) => (
                                        <span key={cIdx} className={styles.changeChip}>
                                            {change.field}:
                                            {change.old && <span className={styles.oldValue}>{String(change.old).slice(0, 10)}</span>}
                                            <span className={styles.newValue}>{String(change.new).slice(0, 15)}{String(change.new).length > 15 ? '...' : ''}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {diff.type === 'ADDED' && (
                                <div className={styles.diffDetails}>
                                    <span className={styles.changeChip}>类型: {diff.data.type}</span>
                                    <span className={styles.changeChip}>分值: {diff.data.score}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.applyBar}>
                <label className={styles.selectAllLabel}>
                    <input
                        type="checkbox"
                        checked={selectedIndices.size === diffList.length && diffList.length > 0}
                        onChange={toggleSelectAll}
                        disabled={hasApplied}
                        style={{ accentColor: '#6C5CE7' }}
                    />
                    全选
                </label>
                <button
                    className={styles.importBtn}
                    onClick={handleConfirm}
                    disabled={selectedIndices.size === 0 || hasApplied}
                >
                    <FontAwesomeIcon icon={faCheck} /> {hasApplied ? '已应用修改' : `应用选中的 ${selectedIndices.size} 项`}
                </button>
            </div>
        </div>
    );
};


// =========================================================================
// 主组件：AIAssistantPanel
// =========================================================================
const AIAssistantPanel = ({
    isOpen,
    onClose,
    onApplyHomework,
    currentHomework // 实时数据 (Props)
}) => {
    // UI 状态
    const [width, setWidth] = useState(400);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [files, setFiles] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [isResizing, setIsResizing] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const panelRef = useRef(null);

    // 1. 初始化会话
    useEffect(() => {
        const initSession = async () => {
            if (isOpen && !sessionId) {
                try {
                    const res = await baseApi.get('/llm/session/new', { params: { purpose: 'homework_generation' } });
                    if (res.data.code === 200) {
                        setSessionId(res.data.data);
                        setMessages([{
                            role: 'assistant',
                            type: 'text',
                            content: '我是您的智能出题助手。我已经读取了当前的作业内容。您可以要求我：\n\n' +
                                '- **新增**：例如“加两道关于多态的单选题”\n' +
                                '- **修改**：例如“把第3题的分值改成10分”\n' +
                                '- **删除**：例如“删掉所有关于历史的题目”\n' +
                                '\n或者直接上传教案文档让我分析。'
                        }]);
                    }
                } catch (error) {
                    setSessionId(crypto.randomUUID());
                }
            }
        };
        initSession();
    }, [isOpen, sessionId]);

    // 2. 自动滚动
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    // 3. 输入框自适应高度
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    // 4. 拖拽调整宽度
    const startResizing = useCallback((e) => { e.preventDefault(); setIsResizing(true); }, []);
    const stopResizing = useCallback(() => { setIsResizing(false); }, []);
    const resize = useCallback((e) => {
        if (isResizing) {
            const newWidth = document.body.clientWidth - e.clientX;
            if (newWidth > 320 && newWidth < 800) setWidth(newWidth);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);


    // 5. 发送消息逻辑
    const handleSend = async () => {
        if ((!input.trim() && files.length === 0) || isSending) return;

        const currentFiles = [...files];

        // 关键点：发送前，对 currentHomework 进行深拷贝快照
        // 这个 snapshot 将随消息一起永久保存，作为 Diff 的基准，不受后续编辑影响
        const homeworkSnapshot = JSON.parse(JSON.stringify(currentHomework));

        setMessages(prev => [...prev, { role: 'user', content: input, files: currentFiles, type: 'text' }]);
        setInput('');
        setFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsSending(true);

        try {
            const formData = new FormData();
            const requestDTO = {
                sessionId: sessionId,
                message: input || '分析作业并修改',
                scene: 'homework-gen',
                // 将快照发送给后端 (RAG上下文)
                sceneParams: {
                    current_homework: homeworkSnapshot
                }
            };

            formData.append('request', new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }));
            currentFiles.forEach(f => formData.append('files', f));

            // 调用 Agent 模式
            const res = await baseApi.post('/llm/chat/agent', formData);
            const data = res.data.data;

            let aiMsg = { role: 'assistant', type: 'text', content: '' };

            if (data.tool_calls && data.tool_calls.length > 0) {
                const genTool = data.tool_calls.find(t => t.function.name === 'HomeworkGenerationTool');

                if (genTool) {
                    let args;
                    try { args = JSON.parse(genTool.function.arguments); } catch (e) { args = {}; }

                    aiMsg = {
                        role: 'assistant',
                        type: 'diff_view', // 标记为 Diff 视图
                        content: '我已根据要求生成了修改方案，请确认：',
                        homeworkData: args, // AI 返回的数据
                        snapshot: homeworkSnapshot // 绑定当时的快照！
                    };
                } else {
                    const replayTool = data.tool_calls.find(t => t.function.name === 'ReplayTool');
                    aiMsg.content = replayTool ? JSON.parse(replayTool.function.arguments).message : (data.content || '任务完成');
                }
            } else {
                aiMsg.content = data.content || '未能生成有效结果，请尝试更详细的描述。';
            }

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', type: 'error', content: '服务响应异常，请重试。' }]);
        } finally {
            setIsSending(false);
        }
    };

    // --- 新增：辅助函数，用于将 AI 返回的答案 (Label 或 UUID) 解析为系统需要的 UUID ---
    const resolveCorrectAnswer = (rawAnswer, type, options) => {
        // 1. 如果没有答案，根据类型返回空值
        if (!rawAnswer) {
            return type === 'MULTI_CHOICE' ? [] : '';
        }

        // 2. 文本题直接返回原始字符串
        if (type === 'TEXT') {
            return Array.isArray(rawAnswer) ? rawAnswer[0] : rawAnswer;
        }

        // 3. 规范化输入为数组 (兼容单选传 "A" 或 ["A"])
        const rawValues = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
        const resolvedIds = [];

        rawValues.forEach(val => {
            // 策略 A: 优先检查是否直接是 UUID (AI 回传了原 ID)
            const matchById = options.find(o => o.id === val);
            if (matchById) {
                resolvedIds.push(matchById.id);
                return;
            }

            // 策略 B: 检查是否是 Label (AI 回传了 "A", "B")
            const matchByLabel = options.find(o => o.label === val);
            if (matchByLabel) {
                resolvedIds.push(matchByLabel.id);
                return;
            }
        });

        // 4. 根据类型返回最终格式
        if (type === 'SINGLE_CHOICE') {
            return resolvedIds.length > 0 ? resolvedIds[0] : '';
        }
        // MULTI_CHOICE
        return resolvedIds;
    };

    const handleApplyChanges = (selectedDiffs) => {
        let newTitle = currentHomework.title;
        let newContent = currentHomework.content;
        let newQuestions = [...(currentHomework.questions || [])];

        // A. 处理全局属性修改
        selectedDiffs.filter(d => d.target === 'global').forEach(diff => {
            if (diff.id === 'global-title') newTitle = diff.data.title;
            if (diff.id === 'global-content') newContent = diff.data.content;
        });

        // B. 处理题目删除
        const idsToDelete = new Set(selectedDiffs.filter(d => d.type === 'DELETED').map(d => d.id));
        if (idsToDelete.size > 0) {
            newQuestions = newQuestions.filter(q => !idsToDelete.has(q.id));
        }

        // C. 处理题目修改 (MODIFIED)
        const updatesMap = new Map();
        selectedDiffs.filter(d => d.type === 'MODIFIED' && d.target === 'question').forEach(diff => {
            updatesMap.set(diff.id, diff.data);
        });

        if (updatesMap.size > 0) {
            newQuestions = newQuestions.map(q => {
                if (updatesMap.has(q.id)) {
                    const aiUpdate = updatesMap.get(q.id);

                    // 1. 确定最终的 options 列表
                    // 如果 AI 更新了选项，就生成新的；否则沿用旧的
                    const finalOptions = (aiUpdate.options && aiUpdate.options.length > 0)
                        ? aiUpdate.options.map(opt => ({
                            id: opt.id || crypto.randomUUID(), // 优先用回传ID，否则生成新ID
                            label: opt.label,
                            text: opt.text
                        }))
                        : q.options;

                    // 2. 确定最终的 type
                    const finalType = aiUpdate.type || q.type;

                    // 3. 计算最终答案 (关键修复)
                    // 如果 AI 提供了新答案，使用 resolveCorrectAnswer 解析
                    // 如果没提供，但选项变了，旧答案 UUID 可能失效，这里暂且保留旧答案(假设没变)
                    const finalAnswer = aiUpdate.correctAnswer
                        ? resolveCorrectAnswer(aiUpdate.correctAnswer, finalType, finalOptions)
                        : q.correctAnswer;

                    return {
                        ...q,
                        title: aiUpdate.title || q.title,
                        score: (aiUpdate.score !== undefined && aiUpdate.score !== null) ? aiUpdate.score : q.score,
                        type: finalType,
                        analysis: aiUpdate.analysis || q.analysis,
                        aiGradingCriteria: aiUpdate.aiGradingCriteria || q.aiGradingCriteria,
                        options: finalOptions,
                        correctAnswer: finalAnswer
                    };
                }
                return q;
            });
        }

        // D. 处理题目新增 (ADDED)
        const adds = selectedDiffs.filter(d => d.type === 'ADDED').map(d => d.data);
        adds.forEach(q => {
            // 1. 生成新选项
            const newOptions = (q.options || []).map(opt => ({
                id: crypto.randomUUID(),
                label: opt.label,
                text: opt.text
            }));

            // 2. 解析答案 (关键修复)
            const resolvedAnswer = resolveCorrectAnswer(q.correctAnswer, q.type, newOptions);

            const newQ = {
                id: crypto.randomUUID(),
                type: q.type,
                title: q.title,
                score: q.score || 5,
                required: true,
                analysis: q.analysis || '',
                aiGradingCriteria: q.aiGradingCriteria || '',
                options: newOptions,
                correctAnswer: resolvedAnswer
            };

            newQuestions.push(newQ);
        });

        // 提交回父组件
        onApplyHomework({
            title: newTitle,
            content: newContent,
            questions: newQuestions
        });

        Swal.fire({ toast: true, icon: 'success', title: '修改已应用', position: 'top', timer: 1500, showConfirmButton: false });
    };

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files).filter(f => f.size < 10 * 1024 * 1024);
        setFiles(prev => [...prev, ...selected]);
        e.target.value = '';
    };

    if (!isOpen) return null;

    return (
        <div ref={panelRef} className={styles.panelWrapper} style={{ width: `${width}px` }}>
            <div className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`} onMouseDown={startResizing}>
                <div className={styles.handleBar}></div>
            </div>

            <div className={styles.panelContent}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <div className={styles.avatarIcon}><FontAwesomeIcon icon={faRobot} /></div>
                        <div>
                            <h3>AI 出题助手</h3>
                            <span className={styles.statusBadge}>Agent Mode</span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} title="关闭面板">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className={styles.chatArea}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`${styles.messageRow} ${msg.role === 'user' ? styles.rowUser : styles.rowAi}`}>
                            {msg.role === 'assistant' && <div className={styles.aiAvatar}><FontAwesomeIcon icon={faRobot} /></div>}

                            <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
                                {msg.type === 'text' && <ReactMarkdown>{msg.content}</ReactMarkdown>}
                                {msg.type === 'error' && (
                                    <div className={styles.errorMsg}>
                                        <FontAwesomeIcon icon={faExclamationCircle} /> {msg.content}
                                    </div>
                                )}

                                {msg.files && msg.files.length > 0 && (
                                    <div className={styles.fileListMsg}>
                                        {msg.files.map((f, i) => (
                                            <div key={i} className={styles.fileTag}>
                                                <FontAwesomeIcon icon={faFileAlt} /> {f.name}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* --- Diff 视图 --- */}
                                {msg.type === 'diff_view' && (
                                    <>
                                        <div style={{ marginBottom: '8px', fontSize: '0.9rem' }}>{msg.content}</div>
                                        {/* 关键：将消息中的 snapshot 传给 DiffViewer，而不是实时的 currentHomework */}
                                        <HomeworkDiffViewer
                                            aiData={msg.homeworkData}
                                            snapshot={msg.snapshot}
                                            currentHomework={currentHomework} // 这里如果需要展示实时状态的差异提示可传，但核心diff计算用snapshot
                                            onConfirm={handleApplyChanges}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className={styles.messageRow}>
                            <div className={styles.aiAvatar}><FontAwesomeIcon icon={faRobot} /></div>
                            <div className={`${styles.bubble} ${styles.bubbleAi}`}>
                                <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingIcon} />
                                正在分析作业结构并生成修改方案...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef}></div>
                </div>

                <div className={styles.inputArea}>
                    {files.length > 0 && (
                        <div className={styles.uploadPreview}>
                            {files.map((f, i) => (
                                <div key={i} className={styles.fileChip}>
                                    <span>{f.name}</span>
                                    <button onClick={() => setFiles(prev => prev.filter((_, x) => x !== i))}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`${styles.inputContainer} ${isSending ? styles.disabled : ''}`}>
                        <button className={styles.attachBtn} onClick={() => fileInputRef.current.click()} title="上传教材或文档">
                            <FontAwesomeIcon icon={faPaperclip} />
                        </button>
                        <input
                            type="file" multiple ref={fileInputRef} style={{ display: 'none' }}
                            onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        <textarea
                            ref={textareaRef}
                            className={styles.textarea}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            placeholder="输入需求（如：把所有单选题分值改为5分）..."
                            rows={1}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={isSending || (!input.trim() && files.length === 0)}
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantPanel;