import React from 'react';
import ClassDetailView from './ClassDetailView';
import styles from '../OrganizationPage.module.css';

const MemberView = ({ classInfo }) => {
    // 如果用户不属于任何班级
    if (!classInfo) {
        return (
            <div className={styles.placeholder}>
                您当前未加入任何班级。
            </div>
        );
    }

    // 直接渲染班级详情视图，无需返回按钮，因为这是用户的唯一视图
    return (
        <ClassDetailView
            classId={classInfo.id}
            className={classInfo.name}
        // onBack prop 不再需要
        />
    );
};

export default MemberView;