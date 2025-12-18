import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import styles from './ClassModal.module.css'; // 复用 ClassModal 的样式

const SchoolModal = ({ isOpen, onClose, onSave, schoolData }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (schoolData) {
            setName(schoolData.name);
        } else {
            setName('');
        }
    }, [schoolData, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name });
    };

    return (
        <Modal show={isOpen} onClose={onClose} title={schoolData ? '编辑学校' : '新建学校'}>
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="schoolNameInput">学校名称</label>
                    <input
                        id="schoolNameInput"
                        type="text"
                        className={styles.formControl}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className={styles.formActions}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                    <button type="submit" className="btn btn-primary">保存</button>
                </div>
            </form>
        </Modal>
    );
};

export default SchoolModal;