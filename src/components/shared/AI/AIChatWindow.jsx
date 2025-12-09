import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faPaperPlane, faRobot, faBrain, faSpinner, faCode,
    faBars, faPlus, faCommentDots, faExclamationCircle, faTools, faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import useAuthStore from '../../../store/authStore';
import useAIStore from '../../../store/aiStore';
import { config } from '../../../utils/config';
import { baseApi } from '../../../services/api';
import { useDraggable } from '../../../hooks/useDraggable'; // 确保路径正确
import styles from './AIChatWindow.module.css';
import Swal from 'sweetalert2';

const AIChatWindow = ({ onClose, initialSessionId }) => {
    const { token } = useAuthStore();
    const { context } = useAIStore();

    // --- 状态定义 ---
    const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');

    const [isLoading, setIsLoading] = useState(false); // 历史记录加载中
    const [isSending, setIsSending] = useState(false); // 发送消息中
    const [useAgent, setUseAgent] = useState(false);   // 模式切换
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 侧边栏开关

    const messagesEndRef = useRef(null);
    const textAreaRef = useRef(null);

    // --- 拖拽功能 ---
    // 初始位置：屏幕中心偏右下
    const initialPos = {
        x: Math.max(0, window.innerWidth - 950),
        y: Math.max(0, window.innerHeight - 700)
    };
    const { position, dragRef, handleMouseDown } = useDraggable(initialPos);

    // --- 自动滚动 ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages, isSending]);

    // --- 自动调整输入框高度 ---
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
    }, [inputValue]);

    // --- 获取会话列表 ---
    const fetchSessions = useCallback(async () => {
        try {
            const res = await baseApi.get('/llm/sessions');
            if (res.data.code === 200) {
                setSessions(res.data.data || []);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // --- 加载特定会话的历史记录 ---
    const loadHistory = useCallback(async (sessionId) => {
        if (!sessionId) {
            setMessages([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await baseApi.get(`/llm/history/${sessionId}`);
            if (res.data.code === 200) {
                const history = res.data.data.map(m => ({
                    role: m.role,
                    content: m.content,
                    id: m.id,
                    type: 'history'
                }));
                setMessages(history);
            }
        } catch (e) {
            setMessages([{
                role: 'assistant',
                type: 'error',
                content: '无法加载历史记录，请检查网络。'
            }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 监听 currentSessionId 变化
    useEffect(() => {
        if (currentSessionId) {
            loadHistory(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId, loadHistory]);

    // --- 创建新会话 ---
    const handleNewChat = async () => {
        try {
            const res = await baseApi.get('/llm/session/new');
            if (res.data.code === 200) {
                const newId = res.data.data;
                setCurrentSessionId(newId);
                // 自动在移动端收起侧边栏
                if (window.innerWidth < 800) setIsSidebarOpen(false);
            }
        } catch (e) {
            console.error("New chat failed");
        }
    };

    const handleDeleteSession = async (e, targetSessionId) => {
        e.stopPropagation(); // 阻止冒泡，防止触发 session 切换

        const result = await Swal.fire({
            title: '删除会话?',
            text: "此操作无法恢复。",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            width: '300px', // 小一点的弹窗
            backdrop: false, // 不遮挡背景
            customClass: {
                container: styles.swalHighZIndex
            }
        });

        if (!result.isConfirmed) return;

        try {
            await baseApi.delete(`/llm/session/${targetSessionId}`);

            // 更新列表
            const newSessions = sessions.filter(s => s.sessionId !== targetSessionId);
            setSessions(newSessions);

            // 如果删除的是当前选中的会话
            if (targetSessionId === currentSessionId) {
                if (newSessions.length > 0) {
                    // 切换到下一个最新的
                    setCurrentSessionId(newSessions[0].sessionId);
                } else {
                    // 如果删光了，新建一个
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    // --- 发送消息处理 ---
    const handleSend = async () => {
        if (!inputValue.trim() || !currentSessionId) return;

        const userText = inputValue;
        setInputValue(''); // 立即清空，提升体验
        if (textAreaRef.current) textAreaRef.current.style.height = 'auto'; // 重置高度
        setIsSending(true);

        // 1. 乐观更新用户消息
        const tempUserMsgId = Date.now();
        setMessages(prev => [...prev, {
            role: 'user',
            content: userText,
            id: tempUserMsgId,
            type: 'text'
        }]);

        const requestBody = {
            sessionId: currentSessionId,
            message: userText,
            scene: context.scene,
            sceneParams: context.sceneParams
        };

        if (useAgent) {
            // ================== Agent 模式 (HTTP POST) ==================
            const aiMsgId = Date.now() + 1;
            // 插入占位符
            setMessages(prev => [...prev, {
                role: 'assistant',
                id: aiMsgId,
                isAgentThinking: true,
                type: 'agent_placeholder'
            }]);

            try {
                const response = await baseApi.post('/llm/chat/agent', requestBody);
                const toolsList = response.data.data; // List<Tools.Tool>

                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? {
                        ...msg,
                        isAgentThinking: false,
                        type: 'agent_response',
                        tools: toolsList
                    } : msg
                ));
                // 刷新侧边栏（标题可能更新）
                fetchSessions();
            } catch (error) {
                const errorText = error.response?.data?.message || error.message || "Agent 执行失败";
                // 将占位符替换为错误提示
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? {
                        role: 'assistant',
                        type: 'error',
                        content: `Agent Error: ${errorText}`
                    } : msg
                ));
                // 恢复输入框内容以便用户重试（可选）
                setInputValue(userText);
            } finally {
                setIsSending(false);
            }

        } else {
            // ================== Stream 模式 (SSE) ==================
            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                id: aiMsgId,
                isStreaming: true,
                type: 'text'
            }]);

            try {
                const response = await fetch(`${config.back_base_url}/llm/chat/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiContent = "";
                let buffer = ""; // 【核心】：必须使用 Buffer 处理 TCP 拆包/粘包

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // 1. 解码并追加到缓冲区
                    buffer += decoder.decode(value, { stream: true });

                    // 2. 按行分割
                    const lines = buffer.split('\n');

                    // 3. 【关键】：保留最后一行（因为它可能不完整），留给下一次处理
                    buffer = lines.pop();

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data:')) continue;

                        const dataStr = trimmed.slice(5).trim(); // 去掉 "data:"

                        // 处理错误事件
                        if (trimmed.startsWith('event:error')) {
                            throw new Error(dataStr);
                        }

                        // 尝试解析 JSON
                        try {
                            const json = JSON.parse(dataStr);
                            // 后端传的是 {"c": "内容"}
                            if (json.c) {
                                aiContent += json.c;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                                ));
                            }
                        } catch (e) {
                            throw new Error(dataStr);
                        }
                    }
                }
                fetchSessions(); // 刷新会话列表
            } catch (error) {
                console.error("Stream Error:", error);
                // 关键修正：不要覆盖用户消息，而是把当前的 AI 消息变为错误状态
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? {
                        role: 'assistant',
                        type: 'error',
                        content: `连接中断: ${error.message}`
                    } : msg
                ));
            } finally {
                setIsSending(false);
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
                ));
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSending) handleSend();
        }
    };

    // --- 渲染不同类型的消息 ---
    const renderMessageContent = (msg) => {
        // 1. 错误消息
        if (msg.type === 'error') {
            return (
                <div className={styles.errorMessage}>
                    <FontAwesomeIcon icon={faExclamationCircle} /> {msg.content}
                </div>
            );
        }

        // 2. 普通文本 / Stream 文本
        // 当前用户只能输入文本
        if (msg.type === 'text' || (msg.type === 'history' && msg.role === 'user')) {
            return <ReactMarkdown>{msg.content}</ReactMarkdown>;
        }

        // 3. Agent 思考中
        if (msg.isAgentThinking) {
            return (
                <div className={styles.agentThinking}>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Agent 正在分析上下文并执行任务...</span>
                </div>
            );
        }

        // 4. Agent 工具调用结果渲染（AI聊天记录也使用此渲染）
        if ((msg.type === 'agent_response' && msg.tools) || (msg.type === 'history' && msg.role === 'assistant')) {
            let tools;
            if (msg.type === 'history') {
                tools = JSON.parse(msg.content);
            } else {
                tools = msg.tools;
            }
            return (
                <div className={styles.agentResponseContainer}>
                    {tools.map((tool, idx) => {
                        // 策略：检查 name 属性
                        if (tool.name === 'ReplayTool') {
                            return (
                                <div key={idx} className={styles.toolResultText}>
                                    <ReactMarkdown>{tool.message}</ReactMarkdown>
                                </div>
                            );
                        }
                        // 其他 Tool (通用渲染)
                        return (
                            <div key={idx} className={styles.toolResultGeneric}>
                                <div className={styles.toolLabel}>
                                    <FontAwesomeIcon icon={faTools} /> 调用工具: {tool.name || 'Unknown'}
                                </div>
                                <pre className={styles.jsonPre}>
                                    {JSON.stringify(tool, null, 2)}
                                </pre>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // 兜底
        return <ReactMarkdown>{msg.content}</ReactMarkdown>;
    };

    return (
        <div
            className={styles.chatWindow}
            style={{ left: position.x, top: position.y }}
            ref={dragRef}
        >
            {/* --- Header (Drag Handle) --- */}
            <div className={styles.header} onMouseDown={handleMouseDown}>
                <div className={`${styles.titleArea} no-drag`}>
                    <button
                        className={styles.toggleSidebarBtn}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        title={isSidebarOpen ? "收起列表" : "展开列表"}
                        onMouseDown={(e) => e.stopPropagation()} // 防止触发拖拽
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <div className={styles.titleText}>
                        <h3>AI 教学助手</h3>
                        <span>{useAgent ? 'Agent 深度模式' : '极速对话模式'}</span>
                    </div>
                </div>
                <div className={`${styles.controls} no-drag`}>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
            </div>

            {/* --- Content (Sidebar + Main) --- */}
            <div className={styles.contentContainer}>

                {/* 侧边栏 */}
                <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
                    <button className={styles.newChatBtn} onClick={handleNewChat}>
                        <FontAwesomeIcon icon={faPlus} /> 新建对话
                    </button>
                    <div className={styles.sessionList}>
                        {sessions.map(s => (
                            <div
                                key={s.id}
                                className={`${styles.sessionItem} ${s.sessionId === currentSessionId ? styles.active : ''}`}
                                onClick={() => { setCurrentSessionId(s.sessionId); if (window.innerWidth < 800) setIsSidebarOpen(false); }}
                                title={s.title}
                            >
                                <div className={styles.sessionTitle}>
                                    <FontAwesomeIcon icon={faCommentDots} />
                                    <span>{s.title}</span>
                                </div>

                                {/* 删除按钮 */}
                                <button
                                    className={styles.deleteSessionBtn}
                                    onClick={(e) => handleDeleteSession(e, s.sessionId)}
                                    title="删除会话"
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 主聊天区 */}
                <div className={styles.mainArea}>
                    <div className={styles.messageList}>
                        {messages.length === 0 && !isLoading && (
                            <div className={styles.emptyState}>
                                <FontAwesomeIcon icon={faBrain} size="3x" style={{ color: '#dee2e6', marginBottom: '1rem' }} />
                                <p>有什么可以帮你的吗？</p>
                                <p style={{ fontSize: '0.8rem', color: '#999' }}>当前场景: {context.scene}</p>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                                <div className={styles.messageContent}>
                                    {renderMessageContent(msg)}
                                    {msg.isStreaming && <span className={styles.cursor}></span>}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 底部输入区 */}
                    <div className={styles.footer}>
                        <div className={styles.toolsBar}>
                            <div
                                className={`${styles.agentToggle} ${isSending ? styles.disabled : ''}`}
                                onClick={() => !isSending && setUseAgent(!useAgent)}
                            >
                                <div className={`${styles.toggleSwitch} ${useAgent ? styles.active : ''}`}>
                                    <div className={styles.toggleKnob}></div>
                                </div>
                                <span>Agent 模式</span>
                            </div>
                        </div>

                        <div className={styles.inputArea}>
                            <textarea
                                ref={textAreaRef}
                                className={styles.input}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isSending ? "正在思考中..." : "输入消息..."}
                                disabled={isSending}
                                rows={1}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={handleSend}
                                disabled={isSending || !inputValue.trim()}
                            >
                                {isSending ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AIChatWindow;