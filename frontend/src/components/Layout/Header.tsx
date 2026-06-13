import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { getWorkflowPreview, getWorkflowTitle } from '@/lib/chat';

const routeTitles: Record<string, { title: string; description: string }> = {
  '/chat': {
    title: 'ERP Assistant',
    description: 'Plan and monitor business operations',
  },
  '/dashboard': {
    title: 'Approvals',
    description: 'Review operations requiring a decision',
  },
  '/audit': {
    title: 'Audit Log',
    description: 'Trace every automated operation',
  },
  '/profile': {
    title: 'Profile & Security',
    description: 'Manage account identity and MFA settings',
  },
};

interface HeaderProps {
  onOpenNavigation: () => void;
}

export default function Header({ onOpenNavigation }: HeaderProps) {
  const pendingApprovals = useWorkflowStore((state) => state.pendingApprovals);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const workflows = useWorkflowStore((state) => state.workflows);
  const pendingCount = pendingApprovals.length;
  const { user, logout } = useAuthStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = routeTitles[pathname] ?? routeTitles['/chat'];
  const activeWorkflow = activeWorkflowId
    ? workflows.find((workflow) => workflow.id === activeWorkflowId)
    : null;
  const title =
    pathname === '/chat' && activeWorkflow ? getWorkflowTitle(activeWorkflow) : route.title;
  const description =
    pathname === '/chat' && activeWorkflow ? getWorkflowPreview(activeWorkflow) : route.description;
  const initials =
    user?.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'DU';
  const roleLabel = user?.role.replace(/([a-z])([A-Z])/g, '$1 $2') ?? 'System Admin';

  useEffect(() => {
    setIsNotificationOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!notificationRef.current?.contains(target)) setIsNotificationOpen(false);
      if (!userMenuRef.current?.contains(target)) setIsUserMenuOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const openApprovals = () => {
    setIsNotificationOpen(false);
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="surface-card flex h-16 items-center justify-between rounded-2xl border border-white/70 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open navigation"
            className="shrink-0 lg:hidden"
            size="icon"
            variant="outline"
            onClick={onOpenNavigation}
          >
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Operations workspace
            </p>
            <h1 className="font-heading truncate text-sm font-semibold tracking-tight text-gray-950 sm:text-base">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge className="hidden sm:inline-flex" tone="info">
            Authenticated
          </Badge>

          <div className="relative" ref={notificationRef}>
            <Button
              aria-label={
                pendingCount
                  ? `${pendingCount} pending approval${pendingCount === 1 ? '' : 's'}`
                  : 'Notifications'
              }
              aria-expanded={isNotificationOpen}
              aria-haspopup="dialog"
              className="relative"
              size="icon"
              variant="ghost"
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsNotificationOpen((open) => !open);
              }}
            >
              <Bell />
              {pendingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-bold text-white shadow-sm">
                  {pendingCount}
                </span>
              )}
            </Button>
            {isNotificationOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="surface-card absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/70"
              >
                <div className="ambient-line flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
                  <div>
                    <p className="font-heading text-sm font-semibold text-gray-950">
                      Notifications
                    </p>
                    <p className="text-xs text-slate-500">
                      {pendingCount
                        ? `${pendingCount} approval${pendingCount === 1 ? '' : 's'} need your attention`
                        : 'You are all caught up'}
                    </p>
                  </div>
                  {pendingCount > 0 && <Badge tone="warning">{pendingCount} pending</Badge>}
                </div>

                {pendingCount > 0 ? (
                  <div className="max-h-80 divide-y divide-slate-200/70 overflow-y-auto">
                    {pendingApprovals.slice(0, 3).map((approval) => (
                      <button
                        key={approval.id}
                        type="button"
                        className="block w-full px-4 py-3 text-left transition-colors hover:bg-slate-100/60 focus-visible:bg-slate-100/60"
                        onClick={openApprovals}
                      >
                        <span className="block text-xs font-medium text-cyan-700">
                          {approval.triggerReason}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-gray-900">
                          {approval.proposedAction}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">
                          {approval.businessContext}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto size-7 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-700">No new notifications</p>
                  </div>
                )}

                <button
                  type="button"
                  className="flex w-full items-center justify-between border-t border-slate-200/70 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-50/80"
                  onClick={openApprovals}
                >
                  View all approvals
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 py-1 pl-1 pr-2 transition-colors hover:bg-slate-100/70"
              onClick={() => {
                setIsNotificationOpen(false);
                setIsUserMenuOpen((open) => !open);
              }}
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="hidden pr-1 text-left sm:block">
                <p className="text-xs font-semibold text-gray-900">{user?.name ?? 'User'}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{roleLabel}</p>
              </div>
              <ChevronDown className="hidden size-3.5 text-gray-400 sm:block" />
            </button>
            {isUserMenuOpen && (
              <div
                role="menu"
                className="surface-card absolute right-0 top-12 z-50 w-56 rounded-2xl border border-white/70 p-2"
              >
                <div className="border-b border-slate-200/70 px-3 py-2">
                  <p className="truncate text-xs font-semibold text-gray-900">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    void logout().then(() => navigate('/login', { replace: true }));
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
