import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { ResetPasswordPage } from './pages/ResetPassword';
import { DashboardPage } from './pages/Dashboard';
import { ChatPage } from './pages/Chat';
import { FocusPage } from './pages/Focus';
import { TasksPage } from './pages/Tasks';
import { CheckInsPage } from './pages/CheckIns';
import { SettingsPage } from './pages/Settings';
import { CounselorDashboard } from './pages/Counselor';
import { CounselorStudentsPage } from './pages/CounselorStudents';
import { RiskFlagsPage } from './pages/RiskFlags';
import { MessagesPage } from './pages/Messages';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; counselorOnly?: boolean; studentOnly?: boolean }> = ({
  children,
  counselorOnly = false,
  studentOnly = false,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wellness-sage-500 mx-auto mb-4" />
          <p className="text-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (counselorOnly && user.role !== 'counselor' && user.role !== 'admin') {
    return <Navigate to="/app/chat" replace />;
  }

  if (studentOnly && user.role !== 'student') {
    return <Navigate to="/counselor" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Protected student routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute studentOnly>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="checkins" element={<CheckInsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Protected counselor routes */}
      <Route
        path="/counselor"
        element={
          <ProtectedRoute counselorOnly>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CounselorDashboard />} />
        <Route path="students" element={<CounselorStudentsPage />} />
        <Route path="flags" element={<RiskFlagsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const isPasswordRecovery = new URLSearchParams(window.location.search).get('recovery') === '1';
  return (
    <ThemeProvider>
      <div className="app-shell min-h-screen bg-bg text-text transition-colors duration-300">
        <HashRouter>
          <AuthProvider>
            <SocketProvider>
              <ErrorBoundary
                title="We hit an app error"
                description="The page can recover without a full refresh. Click try again to continue."
              >
                {isPasswordRecovery ? <ResetPasswordPage /> : <AppRoutes />}
              </ErrorBoundary>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-soft)',
                  },
                }}
              />
            </SocketProvider>
          </AuthProvider>
        </HashRouter>
      </div>
    </ThemeProvider>
  );
};

export default App;
