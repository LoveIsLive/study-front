import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { mathvisionApi } from '../../../services/api';
import useMathVisionStore from '../../../store/mathvisionStore';
import { useUploader } from '../../../hooks/useUploader';
import Modal from '../../../components/common/Modal/Modal';
import FileUpload from '../../../components/shared/FileUpload/FileUpload';
import styles from './CreateTaskModal.module.css';

const CreateTaskModal = ({ isOpen, onClose, onCreated }) => {
    const createTask = useMathVisionStore((s) => s.createTask);
    const { startUpload, uploadProgress, isUploading } = useUploader(mathvisionApi);

    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState('manual');
    const [outputTarget, setOutputTarget] = useState('manim');
    const [providerCode, setProviderCode] = useState('');
    const [modelName, setModelName] = useState('');
    const [files, setFiles] = useState([]);

    const [providers, setProviders] = useState([]);
    const [models, setModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 是否包含图片输入 -> 决定模型是否需要视觉能力
    const hasImage = files.some((f) => (f.type || '').startsWith('image/'));

    const resetForm = useCallback(() => {
        setMessage(''); setTitle(''); setMode('manual'); setOutputTarget('manim');
        setProviderCode(''); setModelName(''); setFiles([]);
        setModels([]); setSubmitting(false);
    }, []);

    // 打开时加载供应商列表
    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const res = await mathvisionApi.get('/llm/providers');
                if (res.data.code === 200) {
                    const list = (res.data.data || []).filter((p) => p.configured && p.status === 'enabled');
                    setProviders(list);
                    if (list.length && !providerCode) setProviderCode(list[0].providerCode);
                }
            } catch (e) {
                Swal.fire({ icon: 'error', title: '加载供应商失败', text: e.response?.data?.message || '请稍后重试' });
            }
        })();
    }, [isOpen]);

    // 供应商变化 -> 拉该厂模型
    useEffect(() => {
        if (!isOpen || !providerCode) return;
        setLoadingModels(true);
        setModelName('');
        (async () => {
            try {
                const res = await mathvisionApi.get(`/llm/providers/${providerCode}/models`);
                if (res.data.code === 200) {
                    setModels(res.data.data?.models || []);
                }
            } catch (e) {
                setModels([]);
            } finally {
                setLoadingModels(false);
            }
        })();
    }, [providerCode, isOpen]);

    // 有图片时可选模型仅限支持视觉的
    const selectableModels = hasImage ? models.filter((m) => m.supportVision) : models;

    const handleClose = () => { resetForm(); onClose(); };

    const handleSubmit = async () => {
        if (!message.trim()) { Swal.fire({ icon: 'warning', title: '请输入任务描述' }); return; }
        if (!providerCode) { Swal.fire({ icon: 'warning', title: '请选择模型厂家' }); return; }
        if (!modelName) { Swal.fire({ icon: 'warning', title: '请选择模型' }); return; }

        setSubmitting(true);
        try {
            // 小文件随请求作为 multipart files 上传; 大文件先分块上传, 以 uploadFiles 引用其存储路径
            const { smallFiles, largeFileAttachmentIds } = await startUpload(files);
            const uploadFiles = (largeFileAttachmentIds || []).map((f) => ({
                fileName: f.fileName,
                filePath: f.filePath,
            }));

            const request = {
                message: message.trim(),
                title: title.trim() || undefined,
                mode,
                outputTarget,
                providerCode,
                modelName,
                uploadFiles,
                requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                autoStart: mode === 'auto',
            };

            const formData = new FormData();
            formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
            (smallFiles || []).forEach((f) => formData.append('files', f));

            const created = await createTask(formData);
            resetForm();
            onCreated?.(created?.taskId);
        } catch (e) {
            Swal.fire({ icon: 'error', title: '创建失败', text: e.response?.data?.message || e.message || '请稍后重试' });
            setSubmitting(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="新建教学动画任务" size="large">
            <div className={styles.form}>
                <div className={styles.field}>
                    <label>任务描述 <span className={styles.req}>*</span></label>
                    <textarea
                        className={styles.textarea}
                        rows={3}
                        placeholder="描述你想生成的教学内容，例如：讲解勾股定理的教学动画"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className={styles.field}>
                    <label>任务标题</label>
                    <input
                        className={styles.input}
                        placeholder="留空则自动从描述截取"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className={styles.field}>
                    <label>题图 / 附件</label>
                    <FileUpload files={files} onFilesChange={setFiles} />
                    {hasImage && (
                        <small className={styles.tip}>已选择图片，仅可选支持视觉输入的模型。</small>
                    )}
                    {isUploading && Object.keys(uploadProgress).length > 0 && (
                        <div className={styles.progressList}>
                            {Object.entries(uploadProgress).map(([name, p]) => (
                                <div key={name} className={styles.progressItem}>
                                    <span className={styles.progressName}>{name}</span>
                                    <span className={p.error ? styles.progressErr : styles.progressStatus}>
                                        {p.status || `${p.percent || 0}%`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.row}>
                    <div className={styles.field}>
                        <label>生成模式</label>
                        <div className={styles.segment}>
                            <button
                                type="button"
                                className={mode === 'manual' ? styles.segActive : styles.seg}
                                onClick={() => setMode('manual')}
                            >手动模式</button>
                            <button
                                type="button"
                                className={mode === 'auto' ? styles.segActive : styles.seg}
                                onClick={() => setMode('auto')}
                            >自动模式</button>
                        </div>
                    </div>
                    <div className={styles.field}>
                        <label>输出目标</label>
                        <div className={styles.segment}>
                            <button
                                type="button"
                                className={outputTarget === 'manim' ? styles.segActive : styles.seg}
                                onClick={() => setOutputTarget('manim')}
                            >Manim 视频</button>
                            <button
                                type="button"
                                className={outputTarget === 'geogebra' ? styles.segActive : styles.seg}
                                onClick={() => setOutputTarget('geogebra')}
                            >GeoGebra 交互图</button>
                        </div>
                    </div>
                </div>

                <div className={styles.row}>
                    <div className={styles.field}>
                        <label>模型厂家 <span className={styles.req}>*</span></label>
                        {providers.length === 0 ? (
                            <div className={styles.emptyHint}>
                                暂无已配置的厂家，请先在「模型配置」中设置 API Key。
                            </div>
                        ) : (
                            <select
                                className={styles.input}
                                value={providerCode}
                                onChange={(e) => setProviderCode(e.target.value)}
                            >
                                {providers.map((p) => (
                                    <option key={p.providerCode} value={p.providerCode}>{p.providerName}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className={styles.field}>
                        <label>模型 <span className={styles.req}>*</span></label>
                        <select
                            className={styles.input}
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            disabled={loadingModels || !providerCode}
                        >
                            <option value="">{loadingModels ? '加载中...' : '请选择模型'}</option>
                            {selectableModels.map((m) => (
                                <option key={m.modelName} value={m.modelName}>
                                    {m.displayName || m.modelName}{m.supportVision ? ' 👁' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
                        取消
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting
                            ? (<><FontAwesomeIcon icon={faSpinner} spin /> {isUploading ? '上传文件中...' : '创建中...'}</>)
                            : '创建任务'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CreateTaskModal;
