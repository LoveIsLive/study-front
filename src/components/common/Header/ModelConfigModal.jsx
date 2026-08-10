import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faSpinner, faTrash, faVial, faPen, faPlus } from '@fortawesome/free-solid-svg-icons';
import { mathvisionApi } from '../../../services/api';
import Modal from '../Modal/Modal';
import styles from './ModelConfigModal.module.css';

const STATUS_LABEL = {
    enabled: { text: '已配置', cls: 'enabled' },
    invalid: { text: '无效', cls: 'invalid' },
    disabled: { text: '已禁用', cls: 'disabled' },
    not_configured: { text: '未配置', cls: 'notConfigured' },
};

const COMPATIBILITY_LABEL = {
    openai: 'OpenAI 兼容',
    anthropic: 'Anthropic 兼容',
    google: 'Gemini 兼容',
};

const BASE_URL_PLACEHOLDER = {
    openai: '按厂商文档填写，例如：https://api.openai.com/v1',
    anthropic: '按厂商文档填写，例如：https://api.anthropic.com/v1',
    google: '按厂商文档填写，例如：https://generativelanguage.googleapis.com/v1beta',
};

const BASE_URL_ENDPOINT_HINT = {
    openai: '/chat/completions',
    anthropic: '/messages',
    google: '/models/{model}:generateContent',
};

const ProviderRow = ({ info, onChanged, onEditCustom }) => {
    const [editing, setEditing] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const status = STATUS_LABEL[info.status] || STATUS_LABEL.not_configured;

    const handleSave = async () => {
        if (!apiKey.trim()) return;
        setSaving(true);
        try {
            await mathvisionApi.put(`/llm/providers/${info.providerCode}/credential`, { apiKey: apiKey.trim() });
            setEditing(false);
            setApiKey('');
            setShowKey(false);
            await onChanged();
        } catch (e) {
            Swal.fire({ icon: 'error', title: '保存失败', text: e.response?.data?.message || '请稍后重试' });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const res = await mathvisionApi.post(`/llm/providers/${info.providerCode}/credential/test`);
            const data = res.data.data;
            Swal.fire({
                icon: data.success ? 'success' : 'error',
                title: data.success ? 'API Key 可用' : '测试未通过',
                text: data.message || '',
            });
            await onChanged();
        } catch (e) {
            Swal.fire({ icon: 'error', title: '测试失败', text: e.response?.data?.message || '请稍后重试' });
        } finally {
            setTesting(false);
        }
    };

    const handleDelete = async () => {
        const confirm = await Swal.fire({
            icon: 'warning', title: `删除 ${info.providerName} 的 API Key?`,
            text: '历史任务不受影响, 但该厂家将无法用于新任务。',
            showCancelButton: true, confirmButtonText: '删除', cancelButtonText: '取消',
            confirmButtonColor: '#dc3545',
        });
        if (!confirm.isConfirmed) return;
        try {
            await mathvisionApi.delete(`/llm/providers/${info.providerCode}/credential`);
            await onChanged();
        } catch (e) {
            Swal.fire({ icon: 'error', title: '删除失败', text: e.response?.data?.message || '请稍后重试' });
        }
    };

    return (
        <div className={styles.row}>
            <div className={styles.rowHead}>
                <div className={styles.providerMeta}>
                    <span className={styles.providerName}>{info.providerName}</span>
                    <span className={`${styles.badge} ${styles[status.cls]}`}>{status.text}</span>
                </div>
                <div className={styles.actions}>
                    {info.configured && (
                        <button className={styles.iconBtn} title="测试" onClick={handleTest} disabled={testing}>
                            <FontAwesomeIcon icon={testing ? faSpinner : faVial} spin={testing} />
                        </button>
                    )}
                    <button
                        className={styles.iconBtn}
                        title={info.configured ? '更新' : '配置'}
                        onClick={() => info.custom ? onEditCustom(info) : setEditing(!editing)}
                    >
                        <FontAwesomeIcon icon={info.configured ? faPen : faPlus} />
                    </button>
                    {info.configured && (
                        <button className={`${styles.iconBtn} ${styles.danger}`} title="删除" onClick={handleDelete}>
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    )}
                </div>
            </div>
            {info.configured && !editing && (
                <div className={styles.configSummary}>
                    <span className={styles.maskedKey}>{info.apiKeyMasked}</span>
                    {info.custom && (
                        <>
                            <span>{COMPATIBILITY_LABEL[info.compatibilityType] || info.compatibilityType}</span>
                            <span>{info.modelName}</span>
                            <span className={styles.baseUrl}>{info.baseUrl}</span>
                        </>
                    )}
                </div>
            )}
            {editing && !info.custom && (
                <div className={styles.editArea}>
                    <div className={styles.keyInputWrap}>
                        <input
                            type={showKey ? 'text' : 'password'}
                            className={styles.keyInput}
                            placeholder="输入 API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            autoFocus
                        />
                        <FontAwesomeIcon
                            icon={showKey ? faEyeSlash : faEye}
                            className={styles.eyeIcon}
                            onClick={() => setShowKey(!showKey)}
                        />
                    </div>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !apiKey.trim()}>
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            )}
        </div>
    );
};

const CustomProviderForm = ({ initial, onCancel, onSaved }) => {
    const editing = Boolean(initial?.providerCode);
    const [form, setForm] = useState({
        providerName: initial?.providerName || '',
        compatibilityType: initial?.compatibilityType || 'openai',
        baseUrl: initial?.baseUrl || '',
        apiKey: '',
        modelName: initial?.modelName || '',
        supportVision: Boolean(initial?.supportVision),
        contextWindow: initial?.contextWindow || 128000,
        maxOutputTokens: initial?.maxOutputTokens || 16384,
        temperature: initial?.temperature ?? '',
        topP: initial?.topP ?? '',
    });
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);

    const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleSave = async () => {
        if (!form.providerName.trim() || !form.baseUrl.trim() || !form.modelName.trim()) {
            Swal.fire({ icon: 'warning', title: '请完整填写厂家名称、Base URL 和模型名称' });
            return;
        }
        if (!editing && !form.apiKey.trim()) {
            Swal.fire({ icon: 'warning', title: '请输入 API Key' });
            return;
        }
        const contextWindow = Number(form.contextWindow);
        const maxOutputTokens = Number(form.maxOutputTokens);
        if (contextWindow < 1024 || maxOutputTokens < 256 || maxOutputTokens > contextWindow) {
            Swal.fire({ icon: 'warning', title: '请检查 Token 配置', text: '最大输出不能大于上下文窗口。' });
            return;
        }

        const payload = {
            providerName: form.providerName.trim(),
            compatibilityType: form.compatibilityType,
            baseUrl: form.baseUrl.trim(),
            apiKey: form.apiKey.trim() || undefined,
            modelName: form.modelName.trim(),
            supportVision: form.supportVision,
            contextWindow,
            maxOutputTokens,
            temperature: form.temperature === '' ? undefined : Number(form.temperature),
            topP: form.topP === '' ? undefined : Number(form.topP),
        };

        setSaving(true);
        try {
            if (editing) {
                await mathvisionApi.put(`/llm/providers/${initial.providerCode}/custom`, payload);
            } else {
                await mathvisionApi.post('/llm/providers/custom', payload);
            }
            await onSaved();
        } catch (e) {
            Swal.fire({ icon: 'error', title: '保存失败', text: e.response?.data?.message || '请稍后重试' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.customForm}>
            <div className={styles.customFormTitle}>{editing ? '编辑其他模型服务' : '添加其他模型服务'}</div>
            <div className={styles.formGrid}>
                <label className={styles.formField}>
                    <span>厂家名称</span>
                    <input value={form.providerName} onChange={(e) => change('providerName', e.target.value)} placeholder="例如：硅基流动" />
                </label>
                <label className={styles.formField}>
                    <span>兼容协议</span>
                    <select value={form.compatibilityType} onChange={(e) => change('compatibilityType', e.target.value)}>
                        <option value="openai">OpenAI 兼容</option>
                        <option value="anthropic">Anthropic 兼容</option>
                        <option value="google">Google Gemini 兼容</option>
                    </select>
                </label>
                <label className={`${styles.formField} ${styles.fullWidth}`}>
                    <span>Base URL</span>
                    <input
                        value={form.baseUrl}
                        onChange={(e) => change('baseUrl', e.target.value)}
                        placeholder={BASE_URL_PLACEHOLDER[form.compatibilityType] || BASE_URL_PLACEHOLDER.openai}
                    />
                    <small>
                        版本路径（如 /v1、/v1beta）按厂商文档填写；系统会自动拼接
                        {' '}{BASE_URL_ENDPOINT_HINT[form.compatibilityType]}。
                    </small>
                </label>
                <label className={`${styles.formField} ${styles.fullWidth}`}>
                    <span>API Key {editing && <small>留空表示保留当前 Key</small>}</span>
                    <div className={styles.keyInputWrap}>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={form.apiKey}
                            onChange={(e) => change('apiKey', e.target.value)}
                            placeholder={editing ? '留空表示不修改' : '输入 API Key'}
                        />
                        <FontAwesomeIcon icon={showKey ? faEyeSlash : faEye} className={styles.eyeIcon} onClick={() => setShowKey(!showKey)} />
                    </div>
                </label>
                <label className={styles.formField}>
                    <span>模型名称</span>
                    <input value={form.modelName} onChange={(e) => change('modelName', e.target.value)} placeholder="例如：deepseek-chat" />
                </label>
                <label className={styles.checkField}>
                    <input type="checkbox" checked={form.supportVision} onChange={(e) => change('supportVision', e.target.checked)} />
                    <span>支持图片输入</span>
                </label>
                <label className={styles.formField}>
                    <span>上下文窗口</span>
                    <input type="number" min="1024" value={form.contextWindow} onChange={(e) => change('contextWindow', e.target.value)} />
                </label>
                <label className={styles.formField}>
                    <span>最大输出 Token</span>
                    <input type="number" min="256" value={form.maxOutputTokens} onChange={(e) => change('maxOutputTokens', e.target.value)} />
                </label>
                <label className={styles.formField}>
                    <span>Temperature（可选）</span>
                    <input type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => change('temperature', e.target.value)} placeholder="使用系统默认值" />
                </label>
                <label className={styles.formField}>
                    <span>Top P（可选）</span>
                    <input type="number" min="0.01" max="1" step="0.01" value={form.topP} onChange={(e) => change('topP', e.target.value)} placeholder="使用系统默认值" />
                </label>
            </div>
            <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>取消</button>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '保存配置'}
                </button>
            </div>
        </div>
    );
};

const ModelConfigModal = ({ isOpen, onClose }) => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [customEditing, setCustomEditing] = useState(null);

    const loadProviders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await mathvisionApi.get('/llm/providers');
            setProviders(res.data.data || []);
        } catch (e) {
            Swal.fire({ icon: 'error', title: '加载失败', text: e.response?.data?.message || '请稍后重试' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) loadProviders();
        else setCustomEditing(null);
    }, [isOpen, loadProviders]);

    return (
        <Modal show={isOpen} onClose={onClose} title="模型配置" size="large">
            <p className={styles.hint}>为各模型厂家配置 API Key。仅展示脱敏值, 系统不会返回明文。</p>
            <div className={styles.modalBody}>
                {loading ? (
                    <div className={styles.loading}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>
                ) : (
                    customEditing ? (
                        <CustomProviderForm
                            key={customEditing.providerCode || 'new'}
                            initial={customEditing}
                            onCancel={() => setCustomEditing(null)}
                            onSaved={async () => {
                                setCustomEditing(null);
                                await loadProviders();
                            }}
                        />
                    ) : (
                        <div className={styles.list}>
                            {providers.map((p) => (
                                <ProviderRow
                                    key={p.providerCode}
                                    info={p}
                                    onChanged={loadProviders}
                                    onEditCustom={setCustomEditing}
                                />
                            ))}
                            <button type="button" className={styles.otherRow} onClick={() => setCustomEditing({})}>
                                <span>
                                    <strong>其他</strong>
                                    <small>添加 OpenAI、Anthropic 或 Gemini 兼容模型服务</small>
                                </span>
                                <span className={styles.otherPlus}><FontAwesomeIcon icon={faPlus} /></span>
                            </button>
                        </div>
                    )
                )}
            </div>
        </Modal>
    );
};

export default ModelConfigModal;
