import React from 'react';
import HomeworkCard from './HomeworkCard';
import styles from '../HomeworkPage.module.css';
import useAuthStore from '../../../store/authStore';

const HomeworkList = ({ homeworks, onViewSubmissions, onDeleteHomework,
    onSelectHomework, onEditHomework, onOpenDiscussion }) => {
    const { user } = useAuthStore();
    const isAdmin = useAuthStore((state) => state.isAdmin());
    const isTeacher = useAuthStore((state) => state.isTeacher());
    const isPrincipal = useAuthStore((state) => state.isPrincipal());

    const isManage = user && (isTeacher || isAdmin || isPrincipal);

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