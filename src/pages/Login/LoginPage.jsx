import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../services/api';
import { config } from '../../utils/config';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await authApi.post('/login', { username, password });
            if (response.data && response.data.code === 200 && response.data.data) {
                const token = response.data.data;
                login(token);
                await Swal.fire({
                    icon: 'success',
                    title: '登录成功!',
                    showConfirmButton: false,
                    timer: 1500
                });
                navigate(config.front_HOME_PAGE_URL);
            } else {
                throw new Error(response.data.message || '登录失败');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: '登录失败',
                text: error.response?.data?.message || error.message || '服务器发生错误',
                timer: 1500
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.loginBox}>
                <h2>教学系统登录</h2>
                <form id="login-form" onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <FontAwesomeIcon icon={faUser} className={styles.leftIcon} />
                        <input
                            type="text"
                            id="username"
                            placeholder="用户名"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <FontAwesomeIcon icon={faLock} className={styles.leftIcon} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="密码"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <FontAwesomeIcon
                            icon={showPassword ? faEye : faEyeSlash}
                            id={styles.togglePassword}
                            onClick={() => setShowPassword(!showPassword)}
                        />
                    </div>
                    <button type="submit" className={styles.loginButton} disabled={isLoading}>
                        {isLoading ? '登录中...' : '登 录'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;