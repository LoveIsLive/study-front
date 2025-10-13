import React from 'react';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import styles from '../HomeworkPage.module.css';

const HomeworkCard = ({ homework, isTeacher, onViewSubmissions, onDeleteHomework, onSelectHomework }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN');

    return (
        <div className={styles.itemCard}>
            <div className={styles.cardHeader}>
                <div>
                    {isTeacher ? (
                        <h3 className={styles.cardNoclickTitle}>{sanitizeHTML(homework.title)}</h3>
                    ) : (
                        <h3 className={styles.cardTitle} onClick={() => onSelectHomework(homework.id)}>
                            {sanitizeHTML(homework.title)}
                        </h3>
                    )}
                </div>
                <div className={styles.cardMeta}>
                    发布于: {formatDate(homework.createTime)} <br />
                    发布者: {homework.teacherName}
                </div>
            </div>
            <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(homework.content) || '<i>无提交内容</i>' }} />
            <div className={styles.cardAttachments}>
                <AttachmentList attachments={homework.attachments} />
            </div>
            {isTeacher && (
                <div className={styles.cardFooter}>
                    <button className={styles.btnSecondary} onClick={() => onViewSubmissions(homework.id)}>
                        <i className="fas fa-users"></i> 查看提交
                    </button>
                    <button className={styles.btnDanger} onClick={() => onDeleteHomework(homework.id, homework.title)}>
                        <i className="fas fa-trash-alt"></i> 删除作业
                    </button>
                </div>
            )}
        </div>
    );
};

export default HomeworkCard;