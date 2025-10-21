import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal/Modal';
import styles from './ClassModal.module.css';

const ClassModal = ({ isOpen, onClose, onSave, classData }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (classData) {
            setName(classData.name);
        } else {
            setName('');
        }
    }, [classData, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name });
    };

    return (
        <Modal show={isOpen} onClose={onClose} title={classData ? '编辑班级' : '新建班级'}>
            <form onSubmit={handleSubmit}>
                {/* 2. 应用新的 className */}
                <div className={styles.formGroup}>
                    <label htmlFor="classNameInput">班级名称</label>
                    <input
                        id="classNameInput"
                        type="text"
                        className={styles.formControl}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className={styles.formActions}>
                    {/* 按钮使用全局样式，这是正确的 */}
                    <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                    <button type="submit" className="btn btn-primary">保存</button>
                </div>
            </form>
        </Modal>
    );
};

export default ClassModal;