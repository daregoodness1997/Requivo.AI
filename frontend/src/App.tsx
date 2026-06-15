import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import RoleRoute from '@/components/Auth/RoleRoute';
import Layout from '@/components/Layout/Layout';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { approvalRoles, auditRoles } from '@/lib/permissions';

const ApprovalDetailPage = lazy(() => import('@/pages/ApprovalDetailPage'));
const AuditPage = lazy(() => import('@/pages/AuditPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const WorkflowDetailPage = lazy(() => import('@/pages/WorkflowDetailPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-gray-500">
      <Spinner className="size-5" />
      Loading page
    </div>
  );
}

function WorkspaceRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={approvalRoles}>
                <DashboardPage />
              </RoleRoute>
            }
          />
          <Route
            path="/approvals/:id"
            element={
              <RoleRoute allowedRoles={approvalRoles}>
                <ApprovalDetailPage />
              </RoleRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <RoleRoute allowedRoles={auditRoles}>
                <AuditPage />
              </RoleRoute>
            }
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
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
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}
