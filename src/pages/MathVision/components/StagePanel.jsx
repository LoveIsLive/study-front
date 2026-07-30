import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faCircleInfo,
    faCode,
    faDownload,
    faFileVideo,
    faImage,
    faMagic,
    faPenToSquare,
    faPlay,
    faPlus,
    faRotateRight,
    faSave,
    faBan,
    faSpinner,
    faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { mathvisionApi } from '../../../services/api';
import { config } from '../../../utils/config';
import styles from './StagePanel.module.css';

const EDITABLE_STAGES = new Set([
    'problem_normalization',
    'reasoning_graph',
    'visual_storyboard',
    'code_generation',
]);

const AUTO_EDIT_STAGE_CONFIG = {
    problem_normalization: {
        title: '题目识别自动编辑',
        regeneration: '完整题目规范化产物',
        placeholder: '例如：保留原题信息，将题目表述整理得更清晰，并修正图形中点、线段和已知条件的识别结果。',
    },
    reasoning_graph: {
        title: '解题步骤自动编辑',
        regeneration: '完整解题步骤和数学补充内容',
        placeholder: '例如：保留现有结论，将辅助线构造提前，并把第三步拆成两个更适合教学展示的推导步骤。',
    },
    visual_storyboard: {
        title: 'Storyboard 自动编辑',
        regeneration: '全部 storyboard 场景',
        placeholder: '例如：每个场景都保留原有数学结论，增加辅助线 OP，并加强第二场景对半径关系的讲解。',
    },
    code_generation: {
        title: '代码自动编辑',
        regeneration: '完整代码和其中的全部场景',
        placeholder: '例如：保留当前动画内容，放慢关键推导节奏，修正公式排版，并统一辅助线和重点对象的配色。',
    },
};

const resolveCodeOutputMode = (draft = {}, task = {}) => {
    const target = String(task?.outputTarget || draft.outputTarget || '').toLowerCase();
    const format = String(draft.artifactFormat || '').toLowerCase();
    if (target === 'geogebra' || format.includes('geogebra')) {
        return {
            target: 'geogebra',
            title: 'GeoGebra 交互图',
            editorLabel: 'GeoGebra 代码',
            formatLabel: draft.artifactFormat || 'geogebra_commands',
        };
    }
    return {
        target: 'manim',
        title: 'Manim 视频',
        editorLabel: 'Manim Python 代码',
        formatLabel: draft.artifactFormat || 'python',
    };
};

const prettyJson = (value) => JSON.stringify(value ?? {}, null, 2);
const parseJson = (text) => (!text || !text.trim() ? {} : JSON.parse(text));
const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}`;
const safeParseJson = (text) => {
    try {
        return parseJson(text);
    } catch (e) {
        return {};
    }
};
const fileNameFromPath = (path, fallback = 'mathvision-result') => {
    const name = (path || '').split(/[\\/]/).filter(Boolean).pop();
    return name || fallback;
};
const resolveArtifactPath = (artifact = {}, task = {}) => (
    artifact.artifactPath
    || artifact.storageArtifactPath
    || artifact.videoPath
    || task.finalArtifactPath
    || ''
);
const resolveArtifactType = (artifact = {}, task = {}) => (
    artifact.artifactType
    || task.finalArtifactType
    || (artifact.outputTarget === 'geogebra' ? 'html' : 'mp4')
);
const buildDownloadUrl = async (path, fileName, mode = 'attachment') => {
    const res = await mathvisionApi.get('/download/get/downloadId', {
        params: { path, fileName },
    });
    if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取下载凭证失败');
    }
    const token = res.data.data;
    return `${config.back_base_url}${config.back_MATHVISION_PREFIX}/download/download?mode=${mode}&path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
};
const PROBLEM_SECTIONS = [
    ['statement', '题目文字'],
    ['diagram', '题图描述'],
    ['elements', '元素列表'],
    ['constraints', '元素约束'],
    ['unknowns', '未知量'],
    ['ambiguities', '不确定量'],
];
const INPUT_MODE_OPTIONS = [
    { value: 'concept', label: '概念解释' },
    { value: 'problem', label: '问题求解' },
];
const SCENE_MODE_OPTIONS = [
    { value: '2d', label: '2D' },
    { value: '3d', label: '3D' },
];
const PLACEMENT_POSITIONING_OPTIONS = [
    { value: 'absolute', label: '绝对坐标' },
    { value: 'relative', label: '相对定位' },
];
const LINE_STYLE_OPTIONS = [
    { value: '', label: '默认' },
    { value: 'solid', label: '实线' },
    { value: 'dashed', label: '虚线' },
    { value: 'dotted', label: '点线' },
    { value: 'dash_dot', label: '点划线' },
];
const FONT_WEIGHT_OPTIONS = [
    { value: '', label: '默认' },
    { value: 'normal', label: '常规' },
    { value: 'bold', label: '加粗' },
];
const FONT_STYLE_OPTIONS = [
    { value: '', label: '默认' },
    { value: 'normal', label: '常规' },
    { value: 'italic', label: '斜体' },
];
const BOOLEAN_OPTIONS = [
    { value: '', label: '默认' },
    { value: 'true', label: '显示' },
    { value: 'false', label: '隐藏' },
];
const STYLE_FIELD_KEYS = [
    'color',
    'fill_color',
    'stroke_color',
    'highlight_color',
    'font_family',
    'font_weight',
    'font_style',
    'line_style',
    'opacity',
    'fill_opacity',
    'stroke_opacity',
    'stroke_width',
    'font_size',
    'padding',
    'corner_radius',
    'z_index',
    'point_size',
    'radius',
    'marker_size',
    'point_style',
    'decoration',
    'label_visible',
];
const STYLE_FIELD_OPTIONS = [
    { key: 'color', label: '主色', type: 'color' },
    { key: 'fill_color', label: '填充色', type: 'color' },
    { key: 'stroke_color', label: '描边色', type: 'color' },
    { key: 'highlight_color', label: '高亮色', type: 'color' },
    { key: 'opacity', label: '整体透明度', type: 'opacity' },
    { key: 'fill_opacity', label: '填充透明度', type: 'opacity' },
    { key: 'stroke_opacity', label: '描边透明度', type: 'opacity' },
    { key: 'stroke_width', label: '线宽', type: 'number', min: 0, step: 0.5, defaultValue: 2 },
    { key: 'line_style', label: '线型', type: 'select', options: LINE_STYLE_OPTIONS, defaultValue: 'solid' },
    { key: 'font_size', label: '字号', type: 'number', min: 1, step: 1, defaultValue: 22 },
    { key: 'font_family', label: '字体', type: 'text', defaultValue: 'Microsoft YaHei' },
    { key: 'font_weight', label: '字重', type: 'select', options: FONT_WEIGHT_OPTIONS, defaultValue: 'normal' },
    { key: 'font_style', label: '字形', type: 'select', options: FONT_STYLE_OPTIONS, defaultValue: 'normal' },
    { key: 'point_size', label: '点尺寸', type: 'number', min: 0, step: 0.01, defaultValue: 0.08 },
    { key: 'radius', label: '半径', type: 'number', min: 0, step: 0.01, defaultValue: 0.08 },
    { key: 'marker_size', label: '标记尺寸', type: 'number', min: 0, step: 0.05, defaultValue: 0.25 },
    { key: 'padding', label: '内边距', type: 'number', min: 0, step: 0.05, defaultValue: 0.2 },
    { key: 'corner_radius', label: '圆角', type: 'number', min: 0, step: 0.05, defaultValue: 0.15 },
    { key: 'z_index', label: '显示层级', type: 'number', step: 1, defaultValue: 1 },
    { key: 'point_style', label: '点样式', type: 'number', min: 0, step: 1, defaultValue: 0 },
    { key: 'decoration', label: '装饰', type: 'number', min: 0, step: 1, defaultValue: 0 },
    { key: 'label_visible', label: '标签显示', type: 'boolean', defaultValue: true },
];
const STYLE_OPTION_BY_KEY = Object.fromEntries(STYLE_FIELD_OPTIONS.map((option) => [option.key, option]));
const CONSTRAINT_DOMAIN_OPTIONS = [
    'placement',
    'construction',
    'constraint',
    'metric',
    'marker',
    'motion',
    'attachment',
    'layout',
    'visibility',
    'style',
    'lifecycle',
];
const CONSTRAINT_STRENGTH_OPTIONS = ['hard', 'repair_hard', 'soft'];
const CONSTRAINT_RELATIONS_BY_DOMAIN = {
    placement: ['point_at', 'other'],
    construction: [
        'connects_points',
        'line_through_points',
        'ray_from_to',
        'vector_from_to',
        'intersection_of',
        'reflection_across',
        'rotate_about',
        'midpoint_of',
        'projection_onto',
        'parallel_through',
        'perpendicular_through',
        'perpendicular_bisector',
        'circle_through',
        'minimum_of',
        'other',
    ],
    constraint: [
        'lies_on',
        'on_side_of',
        'parallel_to',
        'perpendicular_to',
        'same_side_of',
        'opposite_side_of',
        'collinear',
        'other',
    ],
    metric: ['equal_length', 'equal_angle', 'equal_measure_group', 'distance_between', 'other'],
    marker: ['angle_between', 'arc_sweep', 'right_angle_at', 'other'],
    motion: ['moves_on_object', 'moves_along_range', 'slider_driven', 'follows_path', 'trace_of', 'other'],
    attachment: ['label_for', 'fixed_offset_from', 'anchored_to', 'fixed_overlay', 'other'],
    layout: ['keep_inside_safe_area', 'avoid_overlap', 'maintain_clearance', 'group_alignment', 'other'],
    visibility: ['visible_during', 'hidden_after', 'fade_with', 'other'],
    style: ['style_matches', 'other'],
    lifecycle: ['persistent_across_scenes', 'exits_after_scene', 'other'],
};
const DEFAULT_CONSTRAINT_DOMAIN = 'constraint';
const DEFAULT_CONSTRAINT_RELATION = 'other';
const DEFAULT_CONSTRAINT_STRENGTH = 'hard';
const ELEMENT_GROUPS = [
    { key: 'points', type: 'point', label: '点', addLabel: '添加点', storage: 'object' },
    { key: 'segments', type: 'segment', label: '线段', addLabel: '添加线段', storage: 'array' },
    { key: 'lines', type: 'line', label: '直线', addLabel: '添加直线', storage: 'array' },
    { key: 'rays', type: 'ray', label: '射线', addLabel: '添加射线', storage: 'array' },
    { key: 'vectors', type: 'vector', label: '向量', addLabel: '添加向量', storage: 'array' },
    { key: 'circles', type: 'circle', label: '圆', addLabel: '添加圆', storage: 'array' },
    { key: 'arcs', type: 'arc', label: '圆弧', addLabel: '添加圆弧', storage: 'array' },
    { key: 'polygons', type: 'polygon', label: '多边形', addLabel: '添加多边形', storage: 'array' },
    { key: 'regions', type: 'region', label: '区域', addLabel: '添加区域', storage: 'array' },
    { key: 'marks', type: 'angle_marker', label: '标记', addLabel: '添加标记', storage: 'array' },
    { key: 'texts', type: 'text', label: '文本', addLabel: '添加文本', storage: 'array' },
    { key: 'equations', type: 'equation', label: '公式', addLabel: '添加公式', storage: 'array' },
    { key: 'traces', type: 'trace', label: '轨迹', addLabel: '添加轨迹', storage: 'array' },
];
const CORE_ELEMENT_GROUP_KEYS = new Set(['points', 'segments', 'arcs', 'marks']);
const ELEMENT_TYPE_OPTIONS = [
    { type: 'point', label: '点', groupKey: 'points' },
    { type: 'segment', label: '线段', groupKey: 'segments' },
    { type: 'line', label: '直线', groupKey: 'lines' },
    { type: 'ray', label: '射线', groupKey: 'rays' },
    { type: 'vector', label: '向量', groupKey: 'vectors' },
    { type: 'circle', label: '圆', groupKey: 'circles' },
    { type: 'arc', label: '圆弧', groupKey: 'arcs' },
    { type: 'polygon', label: '多边形', groupKey: 'polygons' },
    { type: 'region', label: '区域', groupKey: 'regions' },
    { type: 'angle_marker', label: '角标记', groupKey: 'marks' },
    { type: 'right_angle_marker', label: '直角标记', groupKey: 'marks' },
    { type: 'text', label: '文本', groupKey: 'texts' },
    { type: 'equation', label: '公式', groupKey: 'equations' },
    { type: 'trace', label: '轨迹', groupKey: 'traces' },
];
const ELEMENT_GROUP_BY_KEY = Object.fromEntries(ELEMENT_GROUPS.map((group) => [group.key, group]));
const ELEMENT_TYPE_BY_TYPE = Object.fromEntries(ELEMENT_TYPE_OPTIONS.map((item) => [item.type, item]));
const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isMeaningfulValue = (value) => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(isMeaningfulValue);
    if (typeof value === 'object') return Object.values(value).some(isMeaningfulValue);
    return true;
};
const hasMeaningfulDiagram = (diagram = {}) => (
    isMeaningfulValue(diagram.diagram_description)
    || isMeaningfulValue(diagram.coordinate_model)
    || isMeaningfulValue(diagram.unknowns)
    || isMeaningfulValue(diagram.ambiguities)
    || isMeaningfulValue(diagram.normalization_notes)
);
const normalizeDiagramPresence = (diagram = {}) => {
    const meaningful = hasMeaningfulDiagram(diagram);
    return {
        ...diagram,
        present: meaningful,
        source_observed: meaningful,
    };
};
const elementDisplayName = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (isPlainObject(value)) {
        return value.name || value.id || value.label || value.symbol || value.vertex || value.type || fallback;
    }
    return fallback;
};
const isArcLikeElement = (value) => {
    const label = elementDisplayName(value).toLowerCase();
    return label.includes('arc') || label.includes('弧');
};
const elementArrayItem = (name, type) => {
    if (type === 'right_angle_marker') {
        return { type: 'right_angle', vertex: name, description: name };
    }
    if (type === 'angle_marker') {
        return { type: 'angle', name, description: name };
    }
    return { name, description: name };
};
const formatCoordinateValue = (value) => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (!isMeaningfulValue(value)) return '';
    return prettyJson(value);
};
const formatStructuredTextValue = (value) => {
    if (value == null || !isMeaningfulValue(value)) return '';
    if (typeof value === 'string') return value;
    return prettyJson(value);
};
const parseCoordinatePart = (value) => {
    const text = (value || '').trim();
    if (!text) return '';
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
};
const emptyCoordinateDraft = { name: '', x: '', y: '', z: '' };
const emptyConstraintDraft = { name: '', description: '' };
const parseCoordinateValue = (text) => {
    const cleanText = (text || '').trim();
    if (!cleanText) return '';
    if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
        try {
            return JSON.parse(cleanText);
        } catch (e) {
            return cleanText;
        }
    }
    const parts = cleanText.split(/[,\s]+/).filter(Boolean);
    const numberPattern = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
    if (parts.length > 1 && parts.every((part) => numberPattern.test(part))) {
        return parts.map(Number);
    }
    return cleanText;
};
const toArray = (value) => (Array.isArray(value) ? value : []);
const formatTypedValue = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
};
const parseTypedValue = (value) => {
    const text = (value || '').trim();
    if (!text) return '';
    if (/^(true|false|null|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)$/i.test(text) || ['{', '[', '"'].includes(text[0])) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }
    return text;
};
const formatRefObjectId = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return formatTypedValue(value);
};
const refObjectItems = (value) => {
    if (Array.isArray(value)) {
        return value.map(formatRefObjectId).map((item) => item.trim()).filter(Boolean);
    }
    const item = formatRefObjectId(value).trim();
    return item ? [item] : [];
};
const packRefObjectItems = (items) => {
    const cleanItems = items.map((item) => String(item || '').trim()).filter(Boolean);
    if (cleanItems.length === 0) return [];
    if (cleanItems.length === 1) return cleanItems[0];
    return cleanItems;
};
const numberInputValue = (value) => (value == null ? '' : value);
const parseOptionalNumber = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return undefined;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
};
const normalizeColorValue = (value) => {
    const color = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color.slice(1).split('').map((char) => char + char).join('')}`;
    }
    return '#FFFFFF';
};
const sanitizeStyle = (style) => {
    if (!isPlainObject(style)) return undefined;
    const source = { ...style };
    if (source.z_index == null && source.zindex != null) {
        source.z_index = source.zindex;
    }
    const next = {};
    STYLE_FIELD_KEYS.forEach((key) => {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') {
            next[key] = value;
        }
    });
    return Object.keys(next).length > 0 ? next : undefined;
};
const sanitizeSceneObject = (item, withPlacement = true) => {
    const source = isPlainObject(item) ? item : { id: elementDisplayName(item) };
    const next = { id: source.id ?? '' };
    if (withPlacement && isPlainObject(source.placement)) {
        next.placement = source.placement;
    }
    if (isPlainObject(source.style)) {
        const style = sanitizeStyle(source.style);
        if (style) {
            next.style = style;
        }
    }
    return next;
};
const sanitizeStoryboardSceneObjects = (scene = {}) => {
    const next = { ...scene };
    if (Array.isArray(next.entering_objects)) {
        next.entering_objects = next.entering_objects.map((item) => sanitizeSceneObject(item, true));
    }
    if (Array.isArray(next.persistent_objects)) {
        next.persistent_objects = next.persistent_objects.map((item) => sanitizeSceneObject(item, true));
    }
    return next;
};
const normalizeConstraintDomain = (domain) => (
    CONSTRAINT_DOMAIN_OPTIONS.includes(domain) ? domain : DEFAULT_CONSTRAINT_DOMAIN
);
const constraintRelationOptions = (domain) => (
    CONSTRAINT_RELATIONS_BY_DOMAIN[normalizeConstraintDomain(domain)] || CONSTRAINT_RELATIONS_BY_DOMAIN[DEFAULT_CONSTRAINT_DOMAIN]
);
const normalizeConstraintRelation = (domain, relation) => {
    const options = constraintRelationOptions(domain);
    if (options.includes(relation)) return relation;
    return options.includes(DEFAULT_CONSTRAINT_RELATION) ? DEFAULT_CONSTRAINT_RELATION : options[0];
};
const normalizeConstraintStrength = (strength) => (
    CONSTRAINT_STRENGTH_OPTIONS.includes(strength) ? strength : DEFAULT_CONSTRAINT_STRENGTH
);
const normalizeConstraintForEditor = (constraint = {}) => {
    const domain = normalizeConstraintDomain(constraint.domain);
    return {
        ...constraint,
        domain,
        relation: normalizeConstraintRelation(domain, constraint.relation),
        strength: normalizeConstraintStrength(constraint.strength),
    };
};

const Field = ({ label, children }) => (
    <label className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>
        {children}
    </label>
);

const TextInput = ({ value, onChange, placeholder = '', autoFocus = false }) => (
    <input
        className={styles.textInput}
        value={value ?? ''}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
    />
);

const CommitTextInput = ({ value, onCommit, placeholder = '' }) => {
    const [text, setText] = useState(value ?? '');

    useEffect(() => {
        setText(value ?? '');
    }, [value]);

    const commit = () => onCommit(text);

    return (
        <input
            className={styles.textInput}
            value={text}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.currentTarget.blur();
                }
            }}
        />
    );
};

const CoordinateValueInput = ({ value, onCommit, placeholder = '' }) => {
    const [text, setText] = useState(formatCoordinateValue(value));

    useEffect(() => {
        setText(formatCoordinateValue(value));
    }, [value]);

    return (
        <input
            className={styles.textInput}
            value={text}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => onCommit(parseCoordinateValue(text))}
        />
    );
};

const TypedValueInput = ({ value, onCommit, placeholder = '' }) => {
    const [text, setText] = useState(formatTypedValue(value));

    useEffect(() => {
        setText(formatTypedValue(value));
    }, [value]);

    return (
        <input
            className={styles.textInput}
            value={text}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => onCommit(parseTypedValue(text))}
        />
    );
};

const TextArea = ({ value, onChange, rows = 4, code = false, placeholder = '' }) => (
    <textarea
        className={code ? styles.codeArea : styles.textArea}
        value={value ?? ''}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
    />
);

const CollapsibleBlock = ({ title, summary, defaultOpen = false, children, className = '' }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <details
            className={`${styles.detailsBlock} ${styles.compactDetails} ${className}`.trim()}
            open={open}
            onToggle={(event) => setOpen(event.currentTarget.open)}
        >
            <summary>
                <span>{title}</span>
                {summary && <small>{summary}</small>}
            </summary>
            <div className={styles.detailsContent}>
                {children}
            </div>
        </details>
    );
};

const ColorPicker = ({ value, onChange }) => {
    const color = normalizeColorValue(value);
    return (
        <div className={styles.colorPicker}>
            <input
                className={styles.colorInput}
                type="color"
                value={color}
                title="选择颜色"
                onChange={(event) => onChange(event.target.value.toUpperCase())}
            />
            <input
                className={styles.textInput}
                value={value ?? ''}
                placeholder="#FFFFFF"
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
};

const NumericField = ({ label, value, onChange, min, max, step = 1 }) => (
    <Field label={label}>
        <input
            className={styles.textInput}
            type="number"
            min={min}
            max={max}
            step={step}
            value={numberInputValue(value)}
            onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
        />
    </Field>
);

const OpacityField = ({ label, value, onChange }) => {
    const rangeValue = value == null ? 1 : value;
    const update = (nextValue) => onChange(parseOptionalNumber(nextValue));
    return (
        <Field label={label}>
            <div className={styles.rangeControl}>
                <input
                    className={styles.rangeInput}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={rangeValue}
                    onChange={(event) => update(event.target.value)}
                />
                <input
                    className={styles.textInput}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={numberInputValue(value)}
                    onChange={(event) => update(event.target.value)}
                />
            </div>
        </Field>
    );
};

const SelectField = ({ label, value, onChange, options }) => (
    <Field label={label}>
        <select className={styles.textInput} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </Field>
);

const BooleanSelectField = ({ label, value, onChange }) => (
    <Field label={label}>
        <select
            className={styles.textInput}
            value={value == null ? '' : String(value)}
            onChange={(event) => {
                const nextValue = event.target.value;
                onChange(nextValue === '' ? undefined : nextValue === 'true');
            }}
        >
            {BOOLEAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </Field>
);

const defaultStyleValue = (option) => {
    if (option.defaultValue !== undefined) return option.defaultValue;
    if (option.type === 'color') return '#FFFFFF';
    if (option.type === 'opacity') return 1;
    return '';
};

const StyleEditor = ({ value, onChange }) => {
    const style = sanitizeStyle(value) || {};
    const presentKeys = STYLE_FIELD_KEYS.filter((key) => style[key] !== undefined && style[key] !== null && style[key] !== '');
    const availableOptions = STYLE_FIELD_OPTIONS.filter((option) => !presentKeys.includes(option.key));
    const [pendingStyleKey, setPendingStyleKey] = useState(availableOptions[0]?.key || '');

    useEffect(() => {
        if (!availableOptions.some((option) => option.key === pendingStyleKey)) {
            setPendingStyleKey(availableOptions[0]?.key || '');
        }
    }, [availableOptions, pendingStyleKey]);

    const setStyleValue = (key, nextValue) => {
        onChange(sanitizeStyle({ ...style, [key]: nextValue }));
    };
    const removeStyleValue = (key) => {
        const nextStyle = { ...style };
        delete nextStyle[key];
        onChange(sanitizeStyle(nextStyle));
    };
    const addStyleValue = () => {
        const option = STYLE_OPTION_BY_KEY[pendingStyleKey] || availableOptions[0];
        if (!option) return;
        setStyleValue(option.key, defaultStyleValue(option));
    };
    const renderStyleInput = (option) => {
        const currentValue = style[option.key];
        if (option.type === 'color') {
            return (
                <Field label={option.label}>
                    <ColorPicker value={currentValue} onChange={(color) => setStyleValue(option.key, color)} />
                </Field>
            );
        }
        if (option.type === 'opacity') {
            return (
                <OpacityField label={option.label} value={currentValue} onChange={(opacity) => setStyleValue(option.key, opacity)} />
            );
        }
        if (option.type === 'select') {
            return (
                <SelectField label={option.label} value={currentValue} options={option.options} onChange={(selectedValue) => setStyleValue(option.key, selectedValue)} />
            );
        }
        if (option.type === 'boolean') {
            return (
                <BooleanSelectField label={option.label} value={currentValue} onChange={(selectedValue) => setStyleValue(option.key, selectedValue)} />
            );
        }
        if (option.type === 'text') {
            return (
                <Field label={option.label}>
                    <TextInput value={currentValue} onChange={(text) => setStyleValue(option.key, text)} />
                </Field>
            );
        }
        return (
            <NumericField
                label={option.label}
                value={currentValue}
                min={option.min}
                step={option.step}
                onChange={(numberValue) => setStyleValue(option.key, numberValue)}
            />
        );
    };

    return (
        <div className={styles.styleEditor}>
            <div className={styles.styleEditorHeader}>样式</div>
            {presentKeys.length === 0 ? (
                <div className={styles.inlineEmpty}>暂无样式设置</div>
            ) : (
                <div className={styles.styleList}>
                    {presentKeys.map((key) => {
                        const option = STYLE_OPTION_BY_KEY[key];
                        if (!option) return null;
                        return (
                            <div className={styles.styleRow} key={key}>
                                <div className={styles.styleControl}>
                                    {renderStyleInput(option)}
                                </div>
                                <button className={styles.iconTextBtn} type="button" onClick={() => removeStyleValue(key)}>
                                    <FontAwesomeIcon icon={faTrash} /> 删除
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            {availableOptions.length > 0 && (
                <div className={styles.styleAddRow}>
                    <select className={styles.textInput} value={pendingStyleKey} onChange={(event) => setPendingStyleKey(event.target.value)}>
                        {availableOptions.map((option) => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                    <button className={styles.ghostBtn} type="button" onClick={addStyleValue}>
                        <FontAwesomeIcon icon={faPlus} /> 添加样式
                    </button>
                </div>
            )}
        </div>
    );
};

const ProblemBundleEditor = ({ draft, onDraft }) => {
    const [activeSection, setActiveSection] = useState('statement');
    const [typeMenuOpen, setTypeMenuOpen] = useState(false);
    const [hiddenElementGroupKeys, setHiddenElementGroupKeys] = useState(() => new Set());
    const [editorDialog, setEditorDialog] = useState(null);
    const [coordinateFormOpen, setCoordinateFormOpen] = useState(false);
    const [coordinateDraft, setCoordinateDraft] = useState(emptyCoordinateDraft);
    const [coordinateError, setCoordinateError] = useState('');
    const [constraintFormOpen, setConstraintFormOpen] = useState(false);
    const [constraintDraft, setConstraintDraft] = useState(emptyConstraintDraft);
    const [constraintError, setConstraintError] = useState('');
    const sectionRefs = useRef({});
    const sectionsContainerRef = useRef(null);
    const diagram = draft.diagram || {};
    const diagramDescription = isPlainObject(diagram.diagram_description) ? diagram.diagram_description : {};
    const coordinateModel = isPlainObject(diagram.coordinate_model) ? diagram.coordinate_model : {};
    const coordinates = isPlainObject(coordinateModel.coordinates) ? coordinateModel.coordinates : {};
    const coordinateConstraints = isPlainObject(coordinateModel.constraints) ? coordinateModel.constraints : {};
    const unknowns = Array.isArray(diagram.unknowns) ? diagram.unknowns : [];
    const ambiguities = Array.isArray(diagram.ambiguities) ? diagram.ambiguities : [];
    const coordinateDimensions = (draft.scene_mode || '2d').toLowerCase() === '3d' ? ['x', 'y', 'z'] : ['x', 'y'];
    const update = (patch) => onDraft({ ...draft, ...patch });
    const updateDiagram = (patch) => update({ diagram: normalizeDiagramPresence({ ...diagram, ...patch }) });
    const updateDiagramDescription = (patch) => {
        updateDiagram({ diagram_description: { ...diagramDescription, ...patch } });
    };
    const replaceDiagramDescription = (nextDescription) => {
        updateDiagram({ diagram_description: nextDescription });
    };
    const updateCoordinateModel = (patch) => {
        updateDiagram({ coordinate_model: { ...coordinateModel, ...patch } });
    };
    const updateCoordinateConstraints = (nextConstraints) => {
        updateCoordinateModel({ constraints: nextConstraints });
    };
    const closeEditorDialog = () => setEditorDialog(null);
    const openTextDialog = ({
        title,
        label,
        initialValue = '',
        placeholder = '',
        confirmText = '确定',
        onSubmit,
    }) => {
        setEditorDialog({
            type: 'text',
            title,
            label,
            value: initialValue,
            placeholder,
            confirmText,
            error: '',
            onSubmit,
        });
    };
    const openConfirmDialog = ({
        title,
        message,
        confirmText = '确认',
        onConfirm,
    }) => {
        setEditorDialog({
            type: 'confirm',
            title,
            message,
            confirmText,
            onConfirm,
        });
    };
    const submitEditorDialog = () => {
        if (!editorDialog) return;
        if (editorDialog.type === 'text') {
            const value = (editorDialog.value || '').trim();
            if (!value) {
                setEditorDialog({ ...editorDialog, error: '请输入内容' });
                return;
            }
            editorDialog.onSubmit?.(value);
            closeEditorDialog();
            return;
        }
        editorDialog.onConfirm?.();
        closeEditorDialog();
    };

    useEffect(() => {
        const root = sectionsContainerRef.current?.closest(`.${styles.stageBody}`) || sectionsContainerRef.current?.closest(`.${styles.wrap}`);
        if (!root) return undefined;
        let frameId = 0;
        const syncActiveSection = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                const rootTop = root.getBoundingClientRect().top;
                const navHeight = sectionsContainerRef.current?.previousElementSibling?.getBoundingClientRect().height || 0;
                const pivot = rootTop + navHeight + 20;
                let nextSection = PROBLEM_SECTIONS[0][0];
                PROBLEM_SECTIONS.forEach(([key]) => {
                    const section = sectionRefs.current[key];
                    if (section && section.getBoundingClientRect().top <= pivot) {
                        nextSection = key;
                    }
                });
                setActiveSection((current) => (current === nextSection ? current : nextSection));
            });
        };
        syncActiveSection();
        root.addEventListener('scroll', syncActiveSection, { passive: true });
        window.addEventListener('resize', syncActiveSection);
        return () => {
            window.cancelAnimationFrame(frameId);
            root.removeEventListener('scroll', syncActiveSection);
            window.removeEventListener('resize', syncActiveSection);
        };
    }, []);

    const scrollToSection = (key) => {
        setActiveSection(key);
        const target = sectionRefs.current[key];
        const root = sectionsContainerRef.current?.closest(`.${styles.stageBody}`) || sectionsContainerRef.current?.closest(`.${styles.wrap}`);
        if (!target || !root) {
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const navHeight = sectionsContainerRef.current?.previousElementSibling?.getBoundingClientRect().height || 0;
        const targetTop = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - navHeight - 12;
        root.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const elementItems = (group) => {
        const raw = diagramDescription[group.key];
        if (group.storage === 'object') {
            return isPlainObject(raw)
                ? Object.entries(raw).map(([name, value]) => ({ name, value, label: name }))
                : [];
        }
        const groupItems = Array.isArray(raw)
            ? raw.map((value, index) => ({
                index,
                value,
                label: elementDisplayName(value, `${group.label}${index + 1}`),
            }))
            : [];
        if (group.key === 'segments') {
            return groupItems.filter((item) => !isArcLikeElement(item.value));
        }
        if (group.key === 'arcs') {
            const segmentArcs = (Array.isArray(diagramDescription.segments) ? diagramDescription.segments : [])
                .map((value, index) => ({
                    index,
                    sourceKey: 'segments',
                    value,
                    label: elementDisplayName(value, `${group.label}${index + 1}`),
                }))
                .filter((item) => isArcLikeElement(item.value));
            return [...groupItems, ...segmentArcs];
        }
        return groupItems;
    };

    const setElementGroupValue = (groupKey, nextValue) => {
        updateDiagramDescription({ [groupKey]: nextValue });
    };
    const setElementGroup = (group, nextValue) => {
        setElementGroupValue(group.key, nextValue);
    };

    const revealElementGroup = (groupKey) => {
        setHiddenElementGroupKeys((current) => {
            if (!current.has(groupKey)) return current;
            const next = new Set(current);
            next.delete(groupKey);
            return next;
        });
    };

    const addElementType = (type) => {
        const option = ELEMENT_TYPE_BY_TYPE[type] || ELEMENT_TYPE_OPTIONS[0];
        const group = ELEMENT_GROUP_BY_KEY[option.groupKey];
        revealElementGroup(group.key);
        if (Object.prototype.hasOwnProperty.call(diagramDescription, group.key)) return;
        setElementGroup(group, group.storage === 'object' ? {} : []);
    };

    const addElement = (type) => {
        const option = ELEMENT_TYPE_BY_TYPE[type] || ELEMENT_TYPE_OPTIONS[0];
        const group = ELEMENT_GROUP_BY_KEY[option.groupKey];
        openTextDialog({
            title: `添加${option.label}`,
            label: `${option.label}名称`,
            placeholder: `请输入${option.label}名称`,
            confirmText: '添加',
            onSubmit: (cleanName) => {
                revealElementGroup(group.key);
                if (group.storage === 'object') {
                    setElementGroup(group, {
                        ...(isPlainObject(diagramDescription[group.key]) ? diagramDescription[group.key] : {}),
                        [cleanName]: { role: cleanName, position: '' },
                    });
                    return;
                }
                setElementGroup(group, [
                    ...(Array.isArray(diagramDescription[group.key]) ? diagramDescription[group.key] : []),
                    elementArrayItem(cleanName, option.type),
                ]);
            },
        });
    };

    const commitRemoveElementType = (group) => {
        const nextDescription = { ...diagramDescription };
        if (group.key === 'segments') {
            const remainingSegments = (Array.isArray(diagramDescription.segments) ? diagramDescription.segments : [])
                .filter((item) => isArcLikeElement(item));
            if (remainingSegments.length > 0) {
                nextDescription.segments = remainingSegments;
            } else {
                delete nextDescription.segments;
            }
        } else if (group.key === 'arcs') {
            delete nextDescription.arcs;
            const remainingSegments = (Array.isArray(diagramDescription.segments) ? diagramDescription.segments : [])
                .filter((item) => !isArcLikeElement(item));
            if (remainingSegments.length > 0) {
                nextDescription.segments = remainingSegments;
            } else {
                delete nextDescription.segments;
            }
        } else {
            delete nextDescription[group.key];
        }
        setHiddenElementGroupKeys((current) => new Set(current).add(group.key));
        replaceDiagramDescription(nextDescription);
    };

    const removeElementType = (group) => {
        const items = elementItems(group);
        if (items.length === 0) {
            commitRemoveElementType(group);
            return;
        }
        openConfirmDialog({
            title: `删除${group.label}类型`,
            message: `将删除该类型及其中 ${items.length} 个元素。`,
            confirmText: '删除类型',
            onConfirm: () => commitRemoveElementType(group),
        });
    };

    const removeElement = (group, item) => {
        if (group.storage === 'object') {
            const next = { ...(isPlainObject(diagramDescription[group.key]) ? diagramDescription[group.key] : {}) };
            delete next[item.name];
            setElementGroup(group, next);
            return;
        }
        const targetKey = item.sourceKey || group.key;
        setElementGroupValue(targetKey, (Array.isArray(diagramDescription[targetKey]) ? diagramDescription[targetKey] : [])
            .filter((_, index) => index !== item.index));
    };

    const renameElement = (group, item, nextName) => {
        if (!nextName || !nextName.trim()) return;
        const cleanName = nextName.trim();
        if (group.storage === 'object') {
            const raw = isPlainObject(diagramDescription[group.key]) ? diagramDescription[group.key] : {};
            const next = {};
            Object.entries(raw).forEach(([name, value]) => {
                next[name === item.name ? cleanName : name] = value;
            });
            setElementGroup(group, next);
            return;
        }
        const targetKey = item.sourceKey || group.key;
        const raw = Array.isArray(diagramDescription[targetKey]) ? diagramDescription[targetKey] : [];
        setElementGroupValue(targetKey, raw.map((value, index) => {
            if (index !== item.index) return value;
            if (typeof value === 'string') return cleanName;
            if (isPlainObject(value)) return { ...value, name: cleanName };
            return cleanName;
        }));
    };

    const updateUnknown = (index, patch) => {
        updateDiagram({ unknowns: unknowns.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
    };
    const addUnknown = () => updateDiagram({ unknowns: [...unknowns, { name: '', description: '' }] });
    const removeUnknown = (index) => updateDiagram({ unknowns: unknowns.filter((_, i) => i !== index) });

    const updateAmbiguity = (index, patch) => {
        updateDiagram({ ambiguities: ambiguities.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
    };
    const addAmbiguity = () => updateDiagram({
        ambiguities: [...ambiguities, {
            name: '',
            choices: [],
            selected_by_source_diagram: '',
            reason: '',
        }],
    });
    const removeAmbiguity = (index) => updateDiagram({ ambiguities: ambiguities.filter((_, i) => i !== index) });
    const addAmbiguityChoice = (index) => {
        const choices = Array.isArray(ambiguities[index]?.choices) ? ambiguities[index].choices : [];
        updateAmbiguity(index, { choices: [...choices, ''] });
    };
    const updateAmbiguityChoice = (index, choiceIndex, value) => {
        const choices = Array.isArray(ambiguities[index]?.choices) ? ambiguities[index].choices : [];
        updateAmbiguity(index, { choices: choices.map((choice, i) => (i === choiceIndex ? value : choice)) });
    };
    const removeAmbiguityChoice = (index, choiceIndex) => {
        const choices = Array.isArray(ambiguities[index]?.choices) ? ambiguities[index].choices : [];
        updateAmbiguity(index, { choices: choices.filter((_, i) => i !== choiceIndex) });
    };

    const addConstraint = () => {
        setConstraintDraft(emptyConstraintDraft);
        setConstraintError('');
        setConstraintFormOpen(true);
    };
    const updateConstraintDraft = (patch) => {
        setConstraintDraft((current) => ({ ...current, ...patch }));
        setConstraintError('');
    };
    const submitConstraintDraft = () => {
        const name = constraintDraft.name.trim();
        if (!name) {
            setConstraintError('请输入约束名称');
            return;
        }
        if (Object.prototype.hasOwnProperty.call(coordinateConstraints, name)) {
            setConstraintError('该约束名称已存在');
            return;
        }
        updateCoordinateConstraints({ ...coordinateConstraints, [name]: constraintDraft.description.trim() });
        setConstraintDraft(emptyConstraintDraft);
        setConstraintError('');
        setConstraintFormOpen(false);
    };
    const renameConstraint = (oldKey, nextKey) => {
        if (!nextKey || !nextKey.trim() || nextKey === oldKey) return;
        const next = {};
        Object.entries(coordinateConstraints).forEach(([key, value]) => {
            next[key === oldKey ? nextKey.trim() : key] = value;
        });
        updateCoordinateConstraints(next);
    };
    const updateConstraintValue = (key, value) => updateCoordinateConstraints({ ...coordinateConstraints, [key]: value });
    const removeConstraint = (key) => {
        const next = { ...coordinateConstraints };
        delete next[key];
        updateCoordinateConstraints(next);
    };

    const updateCoordinates = (nextCoordinates) => updateCoordinateModel({ coordinates: nextCoordinates });
    const addCoordinate = () => {
        setCoordinateDraft(emptyCoordinateDraft);
        setCoordinateError('');
        setCoordinateFormOpen(true);
    };
    const updateCoordinateDraft = (patch) => {
        setCoordinateDraft((current) => ({ ...current, ...patch }));
        setCoordinateError('');
    };
    const submitCoordinateDraft = () => {
        const name = coordinateDraft.name.trim();
        if (!name) {
            setCoordinateError('请输入元素名称');
            return;
        }
        if (Object.prototype.hasOwnProperty.call(coordinates, name)) {
            setCoordinateError('该元素坐标已存在');
            return;
        }
        const missingDimension = coordinateDimensions.find((dimension) => !coordinateDraft[dimension].trim());
        if (missingDimension) {
            setCoordinateError(`请输入 ${missingDimension.toUpperCase()} 坐标`);
            return;
        }
        updateCoordinates({
            ...coordinates,
            [name]: coordinateDimensions.map((dimension) => parseCoordinatePart(coordinateDraft[dimension])),
        });
        setCoordinateDraft(emptyCoordinateDraft);
        setCoordinateError('');
        setCoordinateFormOpen(false);
    };
    const renameCoordinate = (oldKey, nextKey) => {
        if (!nextKey || !nextKey.trim() || nextKey === oldKey) return;
        const next = {};
        Object.entries(coordinates).forEach(([key, value]) => {
            next[key === oldKey ? nextKey.trim() : key] = value;
        });
        updateCoordinates(next);
    };
    const updateCoordinateValue = (key, value) => updateCoordinates({ ...coordinates, [key]: value });
    const removeCoordinate = (key) => {
        const next = { ...coordinates };
        delete next[key];
        updateCoordinates(next);
    };

    const visibleElementGroups = ELEMENT_GROUPS.filter((group) => (
        !hiddenElementGroupKeys.has(group.key)
        && (
            CORE_ELEMENT_GROUP_KEYS.has(group.key)
            || Object.prototype.hasOwnProperty.call(diagramDescription, group.key)
            || elementItems(group).length > 0
        )
    ));

    const renderElementGroup = (group) => {
        const items = elementItems(group);
        return (
            <div className={styles.elementGroupCard} key={group.key}>
                <div className={styles.elementGroupHead}>
                    <span>{group.label}（{items.length}）</span>
                    <div className={styles.actionCluster}>
                        <button className={styles.ghostBtn} type="button" onClick={() => addElement(group.type)}>
                            <FontAwesomeIcon icon={faPlus} /> {group.addLabel}
                        </button>
                        <button className={styles.iconTextBtn} type="button" onClick={() => removeElementType(group)}>
                            <FontAwesomeIcon icon={faTrash} /> 删除类型
                        </button>
                    </div>
                </div>
                {items.length === 0 ? (
                    <div className={styles.inlineEmpty}>暂无{group.label}元素</div>
                ) : (
                    <div className={styles.chipGrid}>
                        {items.map((item) => (
                            <span className={styles.editChip} key={`${group.key}-${item.name || item.index}`}>
                                <button
                                    type="button"
                                    onClick={() => openTextDialog({
                                        title: `修改${group.label}名称`,
                                        label: `${group.label}名称`,
                                        initialValue: item.label,
                                        confirmText: '保存',
                                        onSubmit: (nextName) => renameElement(group, item, nextName),
                                    })}
                                >
                                    {item.label}
                                </button>
                                <button type="button" onClick={() => removeElement(group, item)} aria-label={`删除${item.label}`}>×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.designedEditor}>
            <div className={`${styles.stageTabs} ${styles.problemNav}`}>
                {PROBLEM_SECTIONS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={activeSection === key ? styles.stageTabActive : styles.stageTab}
                        onClick={() => scrollToSection(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className={styles.problemSections} ref={sectionsContainerRef}>
                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.statement = node; }}
                >
                    <div className={styles.problemSectionTitle}>题目文字</div>
                    <div className={styles.editorFields}>
                        <div className={styles.miniGrid}>
                            <Field label="任务标题">
                                <TextInput value={draft.title} onChange={(title) => update({ title })} />
                            </Field>
                            <Field label="输入模式">
                                <select className={styles.textInput} value={draft.input_mode || 'problem'} onChange={(event) => update({ input_mode: event.target.value })}>
                                    {INPUT_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="场景模式">
                                <select className={styles.textInput} value={draft.scene_mode || '2d'} onChange={(event) => update({ scene_mode: event.target.value })}>
                                    {SCENE_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <Field label="题目文字">
                            <TextArea value={draft.statement} rows={6} onChange={(statement) => update({ statement })} />
                        </Field>
                    </div>
                </section>

                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.diagram = node; }}
                >
                    <div className={styles.problemSectionTitle}>题图描述</div>
                    <div className={styles.editorFields}>
                        <Field label="整体图形描述">
                            <TextArea
                                value={diagramDescription.overall_shape || ''}
                                rows={4}
                                placeholder="描述源图中的整体形状、布局和关键视觉关系"
                                onChange={(text) => updateDiagramDescription({ overall_shape: text })}
                            />
                        </Field>
                    </div>
                </section>

                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.elements = node; }}
                >
                    <div className={styles.problemSectionHeader}>
                        <div className={styles.problemSectionTitle}>元素列表</div>
                        <button className={styles.ghostBtn} type="button" onClick={() => setTypeMenuOpen((open) => !open)}>
                            <FontAwesomeIcon icon={faPlus} /> 新增元素类型
                        </button>
                    </div>
                    {typeMenuOpen && (
                        <div className={styles.typeMenu}>
                            {ELEMENT_TYPE_OPTIONS.map((option) => (
                                <button key={option.type} type="button" onClick={() => { addElementType(option.type); setTypeMenuOpen(false); }}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className={styles.elementGroups}>
                        {visibleElementGroups.map(renderElementGroup)}
                    </div>
                </section>

                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.constraints = node; }}
                >
                    <div className={styles.problemSectionHeader}>
                        <div className={styles.problemSectionTitle}>元素约束</div>
                    </div>
                    <div className={styles.editorFields}>
                        <Field label="布局说明">
                            <TextArea
                                value={coordinateModel.description || ''}
                                rows={3}
                                placeholder="例如：以 C 为原点，CB 为 x 轴正方向，CA 为 y 轴正方向"
                                onChange={(description) => updateCoordinateModel({ description })}
                            />
                        </Field>
                    </div>
                    <div className={styles.inlineEditorHeader}>
                        <span className={styles.fieldLabel}>元素坐标</span>
                        <button className={styles.ghostBtn} type="button" onClick={addCoordinate}>
                            <FontAwesomeIcon icon={faPlus} /> 添加坐标
                        </button>
                    </div>
                    {coordinateFormOpen && (
                        <div className={`${styles.detailCard} ${styles.inlineFormCard}`}>
                            <div className={`${styles.coordInputGrid} ${coordinateDimensions.length === 2 ? styles.coordInputGrid2d : ''}`}>
                                <Field label="元素名称">
                                    <TextInput value={coordinateDraft.name} placeholder="例如：A" autoFocus onChange={(name) => updateCoordinateDraft({ name })} />
                                </Field>
                                <Field label="X">
                                    <TextInput value={coordinateDraft.x} placeholder="0" onChange={(x) => updateCoordinateDraft({ x })} />
                                </Field>
                                <Field label="Y">
                                    <TextInput value={coordinateDraft.y} placeholder="4" onChange={(y) => updateCoordinateDraft({ y })} />
                                </Field>
                                {coordinateDimensions.includes('z') && (
                                    <Field label="Z">
                                        <TextInput value={coordinateDraft.z} placeholder="0" onChange={(z) => updateCoordinateDraft({ z })} />
                                    </Field>
                                )}
                            </div>
                            {coordinateError && <div className={styles.dialogError}>{coordinateError}</div>}
                            <div className={styles.inlineFormActions}>
                                <button className={`${styles.actionBtn} ${styles.secondary}`} type="button" onClick={() => { setCoordinateFormOpen(false); setCoordinateError(''); }}>
                                    取消
                                </button>
                                <button className={`${styles.actionBtn} ${styles.primary}`} type="button" onClick={submitCoordinateDraft}>
                                    添加
                                </button>
                            </div>
                        </div>
                    )}
                    <div className={styles.cardList}>
                        {Object.keys(coordinates).length === 0 ? (
                            <div className={styles.inlineEmpty}>暂无元素坐标</div>
                        ) : Object.entries(coordinates).map(([key, value]) => (
                            <div className={styles.detailCard} key={key}>
                                <div className={styles.cardTopline}>
                                    <TextInput value={key} onChange={(nextKey) => renameCoordinate(key, nextKey)} />
                                    <button className={styles.iconTextBtn} type="button" onClick={() => removeCoordinate(key)}>
                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                    </button>
                                </div>
                                <CoordinateValueInput value={value} placeholder="例如：0, 4" onCommit={(nextValue) => updateCoordinateValue(key, nextValue)} />
                            </div>
                        ))}
                    </div>
                    <div className={styles.inlineEditorHeader}>
                        <span className={styles.fieldLabel}>约束条件</span>
                        <button className={styles.ghostBtn} type="button" onClick={addConstraint}>
                            <FontAwesomeIcon icon={faPlus} /> 添加约束
                        </button>
                    </div>
                    {constraintFormOpen && (
                        <div className={`${styles.detailCard} ${styles.inlineFormCard}`}>
                            <Field label="约束名称">
                                <TextInput value={constraintDraft.name} placeholder="例如：P_on_arc" autoFocus onChange={(name) => updateConstraintDraft({ name })} />
                            </Field>
                            <Field label="约束描述">
                                <TextArea value={constraintDraft.description} rows={3} placeholder="描述坐标、几何关系或参数化条件" onChange={(description) => updateConstraintDraft({ description })} />
                            </Field>
                            {constraintError && <div className={styles.dialogError}>{constraintError}</div>}
                            <div className={styles.inlineFormActions}>
                                <button className={`${styles.actionBtn} ${styles.secondary}`} type="button" onClick={() => { setConstraintFormOpen(false); setConstraintError(''); }}>
                                    取消
                                </button>
                                <button className={`${styles.actionBtn} ${styles.primary}`} type="button" onClick={submitConstraintDraft}>
                                    添加
                                </button>
                            </div>
                        </div>
                    )}
                    <div className={styles.cardList}>
                        {Object.keys(coordinateConstraints).length === 0 ? (
                            <div className={styles.inlineEmpty}>暂无坐标或几何约束</div>
                        ) : Object.entries(coordinateConstraints).map(([key, value]) => (
                            <div className={styles.detailCard} key={key}>
                                <div className={styles.cardTopline}>
                                    <TextInput value={key} onChange={(nextKey) => renameConstraint(key, nextKey)} />
                                    <button className={styles.iconTextBtn} type="button" onClick={() => removeConstraint(key)}>
                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                    </button>
                                </div>
                                <TextArea value={formatStructuredTextValue(value)} rows={3} onChange={(text) => updateConstraintValue(key, text)} />
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.unknowns = node; }}
                >
                    <div className={styles.problemSectionHeader}>
                        <div className={styles.problemSectionTitle}>未知量</div>
                        <button className={styles.ghostBtn} type="button" onClick={addUnknown}>
                            <FontAwesomeIcon icon={faPlus} /> 添加未知量
                        </button>
                    </div>
                    <div className={styles.cardList}>
                        {unknowns.length === 0 ? (
                            <div className={styles.inlineEmpty}>暂无未知量</div>
                        ) : unknowns.map((item, index) => (
                            <div className={styles.detailCard} key={`unknown-${index}`}>
                                <div className={styles.cardTopline}>
                                    <TextInput value={item?.name || ''} placeholder="名称" onChange={(name) => updateUnknown(index, { name })} />
                                    <button className={styles.iconTextBtn} type="button" onClick={() => removeUnknown(index)}>
                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                    </button>
                                </div>
                                <TextArea value={item?.description || ''} rows={3} placeholder="说明这个未知量、运动量或目标量" onChange={(description) => updateUnknown(index, { description })} />
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    className={styles.problemSection}
                    ref={(node) => { sectionRefs.current.ambiguities = node; }}
                >
                    <div className={styles.problemSectionHeader}>
                        <div className={styles.problemSectionTitle}>不确定量</div>
                        <button className={styles.ghostBtn} type="button" onClick={addAmbiguity}>
                            <FontAwesomeIcon icon={faPlus} /> 添加不确定量
                        </button>
                    </div>
                    <div className={styles.cardList}>
                        {ambiguities.length === 0 ? (
                            <div className={styles.inlineEmpty}>暂无不确定量</div>
                        ) : ambiguities.map((item, index) => (
                            <div className={styles.detailCard} key={`ambiguity-${index}`}>
                                <div className={styles.cardTopline}>
                                    <TextInput value={item?.name || ''} placeholder="名称" onChange={(name) => updateAmbiguity(index, { name })} />
                                    <button className={styles.iconTextBtn} type="button" onClick={() => removeAmbiguity(index)}>
                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                    </button>
                                </div>
                                <div className={styles.listEditor}>
                                    <div className={styles.inlineEditorHeader}>
                                        <span className={styles.fieldLabel}>可选分支</span>
                                        <button className={styles.ghostBtn} type="button" onClick={() => addAmbiguityChoice(index)}>
                                            <FontAwesomeIcon icon={faPlus} /> 添加分支
                                        </button>
                                    </div>
                                    {Array.isArray(item?.choices) && item.choices.length > 0 ? (
                                        <div className={styles.listEditorRows}>
                                            {item.choices.map((choice, choiceIndex) => (
                                                <div className={styles.listEditorRow} key={`ambiguity-${index}-choice-${choiceIndex}`}>
                                                    <TextInput value={choice} placeholder={`分支 ${choiceIndex + 1}`} onChange={(value) => updateAmbiguityChoice(index, choiceIndex, value)} />
                                                    <button className={styles.iconTextBtn} type="button" onClick={() => removeAmbiguityChoice(index, choiceIndex)}>
                                                        <FontAwesomeIcon icon={faTrash} /> 删除
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.inlineEmpty}>暂无可选分支</div>
                                    )}
                                </div>
                                <Field label="源图选择">
                                    <TextInput value={item?.selected_by_source_diagram || ''} onChange={(selected_by_source_diagram) => updateAmbiguity(index, { selected_by_source_diagram })} />
                                </Field>
                                <Field label="理由">
                                    <TextArea value={item?.reason || ''} rows={3} onChange={(reason) => updateAmbiguity(index, { reason })} />
                                </Field>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            {editorDialog && (
                <div
                    className={styles.dialogOverlay}
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeEditorDialog();
                    }}
                >
                    <form
                        className={styles.editorDialog}
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitEditorDialog();
                        }}
                    >
                        <div>
                            <h4 className={styles.dialogTitle}>{editorDialog.title}</h4>
                            {editorDialog.type === 'confirm' && (
                                <p className={styles.dialogText}>{editorDialog.message}</p>
                            )}
                        </div>
                        {editorDialog.type === 'text' && (
                            <>
                                <Field label={editorDialog.label}>
                                    <TextInput
                                        value={editorDialog.value}
                                        placeholder={editorDialog.placeholder}
                                        autoFocus
                                        onChange={(value) => setEditorDialog((current) => (
                                            current ? { ...current, value, error: '' } : current
                                        ))}
                                    />
                                </Field>
                                {editorDialog.error && <div className={styles.dialogError}>{editorDialog.error}</div>}
                            </>
                        )}
                        <div className={styles.dialogActions}>
                            <button className={`${styles.actionBtn} ${styles.secondary}`} type="button" onClick={closeEditorDialog}>
                                取消
                            </button>
                            <button
                                className={`${styles.actionBtn} ${editorDialog.type === 'confirm' ? styles.dangerAction : styles.primary}`}
                                type="submit"
                            >
                                {editorDialog.confirmText}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const ReasoningGraphEditor = ({ draft, onDraft }) => {
    const nodes = draft.nodes || {};
    const nextEdges = draft.next_edges || {};
    const nodeEntries = Object.entries(nodes);
    const orderedNodeIds = (draft.teaching_order || []).filter((id) => nodes[id]);
    const previewNodeIds = orderedNodeIds.length > 0 ? orderedNodeIds : nodeEntries.map(([id]) => id);
    const [activeNodeId, setActiveNodeId] = useState(previewNodeIds[0] || '');
    const update = (patch) => onDraft({ ...draft, ...patch });

    useEffect(() => {
        if (!activeNodeId || !nodes[activeNodeId]) {
            setActiveNodeId(previewNodeIds[0] || '');
        }
    }, [activeNodeId, nodes, previewNodeIds]);

    const updateNode = (nodeId, patch) => {
        update({ nodes: { ...nodes, [nodeId]: { ...nodes[nodeId], ...patch } } });
    };

    const nodeTypeValue = (node) => node?.node_type || node?.nodeType || 'concept';

    const renameNode = (oldId, nextId) => {
        if (!nextId || nextId === oldId || nodes[nextId]) return;
        const nextNodes = {};
        Object.entries(nodes).forEach(([id, node]) => {
            nextNodes[id === oldId ? nextId : id] = id === oldId ? { ...node, id: nextId } : node;
        });
        const renamedEdges = {};
        Object.entries(nextEdges).forEach(([from, targets]) => {
            renamedEdges[from === oldId ? nextId : from] = (targets || []).map((target) => target === oldId ? nextId : target);
        });
        update({
            nodes: nextNodes,
            next_edges: renamedEdges,
            start_node_id: draft.start_node_id === oldId ? nextId : draft.start_node_id,
            teaching_order: (draft.teaching_order || []).map((id) => id === oldId ? nextId : id),
        });
        setActiveNodeId(nextId);
    };

    const addNode = () => {
        const id = newId('node');
        const anchorId = activeNodeId && nodes[activeNodeId]
            ? activeNodeId
            : previewNodeIds[previewNodeIds.length - 1];
        const anchorIndex = anchorId ? previewNodeIds.indexOf(anchorId) : -1;
        const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : previewNodeIds.length;
        const nextOrder = [...previewNodeIds];
        const followingNodeId = nextOrder[insertIndex] || '';
        nextOrder.splice(insertIndex, 0, id);
        const updatedEdges = { ...nextEdges };
        if (anchorId) {
            const oldTargets = Array.isArray(nextEdges[anchorId]) ? nextEdges[anchorId] : [];
            updatedEdges[anchorId] = [id];
            updatedEdges[id] = oldTargets.length > 0 ? oldTargets : (followingNodeId ? [followingNodeId] : []);
        } else {
            updatedEdges[id] = followingNodeId ? [followingNodeId] : [];
        }
        update({
            nodes: { ...nodes, [id]: { id, step: '新的讲解节点', reason: '', node_type: 'concept', min_depth: 0 } },
            next_edges: updatedEdges,
            start_node_id: draft.start_node_id || nextOrder[0] || id,
            teaching_order: nextOrder,
        });
        setActiveNodeId(id);
    };

    const removeNode = (nodeId) => {
        const removedTargets = Array.isArray(nextEdges[nodeId]) ? nextEdges[nodeId] : [];
        const nextNodes = { ...nodes };
        delete nextNodes[nodeId];
        const renamedEdges = {};
        Object.entries(nextEdges).forEach(([from, targets]) => {
            if (from === nodeId) return;
            const nextTargets = [];
            (targets || []).forEach((target) => {
                if (target === nodeId) {
                    removedTargets.forEach((nextTarget) => {
                        if (nextTarget !== from && nextNodes[nextTarget] && !nextTargets.includes(nextTarget)) {
                            nextTargets.push(nextTarget);
                        }
                    });
                    return;
                }
                if (nextNodes[target] && !nextTargets.includes(target)) {
                    nextTargets.push(target);
                }
            });
            renamedEdges[from] = nextTargets;
        });
        const nextOrder = previewNodeIds.filter((id) => id !== nodeId);
        const removedIndex = previewNodeIds.indexOf(nodeId);
        const nextActiveNodeId = nextOrder[Math.min(Math.max(removedIndex, 0), nextOrder.length - 1)] || '';
        update({
            nodes: nextNodes,
            next_edges: renamedEdges,
            start_node_id: draft.start_node_id === nodeId ? nextOrder[0] || '' : draft.start_node_id,
            teaching_order: nextOrder,
        });
        setActiveNodeId(nextActiveNodeId);
    };

    const activeNode = activeNodeId ? nodes[activeNodeId] || {} : {};
    const activeEquations = Array.isArray(activeNode.equations) ? activeNode.equations : [];
    const activeDefinitions = isPlainObject(activeNode.definitions) ? activeNode.definitions : {};
    const activeNodeTypeKey = Object.prototype.hasOwnProperty.call(activeNode, 'nodeType')
        && !Object.prototype.hasOwnProperty.call(activeNode, 'node_type')
        ? 'nodeType'
        : 'node_type';
    const updateEquation = (index, value) => {
        updateNode(activeNodeId, { equations: activeEquations.map((item, i) => (i === index ? value : item)) });
    };
    const addEquation = () => updateNode(activeNodeId, { equations: [...activeEquations, ''] });
    const removeEquation = (index) => updateNode(activeNodeId, { equations: activeEquations.filter((_, i) => i !== index) });
    const addDefinition = () => {
        let index = Object.keys(activeDefinitions).length + 1;
        let key = `解释${index}`;
        while (Object.prototype.hasOwnProperty.call(activeDefinitions, key)) {
            index += 1;
            key = `解释${index}`;
        }
        updateNode(activeNodeId, { definitions: { ...activeDefinitions, [key]: '' } });
    };
    const renameDefinition = (oldKey, nextKey) => {
        const cleanKey = (nextKey || '').trim();
        if (!cleanKey || cleanKey === oldKey || Object.prototype.hasOwnProperty.call(activeDefinitions, cleanKey)) return;
        const nextDefinitions = {};
        Object.entries(activeDefinitions).forEach(([key, value]) => {
            nextDefinitions[key === oldKey ? cleanKey : key] = value;
        });
        updateNode(activeNodeId, { definitions: nextDefinitions });
    };
    const updateDefinitionValue = (key, value) => {
        updateNode(activeNodeId, { definitions: { ...activeDefinitions, [key]: value } });
    };
    const removeDefinition = (key) => {
        const nextDefinitions = { ...activeDefinitions };
        delete nextDefinitions[key];
        updateNode(activeNodeId, { definitions: nextDefinitions });
    };

    return (
        <div className={styles.designedEditor}>
            <div className={styles.editorSubhead}>
                <span>解题流程预览</span>
                <button className={styles.ghostBtn} type="button" onClick={addNode}><FontAwesomeIcon icon={faPlus} /> 新增</button>
            </div>
            <div className={styles.dagPreview}>
                {previewNodeIds.length === 0 ? (
                    <div className={styles.emptyHint}>暂无节点</div>
                ) : previewNodeIds.map((nodeId, index) => (
                    <React.Fragment key={nodeId}>
                        <button
                            type="button"
                            className={activeNodeId === nodeId ? styles.dagNodeActive : styles.dagNode}
                            onClick={() => setActiveNodeId(nodeId)}
                        >
                            <span>{nodes[nodeId]?.step || nodeId}</span>
                        </button>
                        {index < previewNodeIds.length - 1 && <span className={styles.dagEdge}>→</span>}
                    </React.Fragment>
                ))}
            </div>

            <div className={styles.editorFields}>
                {activeNodeId ? (
                    <div className={styles.nodeEditorCard}>
                        <div className={styles.editorSubhead}>
                            <span>节点编辑</span>
                            <button className={styles.iconTextBtn} type="button" onClick={() => removeNode(activeNodeId)}>
                                <FontAwesomeIcon icon={faTrash} /> 删除
                            </button>
                        </div>
                        <div className={styles.miniGrid}>
                        <Field label="节点 ID">
                            <TextInput value={activeNode.id || activeNodeId} onChange={(value) => renameNode(activeNodeId, value.trim())} />
                        </Field>
                        <Field label="类型">
                            <select
                                className={styles.textInput}
                                value={nodeTypeValue(activeNode)}
                                onChange={(event) => updateNode(activeNodeId, { [activeNodeTypeKey]: event.target.value })}
                            >
                                <option value="concept">concept</option>
                                <option value="problem">problem</option>
                                <option value="observation">observation</option>
                                <option value="construction">construction</option>
                                <option value="derivation">derivation</option>
                                <option value="conclusion">conclusion</option>
                            </select>
                        </Field>
                        </div>
                        <Field label="步骤描述">
                            <TextArea value={activeNode.step} rows={3} onChange={(step) => updateNode(activeNodeId, { step })} />
                        </Field>
                        <div className={styles.listEditor}>
                            <div className={styles.inlineEditorHeader}>
                                <span className={styles.fieldLabel}>关键公式</span>
                                <button className={styles.ghostBtn} type="button" onClick={addEquation}>
                                    <FontAwesomeIcon icon={faPlus} /> 添加公式
                                </button>
                            </div>
                            <div className={styles.latexHint}>
                                公式使用 LaTeX 语法，例如 <code>\frac{'{'}a{'}'}{'{'}b{'}'}</code>、<code>\sqrt{'{'}x{'}'}</code>、<code>\theta</code>；直接填写公式内容即可，无需添加 <code>$$</code> 包裹。
                            </div>
                            {activeEquations.length === 0 ? (
                                <div className={styles.inlineEmpty}>暂无关键公式</div>
                            ) : (
                                <div className={styles.listEditorRows}>
                                    {activeEquations.map((equation, index) => (
                                        <div className={styles.listEditorRow} key={`equation-${activeNodeId}-${index}`}>
                                            <TextArea value={equation} rows={2} placeholder={`LaTeX 公式 ${index + 1}，例如：\\frac{a}{b}`} onChange={(value) => updateEquation(index, value)} />
                                            <button className={styles.iconTextBtn} type="button" onClick={() => removeEquation(index)}>
                                                <FontAwesomeIcon icon={faTrash} /> 删除
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.listEditor}>
                            <div className={styles.inlineEditorHeader}>
                                <span className={styles.fieldLabel}>解释</span>
                                <button className={styles.ghostBtn} type="button" onClick={addDefinition}>
                                    <FontAwesomeIcon icon={faPlus} /> 添加解释
                                </button>
                            </div>
                            {Object.keys(activeDefinitions).length === 0 ? (
                                <div className={styles.inlineEmpty}>暂无解释</div>
                            ) : (
                                <div className={styles.definitionRows}>
                                    {Object.entries(activeDefinitions).map(([key, value]) => (
                                        <div className={styles.definitionRow} key={`definition-${activeNodeId}-${key}`}>
                                            <CommitTextInput value={key} placeholder="符号或对象" onCommit={(nextKey) => renameDefinition(key, nextKey)} />
                                            <TextArea value={value} rows={2} placeholder="解释说明" onChange={(nextValue) => updateDefinitionValue(key, nextValue)} />
                                            <button className={styles.iconTextBtn} type="button" onClick={() => removeDefinition(key)}>
                                                <FontAwesomeIcon icon={faTrash} /> 删除
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={styles.emptyHint}>选择或新增一个节点</div>
                )}
            </div>
        </div>
    );
};

const StoryboardEditor = ({ draft, onDraft }) => {
    const directStoryboard = !draft.storyboard && Array.isArray(draft.scenes);
    const storyboard = directStoryboard ? draft : (draft.storyboard || {});
    const scenes = toArray(storyboard.scenes);
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const update = (patch) => onDraft({ ...draft, ...patch });
    const updateStoryboard = (patch) => {
        const nextStoryboard = { ...storyboard, ...patch };
        onDraft(directStoryboard ? { ...draft, ...nextStoryboard } : { ...draft, storyboard: nextStoryboard });
    };
    const updateScene = (index, patch) => {
        updateStoryboard({ scenes: scenes.map((scene, i) => (i === index ? sanitizeStoryboardSceneObjects({ ...scene, ...patch }) : scene)) });
    };

    useEffect(() => {
        if (activeSceneIndex >= scenes.length) {
            setActiveSceneIndex(Math.max(0, scenes.length - 1));
        }
    }, [activeSceneIndex, scenes.length]);

    const activeScene = scenes[activeSceneIndex] || {};
    const coordinateBounds = isPlainObject(storyboard.coordinate_bounds) ? storyboard.coordinate_bounds : {};
    const objectRegistryItems = toArray(storyboard.object_registry);
    const objectIdOptions = Array.from(new Set(objectRegistryItems
        .map((item) => (isPlainObject(item) ? item.id : elementDisplayName(item)))
        .map((id) => String(id || '').trim())
        .filter(Boolean)));
    const hasObjectIdOptions = objectIdOptions.length > 0;
    const firstObjectId = objectIdOptions[0] || '';
    const hasZPlacement = scenes.some((scene) => (
        ['entering_objects', 'persistent_objects', 'exiting_objects'].some((field) => (
            toArray(scene[field]).some((item) => isPlainObject(item?.placement) && item.placement.z != null)
        ))
    ));
    const showZAxis = coordinateBounds.z != null || hasZPlacement;

    const addScene = () => {
        const insertIndex = scenes.length > 0 ? activeSceneIndex + 1 : 0;
        const nextScenes = [...scenes];
        nextScenes.splice(insertIndex, 0, {
            scene_id: newId('scene'),
            title: '新的分镜',
            goal: '',
            narration: '',
            duration_seconds: 8,
            actions: [],
        });
        updateStoryboard({ scenes: nextScenes });
        setActiveSceneIndex(insertIndex);
    };

    const removeScene = (index) => {
        updateStoryboard({ scenes: scenes.filter((_, i) => i !== index) });
        setActiveSceneIndex(Math.max(0, index - 1));
    };

    const sceneArray = (field) => toArray(activeScene[field]);
    const updateSceneArray = (field, nextItems) => updateScene(activeSceneIndex, { [field]: nextItems });
    const updateSceneArrayItem = (field, index, value) => {
        updateSceneArray(field, sceneArray(field).map((item, i) => (i === index ? value : item)));
    };
    const removeSceneArrayItem = (field, index) => {
        updateSceneArray(field, sceneArray(field).filter((_, i) => i !== index));
    };
    const addSceneArrayItem = (field, value) => {
        updateSceneArray(field, [...sceneArray(field), value]);
    };
    const isStructuredSceneObjectField = (field) => field === 'entering_objects' || field === 'persistent_objects';
    const normalizedObject = (item, field, withPlacement = true) => {
        if (isStructuredSceneObjectField(field)) {
            return sanitizeSceneObject(item, withPlacement);
        }
        return isPlainObject(item) ? item : { id: elementDisplayName(item) };
    };
    const axisValue = (placement, axis) => {
        const axisValueObject = isPlainObject(placement?.[axis]) ? placement[axis] : {};
        return axisValueObject.value ?? '';
    };
    const updateSceneObject = (field, index, patch) => {
        const current = normalizedObject(sceneArray(field)[index], field, field !== 'exiting_objects');
        const next = { ...current, ...patch };
        updateSceneArrayItem(field, index, isStructuredSceneObjectField(field) ? sanitizeSceneObject(next, field !== 'exiting_objects') : next);
    };
    const updateSceneObjectPositioning = (field, index, positioning) => {
        const current = normalizedObject(sceneArray(field)[index], field);
        const placement = isPlainObject(current.placement) ? current.placement : {};
        updateSceneObject(field, index, {
            placement: {
                ...placement,
                positioning,
            },
        });
    };
    const updateSceneObjectPlacement = (field, index, axis, value) => {
        const current = normalizedObject(sceneArray(field)[index], field);
        const placement = isPlainObject(current.placement) ? current.placement : {};
        const currentAxis = isPlainObject(placement[axis]) ? placement[axis] : {};
        const nextAxis = value === '' ? { ...currentAxis, value: undefined } : { ...currentAxis, value };
        updateSceneObject(field, index, {
            placement: {
                ...placement,
                positioning: placement.positioning || 'absolute',
                [axis]: nextAxis,
            },
        });
    };
    const updateSceneObjectStyle = (field, index, patch) => {
        updateSceneObject(field, index, { style: sanitizeStyle(patch) });
    };
    const updateAction = (index, patch) => {
        const current = isPlainObject(sceneArray('actions')[index])
            ? sceneArray('actions')[index]
            : { description: String(sceneArray('actions')[index] || '') };
        updateSceneArrayItem('actions', index, { ...current, ...patch });
    };
    const addAction = () => addSceneArrayItem('actions', {
        order: sceneArray('actions').length + 1,
        type: 'create',
        targets: [],
        description: '',
    });
    const updateStoryboardArray = (field, nextItems) => updateStoryboard({ [field]: nextItems });
    const updateObjectRegistryItem = (index, patch) => {
        updateStoryboardArray('object_registry', toArray(storyboard.object_registry).map((item, i) => (
            i === index ? { ...(isPlainObject(item) ? item : {}), ...patch } : item
        )));
    };
    const updateObjectRegistryStyle = (index, patch) => {
        updateObjectRegistryItem(index, { style: sanitizeStyle(patch) });
    };
    const updateCoordinateBound = (axis, key, value) => {
        const currentAxis = isPlainObject(coordinateBounds[axis]) ? coordinateBounds[axis] : {};
        updateStoryboard({
            coordinate_bounds: {
                ...coordinateBounds,
                [axis]: { ...currentAxis, [key]: parseOptionalNumber(value) },
            },
        });
    };
    const renderObjectIdSelect = (value, onChange) => (
        <select
            className={styles.textInput}
            value={objectIdOptions.includes(value) ? value : ''}
            disabled={!hasObjectIdOptions}
            onChange={(event) => onChange(event.target.value)}
        >
            <option value="" disabled>{hasObjectIdOptions ? '请选择对象' : '请先添加全局对象'}</option>
            {objectIdOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
            ))}
        </select>
    );
    const renderObjectChipSelector = (items, onChange, emptyText = '暂无对象', addLabel = '添加对象') => {
        const selectedItems = toArray(items)
            .map(formatRefObjectId)
            .map((item) => item.trim())
            .filter(Boolean)
            .filter((item, index, array) => array.indexOf(item) === index);
        const availableOptions = objectIdOptions.filter((id) => !selectedItems.includes(id));
        return (
            <div className={styles.objectTargetEditor}>
                {selectedItems.length === 0 ? (
                    <div className={styles.inlineEmpty}>{emptyText}</div>
                ) : (
                    <div className={styles.chipGrid}>
                        {selectedItems.map((item) => (
                            <span className={styles.editChip} key={item}>
                                <button type="button">{item}</button>
                                <button
                                    type="button"
                                    aria-label={`删除${item}`}
                                    onClick={() => onChange(selectedItems.filter((current) => current !== item))}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <select
                    className={styles.textInput}
                    value=""
                    disabled={availableOptions.length === 0}
                    onChange={(event) => {
                        const nextId = event.target.value;
                        if (nextId) {
                            onChange([...selectedItems, nextId]);
                        }
                    }}
                >
                    <option value="" disabled>
                        {hasObjectIdOptions ? (availableOptions.length > 0 ? addLabel : '对象已全部添加') : '请先添加全局对象'}
                    </option>
                    {availableOptions.map((id) => (
                        <option key={id} value={id}>{id}</option>
                    ))}
                </select>
            </div>
        );
    };

    const compactValues = (items, mapper = (item) => item, fallback = '暂无') => {
        const values = toArray(items)
            .map(mapper)
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        if (values.length === 0) return fallback;
        const visible = values.slice(0, 6).join('、');
        return values.length > 6 ? `${visible} 等 ${values.length} 项` : visible;
    };
    const compactText = (value, fallback = '') => {
        const text = String(value || '').trim().replace(/\s+/g, ' ');
        if (!text) return fallback;
        return text.length > 34 ? `${text.slice(0, 34)}...` : text;
    };
    const styleSummary = (style = {}) => {
        const keys = Object.keys(isPlainObject(style) ? style : {}).filter((key) => STYLE_OPTION_BY_KEY[key]);
        return keys.length > 0 ? `样式 ${keys.length} 项` : '未设置样式';
    };
    const placementSummary = (placement = {}) => {
        if (!isPlainObject(placement)) return '未设置定位';
        const positioning = PLACEMENT_POSITIONING_OPTIONS.find((option) => option.value === placement.positioning)?.label
            || placement.positioning
            || '绝对坐标';
        const axes = ['x', 'y', 'z']
            .map((axis) => {
                const axisObject = isPlainObject(placement[axis]) ? placement[axis] : {};
                return axisObject.value == null || axisObject.value === '' ? '' : `${axis.toUpperCase()}=${formatTypedValue(axisObject.value)}`;
            })
            .filter(Boolean)
            .join('，');
        return axes ? `${positioning}，${axes}` : positioning;
    };
    const constraintSummary = (constraint = {}) => {
        const currentDomain = normalizeConstraintDomain(constraint.domain);
        const currentRelation = normalizeConstraintRelation(currentDomain, constraint.relation);
        const currentStrength = normalizeConstraintStrength(constraint.strength);
        return `${currentDomain} / ${currentRelation} / ${currentStrength}`;
    };
    const targetSummary = (targets) => compactValues(refObjectItems(targets), (item) => item, '暂无目标对象');
    const boundsSummary = () => {
        const axisSummary = ['x', 'y', ...(showZAxis ? ['z'] : [])]
            .map((axis) => {
                const axisValueObject = isPlainObject(coordinateBounds[axis]) ? coordinateBounds[axis] : {};
                const min = numberInputValue(axisValueObject.min);
                const max = numberInputValue(axisValueObject.max);
                return min === '' && max === '' ? '' : `${axis.toUpperCase()} ${min || '-'} ~ ${max || '-'}`;
            })
            .filter(Boolean)
            .join('；');
        return axisSummary || '未设置坐标边界';
    };
    const objectIdsSummary = compactValues(objectRegistryItems, (item) => (
        isPlainObject(item) ? item.id : elementDisplayName(item)
    ), '暂无全局对象');

    const renderMapEditor = (label, value, onChange, options = {}) => {
        const mapValue = isPlainObject(value) ? value : {};
        const entries = Object.entries(mapValue);
        const keyPlaceholder = options.keyPlaceholder || '字段名';
        const valuePlaceholder = options.valuePlaceholder || '字段值，支持 JSON';
        const addEntry = () => {
            if (Object.prototype.hasOwnProperty.call(mapValue, '')) return;
            onChange({ ...mapValue, '': '' });
        };
        const updateKey = (oldKey, nextKey) => {
            const cleanKey = (nextKey || '').trim();
            if (!cleanKey || cleanKey === oldKey) return;
            const nextMap = {};
            Object.entries(mapValue).forEach(([key, itemValue]) => {
                nextMap[key === oldKey ? cleanKey : key] = itemValue;
            });
            onChange(nextMap);
        };
        const updateValue = (key, nextValue) => onChange({ ...mapValue, [key]: nextValue });
        const removeKey = (key) => {
            const nextMap = { ...mapValue };
            delete nextMap[key];
            onChange(nextMap);
        };
        return (
            <div className={styles.mapEditor}>
                <div className={styles.inlineEditorHeader}>
                    <span className={styles.fieldLabel}>{label}</span>
                    <button className={styles.ghostBtn} type="button" onClick={addEntry}>
                        <FontAwesomeIcon icon={faPlus} /> 添加
                    </button>
                </div>
                {entries.length === 0 ? (
                    <div className={styles.inlineEmpty}>暂无{label}</div>
                ) : (
                    <div className={styles.mapRows}>
                        {entries.map(([key, itemValue]) => (
                            <div className={styles.mapRow} key={key || `${label}-empty-key`}>
                                <CommitTextInput value={key} placeholder={keyPlaceholder} onCommit={(nextKey) => updateKey(key, nextKey)} />
                                <TypedValueInput value={itemValue} placeholder={valuePlaceholder} onCommit={(nextValue) => updateValue(key, nextValue)} />
                                <button className={styles.iconTextBtn} type="button" onClick={() => removeKey(key)}>
                                    <FontAwesomeIcon icon={faTrash} /> 删除
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderRefsEditor = (value, onChange) => {
        const mapValue = isPlainObject(value) ? value : {};
        const entries = Object.entries(mapValue);
        const addRole = () => {
            if (Object.prototype.hasOwnProperty.call(mapValue, '')) return;
            onChange({ ...mapValue, '': [] });
        };
        const updateRole = (oldKey, nextKey) => {
            const cleanKey = (nextKey || '').trim();
            if (!cleanKey || cleanKey === oldKey) return;
            const nextMap = {};
            Object.entries(mapValue).forEach(([key, itemValue]) => {
                const targetKey = key === oldKey ? cleanKey : key;
                if (Object.prototype.hasOwnProperty.call(nextMap, targetKey)) {
                    nextMap[targetKey] = packRefObjectItems([
                        ...refObjectItems(nextMap[targetKey]),
                        ...refObjectItems(itemValue),
                    ]);
                    return;
                }
                nextMap[targetKey] = itemValue;
            });
            onChange(nextMap);
        };
        const updateObjects = (key, nextItems) => onChange({ ...mapValue, [key]: packRefObjectItems(nextItems) });
        const removeRole = (key) => {
            const nextMap = { ...mapValue };
            delete nextMap[key];
            onChange(nextMap);
        };
        return (
            <div className={styles.mapEditor}>
                <div className={styles.inlineEditorHeader}>
                    <span className={styles.fieldLabel}>引用对象</span>
                    <button className={styles.ghostBtn} type="button" onClick={addRole}>
                        <FontAwesomeIcon icon={faPlus} /> 添加
                    </button>
                </div>
                {entries.length === 0 ? (
                    <div className={styles.inlineEmpty}>暂无引用对象</div>
                ) : (
                    <div className={styles.refGroups}>
                        {entries.map(([key, itemValue]) => {
                            const items = refObjectItems(itemValue);
                            return (
                                <CollapsibleBlock
                                    key={key || 'empty-ref-role'}
                                    title={key || '未命名引用角色'}
                                    summary={compactValues(items, (item) => item, '暂无对象 ID')}
                                    className={styles.refGroupCard}
                                >
                                    <div className={styles.refGroupHead}>
                                        <Field label="引用角色">
                                            <CommitTextInput value={key} placeholder="对象角色，如 object / point / anchor" onCommit={(nextKey) => updateRole(key, nextKey)} />
                                        </Field>
                                        <div className={styles.actionCluster}>
                                            <button className={styles.iconTextBtn} type="button" onClick={() => removeRole(key)}>
                                                <FontAwesomeIcon icon={faTrash} /> 删除角色
                                            </button>
                                        </div>
                                    </div>
                                    {renderObjectChipSelector(items, (nextItems) => updateObjects(key, nextItems), '暂无对象 ID', '添加对象')}
                                </CollapsibleBlock>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderConstraints = (items, onChange, label = '约束条件') => {
        const constraints = toArray(items);
        const updateConstraint = (index, patch) => onChange(constraints.map((item, i) => (
            i === index ? normalizeConstraintForEditor({ ...(isPlainObject(item) ? item : {}), ...patch }) : item
        )));
        return (
            <div className={styles.listEditor}>
                <div className={styles.inlineEditorHeader}>
                    <span className={styles.fieldLabel}>{label}</span>
                    <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={() => onChange([...constraints, {
                            domain: DEFAULT_CONSTRAINT_DOMAIN,
                            relation: DEFAULT_CONSTRAINT_RELATION,
                            refs: {},
                            parameters: {},
                            strength: DEFAULT_CONSTRAINT_STRENGTH,
                            reason: '',
                        }])}
                    >
                        <FontAwesomeIcon icon={faPlus} /> 添加约束
                    </button>
                </div>
                {constraints.length === 0 ? (
                    <div className={styles.inlineEmpty}>暂无约束条件</div>
                ) : (
                    <div className={styles.cardList}>
                        {constraints.map((rawConstraint, index) => {
                            const constraint = isPlainObject(rawConstraint) ? rawConstraint : {};
                            const currentDomain = normalizeConstraintDomain(constraint.domain);
                            const currentRelation = normalizeConstraintRelation(currentDomain, constraint.relation);
                            const relationOptions = constraintRelationOptions(currentDomain);
                            const currentStrength = normalizeConstraintStrength(constraint.strength);
                            return (
                                <CollapsibleBlock
                                    key={`constraint-${index}`}
                                    title={constraint.id || currentRelation || `约束 ${index + 1}`}
                                    summary={constraintSummary(constraint)}
                                >
                                    <div className={styles.cardTopline}>
                                        <strong>{constraint.id || currentRelation || `约束 ${index + 1}`}</strong>
                                        <button className={styles.iconTextBtn} type="button" onClick={() => onChange(constraints.filter((_, i) => i !== index))}>
                                            <FontAwesomeIcon icon={faTrash} /> 删除
                                        </button>
                                    </div>
                                    <div className={styles.miniGrid}>
                                        <Field label="约束 ID">
                                            <TextInput value={constraint.id} placeholder="可选" onChange={(id) => updateConstraint(index, { id })} />
                                        </Field>
                                        <Field label="约束域">
                                            <select
                                                className={styles.textInput}
                                                value={currentDomain}
                                                onChange={(event) => {
                                                    const nextDomain = event.target.value;
                                                    updateConstraint(index, {
                                                        domain: nextDomain,
                                                        relation: normalizeConstraintRelation(nextDomain, constraint.relation),
                                                    });
                                                }}
                                            >
                                                {CONSTRAINT_DOMAIN_OPTIONS.map((domain) => (
                                                    <option key={domain} value={domain}>{domain}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="关系">
                                            <select
                                                className={styles.textInput}
                                                value={currentRelation}
                                                onChange={(event) => updateConstraint(index, { relation: event.target.value })}
                                            >
                                                {relationOptions.map((relation) => (
                                                    <option key={relation} value={relation}>{relation}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="强度">
                                            <select
                                                className={styles.textInput}
                                                value={currentStrength}
                                                onChange={(event) => updateConstraint(index, { strength: event.target.value })}
                                            >
                                                {CONSTRAINT_STRENGTH_OPTIONS.map((strength) => (
                                                    <option key={strength} value={strength}>{strength}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                    <Field label="约束说明">
                                        <TextArea value={constraint.reason} rows={2} onChange={(reason) => updateConstraint(index, { reason })} />
                                    </Field>
                                    <div className={styles.constraintMapGrid}>
                                        {renderRefsEditor(constraint.refs, (refs) => updateConstraint(index, { refs }))}
                                        {renderMapEditor('参数', constraint.parameters, (parameters) => updateConstraint(index, { parameters }), {
                                            keyPlaceholder: '参数名，如 coordinate / positioning / side / tolerance',
                                            valuePlaceholder: '参数值，如 [0,4]、absolute、above、0.1',
                                        })}
                                    </div>
                                </CollapsibleBlock>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderSceneObjects = (field, label, emptyText, withPlacement = true) => {
        const items = sceneArray(field);
        return (
            <div className={styles.listEditor}>
                <div className={styles.inlineEditorHeader}>
                    <span className={styles.fieldLabel}>{label}</span>
                    <button
                        className={styles.ghostBtn}
                        type="button"
                        disabled={!hasObjectIdOptions}
                        onClick={() => addSceneArrayItem(field, isStructuredSceneObjectField(field) ? sanitizeSceneObject({ id: firstObjectId }, withPlacement) : { id: firstObjectId })}
                    >
                        <FontAwesomeIcon icon={faPlus} /> 添加对象
                    </button>
                </div>
                {!hasObjectIdOptions ? (
                    <div className={styles.inlineEmpty}>请先在全局对象注册表添加对象</div>
                ) : items.length === 0 ? (
                    <div className={styles.inlineEmpty}>{emptyText}</div>
                ) : (
                    <div className={styles.cardList}>
                        {items.map((item, index) => {
                            const objectPatch = normalizedObject(item, field, withPlacement);
                            const placement = isPlainObject(objectPatch.placement) ? objectPatch.placement : {};
                            const style = isPlainObject(objectPatch.style) ? objectPatch.style : {};
                            const objectTitle = objectPatch.id || `${label} ${index + 1}`;
                            return (
                                <CollapsibleBlock
                                    key={`${field}-${objectPatch.id || index}`}
                                    title={objectTitle}
                                    summary={withPlacement ? `${placementSummary(placement)}；${styleSummary(style)}` : '退出当前分镜'}
                                >
                                    <div className={styles.cardTopline}>
                                        <Field label="对象 ID">
                                            {renderObjectIdSelect(objectPatch.id, (id) => updateSceneObject(field, index, { id }))}
                                        </Field>
                                        <button className={styles.iconTextBtn} type="button" onClick={() => removeSceneArrayItem(field, index)}>
                                            <FontAwesomeIcon icon={faTrash} /> 删除
                                        </button>
                                    </div>
                                    {withPlacement && (
                                        <div className={styles.miniGrid}>
                                            <Field label="定位方式">
                                                <select
                                                    className={styles.textInput}
                                                    value={placement.positioning || 'absolute'}
                                                    onChange={(event) => updateSceneObjectPositioning(field, index, event.target.value)}
                                                >
                                                    {PLACEMENT_POSITIONING_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="X">
                                                <CoordinateValueInput value={axisValue(placement, 'x')} placeholder="可空" onCommit={(value) => updateSceneObjectPlacement(field, index, 'x', value)} />
                                            </Field>
                                            <Field label="Y">
                                                <CoordinateValueInput value={axisValue(placement, 'y')} placeholder="可空" onCommit={(value) => updateSceneObjectPlacement(field, index, 'y', value)} />
                                            </Field>
                                            {showZAxis && (
                                                <Field label="Z">
                                                    <CoordinateValueInput value={axisValue(placement, 'z')} placeholder="可空" onCommit={(value) => updateSceneObjectPlacement(field, index, 'z', value)} />
                                                </Field>
                                            )}
                                        </div>
                                    )}
                                    {withPlacement && (
                                        <StyleEditor
                                            value={style}
                                            onChange={(nextStyle) => updateSceneObjectStyle(field, index, nextStyle)}
                                        />
                                    )}
                                </CollapsibleBlock>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderGlobalSettings = () => (
        <CollapsibleBlock
            title="全局讲解设置"
            summary={`${boundsSummary()}；对象 ${objectRegistryItems.length} 个`}
            defaultOpen
            className={styles.storyboardSection}
        >
            <div className={styles.summaryBlock}>
                <span>坐标边界</span>
                <div className={styles.boundsGrid}>
                    {['x', 'y', ...(showZAxis ? ['z'] : [])].map((axis) => {
                        const axisValueObject = isPlainObject(coordinateBounds[axis]) ? coordinateBounds[axis] : {};
                        return (
                            <React.Fragment key={axis}>
                                <Field label={`${axis.toUpperCase()} 最小值`}>
                                    <input className={styles.textInput} type="number" value={numberInputValue(axisValueObject.min)} onChange={(event) => updateCoordinateBound(axis, 'min', event.target.value)} />
                                </Field>
                                <Field label={`${axis.toUpperCase()} 最大值`}>
                                    <input className={styles.textInput} type="number" value={numberInputValue(axisValueObject.max)} onChange={(event) => updateCoordinateBound(axis, 'max', event.target.value)} />
                                </Field>
                            </React.Fragment>
                        );
                    })}
                    <Field label="边距">
                        <input
                            className={styles.textInput}
                            type="number"
                            value={numberInputValue(coordinateBounds.padding)}
                            onChange={(event) => updateStoryboard({ coordinate_bounds: { ...coordinateBounds, padding: parseOptionalNumber(event.target.value) } })}
                        />
                    </Field>
                </div>
            </div>
            <CollapsibleBlock
                title="全局对象注册表"
                summary={objectIdsSummary}
                className={styles.listEditor}
            >
                <div className={styles.inlineEditorHeader}>
                    <span className={styles.fieldLabel}>对象列表</span>
                    <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={() => updateStoryboardArray('object_registry', [...objectRegistryItems, { id: newId('object'), kind: '', content: '' }])}
                    >
                        <FontAwesomeIcon icon={faPlus} /> 添加对象
                    </button>
                </div>
                {objectRegistryItems.length === 0 ? (
                    <div className={styles.inlineEmpty}>暂无全局对象</div>
                ) : (
                    <div className={styles.cardList}>
                        {objectRegistryItems.map((item, index) => {
                            const objectItem = isPlainObject(item) ? item : {};
                            const style = isPlainObject(objectItem.style) ? objectItem.style : {};
                            const objectTitle = objectItem.id || `对象 ${index + 1}`;
                            const objectSummary = [objectItem.kind, objectItem.content, styleSummary(style)]
                                .map((part) => String(part || '').trim())
                                .filter(Boolean)
                                .join('；') || '暂无对象信息';
                            return (
                                <CollapsibleBlock
                                    key={objectItem.id || index}
                                    title={objectTitle}
                                    summary={objectSummary}
                                >
                                    <div className={styles.cardTopline}>
                                        <Field label="对象 ID">
                                            <TextInput value={objectItem.id} onChange={(id) => updateObjectRegistryItem(index, { id })} />
                                        </Field>
                                        <button
                                            className={styles.iconTextBtn}
                                            type="button"
                                            onClick={() => updateStoryboardArray('object_registry', objectRegistryItems.filter((_, i) => i !== index))}
                                        >
                                            <FontAwesomeIcon icon={faTrash} /> 删除
                                        </button>
                                    </div>
                                    <div className={styles.miniGrid}>
                                        <Field label="对象类型">
                                            <TextInput value={objectItem.kind} placeholder="point / segment / text" onChange={(kind) => updateObjectRegistryItem(index, { kind })} />
                                        </Field>
                                        <Field label="对象内容">
                                            <TextInput value={objectItem.content} onChange={(content) => updateObjectRegistryItem(index, { content })} />
                                        </Field>
                                    </div>
                                    <StyleEditor
                                        value={style}
                                        onChange={(nextStyle) => updateObjectRegistryStyle(index, nextStyle)}
                                    />
                                    {renderConstraints(toArray(objectItem.constraints), (constraints) => updateObjectRegistryItem(index, { constraints }), '对象约束')}
                                </CollapsibleBlock>
                            );
                        })}
                    </div>
                )}
            </CollapsibleBlock>
        </CollapsibleBlock>
    );

    return (
        <div className={styles.designedEditor}>
            {renderGlobalSettings()}
            <div className={styles.editorSubhead}>
                <span>讲解分镜</span>
                <button className={styles.ghostBtn} type="button" onClick={addScene}><FontAwesomeIcon icon={faPlus} /> 新增分镜</button>
            </div>
            <div className={styles.storyboardLayout}>
                <div className={styles.sceneList}>
                    {scenes.length === 0 ? (
                        <div className={styles.emptyHint}>暂无分镜</div>
                    ) : scenes.map((scene, index) => (
                        <button
                            key={scene.scene_id || index}
                            type="button"
                            className={activeSceneIndex === index ? styles.sceneItemActive : styles.sceneItem}
                            onClick={() => setActiveSceneIndex(index)}
                        >
                            <span className={styles.sceneIndex}>{index + 1}</span>
                            <span className={styles.sceneTitleText}>{scene.title || scene.scene_id || `场景 ${index + 1}`}</span>
                        </button>
                    ))}
                </div>

                <div className={styles.sceneEditor}>
                    <div className={styles.editorSubhead}>
                        <span>分镜内容</span>
                        {scenes.length > 0 && (
                            <button className={styles.iconTextBtn} type="button" onClick={() => removeScene(activeSceneIndex)}>
                                <FontAwesomeIcon icon={faTrash} /> 删除
                            </button>
                        )}
                    </div>
                    {scenes.length === 0 ? (
                        <div className={styles.emptyHint}>新增一个分镜后开始编辑</div>
                    ) : (
                        <>
                            <div className={styles.storyboardSection}>
                                <div className={styles.editorSubhead}><span>分镜目标</span></div>
                                <Field label="分镜标题">
                                    <TextInput value={activeScene.title} onChange={(title) => updateScene(activeSceneIndex, { title })} />
                                </Field>
                            </div>

                            <div className={styles.storyboardSection}>
                                <div className={styles.editorSubhead}><span>对象进出场</span></div>
                                {renderSceneObjects('entering_objects', '进入对象', '暂无进入对象')}
                                {renderSceneObjects('persistent_objects', '持续对象', '暂无持续对象')}
                                {renderSceneObjects('exiting_objects', '退出对象', '暂无退出对象', false)}
                            </div>

                            <div className={styles.storyboardSection}>
                                <div className={styles.editorSubhead}><span>分镜约束</span></div>
                                {renderConstraints(sceneArray('constraints'), (constraints) => updateSceneArray('constraints', constraints), '约束条件')}
                            </div>

                            <div className={styles.storyboardSection}>
                                <div className={styles.editorSubhead}>
                                    <span>分镜实际动作</span>
                                    <button className={styles.ghostBtn} type="button" onClick={addAction}>
                                        <FontAwesomeIcon icon={faPlus} /> 添加动作
                                    </button>
                                </div>
                                {sceneArray('actions').length === 0 ? (
                                    <div className={styles.inlineEmpty}>暂无实际动作</div>
                                ) : (
                                    <div className={styles.cardList}>
                                        {sceneArray('actions').map((rawAction, index) => {
                                            const action = isPlainObject(rawAction) ? rawAction : { description: String(rawAction || '') };
                                            const actionType = action.type || '未设置类型';
                                            const actionSummary = [
                                                targetSummary(action.targets),
                                                compactText(action.description || action.voiceover_text, '暂无描述'),
                                            ].filter(Boolean).join('；');
                                            return (
                                                <CollapsibleBlock
                                                    key={`action-${index}`}
                                                    title={`动作 ${index + 1}：${actionType}`}
                                                    summary={actionSummary}
                                                >
                                                    <div className={styles.cardTopline}>
                                                        <strong>动作 {index + 1}</strong>
                                                        <button className={styles.iconTextBtn} type="button" onClick={() => removeSceneArrayItem('actions', index)}>
                                                            <FontAwesomeIcon icon={faTrash} /> 删除
                                                        </button>
                                                    </div>
                                                    <div className={styles.miniGrid}>
                                                        <Field label="顺序">
                                                            <input className={styles.textInput} type="number" value={action.order ?? index + 1} onChange={(event) => updateAction(index, { order: Number(event.target.value) })} />
                                                        </Field>
                                                        <Field label="动作类型">
                                                            <TextInput value={action.type} placeholder="create / transform / highlight" onChange={(type) => updateAction(index, { type })} />
                                                        </Field>
                                                        <Field label="目标对象">
                                                            {renderObjectChipSelector(action.targets, (targets) => updateAction(index, { targets }), '暂无目标对象', '添加目标对象')}
                                                        </Field>
                                                    </div>
                                                    <Field label="旁白">
                                                        <TextArea value={action.voiceover_text} rows={2} onChange={(voiceover_text) => updateAction(index, { voiceover_text })} />
                                                    </Field>
                                                    <Field label="动作描述">
                                                        <TextArea value={action.description} rows={2} onChange={(description) => updateAction(index, { description })} />
                                                    </Field>
                                                </CollapsibleBlock>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const CodeEditor = ({ task, draft, onDraft }) => {
    const outputMode = resolveCodeOutputMode(draft, task);
    const isGeoGebra = outputMode.target === 'geogebra';
    return (
        <div className={styles.designedEditor}>
            <div className={styles.codeModeBanner}>
                <div className={styles.codeModeTitle}>
                    <FontAwesomeIcon icon={isGeoGebra ? faImage : faFileVideo} />
                    <span>{outputMode.title}</span>
                </div>
                <span className={styles.modeBadge}>{outputMode.formatLabel}</span>
            </div>

            <div className={styles.codeEditorLayout}>
                <div className={styles.codeMain}>
                    <Field label={outputMode.editorLabel}>
                        <TextArea value={draft.generatedCode} rows={24} code onChange={(generatedCode) => onDraft({ ...draft, generatedCode })} />
                    </Field>
                </div>
                <aside className={styles.evalPanel}>
                    <div className={styles.evalScore}>
                        <span>{draft.generatedCode ? draft.generatedCode.split(/\r?\n/).length : 0}</span>
                        <small>代码行数</small>
                    </div>
                    <div className={styles.metricList}>
                        <div><span>格式</span><strong>{outputMode.formatLabel}</strong></div>
                        <div><span>输出</span><strong>{outputMode.title}</strong></div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

const RenderResultViewer = ({ task, artifact, result }) => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewError, setPreviewError] = useState('');
    const [htmlPreviewHeight, setHtmlPreviewHeight] = useState(700);
    const htmlPreviewObserverRef = useRef(null);
    const htmlPreviewTimersRef = useRef([]);
    const renderResult = result?.renderResult || artifact || {};
    const artifactPath = resolveArtifactPath(renderResult, task);
    const artifactType = String(resolveArtifactType(renderResult, task) || '').toLowerCase();
    const fileName = renderResult.artifactFileName || fileNameFromPath(artifactPath, `mathvision-result.${artifactType || 'dat'}`);
    const isVideo = artifactType === 'mp4' || artifactType === 'video';
    const isHtml = artifactType === 'html';
    const renderSuccess = result?.success ?? result?.renderSuccess ?? renderResult.success ?? !!artifactPath;

    const clearHtmlPreviewObservers = useCallback(() => {
        htmlPreviewObserverRef.current?.disconnect();
        htmlPreviewObserverRef.current = null;
        htmlPreviewTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        htmlPreviewTimersRef.current = [];
    }, []);

    const handleHtmlPreviewLoad = useCallback((event) => {
        clearHtmlPreviewObservers();
        const iframe = event.currentTarget;
        try {
            const frameWindow = iframe.contentWindow;
            const frameDocument = iframe.contentDocument;
            if (!frameWindow || !frameDocument?.body) return;

            // Older GeoGebra artifacts included a visible command-source block.
            // Remove it in the embedded preview so existing tasks receive the new layout too.
            frameDocument.getElementById('commands')?.parentElement?.remove();
            frameDocument.documentElement.style.overflow = 'hidden';
            frameDocument.body.style.overflow = 'hidden';

            const contentRoot = frameDocument.querySelector('.layout') || frameDocument.body;
            const measure = () => {
                const bodyStyle = frameWindow.getComputedStyle(frameDocument.body);
                const bottomPadding = Number.parseFloat(bodyStyle.paddingBottom) || 0;
                const contentBottom = contentRoot.getBoundingClientRect().bottom;
                if (contentBottom > 0) {
                    setHtmlPreviewHeight(Math.max(560, Math.ceil(contentBottom + bottomPadding)));
                }
            };

            measure();
            if (frameWindow.ResizeObserver) {
                const observer = new frameWindow.ResizeObserver(measure);
                observer.observe(contentRoot);
                htmlPreviewObserverRef.current = observer;
            }
            htmlPreviewTimersRef.current = [100, 500, 1500].map((delay) => (
                window.setTimeout(measure, delay)
            ));
        } catch (e) {
            // Keep the default height if deployment topology ever makes the iframe cross-origin.
            setHtmlPreviewHeight(700);
        }
    }, [clearHtmlPreviewObservers]);

    useEffect(() => () => clearHtmlPreviewObservers(), [clearHtmlPreviewObservers]);

    useEffect(() => {
        let canceled = false;
        clearHtmlPreviewObservers();
        setHtmlPreviewHeight(700);
        setPreviewUrl('');
        setPreviewError('');
        if (!artifactPath || (!isVideo && !isHtml)) return undefined;
        buildDownloadUrl(artifactPath, fileName, 'inline')
            .then((url) => {
                if (!canceled) setPreviewUrl(url);
            })
            .catch((e) => {
                if (!canceled) setPreviewError(e.message || '预览凭证获取失败');
            });
        return () => {
            canceled = true;
        };
    }, [artifactPath, fileName, isVideo, isHtml, clearHtmlPreviewObservers]);

    const handleDownload = async (path, name) => {
        if (!path) return;
        try {
            const url = await buildDownloadUrl(path, name || fileName, 'attachment');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name || fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            window.alert(e.message || '下载失败');
        }
    };

    return (
        <div className={styles.renderPanel}>
            <div className={styles.renderHead}>
                <div>
                    <h3>阶段 5 · 渲染</h3>
                    <p>本阶段仅提供预览与结果查看，不支持结构化编辑，可去第四阶段（代码生成）编辑后重新渲染。</p>
                </div>
                <span className={renderSuccess ? styles.doneBadge : styles.warnBadge}>
                    {renderSuccess ? '已完成' : '未完成'}
                </span>
            </div>

            <div className={styles.infoNotice}>
                <FontAwesomeIcon icon={faCircleInfo} />
                <span>可在此查看最终渲染产物，并下载或分享结果文件。</span>
            </div>

            <div
                className={`${styles.previewFrame} ${previewUrl && isHtml ? styles.htmlPreviewFrame : ''}`}
                style={previewUrl && isHtml ? { height: `${htmlPreviewHeight}px` } : undefined}
            >
                {previewUrl && isVideo && (
                    <video className={styles.resultVideo} src={previewUrl} controls preload="metadata" />
                )}
                {previewUrl && isHtml && (
                    <iframe
                        className={styles.resultFrame}
                        src={previewUrl}
                        title="GeoGebra 预览"
                        onLoad={handleHtmlPreviewLoad}
                    />
                )}
                {!previewUrl && (
                    <div className={styles.previewPlaceholder}>
                        <FontAwesomeIcon icon={faFileVideo} />
                        <span>{previewError || (artifactPath ? '正在准备预览...' : '暂无可预览产物')}</span>
                    </div>
                )}
            </div>

            <div className={styles.renderActions}>
                <button className={`${styles.actionBtn} ${styles.secondary} ${styles.fullAction}`} type="button" disabled={!artifactPath} onClick={() => handleDownload(artifactPath, fileName)}>
                    <FontAwesomeIcon icon={faDownload} />
                    <span>{isHtml ? '下载文件（HTML）' : '下载视频（MP4）'}</span>
                </button>
            </div>
        </div>
    );
};

const StructuredEditor = ({ task, draft, resultData, rawText, rawError, activeTab, onTab, onDraft, onRaw }) => {
    if (!task?.currentArtifactJson) {
        return <div className={styles.emptyHint}>当前阶段还没有可编辑产物</div>;
    }

    if (task.currentStage === 'render_result') {
        return <RenderResultViewer task={task} artifact={draft} result={resultData} />;
    }

    return (
        <div className={styles.editorShell}>
            <div className={styles.editorTabs}>
                <button className={activeTab === 'structured' ? styles.tabActive : styles.tabBtn} type="button" onClick={() => onTab('structured')}>
                    <FontAwesomeIcon icon={faPenToSquare} /> 结构化
                </button>
                <button className={activeTab === 'json' ? styles.tabActive : styles.tabBtn} type="button" onClick={() => onTab('json')}>
                    <FontAwesomeIcon icon={faCode} /> JSON
                </button>
            </div>
            {activeTab === 'json' ? (
                <div>
                    <TextArea value={rawText} rows={24} code onChange={onRaw} />
                    {rawError && <div className={styles.jsonError}>{rawError}</div>}
                </div>
            ) : (
                <>
                    {task.currentStage === 'problem_normalization' && <ProblemBundleEditor draft={draft} onDraft={onDraft} />}
                    {task.currentStage === 'reasoning_graph' && <ReasoningGraphEditor draft={draft} onDraft={onDraft} />}
                    {task.currentStage === 'visual_storyboard' && <StoryboardEditor draft={draft} onDraft={onDraft} />}
                    {task.currentStage === 'code_generation' && <CodeEditor task={task} draft={draft} onDraft={onDraft} />}
                    {!EDITABLE_STAGES.has(task.currentStage) && <div className={styles.emptyHint}>该阶段仅支持结果查看</div>}
                </>
            )}
        </div>
    );
};

const StagePanel = ({
    task,
    selectedStageCode,
    stageData,
    loading,
    loadingStageData,
    actionLoading,
    onStart,
    onRegenerateStage,
    onCancel,
    onSaveStage,
    onAutoEditStage,
    onConfirmStage,
}) => {
    const [draft, setDraft] = useState({});
    const [rawText, setRawText] = useState('');
    const [rawError, setRawError] = useState('');
    const [activeTab, setActiveTab] = useState('structured');
    const [comment, setComment] = useState('');
    const [autoEditOpen, setAutoEditOpen] = useState(false);
    const [autoEditInstruction, setAutoEditInstruction] = useState('');
    const [autoEditError, setAutoEditError] = useState('');

    const panelTask = useMemo(() => {
        if (!task) return null;
        if (!stageData && selectedStageCode && selectedStageCode !== task.currentStage) {
            return {
                ...task,
                currentStage: selectedStageCode,
                currentArtifactVersion: null,
                currentArtifactJson: null,
                currentResultJson: null,
            };
        }
        if (!stageData) return task;
        return {
            ...task,
            currentStage: stageData.stage || task.currentStage,
            currentArtifactVersion: stageData.stageVersion,
            currentArtifactJson: stageData.artifactJson,
            currentResultJson: stageData.resultJson,
        };
    }, [task, selectedStageCode, stageData]);

    const resultData = useMemo(() => safeParseJson(panelTask?.currentResultJson), [panelTask?.currentResultJson]);

    useEffect(() => {
        if (!panelTask?.currentArtifactJson) {
            setDraft({});
            setRawText('');
            setRawError('');
            setComment('');
            setAutoEditOpen(false);
            setAutoEditInstruction('');
            setAutoEditError('');
            return;
        }
        try {
            const parsed = parseJson(panelTask.currentArtifactJson);
            setDraft(parsed);
            setRawText(prettyJson(parsed));
            setRawError('');
            setComment('');
            setAutoEditOpen(false);
            setAutoEditInstruction('');
            setAutoEditError('');
        } catch (e) {
            setDraft({});
            setRawText(panelTask.currentArtifactJson || '');
            setRawError('当前产物不是合法 JSON');
            setAutoEditOpen(false);
            setAutoEditInstruction('');
            setAutoEditError('');
        }
    }, [
        panelTask?.taskId,
        panelTask?.currentStage,
        panelTask?.currentArtifactVersion,
        panelTask?.currentArtifactJson,
    ]);

    const canEdit = useMemo(() => {
        if (stageData) return !!stageData.editable;
        if (!panelTask || !EDITABLE_STAGES.has(panelTask.currentStage)) return false;
        if (!panelTask.currentArtifactJson || !panelTask.currentArtifactVersion) return false;
        return !['queued', 'running'].includes(panelTask.status);
    }, [panelTask, stageData]);

    const canConfirmStage = useMemo(() => (
        stageData
            ? !!stageData.canConfirm
            : !!panelTask?.currentArtifactJson && !!panelTask.currentArtifactVersion && panelTask.status === 'waiting_confirm'
    ), [panelTask, stageData]);

    const autoEditConfig = AUTO_EDIT_STAGE_CONFIG[panelTask?.currentStage];
    const showAutoEditAction = !!onAutoEditStage
        && !!autoEditConfig
        && !!panelTask.currentArtifactJson
        && !!panelTask.currentArtifactVersion;
    const canAutoEditStage = showAutoEditAction
        && !!stageData?.canAutoEdit
        && !['queued', 'running'].includes(panelTask?.status)
        && !panelTask?.cancelRequested;
    const showRegenerateAction = !!onRegenerateStage
        && !!panelTask?.currentArtifactJson
        && !!panelTask?.currentArtifactVersion;
    const canRegenerateStage = showRegenerateAction
        && (stageData ? !!stageData.canRegenerate : false)
        && !['queued', 'running'].includes(panelTask?.status)
        && !panelTask?.cancelRequested;

    const canRunAfterSave = canEdit || canConfirmStage;
    const confirmLabel = canEdit
        ? (canConfirmStage ? '保存并确认' : '保存并重跑后续')
        : '确认';
    const canStartTask = !!onStart && ['created', 'failed', 'canceled'].includes(panelTask?.status);
    const startActionLabel = panelTask?.status === 'failed'
        ? '重试当前阶段'
        : (panelTask?.status === 'canceled' ? '继续任务' : '开始任务');
    const startActionIcon = panelTask?.status === 'failed' ? faRotateRight : faPlay;
    const canCancelTask = !!onCancel && (panelTask?.status === 'queued' || panelTask?.status === 'running');
    const taskCancelRequested = !!panelTask?.cancelRequested;
    const hasTaskActions = canStartTask || canCancelTask || showRegenerateAction;

    const commitDraft = useCallback((nextDraft) => {
        const next = clone(nextDraft);
        setDraft(next);
        setRawText(prettyJson(next));
        setRawError('');
    }, []);

    const handleRaw = useCallback((text) => {
        setRawText(text);
        try {
            setDraft(parseJson(text));
            setRawError('');
        } catch (e) {
            setRawError('JSON 格式不正确，保存前需要修正');
        }
    }, []);

    const handleSave = useCallback(async () => {
        if (!panelTask?.taskId || !onSaveStage) return;
        let content;
        try {
            content = parseJson(rawText);
            setRawError('');
        } catch (e) {
            setRawError('JSON 格式不正确，保存前需要修正');
            return;
        }
        await onSaveStage(panelTask.currentStage, panelTask.currentArtifactVersion, content, comment);
    }, [panelTask, rawText, comment, onSaveStage]);

    const handleConfirm = useCallback(async () => {
        if (!panelTask?.taskId || !onConfirmStage) return;
        let versionToConfirm = panelTask.currentArtifactVersion;
        if (canEdit && onSaveStage) {
            let content;
            try {
                content = parseJson(rawText);
                setRawError('');
            } catch (e) {
                setRawError('JSON 格式不正确，保存前需要修正');
                return;
            }
            const saved = await onSaveStage(panelTask.currentStage, panelTask.currentArtifactVersion, content, comment);
            versionToConfirm = saved?.stageVersion || versionToConfirm;
        }
        await onConfirmStage(panelTask.currentStage, versionToConfirm, comment);
    }, [panelTask, comment, canEdit, rawText, onSaveStage, onConfirmStage]);

    const handleAutoEdit = useCallback(async () => {
        if (!panelTask?.taskId || !onAutoEditStage || !canAutoEditStage) return;
        const instruction = autoEditInstruction.trim();
        if (!instruction) {
            setAutoEditError('请输入希望系统如何修改当前阶段产物');
            return;
        }
        setAutoEditError('');
        try {
            await onAutoEditStage(
                panelTask.currentStage,
                panelTask.currentArtifactVersion,
                instruction,
            );
            setAutoEditOpen(false);
            setAutoEditInstruction('');
        } catch (e) {
            // 错误提示由页面统一处理，保留输入方便用户修改后重试。
        }
    }, [
        panelTask,
        onAutoEditStage,
        canAutoEditStage,
        autoEditInstruction,
    ]);

    const renderActionButtons = () => (
        <div className={styles.actionLine}>
            {canStartTask && (
                <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    type="button"
                    onClick={() => onStart?.(panelTask.currentStage)}
                    disabled={actionLoading}
                >
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : startActionIcon} spin={actionLoading} />
                    <span>{startActionLabel}</span>
                </button>
            )}
            {canCancelTask && (
                <button className={`${styles.actionBtn} ${styles.dangerAction}`} type="button" onClick={onCancel} disabled={actionLoading || taskCancelRequested}>
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : faBan} spin={actionLoading} />
                    <span>{taskCancelRequested ? '取消中' : '取消任务'}</span>
                </button>
            )}
            {showRegenerateAction && (
                <button
                    className={`${styles.actionBtn} ${styles.regenerateAction}`}
                    type="button"
                    onClick={() => onRegenerateStage?.(panelTask.currentStage)}
                    disabled={actionLoading || !canRegenerateStage}
                    title={canRegenerateStage
                        ? '创建新版本，并重新执行当前阶段及全部后续阶段'
                        : '任务执行中、取消中或当前阶段不可重新生成'}
                >
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : faRotateRight} spin={actionLoading} />
                    <span>重新生成当前及后续</span>
                </button>
            )}
            {showAutoEditAction && (
                <button
                    className={`${styles.actionBtn} ${styles.magicAction}`}
                    type="button"
                    onClick={() => {
                        setAutoEditOpen(true);
                        setAutoEditError('');
                    }}
                    disabled={actionLoading || !canAutoEditStage}
                    title={canAutoEditStage
                        ? `根据修改意见重新生成${autoEditConfig.regeneration}`
                        : '后端尚未启用该阶段的自动编辑能力'}
                >
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : faMagic} spin={actionLoading} />
                    <span>自动编辑</span>
                </button>
            )}
            {canEdit && (
                <button className={`${styles.actionBtn} ${styles.secondary}`} type="button" onClick={handleSave} disabled={actionLoading || !!rawError}>
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : faSave} spin={actionLoading} />
                    <span>保存修改</span>
                </button>
            )}
            {canRunAfterSave && (
                <button className={`${styles.actionBtn} ${styles.success}`} type="button" onClick={handleConfirm} disabled={actionLoading || !!rawError}>
                    <FontAwesomeIcon icon={actionLoading ? faSpinner : faCheck} spin={actionLoading} />
                    <span>{confirmLabel}</span>
                </button>
            )}
        </div>
    );

    if (loading && !task) {
        return <div className={styles.placeholder}><FontAwesomeIcon icon={faSpinner} spin /> 加载中...</div>;
    }
    if (!task) {
        return <div className={styles.placeholder}>选择任务后在此查看当前阶段内容</div>;
    }

    return (
        <div className={styles.wrap}>
            {task.status === 'failed' && task.errorMessage && (
                <div className={styles.errorBox}>
                    <span>{task.errorType || 'workflow_error'}</span>
                    <p>{task.errorMessage}</p>
                </div>
            )}

            <div className={styles.section}>
                <div className={styles.stageHeader}>
                    <div className={styles.sectionTitle}>阶段产物</div>
                    {(hasTaskActions || canEdit || canConfirmStage || showAutoEditAction) && renderActionButtons()}
                </div>
                {autoEditOpen && showAutoEditAction && (
                    <div className={styles.autoEditPanel}>
                        <div className={styles.autoEditHeader}>
                            <div>
                                <strong><FontAwesomeIcon icon={faMagic} /> {autoEditConfig.title}</strong>
                                <span>系统会以当前阶段 V{panelTask.currentArtifactVersion} 为参考，根据意见重新生成{autoEditConfig.regeneration}。</span>
                            </div>
                            <button
                                className={styles.autoEditClose}
                                type="button"
                                onClick={() => {
                                    setAutoEditOpen(false);
                                    setAutoEditError('');
                                }}
                                disabled={actionLoading}
                            >
                                关闭
                            </button>
                        </div>
                        <TextArea
                            value={autoEditInstruction}
                            rows={4}
                            placeholder={autoEditConfig.placeholder}
                            onChange={(value) => {
                                setAutoEditInstruction(value);
                                setAutoEditError('');
                            }}
                        />
                        {autoEditError && <div className={styles.jsonError}>{autoEditError}</div>}
                        <div className={styles.autoEditActions}>
                            <span>提交后将创建新的阶段版本，当前版本不会被覆盖。</span>
                            <button
                                className={`${styles.actionBtn} ${styles.magicAction}`}
                                type="button"
                                onClick={handleAutoEdit}
                                disabled={actionLoading || !autoEditInstruction.trim()}
                            >
                                <FontAwesomeIcon icon={actionLoading ? faSpinner : faMagic} spin={actionLoading} />
                                {actionLoading ? '提交中...' : '提交自动编辑'}
                            </button>
                        </div>
                    </div>
                )}
                {(canEdit || canConfirmStage) && (
                    <div className={styles.headerComment}>
                        <Field label="备注">
                            <TextInput value={comment} onChange={setComment} placeholder="选填，修改说明" />
                        </Field>
                    </div>
                )}
                <div className={styles.stageBody}>
                    {loadingStageData ? (
                        <div className={styles.emptyHint}><FontAwesomeIcon icon={faSpinner} spin /> 阶段加载中...</div>
                    ) : (
                        <StructuredEditor
                            task={panelTask}
                            draft={draft}
                            resultData={resultData}
                            rawText={rawText}
                            rawError={rawError}
                            activeTab={activeTab}
                            onTab={setActiveTab}
                            onDraft={commitDraft}
                            onRaw={handleRaw}
                        />
                    )}
                </div>
            </div>

        </div>
    );
};

export default StagePanel;
