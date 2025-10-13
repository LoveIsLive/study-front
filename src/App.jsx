import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import HomePage from './pages/Home/HomePage';
import HomeworkPage from './pages/Homework/HomeworkPage';
import WarePage from './pages/Ware/WarePage';
import ErrorPage from './pages/Error/ErrorPage';
import MainLayout from './components/common/Layout/MainLayout';
import PrivateRoute from './components/common/PrivateRoute/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<LoginPage />} />

      {/* 受保护的路由组 */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/homework" element={<HomeworkPage />} />
          <Route path="/ware/home/*" element={<WarePage />} />
        </Route>
      </Route>

      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<ErrorPage code="404" />} />
    </Routes>
  );
}

export default App;