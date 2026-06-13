import { useEffect, useState, type ReactNode } from 'react';
import { approvalApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import Sidebar from './Sidebar';
import Header from './Header';

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
    <div className="relative flex min-h-screen overflow-hidden pb-4">
      <div className="pointer-events-none absolute inset-0 ambient-grid opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-[-3rem] h-[24rem] w-[24rem] rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 bottom-[-4rem] h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
      <Sidebar open={isNavigationOpen} onClose={() => setIsNavigationOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col lg:pl-72">
        <Header onOpenNavigation={() => setIsNavigationOpen(true)} />
        <main className="flex-1 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mx-auto w-full max-w-[1220px] fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
