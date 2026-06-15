import { useEffect, useState, type ReactNode } from 'react';
import { approvalApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import Sidebar from './Sidebar';
import Header from './Header';
import OfflineBanner from './OfflineBanner';

export default function Layout({ children }: { children: ReactNode }) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const setPendingApprovals = useWorkflowStore((state) => state.setPendingApprovals);

  useEffect(() => {
    approvalApi
      .list()
      .then(setPendingApprovals)
      .catch(() => undefined);
  }, [setPendingApprovals]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={isNavigationOpen} onClose={() => setIsNavigationOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <OfflineBanner />
        <Header onOpenNavigation={() => setIsNavigationOpen(true)} />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
