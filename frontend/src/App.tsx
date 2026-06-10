import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Layout from '@/components/Layout/Layout';
import EmptyState from '@/components/ui/EmptyState';
import AuditPage from '@/pages/AuditPage';
import ChatPage from '@/pages/ChatPage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';

function WorkspaceRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/audit" element={<AuditPage />} />
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
