import React, { useState, forwardRef } from 'react';
import Swal from 'sweetalert2';
import { useForm } from 'react-hook-form'; // 使用 react-hook-form 进行表单管理和校验
import { userApi } from '../../../services/api';
import Modal from '../Modal/Modal';
import styles from './ChangePasswordModal.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const PasswordInput = forwardRef(({ label, id, error, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    return (
        <div className={styles.formGroup}>
            <label htmlFor={id}>{label}</label>
            <div className={styles.passwordInputWrapper}>
                <input
                    id={id}
                    type={isPasswordVisible ? 'text' : 'password'}
                    className={`${styles.formControl} ${error ? styles.isInvalid : ''}`}
                    // b. 将 ...props 和 ref 都传递给底层的 input 元素
                    {...props}
                    ref={ref}
                />
                <FontAwesomeIcon
                    icon={isPasswordVisible ? faEyeSlash : faEye}
                    className={styles.eyeIcon}
                    onClick={togglePasswordVisibility}
                />
            </div>
            {error && <small className={styles.errorText}>{error.message}</small>}
        </div>
    );
});

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset } = useForm();
    const [serverError, setServerError] = useState('');

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const newPassword = watch('newPassword'); // 监视新密码字段

    const handleClose = () => {
        reset();
        setServerError('');
        // Reset visibility states
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onClose();
    };

    const onSubmit = async (data) => {
        setServerError(''); // 每次提交前清空之前的错误
        try {
            const response = await userApi.put('/password', {
                oldPassword: data.oldPassword,
                newPassword: data.newPassword,
            });

            // 根据后端返回的 R 对象的 code 和 data 来判断
            // 假设 R.success 的 code 是 200, R.error 的 code 是其他值 (e.g., 500)
            if (response.data.code === 200) {
                // HTTP 状态码是 2xx，且业务 code 是 200，说明完全成功
                await Swal.fire({
                    icon: 'success',
                    title: '密码修改成功',
                    text: '下次登录请使用新密码。',
                });
                handleClose();
            } else {
                // HTTP 状态码是 2xx，但业务 code 不是 200，说明是业务逻辑错误
                // 例如 "旧密码不正确"
                setServerError(response.data.message || '操作失败');
            }
        } catch (error) {
            // 当 HTTP 状态码不是 2xx 时 (e.g., 400, 401, 500)，会进入 catch 块
            setServerError(error.response?.data?.message || '服务器发生错误，请稍后重试');
        }
    };

    return (
        <Modal show={isOpen} onClose={handleClose} title="修改密码">
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                {serverError && <div className={styles.serverError}>{serverError}</div>}

                {/* --- 3. 重构为使用 PasswordInput 组件 --- */}
                <PasswordInput
                    label="旧密码"
                    id="oldPassword"
                    error={errors.oldPassword}
                    {...register('oldPassword', { required: '旧密码不能为空' })}
                />

                <PasswordInput
                    label="新密码"
                    id="newPassword"
                    error={errors.newPassword}
                    {...register('newPassword', {
                        required: '新密码不能为空',
                        minLength: { value: 6, message: '新密码长度不能少于6位' },
                        maxLength: { value: 20, message: '新密码长度不能超过20位' },
                    })}
                />

                <PasswordInput
                    label="确认新密码"
                    id="confirmPassword"
                    error={errors.confirmPassword}
                    {...register('confirmPassword', {
                        required: '请再次输入新密码',
                        validate: value => value === newPassword || '两次输入的密码不一致',
                    })}
                />

                <div className={styles.formActions}>
                    <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
                        取消
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? '保存中...' : '确认修改'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ChangePasswordModal;