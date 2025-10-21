import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import styles from './AddMemberModal.module.css';

const AddMemberModal = ({ isOpen, onClose, onAdd }) => {
    const [userNames, setUserNames] = useState('');
    const [role, setRole] = useState('ROLE_STUDENT'); // 默认添加学生

    const handleSubmit = (e) => {
        e.preventDefault();
        // 按空格、逗号（中英文）、换行符分割，并过滤掉空字符串
        const namesArray = userNames.split(/[\s,，\n]+/).filter(Boolean);
        if (namesArray.length === 0) return;

        onAdd({ userNames: namesArray, role });
    };

    const handleClose = () => {
        // 关闭时重置表单状态
        setUserNames('');
        setRole('ROLE_STUDENT');
        onClose();
    };

    // 注意：删除成员的逻辑已从该模态框分离到 MemberTable 中，
    // 这使得组件职责更清晰，符合单一职责原则。

    return (
        <Modal show={isOpen} onClose={handleClose} title="添加成员">
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="userNamesInput">用户名</label>
                    <textarea
                        id="userNamesInput"
                        className={styles.formControl}
                        rows="4"
                        placeholder="输入一个或多个用户名，用空格、逗号或换行隔开"
                        value={userNames}
                        onChange={(e) => setUserNames(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>要添加的角色</label>
                    <div className={styles.roleSelector}>
                        <label>
                            <input
                                type="radio"
                                value="ROLE_STUDENT"
                                checked={role === 'ROLE_STUDENT'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            学生 (Student)
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="ROLE_TEACHER"
                                checked={role === 'ROLE_TEACHER'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            教师 (Teacher)
                        </label>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>取消</button>
                    <button type="submit" className="btn btn-primary">确认添加</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddMemberModal;