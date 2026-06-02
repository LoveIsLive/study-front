// src/pages/Login/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import useAuthStore from "../../store/authStore";
import { authApi } from "../../services/api";
import { config } from "../../utils/config";
import styles from "./LoginPage.module.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await authApi.post("/login", { username, password });

      if (response.data && response.data.code === 200) {
        const loginData = response.data.data;
        const needPasswordChange =
          typeof loginData === "object"
            ? loginData.needPasswordChange === true
            : false;

        await login(loginData);

        // 【核心修改】：检测 needPasswordChange 标记
        if (needPasswordChange) {
          Swal.fire({
            icon: "warning",
            title: "需要修改密码",
            text: "为了您的账号安全，请先修改初始密码。",
            showConfirmButton: true,
            confirmButtonText: "去修改",
            allowOutsideClick: false,
          }).then(() => {
            navigate("/force-change-password");
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "欢迎回来",
            text: "正在进入智慧教学系统...",
            showConfirmButton: false,
            timer: 1500,
            position: "center",
          });
          navigate("/class-home");
        }
      } else {
        throw new Error(response.data.message || "登录失败");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "认证失败",
        text: error.response?.data?.message || "用户名或密码不正确",
        confirmButtonColor: "#0356CA",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
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
              type={showPassword ? "text" : "password"}
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

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? <div className={styles.loader}></div> : "立即登录"}
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
