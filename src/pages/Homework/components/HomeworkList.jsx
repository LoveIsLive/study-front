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
    const isGuest = useAuthStore((state) => state.isGuest());

    const isManage = user && (isTeacher || isAdmin || isPrincipal);

    // 根据不同角色，给予更人性化的空状态提示
    if (!homeworks || homeworks.length === 0) {
        let emptyMessage = "当前没有作业";

        if (isManage) {
            emptyMessage = "您还没有发布任何作业";
        } else if (isGuest) {
            // 【修改】：既然现在能查出来了，如果没数据，就说明这些课程确实还没发布作业
            emptyMessage = "当前公开课程中暂未发布任何作业";
        }

        return (
            <div
                style={{ textAlign: "center", padding: "40px 20px", color: "#8c8c8c" }}
            >
                <p className={styles.placeholderText}>{emptyMessage}</p>
            </div>
        );
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