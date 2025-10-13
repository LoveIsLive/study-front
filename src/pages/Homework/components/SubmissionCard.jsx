import React from 'react';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import styles from '../HomeworkPage.module.css';

const SubmissionCard = ({ submission, isStudentView }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN');

    const title = isStudentView
        ? `作业: ${sanitizeHTML(submission.homework?.title || '未知作业')}`
        : `${submission.studentName}`;

    return (
        <div className={styles.itemCard}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardNoclickTitle} dangerouslySetInnerHTML={{ __html: title }} />
                <div className={styles.cardMeta}>
                    提交于: {formatDate(submission.createTime)} <br />
                    提交者: {submission.studentName}
                </div>
            </div>
            <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(submission.content) || '<i>无提交内容</i>' }} />
            <div className={styles.cardAttachments}>
                <AttachmentList attachments={submission.attachments} />
            </div>
        </div>
    );
};

export default SubmissionCard;