// src/pages/Login/ForceChangePasswordPage.jsx
import React, { useState, forwardRef } from "react";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faEye,
  faEyeSlash,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import { userApi } from "../../services/api";
import useAuthStore from "../../store/authStore";
import { config } from "../../utils/config";
import styles from "./LoginPage.module.css"; // 复用 LoginPage 的背景与卡片样式

// 定制化的 Password Input 以适配 LoginPage.module.css
const PasswordInput = forwardRef(({ placeholder, error, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ marginBottom: error ? "20px" : "0" }}>
      <div className={styles.inputWrapper} style={{ marginBottom: "5px" }}>
        <FontAwesomeIcon icon={faLock} className={styles.inputIcon} />
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className={error ? styles.isInvalid : ""}
          {...props}
          ref={ref}
        />
        <div
          className={styles.passwordToggle}
          onClick={() => setShowPassword(!showPassword)}
        >
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </div>
      </div>
      {error && (
        <small
          style={{ color: "#ff4d4f", fontSize: "12px", paddingLeft: "10px" }}
        >
          {error.message}
        </small>
      )}
    </div>
  );
});

const ForceChangePasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm();
  const [serverError, setServerError] = useState("");

  const newPassword = watch("newPassword");
  const logout = useAuthStore((state) => state.logout);

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const response = await userApi.put("/password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (response.data.code === 200) {
        await Swal.fire({
          icon: "success",
          title: "密码修改成功",
          text: "您的安全凭证已更新，请重新登录。",
          allowOutsideClick: false,
          confirmButtonText: "去登录",
        });
        // 登出时会自动清空 token 和 needPasswordChange
        logout();
        window.location.href = config.front_AUTH_PREFIX || "/auth";
      } else {
        setServerError(response.data.message || "修改失败，请检查原密码");
      }
    } catch (error) {
      setServerError(
        error.response?.data?.message || "服务器发生错误，请稍后重试",
      );
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.bgDecoration1}></div>
      <div className={styles.bgDecoration2}></div>

      <div className={styles.loginCard}>
        <div className={styles.cardHeader}>
          <div className={styles.logoCircle}>
            <FontAwesomeIcon icon={faShieldAlt} />
          </div>
          <h1>强制修改密码</h1>
          <p>为了保障您的账号安全，请在继续操作前修改初始密码。</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.loginForm}>
          {serverError && (
            <div
              style={{
                color: "#ff4d4f",
                marginBottom: "15px",
                textAlign: "center",
                fontSize: "14px",
              }}
            >
              {serverError}
            </div>
          )}

          <PasswordInput
            placeholder="当前密码 (初始密码)"
            error={errors.oldPassword}
            {...register("oldPassword", { required: "旧密码不能为空" })}
          />

          <PasswordInput
            placeholder="新密码"
            error={errors.newPassword}
            {...register("newPassword", {
              required: "新密码不能为空",
              minLength: { value: 6, message: "密码长度至少 6 位" },
              maxLength: { value: 20, message: "密码长度最多 20 位" },
            })}
          />

          <PasswordInput
            placeholder="确认新密码"
            error={errors.confirmPassword}
            {...register("confirmPassword", {
              required: "请再次确认新密码",
              validate: (value) =>
                value === newPassword || "两次输入的密码不一致",
            })}
          />

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
            style={{ marginTop: "20px" }}
          >
            {isSubmitting ? (
              <div className={styles.loader}></div>
            ) : (
              "确认并重新登录"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;
