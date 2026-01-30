import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrashAlt, faArrowUp, faArrowDown, faMagic
} from '@fortawesome/free-solid-svg-icons';

import { QUESTION_TYPES, QUESTION_TYPE_LABELS, createDefaultQuestion } from '../core/Constants';
import { ChoiceEditor } from '../types/ChoiceQuestion';
import { TextEditor } from '../types/TextQuestion';
import styles from './Builder.module.css';

// 接收 onToggleAIPanel 属性
const QuestionBuilder = ({ questions, setQuestions, onToggleAIPanel }) => {

    const updateQuestion = (index, updatedQ) => {
        const newQuestions = [...questions];
        newQuestions[index] = updatedQ;
        setQuestions(newQuestions);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const addQuestion = (type) => {
        setQuestions([...questions, createDefaultQuestion(type)]);
    };

    const moveQuestion = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === questions.length - 1)) return;
        const newQuestions = [...questions];
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + direction];
        newQuestions[index + direction] = temp;
        setQuestions(newQuestions);
    };

    return (
        <div className={styles.builderContainer}>
            {/* Top Toolbar */}
            <div className={styles.topToolbar}>
                <button
                    className={styles.aiTriggerBtn}
                    onClick={onToggleAIPanel} // 只触发开关
                >
                    <FontAwesomeIcon icon={faMagic} className={styles.magicIcon} />
                    <span>AI 智能出题助手</span>
                    <span className={styles.aiTag}>侧边栏模式</span>
                </button>
                <div className={styles.tips}>
                    💡 点击召唤 AI，上传教案或描述需求，一键生成整套试卷。
                </div>
            </div>

            {/* Question List */}
            <div className={styles.questionList}>
                {questions.map((q, idx) => (
                    <div key={q.id} className={styles.questionCard}>
                        {/* ... (题目卡片渲染逻辑保持不变) ... */}
                        <div className={styles.indexNum}>{idx + 1}.</div>
                        <div className={styles.cardHeader}>
                            <div className={styles.headerLeft}>
                                <span className={styles.typeBadge}>{QUESTION_TYPE_LABELS[q.type]}</span>
                                <input
                                    type="text"
                                    className={styles.titleInput}
                                    value={q.title}
                                    placeholder="请输入题干内容..."
                                    onChange={(e) => updateQuestion(idx, { ...q, title: e.target.value })}
                                />
                            </div>
                            <div className={styles.headerRight}>
                                <div className={styles.scoreInputWrapper}>
                                    <span>分值</span>
                                    <input
                                        type="number"
                                        className={styles.scoreInput}
                                        value={q.score}
                                        min={0}
                                        onChange={(e) => updateQuestion(idx, { ...q, score: Number(e.target.value) })}
                                    />
                                </div>
                                <div className={styles.actions}>
                                    <button type="button" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}><FontAwesomeIcon icon={faArrowUp} /></button>
                                    <button type="button" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}><FontAwesomeIcon icon={faArrowDown} /></button>
                                    <button type="button" className={styles.deleteBtn} onClick={() => removeQuestion(idx)}><FontAwesomeIcon icon={faTrashAlt} /></button>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardBody}>
                            {q.type === QUESTION_TYPES.TEXT
                                ? <TextEditor question={q} onChange={val => updateQuestion(idx, val)} />
                                : <ChoiceEditor question={q} onChange={val => updateQuestion(idx, val)} />
                            }
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Bar */}
            <div className={styles.addBar}>
                <button type="button" className={styles.addTypeBtn} onClick={() => addQuestion(QUESTION_TYPES.SINGLE_CHOICE)}>
                    <FontAwesomeIcon icon={faPlus} /> 单选题
                </button>
                <button type="button" className={styles.addTypeBtn} onClick={() => addQuestion(QUESTION_TYPES.MULTI_CHOICE)}>
                    <FontAwesomeIcon icon={faPlus} /> 多选题
                </button>
                <button type="button" className={styles.addTypeBtn} onClick={() => addQuestion(QUESTION_TYPES.TEXT)}>
                    <FontAwesomeIcon icon={faPlus} /> 问答题
                </button>
            </div>
        </div>
    );
};

export default QuestionBuilder;