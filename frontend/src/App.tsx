import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Layout from '@/components/Layout/Layout';
import EmptyState from '@/components/ui/EmptyState';
import AuditPage from '@/pages/AuditPage';
import ChatPage from '@/pages/ChatPage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import ProfilePage from '@/pages/ProfilePage';
import RegisterPage from '@/pages/RegisterPage';

function WorkspaceRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={['WorkflowOperator', 'Admin', 'Auditor']}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Approver', 'Admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['Auditor', 'Admin']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-gray-200 bg-white">
              <EmptyState
                title="Page not found"
                description="The page you requested does not exist in this workspace."
              />
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceRoutes />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
