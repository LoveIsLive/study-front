import React from 'react';
import { ChoicePlayer } from '../types/ChoiceQuestion';
import { TextPlayer } from '../types/TextQuestion';
import styles from '../QuestionEngine.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faLightbulb, faPenNib, faListUl } from '@fortawesome/free-solid-svg-icons';

/**
 * 辅助函数：将答案 ID 转换为可读的 Label (A, B...)
 */
const getCorrectAnswerLabel = (question) => {
    if (!question) return '无';

    // 1. 简答题直接返回文本
    if (question.type === 'TEXT') {
        return question.correctAnswer || '无参考答案';
    }

    // 2. 选择题需查找 Option
    if (!question.options || question.options.length === 0) return '无选项';

    const findLabel = (id) => {
        const opt = question.options.find(o => o.id === id);
        return opt ? opt.label : '?'; // 找不到显示 ?
    };

    if (question.type === 'SINGLE_CHOICE') {
        return findLabel(question.correctAnswer);
    }

    if (question.type === 'MULTI_CHOICE') {
        const ans = question.correctAnswer;
        if (Array.isArray(ans)) {
            // 将找到的 label 排序 (A, B 而不是 B, A) 并连接
            return ans.map(findLabel).sort().join(', ');
        }
        return '无';
    }
    return '未知类型';
};

const HomeworkPlayer = ({
    questions,
    answers,
    setAnswers,
    readOnly = false,
    isTeacher = false,
    isGradingMode = false,
    gradingData = { details: {} },
    onGradingChange
}) => {

    const handleAnswerChange = (qId, val) => {
        if (!readOnly && setAnswers) {
            setAnswers(prev => ({ ...prev, [qId]: val }));
        }
    };

    // 渲染参考答案区 (包含解析、AI标准)
    const renderReference = (q) => {
        // 学生只有在 (readOnly 且 已批改) 时可见，或者 教师始终可见
        // 这里简化逻辑：如果是教师或者是只读模式(代表已提交/已批改)，则显示
        // 实际业务中可能需要判断 submission.status === 'GRADED'
        if (!isTeacher && !readOnly) return null;

        const label = getCorrectAnswerLabel(q);

        return (
            <div className={styles.referenceBox}>
                {/* 1. 正确答案 */}
                <div className={styles.refRow}>
                    <strong className={styles.refLabel} style={{ color: '#28a745' }}>
                        <FontAwesomeIcon icon={faCheck} /> 正确答案：
                    </strong>
                    <span className={styles.refContent} style={{ fontWeight: 'bold' }}>
                        {label}
                    </span>
                </div>

                {/* 2. AI 评分标准 (仅简答题显示，或者都显示) */}
                {q.aiGradingCriteria && (
                    <div className={styles.refRow}>
                        <strong className={styles.refLabel} style={{ color: '#17a2b8' }}>
                            <FontAwesomeIcon icon={faListUl} /> 评分标准：
                        </strong>
                        <span className={styles.refContent}>{q.aiGradingCriteria}</span>
                    </div>
                )}

                {/* 3. 解析 (修复：显示解析) */}
                {q.analysis && (
                    <div className={styles.refRow}>
                        <strong className={styles.refLabel} style={{ color: '#ffc107' }}>
                            <FontAwesomeIcon icon={faLightbulb} /> 解析：
                        </strong>
                        <div className={styles.refContent}>{q.analysis}</div>
                    </div>
                )}
            </div>
        );
    };

    // 渲染批改输入区域
    const renderGradingArea = (q) => {
        const detail = gradingData?.details?.[q.id] || {};

        // 1. 教师输入模式
        if (isTeacher && isGradingMode) {
            return (
                <div className={styles.gradingInputBox}>
                    <div className={styles.gradingHeader}>
                        <FontAwesomeIcon icon={faPenNib} /> 教师评分
                    </div>
                    <div className={styles.gradingRow}>
                        <label>得分 (满分 {q.score}):</label>
                        <input
                            type="number"
                            min="0"
                            max={q.score}
                            // 修复：确保 value 不为 undefined，否则变成非受控组件
                            value={detail.score !== undefined ? detail.score : ''}
                            onChange={(e) => onGradingChange(q.id, 'score', e.target.value === '' ? '' : parseInt(e.target.value))}
                            className={styles.scoreInput}
                        />
                    </div>
                    <div className={styles.gradingRow}>
                        <label>评语:</label>
                        <input
                            type="text"
                            placeholder="请输入评语..."
                            value={detail.comment || ''}
                            onChange={(e) => onGradingChange(q.id, 'comment', e.target.value)}
                            className={styles.commentInput}
                        />
                    </div>
                </div>
            );
        }

        // 2. 结果展示模式
        if (detail.score !== undefined) {
            return (
                <div className={`${styles.gradingResultBox} ${detail.score > 0 ? styles.resultSuccess : styles.resultDanger}`}>
                    <div className={styles.resultScore}>
                        得分：<span>{detail.score}</span> / {q.score}
                    </div>
                    {detail.comment && (
                        <div className={styles.resultComment}>
                            <strong>评语：</strong> {detail.comment}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className={styles.playerContainer}>
            {questions.map((q, idx) => (
                <div key={q.id} className={styles.questionCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.headerLeft}>
                            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{idx + 1}.</span>
                            <span style={{ fontSize: '1.1rem' }}>{q.title}</span>
                            <span style={{ color: '#888', fontSize: '0.9rem', marginLeft: '10px' }}>({q.score}分)</span>
                        </div>
                    </div>

                    <div className={styles.cardBody}>
                        {q.type === 'TEXT'
                            ? <TextPlayer
                                value={answers[q.id]}
                                onChange={val => handleAnswerChange(q.id, val)}
                                readOnly={readOnly}
                            />
                            : <ChoicePlayer
                                question={q}
                                value={answers[q.id]}
                                onChange={val => handleAnswerChange(q.id, val)}
                                readOnly={readOnly}
                            />
                        }

                        {/* 分割线 */}
                        {(isTeacher || readOnly) && <hr className={styles.divider} />}

                        {/* 参考答案区域 */}
                        {renderReference(q)}

                        {/* 批改区域 */}
                        {renderGradingArea(q)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default HomeworkPlayer;