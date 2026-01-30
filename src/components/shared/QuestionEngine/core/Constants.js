// src/components/shared/QuestionEngine/core/Constants.js

// 题目类型枚举
export const QUESTION_TYPES = {
    SINGLE_CHOICE: 'SINGLE_CHOICE',
    MULTI_CHOICE: 'MULTI_CHOICE',
    TEXT: 'TEXT',
    // FILE: 'FILE' // 暂时未启用，保留扩展位
};

// 题目类型对应的中文标签
export const QUESTION_TYPE_LABELS = {
    [QUESTION_TYPES.SINGLE_CHOICE]: '单选题',
    [QUESTION_TYPES.MULTI_CHOICE]: '多选题',
    [QUESTION_TYPES.TEXT]: '问答题',
    // [QUESTION_TYPES.FILE]: '附件题'
};

// 创建默认题目数据的工厂函数
export const createDefaultQuestion = (type) => {
    // 基础结构
    const base = {
        id: crypto.randomUUID(), // 生成唯一ID
        type,
        title: '',
        score: 5, // 默认分值
        required: true
        // 注意：后端协议中，options, correctAnswer 等字段是扁平化的，直接在根级
    };

    // 根据类型填充特定字段的默认值
    switch (type) {
        case QUESTION_TYPES.SINGLE_CHOICE:
            return {
                ...base,
                options: [
                    { id: crypto.randomUUID(), label: 'A', text: '' },
                    { id: crypto.randomUUID(), label: 'B', text: '' }
                ],
                correctAnswer: '' // 单选答案为 OptionID (String)
            };
        case QUESTION_TYPES.MULTI_CHOICE:
            return {
                ...base,
                options: [
                    { id: crypto.randomUUID(), label: 'A', text: '' },
                    { id: crypto.randomUUID(), label: 'B', text: '' },
                    { id: crypto.randomUUID(), label: 'C', text: '' },
                    { id: crypto.randomUUID(), label: 'D', text: '' }
                ],
                correctAnswer: [] // 多选答案为 OptionID 数组
            };
        case QUESTION_TYPES.TEXT:
            return {
                ...base,
                options: [], // 文本题不需要选项，但为了数据结构统一，可留空数组或不传
                correctAnswer: '', // 参考答案文本
                aiGradingCriteria: '' // AI 评分标准
            };
        default:
            return base;
    }
};