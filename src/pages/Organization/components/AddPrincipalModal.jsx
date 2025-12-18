import React, { useState } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import styles from './AddMemberModal.module.css'; // 复用样式

const AddPrincipalModal = ({ isOpen, onClose, onAdd }) => {
    const [userNames, setUserNames] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const namesArray = userNames.split(/[\s,，\n]+/).filter(Boolean);
        if (namesArray.length === 0) return;

        // 固定角色 ROLE_PRINCIPAL
        onAdd({ userNames: namesArray, role: 'ROLE_PRINCIPAL' });
    };

    const handleClose = () => {
        setUserNames('');
        onClose();
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="添加学校负责人">
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="principalNamesInput">负责人用户名</label>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                        请输入用户名（不需要输入学校前缀），系统将自动创建账号或关联已有账号。初始密码为 123456。
                    </div>
                    <textarea
                        id="principalNamesInput"
                        className={styles.formControl}
                        rows="3"
                        placeholder="输入用户名，例如: zhangsan"
                        value={userNames}
                        onChange={(e) => setUserNames(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formActions}>
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>取消</button>
                    <button type="submit" className="btn btn-primary">确认添加</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddPrincipalModal;