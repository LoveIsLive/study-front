import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faUndo, faComments } from '@fortawesome/free-solid-svg-icons';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import styles from '../HomeworkPage.module.css';

// 状态显示辅助函数 (已更新为匹配中文状态)
const getStatusInfo = (status) => {
    switch (status) {
        case '被退回':
            return { text: '被退回', className: styles.statusReturned };
        case '作业有更新':
            return { text: '作业有更新', className: styles.statusUpdated };
        case '重新提交':
            return { text: '重新提交', className: styles.statusResubmitted };
        case '已提交':
        default:
            return { text: '已提交', className: styles.statusSubmitted };
    }
};

const SubmissionCard = ({ submission, isStudentView, onReturn, onEdit, onOpenDiscussion }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN');
    const statusInfo = getStatusInfo(submission.status);

    const title = isStudentView
        ? `作业: ${sanitizeHTML(submission.homework?.title || '未知作业')}`
        : `<strong>${submission.studentName}</strong>`;

    const cardClasses = `${styles.itemCard} ${styles.statusRibbon} ${statusInfo.className}`;

    return (
        <div className={cardClasses} data-status={statusInfo.text}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardNoclickTitle} dangerouslySetInnerHTML={{ __html: title }} />
                <div className={styles.cardMeta}>
                    提交于: {formatDate(submission.createTime)} <br />
                    {isStudentView && `提交者: ${submission.studentName}`}
                </div>
            </div>
            <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) || '<i>无提交内容</i>' }} />
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

                {/* 学生视图下，只有被退回的作业才能修改 (已更新为匹配中文状态) */}
                {isStudentView && (submission.status === '被退回' || submission.status === '作业有更新') && (
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onEdit(submission)}>
                        <FontAwesomeIcon icon={faEdit} /> 修改提交
                    </button>
                )}

                {/* 教师/管理员视图下，可以退回作业 (已更新为匹配中文状态) */}
                {!isStudentView && (
                    <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => onReturn(submission.id, submission.studentName)}
                        disabled={submission.status === '被退回'} // 如果已被退回，则禁用按钮
                    >
                        <FontAwesomeIcon icon={faUndo} /> {submission.status === '被退回' ? '已被退回' : '退回作业'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SubmissionCard;