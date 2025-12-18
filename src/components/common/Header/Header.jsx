import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faSignOutAlt, faKey } from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../../store/authStore';
import { config } from '../../../utils/config';
import styles from './Header.module.css';
import ChangePasswordModal from './ChangePasswordModal';
import { usernameProcessor } from '../../../utils/helpers';

const Header = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

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
        <>
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
                                <span>{usernameProcessor(user.name)}</span>
                            </div>
                            {isDropdownVisible && (
                                <div className={`${styles.userDropdown} ${styles.show}`}>
                                    <div className={styles.dropdownHeader}>
                                        <img src={avatarUrl} alt="User Avatar" />
                                        <div className={styles.userInfo}>
                                            <p className={styles.userNameLarge}>{usernameProcessor(user.name)}</p>
                                            <p className={styles.userRole}>{user.isAdmin ? '管理员' :
                                                (user.isPrincipal ? '校长' : (user.isTeacher ? '教师' : '学生'))}</p>
                                        </div>
                                    </div>

                                    {/* --- 3. 新增下拉菜单的主体部分 --- */}
                                    <ul className={styles.dropdownMenu}>
                                        <li>
                                            <Link to="/organization">
                                                <FontAwesomeIcon icon={faUsers} />
                                                <span>{user.isAdmin ? '组织管理' : '我的班级'}</span>
                                            </Link>
                                        </li>
                                        {/* 可以在这里添加更多菜单项，如“个人中心”等 */}
                                        <li>
                                            <a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setChangePasswordModalOpen(true);
                                                setDropdownVisible(false); // 关闭下拉菜单
                                            }}>
                                                <FontAwesomeIcon icon={faKey} />
                                                <span>修改密码</span>
                                            </a>
                                        </li>
                                    </ul>

                                    <div className={styles.dropdownFooter}>
                                        <button onClick={handleLogout}>
                                            <FontAwesomeIcon icon={faSignOutAlt} /> 退出登录
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            {/* --- 5. 在 Header 组件的根部渲染模态框 --- */}
            <ChangePasswordModal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setChangePasswordModalOpen(false)}
            />
        </>
    );
};

export default Header;