import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

const PrivateRoute = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

    if (!isAuthenticated) {
        // 重定向到登录页，并记录他们想去的页面
        return <Navigate to="/auth" replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;