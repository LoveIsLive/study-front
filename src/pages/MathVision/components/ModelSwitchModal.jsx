import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../../components/common/Modal/Modal';
import { mathvisionApi } from '../../../services/api';
import styles from './ModelSwitchModal.module.css';

const ModelSwitchModal = ({ show, onClose, task, onUpdate }) => {
    const [providers, setProviders] = useState([]);
    const [models, setModels] = useState([]);
    const [providerCode, setProviderCode] = useState('');
    const [modelName, setModelName] = useState('');
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);
    const [saving, setSaving] = useState(false);
    const hasImage = useMemo(() => (
        (task?.inputAssets || []).some((asset) => (asset.mimeTypeName || '').startsWith('image/'))
    ), [task?.inputAssets]);

    useEffect(() => {
        if (!show || !task) return;
        setProviderCode(task.providerCode || '');
        setModelName(task.modelName || '');
        setLoadingProviders(true);
        mathvisionApi.get('/llm/providers')
            .then((res) => {
                if (res.data.code === 200) {
                    setProviders(res.data.data || []);
                }
            })
            .catch(() => setProviders([]))
            .finally(() => setLoadingProviders(false));
    }, [show, task?.taskId, task?.providerCode, task?.modelName]);

    useEffect(() => {
        if (!show || !providerCode) {
            setModels([]);
            return;
        }
        let active = true;
        setLoadingModels(true);
        mathvisionApi.get(`/llm/providers/${providerCode}/models`)
            .then((res) => {
                if (!active) return;
                const available = (res.data.code === 200 ? res.data.data?.models : []) || [];
                const compatible = hasImage ? available.filter((model) => model.supportVision) : available;
                setModels(compatible);
                setModelName((current) => {
                    if (providerCode === task?.providerCode
                        && compatible.some((model) => model.modelName === task?.modelName)) {
                        return task.modelName;
                    }
                    return compatible.some((model) => model.modelName === current) ? current : '';
                });
            })
            .catch(() => active && setModels([]))
            .finally(() => active && setLoadingModels(false));
        return () => { active = false; };
    }, [show, providerCode, hasImage, task?.providerCode, task?.modelName]);

    if (!task) return null;

    const selectedProvider = providers.find((provider) => provider.providerCode === providerCode);
    const changed = providerCode !== task.providerCode || modelName !== task.modelName;
    const canApply = changed
        && Boolean(modelName)
        && selectedProvider?.configured
        && selectedProvider?.status === 'enabled'
        && !saving;

    const handleClose = () => {
        if (!saving) onClose();
    };

    const handleApply = async () => {
        if (!canApply || !onUpdate) return;
        setSaving(true);
        try {
            await onUpdate(task.taskId, { providerCode, modelName });
            onClose();
            Swal.fire({
                icon: 'success',
                title: '模型已切换',
                text: '当前阶段不会被中断，新模型将在下一阶段运行时生效。',
                timer: 1900,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: '切换模型失败',
                text: error.response?.data?.message || error.message || '请稍后重试',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={show} onClose={handleClose} title="切换模型">
            <div className={styles.form}>
                <div className={styles.currentModel}>
                    <FontAwesomeIcon icon={faRobot} />
                    <div>
                        <span>当前模型</span>
                        <strong>{task.providerName || task.providerCode} / {task.modelName}</strong>
                    </div>
                </div>

                <div className={styles.field}>
                    <label>模型厂家</label>
                    <select
                        value={providerCode}
                        disabled={loadingProviders || saving}
                        onChange={(event) => {
                            setProviderCode(event.target.value);
                            setModelName('');
                        }}
                    >
                        {providers.map((provider) => (
                            <option
                                key={provider.providerCode}
                                value={provider.providerCode}
                                disabled={!provider.configured || provider.status !== 'enabled'}
                            >
                                {provider.providerName}
                                {!provider.configured ? '（未配置）' : provider.status !== 'enabled' ? '（不可用）' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.field}>
                    <label>模型</label>
                    <select
                        value={modelName}
                        disabled={!providerCode || loadingModels || saving}
                        onChange={(event) => setModelName(event.target.value)}
                    >
                        <option value="">{loadingModels ? '加载模型中...' : '请选择模型'}</option>
                        {models.map((model) => (
                            <option key={model.modelName} value={model.modelName}>
                                {model.displayName || model.modelName}
                                {model.supportVision ? '（支持视觉）' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {hasImage && <div className={styles.hint}>当前任务包含图片，只显示支持视觉输入的模型。</div>}
                <div className={styles.effectHint}>切换不会影响正在运行的阶段，将从下一阶段开始使用。</div>

                <div className={styles.actions}>
                    <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={saving}>
                        取消
                    </button>
                    <button type="button" className={styles.applyButton} onClick={handleApply} disabled={!canApply}>
                        {saving ? <><FontAwesomeIcon icon={faSpinner} spin /> 切换中...</> : '应用模型'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModelSwitchModal;
