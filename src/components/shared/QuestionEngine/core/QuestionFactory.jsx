import React from 'react';
import { QUESTION_TYPES } from './Constants';
// 修改引用路径，指向正确的 Question 文件
import { ChoiceEditor, ChoicePlayer } from '../types/ChoiceQuestion';
import { TextEditor, TextPlayer } from '../types/TextQuestion';

export const renderEditor = (question, onChange) => {
    switch (question.type) {
        case QUESTION_TYPES.SINGLE_CHOICE:
        case QUESTION_TYPES.MULTI_CHOICE:
            return <ChoiceEditor question={question} onChange={onChange} />;
        case QUESTION_TYPES.TEXT:
            return <TextEditor question={question} onChange={onChange} />;
        default:
            return <div>未知题型: {question.type}</div>;
    }
};

export const renderPlayer = (question, value, onChange, readOnly = false) => {
    switch (question.type) {
        case QUESTION_TYPES.SINGLE_CHOICE:
        case QUESTION_TYPES.MULTI_CHOICE:
            return <ChoicePlayer question={question} value={value} onChange={onChange} readOnly={readOnly} />;
        case QUESTION_TYPES.TEXT:
            return <TextPlayer question={question} value={value} onChange={onChange} readOnly={readOnly} />;
        default:
            return <div>不支持的题型</div>;
    }
};