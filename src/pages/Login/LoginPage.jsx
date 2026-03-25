import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// 新增了 faUsers 图标用于班级选择框
import { faUser, faLock, faEye, faEyeSlash, faSchool, faUsers, faUserShield, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../services/api';
import { config } from '../../utils/config';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // 学校相关状态
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [schools, setSchools] = useState([]);

    // --- 新增：班级相关状态 ---
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classes, setClasses] = useState([]);

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    // 1. 加载学校列表
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const response = await authApi.get('/public/schools');
                if (response.data.code === 200) {
                    const schoolList = response.data.data || [];
                    setSchools(schoolList);
                    if (schoolList.length > 0) {
                        setSelectedSchoolId(schoolList[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch schools", error);
            }
        };
        if (!isAdminLogin) {
            fetchSchools();
        }
    }, [isAdminLogin]);

    // --- 新增：2. 监听学校变化，联动加载对应班级列表 ---
    useEffect(() => {
        const fetchClasses = async () => {
            // 如果没有选择学校，或者是管理员登录，则不拉取班级
            if (!selectedSchoolId || isAdminLogin) return;

            try {
                const response = await authApi.get(`/public/${selectedSchoolId}/classes`);
                if (response.data.code === 200) {
                    setClasses(response.data.data || []);
                    // 切换学校时，清空之前选择的班级
                    setSelectedClassId('');
                }
            } catch (error) {
                console.error("Failed to fetch classes", error);
            }
        };

        fetchClasses();
    }, [selectedSchoolId, isAdminLogin]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAdminLogin && !selectedSchoolId) {
            Swal.fire({ icon: 'warning', title: '请选择学校' });
            return;
        }

        setIsLoading(true);
        try {
            // --- 修改：在 Payload 中动态携带 classId ---
            const payload = {
                username,
                password,
                schoolId: isAdminLogin ? null : selectedSchoolId,
                // 如果用户没有选择班级（例如老师），则传递 null
                classId: isAdminLogin ? null : (selectedClassId === '' ? null : selectedClassId)
            };

            const response = await authApi.post('/login', payload);

            if (response.data && response.data.code === 200 && response.data.data) {
                const token = response.data.data;
                login(token);
                await Swal.fire({
                    icon: 'success',
                    title: '登录成功!',
                    text: isAdminLogin ? '欢迎管理员' : '欢迎进入教学系统',
                    showConfirmButton: false,
                    timer: 1000
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

    const toggleMode = () => {
        setIsAdminLogin(!isAdminLogin);
        setUsername('');
        setPassword('');
        // 切换模式时重置或重新获取默认值
        if (isAdminLogin && schools.length > 0) {
            setSelectedSchoolId(schools[0].id);
            setSelectedClassId(''); // 切换回来时重置班级
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={`${styles.loginBox} ${isAdminLogin ? styles.adminMode : ''}`}>
                <div className={styles.headerIcon}>
                    <FontAwesomeIcon icon={isAdminLogin ? faUserShield : faChalkboardTeacher} />
                </div>
                <h2>{isAdminLogin ? '系统管理员登录' : '智慧教学系统'}</h2>

                <form id="login-form" onSubmit={handleSubmit}>
                    {!isAdminLogin && (
                        <>
                            {/* 学校选择框 */}
                            <div className={styles.inputGroup}>
                                <FontAwesomeIcon icon={faSchool} className={styles.leftIcon} />
                                <select
                                    className={styles.selectInput}
                                    value={selectedSchoolId}
                                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                                    required={!isAdminLogin}
                                >
                                    <option value="" disabled>请选择您的学校</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>{school.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <FontAwesomeIcon icon={faUsers} className={styles.leftIcon} />
                                <select
                                    className={styles.selectInput}
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                >
                                    {/* 将默认空值选项设置为"教师"选项 */}
                                    <option value="">我是校长 (无班级)</option>

                                    {/* 下方继续渲染学生所在的班级列表 */}
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div className={styles.inputGroup}>
                        <FontAwesomeIcon icon={faUser} className={styles.leftIcon} />
                        <input
                            type="text"
                            id="username"
                            placeholder={isAdminLogin ? "管理员账号" : "姓名/学号"}
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
                        {isLoading ? '登录中...' : (isAdminLogin ? '管 理 员 登 录' : '登 录')}
                    </button>
                </form>

                <div className={styles.footerLinks}>
                    <span onClick={toggleMode} className={styles.linkBtn}>
                        {isAdminLogin ? '返回师生登录' : '管理员登录入口'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;