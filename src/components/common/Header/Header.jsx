import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers, faSignOutAlt, faKey, faUser,
    faChevronDown, faCheck, faChalkboard, faSchool, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../../store/authStore';
import { config } from '../../../utils/config';
import styles from './Header.module.css';
import ChangePasswordModal from './ChangePasswordModal';
import ChangeUsernameModal from './ChangeUsernameModal';

const Header = () => {
    // 1. 订阅基础状态
    const { user, detailInfo, activeId, activeType, switchContext, logout } = useAuthStore(
        useShallow((state) => ({
            user: state.user,
            detailInfo: state.detailInfo,
            activeId: state.activeId,
            activeType: state.activeType,
            switchContext: state.switchContext,
            logout: state.logout,
        }))
    );

    // 2. 身份判断
    const activeIdentity = useAuthStore(state => state.getActiveIdentity());
    const isAdmin = useAuthStore(state => state.isAdmin());
    const isTeacher = useAuthStore(state => state.isTeacher());
    const isStudent = useAuthStore(state => state.isStudent());
    const isPrincipal = useAuthStore(state => state.isPrincipal());

    const navigate = useNavigate();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [isSwitcherOpen, setSwitcherOpen] = useState(false);
    const dropdownRef = useRef(null);
    const switcherRef = useRef(null);
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [isChangeUsernameModalOpen, setChangeUsernameModalOpen] = useState(false);

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownVisible(false);
            if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    // ✅ 修复：头像颜色从橙色 → 蓝色 #0356CA
    const avatarUrl = `https://placehold.co/100x100/0356CA/FFFFFF?text=${user.name.charAt(0).toUpperCase()}`;

    return (
        <>
            <header className={styles.mainHeader}>
                <div className={styles.headerContainer}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerLogo}>
                            <NavLink to="/">智慧教学</NavLink>
                        </div>

                        {/* 身份切换 */}
                        {!isAdmin && (
                            <div className={styles.contextSwitcher} ref={switcherRef}>
                                <div className={styles.activeContextBar} onClick={() => setSwitcherOpen(!isSwitcherOpen)}>
                                    {detailInfo ? (
                                        <>
                                            <div className={`${styles.contextIcon} ${activeType === 'school' ? styles.iconSchool : styles.iconClass}`}>
                                                <FontAwesomeIcon icon={activeType === 'school' ? faSchool : faChalkboard} />
                                            </div>
                                            <div className={styles.contextInfo}>
                                                <span className={styles.contextName}>
                                                    {activeType === 'school' ? activeIdentity?.school?.name : activeIdentity?.classes?.name}
                                                </span>
                                                <span className={styles.contextRole}>
                                                    {isPrincipal ? '校长' : (isTeacher ? '教师' : '学生')}
                                                </span>
                                            </div>
                                            <FontAwesomeIcon icon={faChevronDown} className={`${styles.chevron} ${isSwitcherOpen ? styles.rotate : ''}`} />
                                        </>
                                    ) : (
                                        <div className={styles.loadingContext}>
                                            <FontAwesomeIcon icon={faSpinner} spin /> <span>加载中...</span>
                                        </div>
                                    )}
                                </div>

                                {isSwitcherOpen && detailInfo && (
                                    <div className={styles.switcherDropdown}>
                                        {/* 学校列表 */}
                                        {detailInfo.schoolMembers?.length > 0 && (
                                            <div className={styles.switcherGroup}>
                                                <div className={styles.groupHeader}>管理空间 (学校)</div>
                                                {detailInfo.schoolMembers.map(sm => (
                                                    <div
                                                        key={`s-${sm.schoolId}`}
                                                        className={`${styles.switcherItem} ${activeType === 'school' && String(activeId) === String(sm.schoolId) ? styles.active : ''}`}
                                                        onClick={() => switchContext('school', sm.schoolId)}
                                                    >
                                                        <FontAwesomeIcon icon={faSchool} className={styles.itemIcon} />
                                                        <span className={styles.itemName}>{sm.school.name}</span>
                                                        {activeType === 'school' && String(activeId) === String(sm.schoolId) && <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* 班级列表 */}
                                        {detailInfo.classMembers?.length > 0 && (
                                            <div className={styles.switcherGroup}>
                                                <div className={styles.groupHeader}>学习空间 (班级)</div>
                                                {detailInfo.classMembers.map(cm => (
                                                    <div
                                                        key={`c-${cm.classId}`}
                                                        className={`${styles.switcherItem} ${activeType === 'class' && String(activeId) === String(cm.classId) ? styles.active : ''}`}
                                                        onClick={() => switchContext('class', cm.classId)}
                                                    >
                                                        <FontAwesomeIcon icon={faChalkboard} className={styles.itemIcon} />
                                                        <div className={styles.itemText}>
                                                            <span className={styles.itemName}>{cm.classes.name}</span>
                                                            <small className={styles.itemSub}>{cm.role === 'ROLE_TEACHER' ? '教师' : '学生'}</small>
                                                        </div>
                                                        {activeType === 'class' && String(activeId) === String(cm.classId) && <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 导航菜单 */}
                        <nav className={styles.headerNav}>
                            <ul>
                                <li>
                                    <NavLink 
                                        to="/ware/home" 
                                        className={({ isActive }) => isActive ? styles.active : ''}
                                    >
                                        课程仓库
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink 
                                        to="/homework" 
                                        className={({ isActive }) => isActive ? styles.active : ''}
                                    >
                                        作业区
                                    </NavLink>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* 用户下拉 */}
                    <div className={styles.headerRight} ref={dropdownRef}>
                        <div className={styles.userProfile} onClick={() => setDropdownVisible(!isDropdownVisible)}>
                            <img src={avatarUrl} alt="Avatar" />
                            <span>{user.name}</span>
                        </div>
                        {isDropdownVisible && (
                            <div className={`${styles.userDropdown} ${styles.show}`}>
                                <div className={styles.dropdownHeader}>
                                    <img src={avatarUrl} alt="Avatar" />
                                    <div className={styles.userInfo}>
                                        <p className={styles.userNameLarge}>{user.name}</p>
                                        <p className={styles.userRole}>
                                            {isAdmin ? '管理员' : (isPrincipal ? '校长' : (isTeacher ? '教师' : '学生'))}
                                        </p>
                                    </div>
                                </div>
                                <ul className={styles.dropdownMenu}>
                                    <li><Link to="/organization" onClick={() => setDropdownVisible(false)}><FontAwesomeIcon icon={faUsers} /> 组织管理</Link></li>
                                    <li><a href="#" onClick={(e) => { e.preventDefault(); setChangePasswordModalOpen(true); setDropdownVisible(false); }}><FontAwesomeIcon icon={faKey} /> 修改密码</a></li>
                                    <li><a href="#" onClick={(e) => { e.preventDefault(); setChangeUsernameModalOpen(true); setDropdownVisible(false); }}><FontAwesomeIcon icon={faUser} /> 修改用户名</a></li>
                                </ul>
                                <div className={styles.dropdownFooter}>
                                    <button onClick={logout}><FontAwesomeIcon icon={faSignOutAlt} /> 退出登录</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setChangePasswordModalOpen(false)} />
            <ChangeUsernameModal isOpen={isChangeUsernameModalOpen} onClose={() => setChangeUsernameModalOpen(false)} />
        </>
    );
};

export default Header;