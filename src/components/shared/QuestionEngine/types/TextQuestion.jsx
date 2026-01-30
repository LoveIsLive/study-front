import React from 'react';
import styles from './QuestionTypes.module.css';

// --- 编辑器 (Teacher) ---
export const TextEditor = ({ question, onChange }) => {

    const handleChange = (field, val) => {
        onChange({ ...question, [field]: val });
    };

    return (
        <div className={styles.editorContainer}>
            <div className={styles.fieldGroup}>
                <label>参考答案 <span style={{ fontWeight: 'normal', color: '#888' }}>(用于 AI 批改参考)</span></label>
                <textarea
                    className={styles.textarea}
                    rows={3}
                    placeholder="在此输入参考答案..."
                    value={question.correctAnswer || ''}
                    onChange={(e) => handleChange('correctAnswer', e.target.value)}
                />
            </div>

            {/* --- 新增：解析 --- */}
            <div className={styles.fieldGroup}>
                <label>题目解析 (Analysis)</label>
                <textarea
                    className={styles.textarea}
                    rows={3}
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
                    placeholder="例如：提到'封装'得2分，提到'多态'得3分..."
                    value={question.aiGradingCriteria || ''}
                    onChange={(e) => handleChange('aiGradingCriteria', e.target.value)}
                />
            </div>
        </div>
    );
};

// --- 答题器 (Student) ---
export const TextPlayer = ({ value, onChange, readOnly }) => {
    return (
        <div className={styles.playerContainer}>
            <textarea
                className={styles.textarea}
                rows={5}
                placeholder={readOnly ? "未作答" : "在此输入你的回答..."}
                value={value || ''}
                onChange={(e) => !readOnly && onChange(e.target.value)}
                disabled={readOnly}
                style={{ resize: 'vertical', minHeight: '100px' }}
            />
        </div>
    );
};