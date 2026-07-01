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

const ProviderRow = ({ info, onChanged }) => {
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
                    <button className={styles.iconBtn} title={info.configured ? '更新' : '配置'} onClick={() => setEditing(!editing)}>
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
                <div className={styles.maskedKey}>{info.apiKeyMasked}</div>
            )}
            {editing && (
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
const ModelConfigModal = ({ isOpen, onClose }) => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);

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
    }, [isOpen, loadProviders]);

    return (
        <Modal show={isOpen} onClose={onClose} title="模型配置">
            <p className={styles.hint}>为各模型厂家配置 API Key。仅展示脱敏值, 系统不会返回明文。</p>
            {loading ? (
                <div className={styles.loading}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>
            ) : (
                <div className={styles.list}>
                    {providers.map((p) => (
                        <ProviderRow key={p.providerCode} info={p} onChanged={loadProviders} />
                    ))}
                </div>
            )}
        </Modal>
    );
};

export default ModelConfigModal;
