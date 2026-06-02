// src/components/common/PrivateRoute/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../../../store/authStore";

const PrivateRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // 【核心修改】：路由守卫，拦截未修改密码的用户
  const needPasswordChange =
    localStorage.getItem("needPasswordChange") === "true";
  if (needPasswordChange && location.pathname !== "/force-change-password") {
    return <Navigate to="/force-change-password" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
