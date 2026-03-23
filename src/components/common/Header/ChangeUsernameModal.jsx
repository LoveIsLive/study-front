import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { userApi } from '../../../services/api';
import useAuthStore from '../../../store/authStore';
import Swal from 'sweetalert2';
import styles from './ChangeUsernameModal.module.css';
import { config } from '../../../utils/config';

const ChangeUsernameModal = ({ isOpen, onClose }) => {
    const [newUsername, setNewUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async (e) => {
        if (e) e.preventDefault();
        if (!newUsername.trim()) return;

        setLoading(true);
        try {
            const res = await userApi.put('/username', { username: newUsername });
            if (res.data.code === 200) {
                await Swal.fire({
                    icon: 'success',
                    title: '用户名修改成功',
                    text: '为了保障账户安全，请使用新用户名重新登录。',
                    confirmButtonColor: '#FF7B54',
                    allowOutsideClick: false
                });
                // 彻底清除所有缓存并跳转
                useAuthStore.getState().logout();
                window.location.href = config.front_AUTH_PREFIX;
            } else {
                Swal.fire('修改失败', res.data.message || '该用户名可能已被占用', 'error');
            }
        } catch (err) {
            Swal.fire('系统错误', err.response?.data?.message || '无法连接到服务器', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={isOpen} onClose={onClose} title="修改用户名">
            <form onSubmit={handleConfirm} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="newUsernameInput">新用户名</label>
                    <input
                        id="newUsernameInput"
                        type="text"
                        className={styles.formControl}
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="建议使用姓名或学号"
                        autoComplete="off"
                        required
                    />
                    <p className={styles.hintText}>
                        注意：修改用户名后，当前的登录状态将失效，系统会要求您重新登录。
                    </p>
                </div>
                <div className={styles.formActions}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        取消
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !newUsername.trim()}
                    >
                        {loading ? '提交中...' : '确认修改'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ChangeUsernameModal;