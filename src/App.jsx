import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login/LoginPage";
import ClassHomePage from "./pages/ClassHome/ClassHomePage";
import HomeworkPage from "./pages/Homework/HomeworkPage";
import WarePage from "./pages/Ware/WarePage";
import CourseListPage from "./pages/Course/CourseListPage";
import ErrorPage from "./pages/Error/ErrorPage";
import MainLayout from "./components/common/Layout/MainLayout";
import PrivateRoute from "./components/common/PrivateRoute/PrivateRoute";
import OrganizationPage from "./pages/Organization/OrganizationPage";
import DiscussionPage from "./pages/Discussion/DiscussionPage";
import AnalysisPage from "./pages/Analysis/AnalysisPage";
import MindPage from "./pages/Mind/MindPage";
import CourseDetailPage from "./pages/Course/CourseDetailPage";

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<LoginPage />} />

      {/* 受保护的路由组 */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          {/* 将根目录重定向到新的主页 */}
          <Route path="/" element={<Navigate to="/class-home" replace />} />
          <Route path="/class-home" element={<ClassHomePage />} />

          <Route path="/homework" element={<HomeworkPage />} />
          <Route path="/courses" element={<CourseListPage />} />
          <Route path="/course/:courseId/*" element={<CourseDetailPage />} />
          <Route path="/ware/home/*" element={<WarePage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/discussion" element={<DiscussionPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/mind" element={<MindPage />} />
        </Route>
      </Route>

      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<ErrorPage code="404" />} />
    </Routes>
  );
}

export default App;
