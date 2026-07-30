import React, { useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload,
    faEye,
    faGlobe,
    faSearch,
    faShapes,
    faSpinner,
    faTrash,
    faUser,
    faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { mathvisionApi } from '../../../services/api';
import { config } from '../../../utils/config';
import styles from './SquareGallery.module.css';

const fileNameFromPath = (path, fallback) => (
    (path || '').split(/[\\/]/).filter(Boolean).pop() || fallback
);

const buildPreviewUrl = async (item) => {
    const fileName = fileNameFromPath(
        item.artifactPath,
        item.artifactType === 'html' ? 'mathvision.html' : 'mathvision.mp4',
    );
    const res = await mathvisionApi.get('/download/get/downloadId', {
        params: { path: item.artifactPath, fileName },
    });
    if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取预览凭证失败');
    }
    return `${config.back_base_url}${config.back_MATHVISION_PREFIX}/download/download?mode=inline&path=${encodeURIComponent(item.artifactPath)}&token=${encodeURIComponent(res.data.data)}`;
};

const SquareGallery = ({
    items,
    total,
    loading,
    keyword,
    outputTarget,
    mineOnly,
    actionId,
    onKeyword,
    onOutputTarget,
    onMineOnly,
    onSearch,
    onLoad,
    onUnpublish,
}) => {
    const [previewingId, setPreviewingId] = useState(null);

    const handlePreview = useCallback(async (item) => {
        if (!item?.artifactPath) return;
        setPreviewingId(item.shareId);
        try {
            const url = await buildPreviewUrl(item);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            window.alert(e.response?.data?.message || e.message || '成果预览失败');
        } finally {
            setPreviewingId(null);
        }
    }, []);

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <div>
                    <h2><FontAwesomeIcon icon={faGlobe} /> 创作广场</h2>
                    <p>浏览其他用户公开的教学动画与交互图，并加载为自己工作台中的独立任务。</p>
                </div>
                <span className={styles.total}>{total || 0} 个成果</span>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <input
                        value={keyword}
                        placeholder="搜索成果标题或题目内容"
                        onChange={(event) => onKeyword(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && onSearch()}
                    />
                    <button type="button" onClick={onSearch} title="搜索">
                        <FontAwesomeIcon icon={faSearch} />
                    </button>
                </div>
                <select value={outputTarget} onChange={(event) => onOutputTarget(event.target.value)}>
                    <option value="">全部类型</option>
                    <option value="manim">教学动画</option>
                    <option value="geogebra">交互图</option>
                </select>
                <button
                    type="button"
                    className={`${styles.mineFilter} ${mineOnly ? styles.mineFilterActive : ''}`}
                    role="switch"
                    aria-checked={mineOnly}
                    onClick={() => onMineOnly(!mineOnly)}
                >
                    <span className={styles.mineFilterLabel}>仅看我的分享</span>
                    <span className={styles.mineSwitch} aria-hidden="true">
                        <span className={styles.mineSwitchThumb} />
                    </span>
                </button>
            </div>

            {loading ? (
                <div className={styles.state}><FontAwesomeIcon icon={faSpinner} spin /> 正在加载创作广场...</div>
            ) : items.length === 0 ? (
                <div className={styles.state}>创作广场中还没有符合条件的成果</div>
            ) : (
                <div className={styles.grid}>
                    {items.map((item) => {
                        const isGeoGebra = item.outputTarget === 'geogebra';
                        const busy = actionId === item.shareId;
                        return (
                            <article className={styles.card} key={item.shareId}>
                                <div className={styles.cardTop}>
                                    <span className={styles.typeIcon}>
                                        <FontAwesomeIcon icon={isGeoGebra ? faShapes : faVideo} />
                                    </span>
                                    <span className={styles.typeLabel}>
                                        {isGeoGebra ? 'GeoGebra 交互图' : 'Manim 教学动画'}
                                    </span>
                                    {item.mine && <span className={styles.mine}>我的分享</span>}
                                </div>
                                <h3 title={item.title}>{item.title || '未命名成果'}</h3>
                                <p className={styles.summary}>{item.summary || '作者暂未提供成果说明。'}</p>
                                <div className={styles.meta}>
                                    <span><FontAwesomeIcon icon={faUser} /> {item.authorName || '匿名用户'}</span>
                                    <span>来源 V{item.version}</span>
                                    <span>已加载 {item.loadCount || 0} 次</span>
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.previewBtn}
                                        disabled={!item.artifactPath || previewingId === item.shareId}
                                        onClick={() => handlePreview(item)}
                                    >
                                        <FontAwesomeIcon icon={previewingId === item.shareId ? faSpinner : faEye} spin={previewingId === item.shareId} />
                                        预览成果
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.loadBtn}
                                        disabled={busy}
                                        onClick={() => onLoad(item)}
                                    >
                                        <FontAwesomeIcon icon={busy ? faSpinner : faDownload} spin={busy} />
                                        加载到工作台
                                    </button>
                                    {item.mine && (
                                        <button
                                            type="button"
                                            className={styles.unpublishBtn}
                                            disabled={busy}
                                            onClick={() => onUnpublish(item)}
                                            title="取消分享"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SquareGallery;
