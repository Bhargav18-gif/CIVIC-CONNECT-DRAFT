import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import AuroraBackground from "./components/layout/AuroraBackground.jsx";

// User Pages
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ReportIssuePage from "./pages/ReportIssuePage.jsx";
import TrackComplaintPage from "./pages/TrackComplaintPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

// Protected Route
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

// =======================
// Admin Pages
// =======================
import AdminLoginPage from "./pages/admin/Login.jsx";
import AdminDashboardPage from "./pages/admin/Dashboard.jsx";
import AdminComplaintsPage from "./pages/admin/Complaints.jsx";
import AdminUsersPage from "./pages/admin/Users.jsx";
import AdminRoute from "./components/auth/AdminRoute.jsx";
import PublicDashboard from "./pages/public/Dashboard.jsx";
import EngineerDashboard from "./pages/engineer/Dashboard.jsx";
import EngineerTaskDetail from "./pages/engineer/TaskDetail.jsx";
import EngineerMap from "./pages/engineer/EngineerMap.jsx";
import EngineerTaskList from "./pages/engineer/TaskList.jsx";
import EngineerRoutePlanner from "./pages/engineer/RoutePlanner.jsx";
import EngineerWorkHistory from "./pages/engineer/WorkHistory.jsx";
import EngineerPerformance from "./pages/engineer/Performance.jsx";
import EngineerNotifications from "./pages/engineer/Notifications.jsx";

import DepartmentDashboard from "./pages/department/Dashboard.jsx";
import DepartmentComplaintQueue from "./pages/department/ComplaintQueue.jsx";
import DepartmentComplaintDetails from "./pages/department/ComplaintDetails.jsx";
import DepartmentOperationsMap from "./pages/department/OperationsMap.jsx";
import DepartmentSLAMonitor from "./pages/department/SLAMonitor.jsx";
import DepartmentEscalationCenter from "./pages/department/EscalationCenter.jsx";
import DepartmentResourceManager from "./pages/department/ResourceManager.jsx";
import DepartmentAIInsights from "./pages/department/AIInsights.jsx";
import DepartmentNotifications from "./pages/department/Notifications.jsx";
import DepartmentEngineerManagement from "./pages/department/EngineerManagement.jsx";
import DepartmentAnalytics from "./pages/department/Analytics.jsx";
import DepartmentSelection from "./pages/department/DepartmentSelection.jsx";
import DepartmentRoute from "./components/auth/DepartmentRoute.jsx";

export default function App() {
  const location = useLocation();

  return (
    <>
      <AuroraBackground />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}

          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<LoginPage />} />

          <Route path="/register" element={<RegisterPage />} />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/track" element={<TrackComplaintPage />} />

          {/* Protected User Dashboard */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportIssuePage />
              </ProtectedRoute>
            }
          />

          {/* ===========================
               ADMIN ROUTES
          =========================== */}

          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/complaints"
            element={
              <AdminRoute>
                <AdminComplaintsPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />

          {/* ===========================
               FIELD ENGINEER ROUTES
          =========================== */}
          <Route
            path="/engineer/dashboard"
            element={
              <ProtectedRoute>
                <EngineerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/tasks"
            element={
              <ProtectedRoute>
                <EngineerTaskList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/tasks/:id"
            element={
              <ProtectedRoute>
                <EngineerTaskDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/route"
            element={
              <ProtectedRoute>
                <EngineerRoutePlanner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/map"
            element={
              <ProtectedRoute>
                <EngineerMap />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/history"
            element={
              <ProtectedRoute>
                <EngineerWorkHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/performance"
            element={
              <ProtectedRoute>
                <EngineerPerformance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/engineer/notifications"
            element={
              <ProtectedRoute>
                <EngineerNotifications />
              </ProtectedRoute>
            }
          />

          {/* ===========================
               DEPARTMENT OPERATIONS ROUTES
          =========================== */}
          <Route
            path="/department/select"
            element={
              <DepartmentRoute allowUnselected={true}>
                <DepartmentSelection />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/dashboard"
            element={
              <DepartmentRoute>
                <DepartmentDashboard />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/queue"
            element={
              <DepartmentRoute>
                <DepartmentComplaintQueue />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/tasks/:id"
            element={
              <DepartmentRoute>
                <DepartmentComplaintDetails />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/escalations"
            element={
              <DepartmentRoute>
                <DepartmentEscalationCenter />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/sla"
            element={
              <DepartmentRoute>
                <DepartmentSLAMonitor />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/map"
            element={
              <DepartmentRoute>
                <DepartmentOperationsMap />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/resources"
            element={
              <DepartmentRoute>
                <DepartmentResourceManager />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/insights"
            element={
              <DepartmentRoute>
                <DepartmentAIInsights />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/notifications"
            element={
              <DepartmentRoute>
                <DepartmentNotifications />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/engineers"
            element={
              <DepartmentRoute>
                <DepartmentEngineerManagement />
              </DepartmentRoute>
            }
          />

          <Route
            path="/department/analytics"
            element={
              <DepartmentRoute>
                <DepartmentAnalytics />
              </DepartmentRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/public-dashboard" element={<PublicDashboard />} />
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}