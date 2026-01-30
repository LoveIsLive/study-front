import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faSpinner, faMagic, faTimes, faCheck, faRobot } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import ReactMarkdown from 'react-markdown';
import { baseApi } from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import Modal from '../../../../components/common/Modal/Modal';
import styles from './AIHomeworkModal.module.css';

// 简单的文件卡片组件
const FileChip = ({ file, onRemove }) => (
    <div className={styles.fileChip}>
        <span className={styles.fileName}>{file.name}</span>
        <button onClick={onRemove} className={styles.removeBtn}>&times;</button>
    </div>
);

const AIHomeworkModal = ({ isOpen, onClose, onApplyQuestions }) => {
    const { token } = useAuthStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [files, setFiles] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // 初始化会话
    useEffect(() => {
        if (isOpen && !sessionId) {
            setSessionId(crypto.randomUUID());
            setMessages([{
                role: 'assistant',
                type: 'text',
                content: '你好！我是你的出题助手。你可以上传教材图片、文档，或者直接告诉我你想出什么题（例如："出5道关于光合作用的单选题，难度中等"）。'
            }]);
        }
    }, [isOpen, sessionId]);

    // 滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files);
        // 简单限制大小
        const validFiles = selected.filter(f => f.size < 10 * 1024 * 1024);
        if (validFiles.length < selected.length) Swal.fire('提示', '部分文件超过10MB已被忽略', 'warning');
        setFiles(prev => [...prev, ...validFiles]);
        e.target.value = '';
    };

    const handleSend = async () => {
        if ((!input.trim() && files.length === 0) || isSending) return;

        const currentFiles = [...files];
        const userMsg = { role: 'user', content: input, files: currentFiles, type: 'text' };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setFiles([]);
        setIsSending(true);

        const formData = new FormData();
        const requestDTO = {
            sessionId: sessionId,
            message: input || '请分析文件并出题',
            scene: 'homework-gen',
            type: 'agent' // 关键：使用 agent 模式以触发工具
        };
        formData.append('request', new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }));
        currentFiles.forEach(f => formData.append('files', f));

        try {
            const res = await baseApi.post('/llm/chat/agent', formData);
            const data = res.data.data; // ChatCompletionMessage

            // 解析返回消息
            let aiMsg = { role: 'assistant', type: 'text', content: '' };

            if (data.tool_calls && data.tool_calls.length > 0) {
                // 查找作业生成工具调用
                const genTool = data.tool_calls.find(t => t.function.name === 'HomeworkGenerationTool');
                if (genTool) {
                    const args = JSON.parse(genTool.function.arguments);
                    aiMsg = {
                        role: 'assistant',
                        type: 'generated_homework',
                        content: '题目已生成，请查看下方预览。',
                        homeworkData: args
                    };
                } else {
                    // 可能是 ReplayTool
                    const replayTool = data.tool_calls.find(t => t.function.name === 'ReplayTool');
                    if (replayTool) {
                        const args = JSON.parse(replayTool.function.arguments);
                        aiMsg.content = args.message;
                    } else {
                        aiMsg.content = data.content || '处理完成';
                    }
                }
            } else {
                aiMsg.content = data.content || '抱歉，我没有理解你的意图，请重试。';
            }

            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', type: 'error', content: '生成失败，请稍后重试。' }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleImport = (homeworkData) => {
        // 转换 Tool 数据格式为 QuestionEngine 格式
        const mappedQuestions = homeworkData.questions.map(q => {
            // 1. 在这里生成题目 ID
            const questionId = crypto.randomUUID();

            const base = {
                id: questionId, // <--- 补全题目 ID
                type: q.type,
                title: q.title,
                score: q.score || 5,
                analysis: q.analysis,
                aiGradingCriteria: q.aiGradingCriteria,
                required: true
            };

            if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') {
                // 2. 处理选项并生成选项 ID
                base.options = q.options.map(opt => ({
                    id: crypto.randomUUID(), // <--- 补全选项 ID
                    label: opt.label,
                    text: opt.text
                }));

                // 3. 映射正确答案: Label -> Option ID
                // 后端现在返回的是 List<String> (e.g., ["A"] or ["A", "B"])
                const correctLabels = q.correctAnswer || [];

                if (q.type === 'SINGLE_CHOICE') {
                    // 单选：找出对应的 Option ID 字符串
                    const label = correctLabels[0];
                    const targetOpt = base.options.find(o => o.label === label);
                    base.correctAnswer = targetOpt ? targetOpt.id : '';
                } else {
                    // 多选：找出对应的 Option ID 数组
                    base.correctAnswer = base.options
                        .filter(o => correctLabels.includes(o.label))
                        .map(o => o.id);
                }
            } else {
                // 简答题：直接取数组第一个元素作为文本
                // 兼容处理：如果是数组取第一个，如果是字符串直接用
                base.correctAnswer = Array.isArray(q.correctAnswer)
                    ? (q.correctAnswer[0] || '')
                    : (q.correctAnswer || '');
                base.options = [];
            }
            return base;
        });

        onApplyQuestions(mappedQuestions);
        onClose();
        Swal.fire({ icon: 'success', title: `成功导入 ${mappedQuestions.length} 道题目`, toast: true, position: 'top', timer: 2000, showConfirmButton: false });
    };

    if (!isOpen) return null;

    return (
        <Modal show={isOpen} onClose={onClose} title="AI 智能出题助手" size="large">
            <div className={styles.container}>
                <div className={styles.chatArea}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.ai}`}>
                            <div className={styles.bubble}>
                                {msg.role === 'assistant' && <FontAwesomeIcon icon={faRobot} className={styles.aiIcon} />}
                                <div className={styles.content}>
                                    {msg.type === 'text' && <ReactMarkdown>{msg.content}</ReactMarkdown>}
                                    {msg.type === 'error' && <span style={{ color: 'red' }}>{msg.content}</span>}

                                    {/* 题目预览卡片 */}
                                    {msg.type === 'generated_homework' && (
                                        <div className={styles.previewCard}>
                                            <div className={styles.previewHeader}>
                                                <strong>已生成: {msg.homeworkData.title || '未命名作业'}</strong>
                                                <span className={styles.badge}>{msg.homeworkData.questions?.length || 0} 题</span>
                                            </div>
                                            <div className={styles.previewList}>
                                                {msg.homeworkData.questions?.slice(0, 3).map((q, i) => (
                                                    <div key={i} className={styles.previewItem}>
                                                        <span className={styles.qType}>[{q.type}]</span> {q.title}
                                                    </div>
                                                ))}
                                                {(msg.homeworkData.questions?.length > 3) && <div style={{ textAlign: 'center', color: '#888' }}>...</div>}
                                            </div>
                                            <button
                                                className={styles.importBtn}
                                                onClick={() => handleImport(msg.homeworkData)}
                                            >
                                                <FontAwesomeIcon icon={faCheck} /> 确认应用到作业
                                            </button>
                                        </div>
                                    )}

                                    {/* 显示用户上传的文件 */}
                                    {msg.files && msg.files.length > 0 && (
                                        <div className={styles.msgFiles}>
                                            {msg.files.map((f, i) => <span key={i} className={styles.msgFileTag}>📄 {f.name}</span>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isSending && <div className={styles.loading}><FontAwesomeIcon icon={faSpinner} spin /> 正在思考...</div>}
                    <div ref={messagesEndRef}></div>
                </div>

                <div className={styles.inputArea}>
                    {files.length > 0 && (
                        <div className={styles.fileList}>
                            {files.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} />)}
                        </div>
                    )}
                    <div className={styles.inputRow}>
                        <button className={styles.attachBtn} onClick={() => fileInputRef.current.click()} title="上传教材/文档">
                            <FontAwesomeIcon icon={faPaperclip} />
                        </button>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                            accept="image/*, .pdf, .txt, .doc, .docx"
                        />
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="输入出题要求，例如：'根据上传的图片出3道多选题'..."
                            className={styles.textarea}
                            rows={1}
                        />
                        <button className={styles.sendBtn} onClick={handleSend} disabled={isSending || (!input.trim() && files.length === 0)}>
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AIHomeworkModal;