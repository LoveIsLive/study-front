import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faPaperPlane, faBrain, faSpinner, faBars,
    faPlus, faCommentDots, faExclamationCircle, faTools, faTrashAlt,
    faPaperclip, faFileAlt, faCodeBranch
} from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import Swal from 'sweetalert2';

import useAuthStore from '../../../store/authStore';
import useAIStore from '../../../store/aiStore';
import { config } from '../../../utils/config';
import { baseApi } from '../../../services/api';
import { useDraggable } from '../../../hooks/useDraggable';
import { formatFileSize } from '../../../utils/helpers';
import styles from './AIChatWindow.module.css';

const ThinkingBubble = () => (
    <div className={styles.thinkingBubble}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <span style={{ fontSize: '0.85rem', color: '#0984e3', marginLeft: '6px' }}>AI 正在思考...</span>
    </div>
);

// ... RemoteFileCard 和 LocalFileCard 代码与之前版本一致，无需变动 ...
// 重点是 RemoteFileCard 内的 div className={styles.fileChip} 
// 和 LocalFileCard 内的 div className={styles.fileChip} 
// 现在会自动应用新的 CSS 样式 (白色半透明或普通白色)

const RemoteFileCard = ({ fileItem }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const isImage = fileItem.mimeTypeName?.startsWith('image/');

    const handleClick = async () => {
        try {
            const res = await baseApi.get('/llm/get/downloadId', {
                params: { path: fileItem.path, fileName: fileItem.fileName }
            });
            if (res.data.code === 200) {
                const token = res.data.data;
                const url = `${config.back_base_url}/llm/download?path=${encodeURIComponent(fileItem.path)}&mode=inline&token=${token}`;
                window.open(url, '_blank');
            }
        } catch (e) {
            Swal.fire({ toast: true, icon: 'error', title: '无法预览文件', position: 'top' });
        }
    };

    useEffect(() => {
        if (!isImage || !fileItem.path) return;
        let isMounted = true;
        const loadImg = async () => {
            try {
                const res = await baseApi.get('/llm/get/downloadId', {
                    params: { path: fileItem.path, fileName: fileItem.fileName }
                });
                if (res.data.code === 200 && isMounted) {
                    const token = res.data.data;
                    setPreviewUrl(`${config.back_base_url}/llm/download?path=${encodeURIComponent(fileItem.path)}&mode=inline&token=${token}`);
                }
            } catch (e) { console.error(e); }
        };
        loadImg();
        return () => { isMounted = false; };
    }, [fileItem, isImage]);

    return (
        <div className={styles.fileChip} onClick={handleClick} title="点击预览">
            {isImage ? (
                <div className={styles.imageWrapper}>
                    {previewUrl ? <img src={previewUrl} alt="thumb" className={styles.fileThumbnail} /> : <div className={styles.fileIconPlaceholder}><FontAwesomeIcon icon={faSpinner} spin /></div>}
                </div>
            ) : (
                <div className={styles.fileIconPlaceholder}>
                    <FontAwesomeIcon icon={faFileAlt} />
                </div>
            )}
            <div className={styles.fileInfo}>
                <span className={styles.fileName}>{fileItem.fileName}</span>
                <span className={styles.fileSize}>{formatFileSize(fileItem.fileSize)}</span>
            </div>
        </div>
    );
};

const LocalFileCard = ({ file, onRemove, onPreview }) => {
    const isImage = file.type.startsWith('image/');
    const imgUrl = isImage ? URL.createObjectURL(file) : null;

    return (
        <div className={styles.fileChip} onClick={() => isImage && onPreview(imgUrl)}>
            {onRemove && (
                <button className={styles.removeFileBtn} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                    &times;
                </button>
            )}
            {isImage ? (
                <div className={styles.imageWrapper}>
                    <img src={imgUrl} alt="thumb" className={styles.fileThumbnail} />
                </div>
            ) : (
                <div className={styles.fileIconPlaceholder}>
                    <FontAwesomeIcon icon={faFileAlt} />
                </div>
            )}
            <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
            </div>
        </div>
    );
};

const AIChatWindow = ({ onClose, initialSessionId }) => {
    const { token } = useAuthStore();
    const { context } = useAIStore();

    // --- State ---
    const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

    // Lightbox State
    const [previewImage, setPreviewImage] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [useAgent, setUseAgent] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const messagesEndRef = useRef(null);
    const textAreaRef = useRef(null);
    const fileInputRef = useRef(null);

    const { position, dragRef, handleMouseDown } = useDraggable({
        x: Math.max(0, window.innerWidth - 1000),
        y: Math.max(0, window.innerHeight - 800)
    });

    // --- Effects ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending, selectedFiles]);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 150) + 'px';
        }
    }, [inputValue]);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await baseApi.get('/llm/sessions');
            if (res.data.code === 200) setSessions(res.data.data || []);
        } catch (e) { }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // --- History Loading ---
    const loadHistory = useCallback(async (sessionId) => {
        if (!sessionId) { setMessages([]); return; }
        setIsLoading(true);
        try {
            const res = await baseApi.get(`/llm/history/${sessionId}`);
            if (res.data.code === 200) {
                const history = res.data.data.map(m => {
                    if (m.type === 'file') {
                        try {
                            const parsed = JSON.parse(m.content);
                            return { ...m, content: parsed.text || '', fileItems: parsed.files || [], type: 'file' };
                        } catch (e) { return { ...m, type: 'text', content: '消息解析失败' }; }
                    }
                    if (m.type === 'tool' && m.role === 'assistant') {
                        try {
                            const messageObj = JSON.parse(m.content);
                            return {
                                ...m,
                                type: 'agent_result',
                                content: messageObj.content,
                                toolCalls: messageObj.tool_calls
                            };
                        } catch (e) { return { ...m, type: 'text', content: m.content }; }
                    }
                    return { ...m, type: 'text' };
                });
                setMessages(history);
            }
        } catch (e) {
            setMessages([{ role: 'assistant', type: 'error', content: '加载历史记录失败' }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentSessionId) loadHistory(currentSessionId);
        else setMessages([]);
    }, [currentSessionId, loadHistory]);

    // --- Interaction ---
    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files).filter(file => {
            if (file.size > 10 * 1024 * 1024) {
                Swal.fire({ toast: true, icon: 'warning', title: `${file.name} 超过 10MB` });
                return false;
            }
            return true;
        });
        setSelectedFiles(prev => [...prev, ...newFiles]);
        e.target.value = '';
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!inputValue.trim() && selectedFiles.length === 0) || !currentSessionId) return;

        const userText = inputValue;
        const currentFiles = [...selectedFiles];

        setInputValue('');
        setSelectedFiles([]);
        if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
        setIsSending(true);

        const tempId = Date.now();
        setMessages(prev => [...prev, {
            role: 'user',
            content: userText,
            localFiles: currentFiles,
            id: tempId,
            type: currentFiles.length > 0 ? 'file' : 'text'
        }]);

        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            id: aiMsgId,
            isWaitingFirstResponse: true,
            type: 'text'
        }]);

        const formData = new FormData();
        const requestDTO = {
            sessionId: currentSessionId,
            message: userText || ' ',
            scene: context.scene,
            sceneParams: context.sceneParams
        };
        formData.append('request', new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }));
        currentFiles.forEach(file => formData.append('files', file));

        try {
            if (useAgent) {
                const response = await baseApi.post('/llm/chat/agent', formData);
                const messageObj = response.data.data;
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? {
                        ...msg,
                        isWaitingFirstResponse: false,
                        type: 'agent_result',
                        content: messageObj.content,
                        toolCalls: messageObj.tool_calls
                    } : msg
                ));
            } else {
                const response = await fetch(`${config.back_base_url}/llm/chat/stream`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!response.ok) throw new Error("Stream Failed");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let aiContent = "";
                let buffer = "";
                let hasReceivedFirstToken = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (!hasReceivedFirstToken) {
                        hasReceivedFirstToken = true;
                        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isWaitingFirstResponse: false, isStreaming: true } : m));
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data:')) continue;
                        const dataStr = trimmed.slice(5).trim();
                        try {
                            const json = JSON.parse(dataStr);
                            if (json.c) {
                                aiContent += json.c;
                                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m));
                            }
                        } catch (e) { }
                    }
                }
            }
            fetchSessions();
        } catch (error) {
            setMessages(prev => prev.map(m => m.id === aiMsgId ? {
                role: 'assistant', type: 'error', content: `请求失败: ${error.message}`, isWaitingFirstResponse: false
            } : m));
        } finally {
            setIsSending(false);
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, isWaitingFirstResponse: false } : m));
        }
    };

    const handleNewChat = async () => {
        try {
            const res = await baseApi.get('/llm/session/new');
            if (res.data.code === 200) {
                setCurrentSessionId(res.data.data);
                if (window.innerWidth < 800) setIsSidebarOpen(false);
            }
        } catch (e) { }
    };

    const handleDeleteSession = async (e, targetSessionId) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: '删除会话?', text: "无法恢复", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ff7675', confirmButtonText: '删除', width: '320px'
        });
        if (!result.isConfirmed) return;
        try {
            await baseApi.delete(`/llm/session/${targetSessionId}`);
            setSessions(prev => prev.filter(s => s.sessionId !== targetSessionId));
            if (targetSessionId === currentSessionId) setCurrentSessionId(null);
        } catch (error) { }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSending && (inputValue.trim() || selectedFiles.length > 0)) handleSend();
        }
    };

    // --- Render Content ---
    const renderMessageContent = (msg) => {
        if (msg.type === 'error') {
            return <div style={{ color: '#d63031', display: 'flex', gap: '8px', alignItems: 'center' }}><FontAwesomeIcon icon={faExclamationCircle} /> {msg.content}</div>;
        }

        if (msg.isWaitingFirstResponse) {
            return <ThinkingBubble />;
        }

        const renderFiles = () => (
            <>
                {msg.localFiles && msg.localFiles.length > 0 && (
                    <div className={styles.filePreviewArea}>
                        {msg.localFiles.map((f, i) => (
                            <LocalFileCard key={i} file={f} onPreview={(url) => setPreviewImage(url)} />
                        ))}
                    </div>
                )}
                {msg.fileItems && msg.fileItems.length > 0 && (
                    <div className={styles.filePreviewArea}>
                        {msg.fileItems.map((f, i) => <RemoteFileCard key={i} fileItem={f} />)}
                    </div>
                )}
            </>
        );

        if (msg.type === 'agent_result' || (msg.type === 'tool' && msg.role === 'assistant')) {
            const tools = msg.toolCalls || [];
            return (
                <>
                    {renderFiles()}
                    {msg.content && <ReactMarkdown>{msg.content}</ReactMarkdown>}
                    {tools.map((toolCall, idx) => {
                        const func = toolCall.function;
                        if (func.name === 'ReplayTool') {
                            let text = "";
                            try { text = JSON.parse(func.arguments).message; } catch (e) { text = func.arguments; }
                            return <div key={idx} style={{ marginTop: '10px' }}><ReactMarkdown>{text}</ReactMarkdown></div>;
                        }
                        return (
                            <div key={idx} className={styles.toolContainer}>
                                <div className={styles.toolHeader}><FontAwesomeIcon icon={faCodeBranch} /> 调用工具: {func.name}</div>
                                <div className={styles.toolBody}>{func.arguments}</div>
                            </div>
                        );
                    })}
                </>
            );
        }

        return (
            <>
                {renderFiles()}
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.isStreaming && <span style={{ display: 'inline-block', width: '6px', height: '14px', background: '#2d3436', marginLeft: '4px', animation: 'blink 1s infinite' }}></span>}
            </>
        );
    };

    return (
        <>
            <div className={styles.chatWindow} style={{ left: position.x, top: position.y }} ref={dragRef}>
                <div className={styles.header} onMouseDown={handleMouseDown}>
                    <div className={`${styles.titleArea} no-drag`}>
                        <button className={styles.toggleSidebarBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <FontAwesomeIcon icon={faBars} />
                        </button>
                        <div className={styles.titleText}>
                            <h3>AI 教学助手</h3>
                            <span>{useAgent ? 'Agent 深度模式' : '极速对话模式'}</span>
                        </div>
                    </div>
                    <button className={`${styles.closeButton} no-drag`} onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
                </div>

                <div className={styles.contentContainer}>
                    <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
                        <button className={styles.newChatBtn} onClick={handleNewChat}>
                            <FontAwesomeIcon icon={faPlus} /> 新建对话
                        </button>
                        <div className={styles.sessionList}>
                            {sessions.map(s => (
                                <div key={s.id}
                                    className={`${styles.sessionItem} ${s.sessionId === currentSessionId ? styles.active : ''}`}
                                    onClick={() => setCurrentSessionId(s.sessionId)}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                                    <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteSession(e, s.sessionId)}>
                                        <FontAwesomeIcon icon={faTrashAlt} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.mainArea}>
                        <div className={styles.messageList}>
                            {messages.length === 0 && !isLoading && (
                                <div className={styles.emptyState}>
                                    <h1 className={styles.emptyTitle}>ASK ME</h1>
                                    <span className={styles.emptySubtitle}>我能为您做些什么？</span>
                                </div>
                            )}
                            {messages.map((msg, index) => (
                                <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                                    <div className={styles.messageContent}>
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.footer}>
                            <div className={styles.toolbar}>
                                <div className={styles.agentSwitch} onClick={() => setUseAgent(!useAgent)}>
                                    <div className={`${styles.switchTrack} ${useAgent ? styles.active : ''}`}>
                                        <div className={styles.switchKnob}></div>
                                    </div>
                                    <span>Agent 模式</span>
                                </div>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className={styles.filePreviewArea}>
                                    {selectedFiles.map((f, i) => (
                                        <LocalFileCard
                                            key={i}
                                            file={f}
                                            onRemove={() => removeSelectedFile(i)}
                                            onPreview={(url) => setPreviewImage(url)}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className={styles.inputWrapper}>
                                <input
                                    type="file" ref={fileInputRef} style={{ display: 'none' }} multiple
                                    accept="image/*,text/*,.txt,.md,.json,.js,.java,.py,.c,.cpp,.h,.css,.html"
                                    onChange={handleFileSelect}
                                />
                                <button className={styles.iconBtn} onClick={() => fileInputRef.current.click()} title="上传文件">
                                    <FontAwesomeIcon icon={faPaperclip} />
                                </button>
                                <textarea
                                    ref={textAreaRef} className={styles.textInput}
                                    placeholder="输入消息..." rows={1}
                                    value={inputValue} onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    className={`${styles.iconBtn} ${styles.primary}`}
                                    onClick={handleSend}
                                    disabled={isSending || (!inputValue.trim() && selectedFiles.length === 0)}
                                >
                                    {isSending ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 图片预览 Lightbox */}
            {previewImage && (
                <div className={styles.imageLightbox} onClick={() => setPreviewImage(null)}>
                    <div className={styles.closeLightbox}>&times;</div>
                    <img src={previewImage} alt="Full Preview" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
};

export default AIChatWindow;