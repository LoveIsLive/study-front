import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useAuthStore from '../../../store/authStore';
import { config } from '../../../utils/config';
import styles from './Header.module.css';

const Header = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        Swal.fire({
            title: '您确定要退出吗?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: '确定退出',
            cancelButtonText: '取消'
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
                navigate(config.front_AUTH_PREFIX, { replace: true });
            }
        });
    };

    const toggleDropdown = () => setDropdownVisible(!isDropdownVisible);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const avatarUrl = 'https://placehold.co/100x100/4A90E2/FFFFFF?text=W'; // 示例头像

    if (!user) {
        return null; // 或者显示一个加载状态
    }

    return (
        <header className={styles.mainHeader}>
            <div className={styles.headerContainer}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerLogo}>
                        <NavLink to="/">教学系统</NavLink>
                    </div>
                    <nav className={styles.headerNav}>
                        <ul>
                            <li><NavLink to="/ware/home" className={({ isActive }) => isActive ? styles.active : ''}>课程仓库</NavLink></li>
                            <li><NavLink to="/homework" className={({ isActive }) => isActive ? styles.active : ''}>作业区</NavLink></li>
                        </ul>
                    </nav>
                </div>

                <div className={styles.headerRight} ref={dropdownRef}>
                    <div className={styles.userProfileContainer}>
                        <div className={styles.userProfile} onClick={toggleDropdown}>
                            <img src={avatarUrl} alt="User Avatar" />
                            <span>{user.name}</span>
                        </div>
                        {isDropdownVisible && (
                            <div className={`${styles.userDropdown} ${styles.show}`}>
                                <div className={styles.dropdownHeader}>
                                    <img src={avatarUrl} alt="User Avatar" />
                                    <div className={styles.userInfo}>
                                        <p className={styles.userNameLarge}>{user.name}</p>
                                        <p className={styles.userRole}>{user.isTeacher ? '教师' : '学生'}</p>
                                    </div>
                                </div>
                                <div className={styles.dropdownFooter}>
                                    <button onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> 退出登录</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;