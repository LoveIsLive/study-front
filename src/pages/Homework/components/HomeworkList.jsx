import React from 'react';
import HomeworkCard from './HomeworkCard';
import styles from '../HomeworkPage.module.css';

const HomeworkList = ({ homeworks, onViewSubmissions, onDeleteHomework, onSelectHomework, isTeacher, onEditHomework }) => {
    if (!homeworks || homeworks.length === 0) {
        return <p className={styles.placeholderText}>{isTeacher ? '您还没有发布任何作业' : '当前没有作业'}</p>;
    }

    return (
        <div className={styles.listContainer}>
            {homeworks.map(hw => (
                <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    isTeacher={isTeacher}
                    onViewSubmissions={onViewSubmissions}
                    onDeleteHomework={onDeleteHomework}
                    onSelectHomework={onSelectHomework}
                    onEdit={onEditHomework}
                />
            ))}
        </div>
    );
};

export default HomeworkList;