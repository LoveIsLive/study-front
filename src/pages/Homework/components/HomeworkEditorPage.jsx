import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPaperPlane, faMagic, faCloudUploadAlt, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useUploader } from '../../../hooks/useUploader';
import { homeworkApi, attachApi } from '../../../services/api';
import { getFileIcon } from '../../../utils/helpers';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import QuestionBuilder from '../../../components/shared/QuestionEngine/Builder/QuestionBuilder';
// 引入新的侧边栏组件
import AIAssistantPanel from '../../../components/shared/QuestionEngine/Builder/AIAssistantPanel';

import styles from './HomeworkEditorPage.module.css';
import progressStyles from '../../Ware/components/NewItemModal.module.css';

const HomeworkEditorPage = ({ onBack, editingHomework, onSuccess }) => {
    // --- 基础状态 ---
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); // 普通模式: 内容; 结构化模式: 导语/说明
    const [homeworkType, setHomeworkType] = useState('SIMPLE');
    const [questions, setQuestions] = useState([]);

    // --- AI 面板状态 ---
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

    // --- 附件状态 ---
    const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [attachmentIdsToDelete, setAttachmentIdsToDelete] = useState([]);

    const { isUploading, uploadProgress, startUpload, setIsUploading } = useUploader(attachApi);
    const textareaRef = useRef(null);

    const isEditMode = !!editingHomework;

    // --- 初始化 ---
    useEffect(() => {
        if (isEditMode) {
            setTitle(editingHomework.title || '');
            setContent(editingHomework.content || '');
            setExistingAttachments(editingHomework.attachments || []);

            if (editingHomework.type === 'STRUCTURED') {
                setHomeworkType('STRUCTURED');
                if (editingHomework.metaData) {
                    try {
                        const meta = typeof editingHomework.metaData === 'string'
                            ? JSON.parse(editingHomework.metaData)
                            : editingHomework.metaData;
                        setQuestions(meta.questions || []);
                    } catch (e) {
                        console.error("Meta parse error", e);
                        setQuestions([]);
                    }
                }
            }
        }
    }, [isEditMode, editingHomework]);

    // --- 自动增高 ---
    useEffect(() => {
        if (homeworkType === 'SIMPLE' && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, homeworkType]);

    const handleToggleAIPanel = () => {
        const nextState = !isAIPanelOpen;
        setIsAIPanelOpen(nextState);

        // 如果打开面板且当前不是结构化模式，自动切换
        if (nextState && homeworkType !== 'STRUCTURED') {
            setHomeworkType('STRUCTURED');
        }
    };

    // --- AI 逻辑回调 ---
    const handleAIApply = (aiData) => {
        // 1. 自动切换到结构化模式
        setHomeworkType('STRUCTURED');
        // 2. 覆盖数据
        if (aiData.title) setTitle(aiData.title);
        if (aiData.content) setContent(aiData.content);
        if (aiData.questions && aiData.questions.length > 0) {
            setQuestions(aiData.questions);
        }
        // 3. 如果没开面板，稍微提示一下（可选）
    };

    const handleContentChange = (e) => setContent(e.target.value);

    const handleRemoveExistingAttachment = (attachmentId) => {
        setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
        setAttachmentIdsToDelete(prev => [...prev, attachmentId]);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Swal.fire({ toast: true, icon: 'warning', title: '请输入作业标题', position: 'top' });
            return;
        }
        if (homeworkType === 'STRUCTURED' && questions.length === 0) {
            Swal.fire({ toast: true, icon: 'warning', title: '请至少添加一道题目', position: 'top' });
            return;
        }

        try {
            const { smallFiles, largeFileAttachmentIds } = await startUpload(newlyUploadedFiles);

            const dto = {
                title,
                content,
                type: homeworkType,
                attachmentUploadIds: largeFileAttachmentIds,
                attachmentIdsToDelete: attachmentIdsToDelete
            };

            if (homeworkType === 'STRUCTURED') {
                dto.metaData = {
                    totalScore: questions.reduce((acc, q) => acc + (q.score || 0), 0),
                    questions
                };
            }

            const formData = new FormData();
            formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
            smallFiles.forEach(file => formData.append('files', file));

            if (isEditMode) {
                await homeworkApi.put(`/${editingHomework.id}`, formData);
            } else {
                await homeworkApi.post('/publish', formData);
            }

            Swal.fire({ icon: 'success', title: '发布成功', timer: 1500, showConfirmButton: false });
            onSuccess();

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: '操作失败', text: error.response?.data?.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.editorPage}>
            {/* Header */}
            <header className={styles.topBar}>
                <div className={styles.barLeft}>
                    <button onClick={onBack} className={styles.backBtn} title="返回">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <span className={styles.saveStatus}>{isEditMode ? '编辑作业' : '新建作业'}</span>
                </div>
                <div className={styles.barRight}>
                    {/* AI 助手开关：现在可以在顶部直接控制 */}
                    <button
                        className={`${styles.modeBtn} ${isAIPanelOpen ? styles.active : ''}`}
                        onClick={handleToggleAIPanel}
                        title="打开 AI 出题助手"
                    >
                        <FontAwesomeIcon icon={faMagic} style={{ marginRight: 5, color: '#6C5CE7' }} />
                        AI 助手
                    </button>

                    <div className={styles.dividerVertical}></div>

                    <div className={styles.modeSwitcher}>
                        <button
                            className={`${styles.modeBtn} ${homeworkType === 'SIMPLE' ? styles.active : ''}`}
                            onClick={() => setHomeworkType('SIMPLE')}
                        >
                            普通文本
                        </button>
                        <button
                            className={`${styles.modeBtn} ${homeworkType === 'STRUCTURED' ? styles.active : ''}`}
                            onClick={() => setHomeworkType('STRUCTURED')}
                        >
                            结构化出题
                        </button>
                    </div>

                    <div className={styles.dividerVertical}></div>

                    <button className={styles.publishBtn} onClick={handleSubmit} disabled={isUploading}>
                        {isUploading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                        <span>{isUploading ? '发布中' : '发布'}</span>
                    </button>
                </div>
            </header>

            {/* Workspace (Split View) */}
            <div className={`${styles.workspace} ${isAIPanelOpen ? styles.hasPanel : ''}`}>

                {/* Left: Editor Area */}
                <main className={styles.editorArea}>
                    <div className={styles.paper}>
                        {/* 标题 */}
                        <input
                            type="text"
                            className={styles.titleInput}
                            placeholder="作业标题"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                        <div className={styles.metaLine}></div>

                        {/* 内容 / 题目构建器 */}
                        {homeworkType === 'STRUCTURED' ? (
                            <div className={styles.builderWrapper}>
                                <div className={styles.noteSection}>
                                    <label>作业导语 / 说明 (可选)</label>
                                    <textarea
                                        ref={textareaRef}
                                        className={styles.noteInput}
                                        placeholder="在此填写作业说明、注意事项..."
                                        value={content}
                                        onChange={handleContentChange}
                                        rows={2}
                                    />
                                </div>

                                <QuestionBuilder
                                    questions={questions}
                                    setQuestions={setQuestions}
                                    // 传递回调给 Builder，Builder 中的 AI 按钮也可以触发父组件状态
                                    onToggleAIPanel={handleToggleAIPanel}
                                />
                            </div>
                        ) : (
                            <div className={styles.simpleEditor}>
                                <textarea
                                    ref={textareaRef}
                                    className={styles.contentInput}
                                    placeholder="在此输入详细的作业内容..."
                                    value={content}
                                    onChange={handleContentChange}
                                    rows={10}
                                />
                            </div>
                        )}

                        {/* 附件 */}
                        <div className={styles.attachmentSection}>
                            <div className={styles.sectionTitle}>
                                <FontAwesomeIcon icon={faCloudUploadAlt} /> 附件材料
                            </div>
                            {/* ... (附件列表渲染逻辑，保持不变) ... */}
                            {existingAttachments.length > 0 && (
                                <div className={styles.existingFiles}>
                                    {existingAttachments.map(att => (
                                        <div key={att.id} className={styles.fileChip}>
                                            <FontAwesomeIcon icon={getFileIcon(att.fileName).icon} className={getFileIcon(att.fileName).className} />
                                            <span className={styles.fileName} title={att.fileName}>{att.fileName}</span>
                                            <button onClick={() => handleRemoveExistingAttachment(att.id)}><FontAwesomeIcon icon={faTimes} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <FileUpload files={newlyUploadedFiles} onFilesChange={setNewlyUploadedFiles} />
                            {/* ... (上传进度条渲染逻辑，保持不变) ... */}
                            {(isUploading || Object.keys(uploadProgress).length > 0) && (
                                <div className={progressStyles.progressContainer} style={{ marginTop: '15px' }}>
                                    {newlyUploadedFiles.map(file => {
                                        const prog = uploadProgress[file.name] || {};
                                        return (
                                            <div key={file.name} className={progressStyles.progressItem}>
                                                <span style={{ fontSize: '0.8rem' }}>{file.name} - {prog.status}</span>
                                                <div className={progressStyles.progressBarBg}>
                                                    <div className={progressStyles.progressBarFg} style={{ width: `${prog.percent}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Right: AI Panel */}
                <AIAssistantPanel
                    isOpen={isAIPanelOpen}
                    onClose={() => setIsAIPanelOpen(false)}
                    onApplyHomework={handleAIApply}
                    currentHomework={{ title, content, questions, type: homeworkType }}
                />
            </div>
        </div>
    );
};

export default HomeworkEditorPage;