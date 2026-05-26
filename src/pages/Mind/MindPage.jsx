// src/pages/Mind/MindPage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPaperPlane, faBrain, faCode, faDownload,
    faSpinner, faRobot, faBars, faPlus, faMousePointer, faPlay, faTerminal,
    faTrashAlt, faPaperclip, faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import { BlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
// 1. 导入中文语言包
import * as ZhHans from 'blockly/msg/zh-hans';


import { pythonGenerator } from 'blockly/python';
import ReactMarkdown from 'react-markdown';
import Swal from 'sweetalert2';

import { baseApi } from '../../services/api';
import { config } from '../../utils/config';
import styles from './MindPage.module.css';

// 【修改点 1】：引入 useAuthStore
import useAuthStore from '../../store/authStore';

// 2. 初始化语言包
Blockly.setLocale(ZhHans);

// 终极工具箱 (与系统提示词 100% 匹配)
const INITIAL_TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
        { kind: 'category', name: '逻辑', colour: '#5b80a5', contents: [{ kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_negate' }, { kind: 'block', type: 'logic_boolean' }] },
        { kind: 'category', name: '循环', colour: '#5ba55b', contents: [{ kind: 'block', type: 'controls_repeat_ext' }, { kind: 'block', type: 'controls_whileUntil' }, { kind: 'block', type: 'controls_for' }, { kind: 'block', type: 'controls_flow_statements' }] },
        { kind: 'category', name: '数学', colour: '#5b67a5', contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }, { kind: 'block', type: 'math_single' }, { kind: 'block', type: 'math_round' }, { kind: 'block', type: 'math_random_int' }] },
        { kind: 'category', name: '文本', colour: '#5ba58c', contents: [{ kind: 'block', type: 'text' }, { kind: 'block', type: 'text_join' }, { kind: 'block', type: 'text_length' }, { kind: 'block', type: 'text_print' }, { kind: 'block', type: 'text_prompt_ext' }] },
        { kind: 'category', name: '列表', colour: '#745ba5', contents: [{ kind: 'block', type: 'lists_create_empty' }, { kind: 'block', type: 'lists_create_with' }, { kind: 'block', type: 'lists_length' }, { kind: 'block', type: 'lists_getIndex' }, { kind: 'block', type: 'lists_setIndex' }, { kind: 'block', type: 'lists_sort' }] },
        { kind: 'sep' },
        { kind: 'category', name: '变量', colour: '#a55b80', custom: 'VARIABLE' },
        { kind: 'category', name: '函数', colour: '#995ba5', custom: 'PROCEDURE' }
    ]
};

// 格式化文件大小辅助函数
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- 文件卡片组件 (移植自 AIChatWindow 并适配) ---
const LocalFileCard = ({ file, onRemove, onPreview }) => {
    // 增加容错判断，有些文件对象的 type 可能是空的
    const isImage = file.type?.startsWith('image/') || false;
    const [fileUrl, setFileUrl] = useState('');

    // 使用 useEffect 创建和释放 Blob URL，防止内存泄漏
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const handleCardClick = () => {
        if (!fileUrl) return;

        if (isImage) {
            // 是图片，触发相册 Lightbox 预览
            onPreview(fileUrl);
        } else {
            // 是 PDF、TXT、代码文件等，直接在浏览器新标签页打开原生预览
            window.open(fileUrl, '_blank');
        }
    };

    return (
        <div className={styles.fileChip} onClick={handleCardClick} title="点击预览">
            {onRemove && (
                <button className={styles.removeFileBtn} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                    &times;
                </button>
            )}
            {isImage ? (
                <div className={styles.imageWrapper}>
                    <img src={fileUrl} alt="thumb" className={styles.fileThumbnail} />
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


const MindPage = () => {
    // 【修改点 2】：获取 isAdmin 状态
    const isAdmin = useAuthStore((state) => state.isAdmin());

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [sessionId, setSessionId] = useState('');

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);

    // 文件上传相关状态
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);

    const [pythonCode, setPythonCode] = useState('');
    const [selectedBlockCode, setSelectedBlockCode] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const [terminalOutput, setTerminalOutput] = useState('等待执行...');
    const [isRunning, setIsRunning] = useState(false);

    const workspaceRef = useRef(null);
    const messagesEndRef = useRef(null);
    const terminalEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // 滚动到底部
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedFiles]);
    useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalOutput]);

    // 监听侧边栏开关，强制 Blockly 重绘适应宽度
    useEffect(() => {
        if (workspaceRef.current) {
            const timer = setTimeout(() => {
                Blockly.svgResize(workspaceRef.current);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isSidebarOpen]);

    // 加载历史消息 (解析 file 和 text 类型)
    const loadHistory = async (sid) => {
        if (!sid) {
            setMessages([]);
            return;
        }
        try {
            const res = await baseApi.get(`/llm/history/${sid}`);
            if (res.data.code === 200) {
                const historyData = res.data.data.map(m => {
                    // 处理 AI 积木生成记录
                    if (m.role === 'assistant' && m.type === 'mind_result') {
                        try {
                            const parsed = JSON.parse(m.content);
                            return { id: m.id, role: m.role, type: 'mind_result', content: parsed.thoughts, blocklyXml: parsed.blocklyXml };
                        } catch (e) { return { ...m, id: m.id, content: "数据解析失败" }; }
                    }
                    // 处理带有附件的记录
                    if (m.type === 'file') {
                        try {
                            const parsed = JSON.parse(m.content);
                            return { ...m, content: parsed.text || '', fileItems: parsed.files || [], type: 'file' };
                        } catch (e) { return { ...m, type: 'text', content: '消息解析失败' }; }
                    }
                    return { ...m, id: m.id };
                });
                setMessages(historyData);
            }
        } catch (e) { console.error(e); }
    };

    // 获取会话列表
    const fetchSessions = useCallback(async () => {
        try {
            const res = await baseApi.get('/llm/sessions?purpose=mind-block-gen');
            if (res.data.code === 200) {
                setSessions(res.data.data || []);
                if (!sessionId && res.data.data.length > 0) {
                    const firstId = res.data.data[0].sessionId;
                    setSessionId(firstId);
                    loadHistory(firstId);
                }
            }
        } catch (e) { console.error(e); }
    }, [sessionId]);

    useEffect(() => { fetchSessions(); }, []);

    // 切换会话
    const handleSelectSession = (sid) => {
        if (sid === sessionId) return;
        setSessionId(sid);
        loadHistory(sid);
    };

    // 新建会话
    const handleNewChat = async () => {
        try {
            const res = await baseApi.get('/llm/session/new?purpose=mind-block-gen');
            if (res.data.code === 200) {
                const newSid = res.data.data;
                setSessionId(newSid);
                fetchSessions();
                setMessages([]);
                setPythonCode('');
                setSelectedFiles([]);
                setTerminalOutput('等待执行...');
                if (workspaceRef.current) Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.utils.xml.textToDom("<xml></xml>"), workspaceRef.current);
            }
        } catch (e) { console.error(e); }
    };

    // 删除会话
    const handleDeleteSession = async (e, targetSessionId) => {
        e.stopPropagation(); // 阻止触发选中会话
        const result = await Swal.fire({
            title: '删除项目?',
            text: "删除后无法恢复！",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff7675',
            confirmButtonText: '删除',
            width: '320px'
        });

        if (!result.isConfirmed) return;

        try {
            await baseApi.delete(`/llm/session/${targetSessionId}`);
            setSessions(prev => prev.filter(s => s.sessionId !== targetSessionId));

            // 如果删除的是当前选中的会话，清空画布和消息
            if (targetSessionId === sessionId) {
                setSessionId('');
                setMessages([]);
                setPythonCode('');
                if (workspaceRef.current) Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.utils.xml.textToDom("<xml></xml>"), workspaceRef.current);
            }
            Swal.fire({ toast: true, icon: 'success', title: '已删除', position: 'top', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire({ toast: true, icon: 'error', title: '删除失败', position: 'top' });
        }
    };

    const onWorkspaceChange = useCallback((workspace) => {
        workspaceRef.current = workspace;
        try { setPythonCode(pythonGenerator.workspaceToCode(workspace)); } catch (e) { }

        const selected = Blockly.common.getSelected();
        if (selected) {
            try {
                let bCode = pythonGenerator.blockToCode(selected);
                setSelectedBlockCode(Array.isArray(bCode) ? bCode[0] : bCode);
            } catch (e) { setSelectedBlockCode('# 无法解析此块'); }
        } else {
            setSelectedBlockCode('');
        }
    }, []);

    // 处理文件选择
    const handleFileSelect = (e) => {
        const allowedTypes = ['image/', 'text/', 'application/pdf', 'application/json'];

        let totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);

        const newFiles = Array.from(e.target.files).filter(file => {
            // 后端限制总大小 100MB
            if (totalSize + file.size > 100 * 1024 * 1024) {
                Swal.fire({ toast: true, icon: 'warning', title: `总文件大小不能超过 100MB`, position: 'top' });
                return false;
            }
            totalSize += file.size;
            return true;
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
        e.target.value = ''; // Reset input
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // 发送消息
    const handleSend = async () => {
        if ((!inputValue.trim() && selectedFiles.length === 0) || isSending) return;

        let targetSessionId = sessionId;
        if (!targetSessionId) {
            try {
                const res = await baseApi.get('/llm/session/new?purpose=mind-block-gen');
                targetSessionId = res.data.data;
                setSessionId(targetSessionId);
            } catch (e) { return; }
        }

        const text = inputValue;
        const currentFiles = [...selectedFiles];

        setInputValue('');
        setSelectedFiles([]);
        setIsSending(true);

        const tempId = Date.now();
        setMessages(prev => [...prev, {
            id: tempId,
            role: 'user',
            content: text,
            localFiles: currentFiles,
            type: currentFiles.length > 0 ? 'file' : 'text'
        }]);

        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', isThinking: true, type: 'mind_result' }]);

        let currentXmlText = "";
        if (workspaceRef.current) currentXmlText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));

        try {
            const formData = new FormData();
            formData.append('request', new Blob([JSON.stringify({
                sessionId: targetSessionId, message: text || " ", scene: "mind-block-gen", sceneParams: { current_blockly_xml: currentXmlText }
            })], { type: 'application/json' }));

            currentFiles.forEach(file => formData.append('files', file));

            const res = await baseApi.post('/llm/chat/mind', formData);
            if (res.data.code === 200) {
                const dto = res.data.data;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isThinking: false, content: dto.thoughts, blocklyXml: dto.blocklyXml } : m));
                fetchSessions();
            } else throw new Error(res.data.msg);
        } catch (e) {
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isThinking: false, content: '生成失败：' + (e.response?.data?.msg || e.message) } : m));
        } finally { setIsSending(false); }
    };

    const applyXmlToWorkspace = (xmlString) => {
        if (!workspaceRef.current) return;
        try {
            Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.utils.xml.textToDom(xmlString), workspaceRef.current);
            Swal.fire({ toast: true, icon: 'success', title: '导入成功', position: 'top', showConfirmButton: false, timer: 1000 });
        } catch (e) {
            Swal.fire({ toast: true, icon: 'error', title: '解析失败', text: '大模型生成了非法积木', position: 'top' });
        }
    };

    const runPythonCode = async () => {
        if (!pythonCode.trim()) {
            setTerminalOutput("请先拼装积木生成代码！");
            return;
        }
        setIsRunning(true);
        setTerminalOutput('>> 正在加载 WebAssembly Python 环境...\n>> 首次运行需下载核心库，请稍候...\n');

        try {
            if (!window.loadPyodide) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }
            if (!window.pyodideInstance) {
                window.pyodideInstance = await window.loadPyodide({
                    stdout: (text) => { setTerminalOutput(prev => prev + text + '\n'); },
                    stderr: (text) => { setTerminalOutput(prev => prev + '[错误] ' + text + '\n'); }
                });
            }
            setTerminalOutput('>> 环境就绪，开始执行程序...\n--------------------------------\n');
            await window.pyodideInstance.runPythonAsync(pythonCode);
            setTerminalOutput(prev => prev + '--------------------------------\n>> [进程已结束]');
        } catch (err) {
            setTerminalOutput(prev => prev + '\n[运行异常] ' + err.message);
        } finally { setIsRunning(false); }
    };

    // 渲染消息附件
    const renderFiles = (msg) => (
        <>
            {msg.localFiles && msg.localFiles.length > 0 && (
                <div className={styles.msgFilePreviewArea}>
                    {msg.localFiles.map((f, i) => (
                        <LocalFileCard key={i} file={f} onPreview={(url) => setPreviewImage(url)} />
                    ))}
                </div>
            )}
            {msg.fileItems && msg.fileItems.length > 0 && (
                <div className={styles.msgFilePreviewArea}>
                    {msg.fileItems.map((f, i) => <RemoteFileCard key={i} fileItem={f} />)}
                </div>
            )}
        </>
    );

    return (
        <div className={styles.container}>
            <div className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <button className={styles.newChatBtn} onClick={handleNewChat}>
                        <FontAwesomeIcon icon={faPlus} /> 新建项目
                    </button>
                </div>
                <div className={styles.sessionList}>
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            className={`${styles.sessionItem} ${s.sessionId === sessionId ? styles.active : ''}`}
                            onClick={() => handleSelectSession(s.sessionId)}
                            title={s.title}
                        >
                            <span className={styles.sessionTitle}>{s.title || '新项目'}</span>
                            <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteSession(e, s.sessionId)}>
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.aiPanel}>
                <div className={styles.aiHeader}>
                    <button className={styles.toggleSidebarBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <div className={styles.aiTitle}>
                        <FontAwesomeIcon icon={faRobot} /> Mind+ 智能助教
                    </div>
                    <div style={{ width: '32px' }}></div>
                </div>

                <div className={styles.messageList}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#b2bec3', marginTop: '60px' }}>
                            <FontAwesomeIcon icon={faBrain} size="3x" style={{ marginBottom: '15px', color: '#dfe6e9' }} />
                            <p>支持文字和图片，告诉我你想做什么！</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                            <div className={styles.messageContent}>
                                {msg.isThinking ? (
                                    <span style={{ color: '#0984e3', fontSize: '0.9rem', fontWeight: 600 }}>
                                        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} /> 拼装积木中...
                                    </span>
                                ) : (
                                    <>
                                        {renderFiles(msg)}
                                        {msg.content && <ReactMarkdown>{msg.content}</ReactMarkdown>}
                                        {msg.blocklyXml && msg.role === 'assistant' &&
                                            msg.blocklyXml !== '<xml xmlns="https://developers.google.com/blockly/xml"></xml>' && (
                                                <button className={styles.importBtn} onClick={() => applyXmlToWorkspace(msg.blocklyXml)}>
                                                    <FontAwesomeIcon icon={faDownload} /> 一键导入积木
                                                </button>
                                            )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.inputArea}>
                    {/* 文件预览区域 */}
                    {selectedFiles.length > 0 && (
                        <div className={styles.inputPreviewArea}>
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
                        {/* 隐藏的文件上传Input */}
                        <input
                            type="file" ref={fileInputRef} style={{ display: 'none' }} multiple
                            accept="image/*,text/*,.txt,.md,.pdf,.py"
                            onChange={handleFileSelect}
                        />
                        {/* 附件按钮 */}
                        <button className={styles.attachBtn} onClick={() => fileInputRef.current.click()} title="上传图片或文本">
                            <FontAwesomeIcon icon={faPaperclip} />
                        </button>

                        <input
                            type="text"
                            placeholder="例如：写一个冒泡排序..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />

                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={isSending || (!inputValue.trim() && selectedFiles.length === 0)}
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.workspace}>
                <div className={styles.blocklyArea}>
                    <BlocklyWorkspace
                        toolboxConfiguration={INITIAL_TOOLBOX}
                        initialXml="<xml xmlns='https://developers.google.com/blockly/xml'></xml>"
                        className={styles.blocklyWrapper}
                        workspaceConfiguration={{
                            grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
                            zoom: { controls: true, wheel: true },
                            // 【修改点 3】：仅为 Admin 替换静态资源 CDN 防止 appspot.com 加载超时报错，不影响其他用户
                            ...(isAdmin
                                ? { media: "https://cdn.jsdelivr.net/npm/blockly@9.3.3/media/" }
                                : {}),
                        }}
                        onWorkspaceChange={onWorkspaceChange}
                    />
                </div>

                <div className={styles.codeArea}>
                    <div className={styles.editorSection}>
                        <div className={styles.tabsHeader}>
                            <div
                                className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                <FontAwesomeIcon icon={faCode} /> 整体 Python 源码
                            </div>
                            <div
                                className={`${styles.tab} ${activeTab === 'selected' ? styles.active : ''}`}
                                onClick={() => setActiveTab('selected')}
                            >
                                <FontAwesomeIcon icon={faMousePointer} /> 选中积木解剖
                            </div>
                        </div>
                        <pre className={`${styles.codeContent} ${activeTab === 'selected' ? styles.highlightText : ''}`}>
                            {activeTab === 'all'
                                ? (pythonCode || '# 画布为空，请从上方拖入积木或让 AI 生成')
                                : (selectedBlockCode ? `# 当前块的 Python 语法解析：\n\n${selectedBlockCode}` : '# 点击上方任意积木块\n# 此处将精准展示对应的 Python 语法片段')}
                        </pre>
                    </div>

                    <div className={styles.terminalSection}>
                        <div className={styles.terminalHeader}>
                            <div className={styles.terminalTitle}>
                                <FontAwesomeIcon icon={faTerminal} /> 本地控制台输出
                            </div>
                            <button className={styles.runBtn} onClick={runPythonCode} disabled={isRunning || !pythonCode}>
                                {isRunning ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlay} />}
                                {isRunning ? ' 执行中...' : ' 立即运行'}
                            </button>
                        </div>
                        <pre className={styles.terminalContent}>
                            {terminalOutput}
                            <div ref={terminalEndRef} />
                        </pre>
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
        </div>
    );
};

export default MindPage;