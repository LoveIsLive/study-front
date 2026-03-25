import React from 'react';
import HomeworkCard from './HomeworkCard';
import styles from '../HomeworkPage.module.css';
import useAuthStore from '../../../store/authStore';

const HomeworkList = ({ homeworks, onViewSubmissions, onDeleteHomework,
    onSelectHomework, onEditHomework, onOpenDiscussion }) => {
    const { user } = useAuthStore();
    const isManage = user && (user.isTeacher || user.isAdmin);

    if (!homeworks || homeworks.length === 0) {
        return <p className={styles.placeholderText}>{isManage ? '您还没有发布任何作业' : '当前没有作业'}</p>;
    }

    return (
        <div className={styles.listContainer}>
            {homeworks.map(hw => (
                <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onViewSubmissions={onViewSubmissions}
                    onDeleteHomework={onDeleteHomework}
                    onSelectHomework={onSelectHomework}
                    onEdit={onEditHomework}
                    onOpenDiscussion={onOpenDiscussion}
                />
            ))}
        </div>
    );
};

export default HomeworkList;