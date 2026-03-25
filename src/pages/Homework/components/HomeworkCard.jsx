import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faTrashAlt, faEdit, faComments } from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../../store/authStore';
import { sanitizeHTML } from '../../../utils/helpers';
import AttachmentList from './AttachmentList';
import styles from '../HomeworkPage.module.css';

const HomeworkCard = ({ homework, onEdit, onViewSubmissions, onDeleteHomework, onSelectHomework, onOpenDiscussion }) => {
    const { user } = useAuthStore(); // 获取当前用户信息
    const formatDate = (dateString) => new Date(dateString).toLocaleString('zh-CN');

    // 权限判断：是否应该显示操作按钮
    const canOperate = user && (user.isAdmin || user.isTeacher);

    return (
        <div className={styles.itemCard}>
            <div className={styles.cardHeader}>
                <div>
                    {canOperate ? (
                        <h3 className={styles.cardNoclickTitle}>{sanitizeHTML(homework.title)}</h3>
                    ) : (
                        <h3 className={styles.cardTitle} onClick={() => onSelectHomework(homework.id)}>
                            {sanitizeHTML(homework.title)}
                        </h3>
                    )}
                </div>
                <div className={styles.cardMeta}>
                    修改日期: {formatDate(homework.updateTime)} <br />
                    发布者: {homework.teacherName}
                </div>
            </div>

            <div className={styles.cardContent} dangerouslySetInnerHTML={{ __html: sanitizeHTML(homework.content) || '<i>无具体内容</i>' }} />

            <div className={styles.cardAttachments}>
                <AttachmentList attachments={homework.attachments} />
            </div>

            <div className={styles.cardFooter}>
                <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => onOpenDiscussion({
                        ownerId: homework.id,
                        ownerType: 'homework',
                        title: homework.title
                    })}
                >
                    <FontAwesomeIcon icon={faComments} /> 讨论区
                </button>
                {!canOperate && (
                    <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => onSelectHomework(homework.id)}
                    >
                        <FontAwesomeIcon icon={faUsers} /> 提交/查看
                    </button>
                )}

                {canOperate && (
                    <>
                        <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => onEdit(homework)}
                        >
                            <FontAwesomeIcon icon={faEdit} /> 编辑
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => onViewSubmissions(homework.id)}
                        >
                            <FontAwesomeIcon icon={faUsers} /> 查看提交
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={() => onDeleteHomework(homework.id, homework.title)}
                        >
                            <FontAwesomeIcon icon={faTrashAlt} /> 删除作业
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default HomeworkCard;