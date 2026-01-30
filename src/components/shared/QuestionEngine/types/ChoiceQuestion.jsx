import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import { faSquare, faCheckSquare } from '@fortawesome/free-regular-svg-icons';
import styles from './QuestionTypes.module.css';

// --- 编辑器 (Teacher) ---
export const ChoiceEditor = ({ question, onChange }) => {
    const isMulti = question.type === 'MULTI_CHOICE';

    const updateOptionText = (idx, text) => {
        const newOpts = [...question.options];
        newOpts[idx].text = text;
        onChange({ ...question, options: newOpts });
    };

    const toggleCorrectAnswer = (optId) => {
        let newAnswer = question.correctAnswer;
        if (isMulti) {
            newAnswer = Array.isArray(newAnswer) ? newAnswer : [];
            if (newAnswer.includes(optId)) {
                newAnswer = newAnswer.filter(id => id !== optId);
            } else {
                newAnswer = [...newAnswer, optId];
            }
        } else {
            newAnswer = optId; // 单选直接替换
        }
        onChange({ ...question, correctAnswer: newAnswer });
    };

    const addOption = () => {
        const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const newOpt = {
            id: crypto.randomUUID(),
            label: labels[question.options.length % 26],
            text: ''
        };
        onChange({ ...question, options: [...question.options, newOpt] });
    };

    const removeOption = (idx) => {
        const newOpts = question.options.filter((_, i) => i !== idx);
        onChange({ ...question, options: newOpts });
    };

    // 通用字段更新
    const handleChange = (field, val) => {
        onChange({ ...question, [field]: val });
    };

    return (
        <div className={styles.editorContainer}>
            {/* 选项列表 */}
            {question.options.map((opt, idx) => {
                const isCorrect = isMulti
                    ? (question.correctAnswer || []).includes(opt.id)
                    : question.correctAnswer === opt.id;

                return (
                    <div key={opt.id} className={styles.optionRow}>
                        <div
                            className={`${styles.checkIcon} ${isCorrect ? styles.active : ''}`}
                            onClick={() => toggleCorrectAnswer(opt.id)}
                            title={isCorrect ? "取消正确答案" : "设为正确答案"}
                        >
                            <FontAwesomeIcon icon={isMulti ? (isCorrect ? faCheckSquare : faSquare) : (isCorrect ? faCheckCircle : faCircle)} />
                        </div>
                        <span className={styles.optionLabel}>{opt.label}.</span>
                        <input
                            type="text"
                            className={styles.optionInput}
                            value={opt.text}
                            placeholder={`选项 ${opt.label} 内容`}
                            onChange={(e) => updateOptionText(idx, e.target.value)}
                        />
                        <button
                            className={styles.iconBtn}
                            onClick={() => removeOption(idx)}
                            disabled={question.options.length <= 1}
                            title="删除选项"
                        >
                            <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                    </div>
                );
            })}

            <button className={styles.addOptionBtn} onClick={addOption}>
                + 添加选项
            </button>

            {/* --- 新增：解析与AI评分标准 --- */}
            <div style={{ marginTop: '20px', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                <div className={styles.fieldGroup}>
                    <label>题目解析 (Analysis)</label>
                    <textarea
                        className={styles.textarea}
                        rows={2}
                        placeholder="输入针对此题的解析，学生在查看结果时可见..."
                        value={question.analysis || ''}
                        onChange={(e) => handleChange('analysis', e.target.value)}
                    />
                </div>
                <div className={styles.fieldGroup}>
                    <label>AI 评分标准 / 提示词</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="例如：'选A得2分' (通常选择题由系统自动判分，此处可留空或作为备注)"
                        value={question.aiGradingCriteria || ''}
                        onChange={(e) => handleChange('aiGradingCriteria', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export const ChoicePlayer = ({ question, value, onChange, readOnly }) => {
    const isMulti = question.type === 'MULTI_CHOICE';

    const handleClick = (optId) => {
        if (readOnly) return;
        let newValue;
        if (isMulti) {
            const current = Array.isArray(value) ? value : [];
            newValue = current.includes(optId)
                ? current.filter(id => id !== optId)
                : [...current, optId];
        } else {
            newValue = optId;
        }
        onChange(newValue);
    };

    return (
        <div className={styles.playerContainer}>
            {question.options.map(opt => {
                const isSelected = isMulti
                    ? Array.isArray(value) && value.includes(opt.id)
                    : value === opt.id;

                return (
                    <div
                        key={opt.id}
                        className={`${styles.playerOption} ${isSelected ? styles.selected : ''} ${readOnly ? styles.readOnly : ''}`}
                        onClick={() => handleClick(opt.id)}
                    >
                        <div className={styles.optionMarker}>
                            {isMulti
                                ? <FontAwesomeIcon icon={isSelected ? faCheckSquare : faSquare} />
                                : <div className={`${styles.radioCircle} ${isSelected ? styles.radioChecked : ''}`}></div>
                            }
                        </div>
                        <span className={styles.optionText}>
                            <strong>{opt.label}.</strong> {opt.text}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};