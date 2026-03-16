import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEdit, faUndo, faComments, faInfoCircle,
    faCheckCircle, faExclamationTriangle, faTimesCircle, faEye, faGraduationCap
} from '@fortawesome/free-solid-svg-icons';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import styles from '../HomeworkPage.module.css';

// 状态显示辅助函数 (已更新为匹配中文状态)
const getStatusInfo = (status) => {
    switch (status) {
        case '被退回':
            return { text: '被退回', className: styles.statusReturned, icon: faTimesCircle };
        case '作业有更新':
            return { text: '作业有更新', className: styles.statusUpdated, icon: faExclamationTriangle };
        case '重新提交':
            return { text: '重新提交', className: styles.statusResubmitted, icon: faCheckCircle };
        case '已批改':
            return { text: '已批改', className: styles.statusGraded, icon: faCheckCircle };
        case '已提交':
        default:
            return { text: '已提交', className: styles.statusSubmitted, icon: faInfoCircle };
    }
};

const SubmissionCard = ({ submission, isStudentView, onReturn, onEdit, onOpenDiscussion, onViewDetail }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('zh-CN');
    const statusInfo = getStatusInfo(submission.status);

    const title = isStudentView
        ? `作业: ${sanitizeHTML(submission.homework?.title || '未知作业')}`
        : `<strong>${submission.studentName}</strong>`;

    // 判断是否是结构化作业（通过是否有 answerData 或 content 为空来推断）
    // 注意：列表接口返回的 submission 可能没有 homework.type，所以这里做个简单判断
    const hasContent = submission.content && submission.content.trim().length > 0;
    const hasAnswerData = submission.answerData && submission.answerData !== '{}';

    let maxScore = null;
    if (submission.homework?.type === 'STRUCTURED' && submission.homework?.metaData) {
        try {
            const meta = typeof submission.homework.metaData === 'string'
                ? JSON.parse(submission.homework.metaData)
                : submission.homework.metaData;
            maxScore = meta.totalScore;
        } catch (e) {
            console.error("解析 metaData 获取总分失败", e);
        }
    }

    return (
        <div className={styles.itemCard}>
            <div className={styles.cardHeader}>
                <div>
                    <h3 className={styles.cardNoclickTitle} dangerouslySetInnerHTML={{ __html: title }} />
                    <div className={`${styles.statusTag} ${statusInfo.className}`}>
                        <FontAwesomeIcon icon={statusInfo.icon} />
                        <span>{statusInfo.text}</span>
                    </div>
                    {/* 显示分数 */}
                    {submission.score !== null && (
                        <span style={{ marginLeft: '10px', color: '#FF7B54', fontWeight: 'bold' }}>
                            {submission.score} {maxScore ? `/ ${maxScore}` : ''} 分
                        </span>
                    )}
                </div>
                <div className={styles.cardMeta}>
                    修改时间: {formatDate(submission.updateTime)} <br />
                    {isStudentView && `提交者: ${submission.studentName}`}
                </div>
            </div>

            <div className={styles.cardContent}>
                {/* 【修复点 5】：优化内容展示逻辑 */}
                {hasContent ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) }} />
                ) : hasAnswerData ? (
                    <div style={{ color: '#666', fontStyle: 'italic' }}>
                        [结构化答题卡内容，请点击详情查看]
                    </div>
                ) : (
                    <div style={{ color: '#999', fontStyle: 'italic' }}>无文本内容</div>
                )}
            </div>

            <div className={styles.cardAttachments}>
                <AttachmentList attachments={submission.attachments} />
            </div>

            <div className={styles.cardFooter}>
                <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => onOpenDiscussion({
                        ownerId: submission.id,
                        ownerType: 'submission',
                        title: `${submission.studentName} 的提交`
                    })}
                >
                    <FontAwesomeIcon icon={faComments} /> 讨论
                </button>

                {/* 【修复点 6】：教师端增加入口按钮 */}
                {!isStudentView && onViewDetail && (
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => onViewDetail(submission.id)}
                    >
                        {/* 如果已批改显示查看，未批改显示批改 */}
                        <FontAwesomeIcon icon={submission.status === '已批改' ? faEye : faGraduationCap} />
                        {submission.status === '已批改' ? ' 查看详情' : ' 批改作业'}
                    </button>
                )}

                {/* 学生端修改按钮 */}
                {isStudentView && (submission.status === '被退回' || submission.status === '作业有更新') && (
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onEdit(submission)}>
                        <FontAwesomeIcon icon={faEdit} /> 修改提交
                    </button>
                )}

                {/* 学生端查看详情按钮（可选，如果你希望学生也能点进去看分数详情） */}
                {isStudentView && onViewDetail && submission.status !== '被退回' && submission.status !== '作业有更新' && (
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onViewDetail(submission.homeworkId)}>
                        <FontAwesomeIcon icon={faEye} /> 查看详情
                    </button>
                )}

                {/* 教师端退回按钮 */}
                {!isStudentView && (
                    <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => onReturn(submission.id, submission.studentName)}
                        disabled={submission.status === '被退回'}
                    >
                        <FontAwesomeIcon icon={faUndo} /> {submission.status === '被退回' ? '已被退回' : '退回作业'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SubmissionCard;