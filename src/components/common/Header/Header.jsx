import React, { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { NavLink, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faSignOutAlt,
  faKey,
  faUser,
  faChevronDown,
  faCheck,
  faChalkboard,
  faSchool,
  faSpinner,
  faHome, // 首页图标
  faBook,
  faTasks,
} from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../../store/authStore";
import { config } from "../../../utils/config";
import styles from "./Header.module.css";
import ChangePasswordModal from "./ChangePasswordModal";
import ChangeUsernameModal from "./ChangeUsernameModal";

const Header = () => {
  const { user, detailInfo, activeId, activeType, switchContext, logout } =
    useAuthStore(
      useShallow((state) => ({
        user: state.user,
        detailInfo: state.detailInfo,
        activeId: state.activeId,
        activeType: state.activeType,
        switchContext: state.switchContext,
        logout: state.logout,
      })),
    );

  const activeIdentity = useAuthStore((state) => state.getActiveIdentity());
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isTeacher = useAuthStore((state) => state.isTeacher());
  const isStudent = useAuthStore((state) => state.isStudent());
  const isPrincipal = useAuthStore((state) => state.isPrincipal());

  const navigate = useNavigate();
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const dropdownRef = useRef(null);
  const switcherRef = useRef(null);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] =
    useState(false);
  const [isChangeUsernameModalOpen, setChangeUsernameModalOpen] =
    useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownVisible(false);
      if (switcherRef.current && !switcherRef.current.contains(e.target))
        setSwitcherOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const avatarUrl = `https://placehold.co/100x100/0356CA/FFFFFF?text=${user.name.charAt(0).toUpperCase()}`;

  return (
    <>
      {/* ===================== 顶部固定栏 ===================== */}
      <header className={styles.mainHeader}>
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            {/* ✅ Logo 只展示，不跳转 */}
            <div className={styles.headerLogo}>
              <span>智慧教学</span>
            </div>

            {!isAdmin && (
              <div className={styles.contextSwitcher} ref={switcherRef}>
                <div
                  className={styles.activeContextBar}
                  onClick={() => setSwitcherOpen(!isSwitcherOpen)}
                >
                  {detailInfo ? (
                    <>
                      <div
                        className={`${styles.contextIcon} ${activeType === "school" ? styles.iconSchool : styles.iconClass}`}
                      >
                        <FontAwesomeIcon
                          icon={
                            activeType === "school" ? faSchool : faChalkboard
                          }
                        />
                      </div>
                      <div className={styles.contextInfo}>
                        <span className={styles.contextName}>
                          {activeType === "school"
                            ? activeIdentity?.school?.name
                            : activeIdentity?.classes?.name}
                        </span>
                        <span className={styles.contextRole}>
                          {isPrincipal ? "校长" : isTeacher ? "教师" : "学生"}
                        </span>
                      </div>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`${styles.chevron} ${isSwitcherOpen ? styles.rotate : ""}`}
                      />
                    </>
                  ) : (
                    <div className={styles.loadingContext}>
                      <FontAwesomeIcon icon={faSpinner} spin />{" "}
                      <span>加载中...</span>
                    </div>
                  )}
                </div>

                {isSwitcherOpen && detailInfo && (
                  <div className={styles.switcherDropdown}>
                    {detailInfo.schoolMembers?.length > 0 && (
                      <div className={styles.switcherGroup}>
                        <div className={styles.groupHeader}>
                          管理空间 (学校)
                        </div>
                        {detailInfo.schoolMembers.map((sm) => (
                          <div
                            key={`s-${sm.schoolId}`}
                            className={`${styles.switcherItem} ${activeType === "school" && String(activeId) === String(sm.schoolId) ? styles.active : ""}`}
                            onClick={() => switchContext("school", sm.schoolId)}
                          >
                            <FontAwesomeIcon
                              icon={faSchool}
                              className={styles.itemIcon}
                            />
                            <span className={styles.itemName}>
                              {sm.school.name}
                            </span>
                            {activeType === "school" &&
                              String(activeId) === String(sm.schoolId) && (
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  className={styles.checkIcon}
                                />
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                    {detailInfo.classMembers?.length > 0 && (
                      <div className={styles.switcherGroup}>
                        <div className={styles.groupHeader}>
                          学习空间 (班级)
                        </div>
                        {detailInfo.classMembers.map((cm) => (
                          <div
                            key={`c-${cm.classId}`}
                            className={`${styles.switcherItem} ${activeType === "class" && String(activeId) === String(cm.classId) ? styles.active : ""}`}
                            onClick={() => switchContext("class", cm.classId)}
                          >
                            <FontAwesomeIcon
                              icon={faChalkboard}
                              className={styles.itemIcon}
                            />
                            <div className={styles.itemText}>
                              <span className={styles.itemName}>
                                {cm.classes.name}
                              </span>
                              <small className={styles.itemSub}>
                                {cm.role === "ROLE_TEACHER" ? "教师" : "学生"}
                              </small>
                            </div>
                            {activeType === "class" &&
                              String(activeId) === String(cm.classId) && (
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  className={styles.checkIcon}
                                />
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.headerRight} ref={dropdownRef}>
            <div
              className={styles.userProfile}
              onClick={() => setDropdownVisible(!isDropdownVisible)}
            >
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
                      {isAdmin
                        ? "管理员"
                        : isPrincipal
                          ? "校长"
                          : isTeacher
                            ? "教师"
                            : "学生"}
                    </p>
                  </div>
                </div>
                <ul className={styles.dropdownMenu}>
                  <li>
                    <Link
                      to="/organization"
                      onClick={() => setDropdownVisible(false)}
                    >
                      <FontAwesomeIcon icon={faUsers} /> 组织管理
                    </Link>
                  </li>
                  <li>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        setChangePasswordModalOpen(true);
                        setDropdownVisible(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faKey} /> 修改密码
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        setChangeUsernameModalOpen(true);
                        setDropdownVisible(false);
                      }}
                    >
                      <FontAwesomeIcon icon={faUser} /> 修改用户名
                    </a>
                  </li>
                </ul>
                <div className={styles.dropdownFooter}>
                  <button onClick={logout}>
                    <FontAwesomeIcon icon={faSignOutAlt} /> 退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===================== 左侧固定侧边栏 ===================== */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarMenu}>
          {/* ✅ 新增：首页按钮 */}
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? styles.sidebarActive : "")}
          >
            <FontAwesomeIcon icon={faHome} />
            <span>首页</span>
          </NavLink>

          <NavLink
            to="/ware/home"
            className={({ isActive }) => (isActive ? styles.sidebarActive : "")}
          >
            <FontAwesomeIcon icon={faBook} />
            <span>课程仓库</span>
          </NavLink>

          <NavLink
            to="/homework"
            className={({ isActive }) => (isActive ? styles.sidebarActive : "")}
          >
            <FontAwesomeIcon icon={faTasks} />
            <span>作业区</span>
          </NavLink>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
      <ChangeUsernameModal
        isOpen={isChangeUsernameModalOpen}
        onClose={() => setChangeUsernameModalOpen(false)}
      />
    </>
  );
};

export default Header;
