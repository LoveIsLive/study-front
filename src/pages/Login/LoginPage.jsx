import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEye, faEyeSlash, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../store/authStore';
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
        if (isLoading) return;
        setIsLoading(true);

        // 写死的账号密码，不发送后端请求
        const validUsers = {
            teacher: '123456',
            master: '123456',
            student: '123456',
            admin: '123456'
        };

        if (validUsers[username] && password === validUsers[username]) {
            const fakeToken = 'fake-token-' + username;
            await login(fakeToken);

            Swal.fire({
                icon: 'success',
                title: '欢迎回来',
                text: `用户 ${username} 登录成功，正在进入智慧教学系统...`,
                showConfirmButton: false,
                timer: 1500,
                position: 'center'
            });

            navigate(config.front_HOME_PAGE_URL);
        } else {
            Swal.fire({
                icon: 'error',
                title: '认证失败',
                text: '用户名或密码不正确',
                confirmButtonColor: '#FF7B54'
            });
        }

        setIsLoading(false);
    };

    return (
        <div className={styles.pageContainer}>
            {/* 背景装饰物 */}
            <div className={styles.bgDecoration1}></div>
            <div className={styles.bgDecoration2}></div>

            <div className={styles.loginCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.logoCircle}>
                        <FontAwesomeIcon icon={faGraduationCap} />
                    </div>
                    <h1>智慧教学系统</h1>
                    <p>Smart Study & Teaching Platform</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    <div className={styles.inputWrapper}>
                        <FontAwesomeIcon icon={faUser} className={styles.inputIcon} />
                        <input
                            type="text"
                            placeholder="用户名 / 学号"
                            required
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className={styles.inputWrapper}>
                        <FontAwesomeIcon icon={faLock} className={styles.inputIcon} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="密码"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div
                            className={styles.passwordToggle}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                        {isLoading ? (
                            <div className={styles.loader}></div>
                        ) : (
                            '立即登录'
                        )}
                    </button>
                </form>

                <div className={styles.cardFooter}>
                    <p>© 2025 Study System. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;