import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { approvalRoles, hasRole } from '@/lib/permissions';

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
};

interface HeaderProps {
  onOpenNavigation: () => void;
}

export default function Header({ onOpenNavigation }: HeaderProps) {
  const pendingApprovals = useWorkflowStore((state) => state.pendingApprovals);
  const pendingCount = pendingApprovals.length;
  const { user, logout } = useAuthStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route =
    routeTitles[pathname] ??
    (pathname.startsWith('/workflows/')
      ? { title: 'Workflow Details', description: 'Inspect execution steps and outputs' }
      : pathname.startsWith('/approvals/')
        ? { title: 'Approval Details', description: 'Review context and record a decision' }
        : pathname === '/unauthorized'
          ? { title: 'Access Restricted', description: 'This area requires another role' }
          : routeTitles['/chat']);
  const initials =
    user?.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'DU';
  const roleLabel = user?.role.replace(/([a-z])([A-Z])/g, '$1 $2') ?? 'System Admin';
  const canReviewApprovals = hasRole(user?.role, approvalRoles);

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

  const openApproval = (approvalId: string) => {
    setIsNotificationOpen(false);
    navigate(`/approvals/${approvalId}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
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
          <h1 className="truncate text-sm font-semibold text-gray-950 sm:text-base">
            {route.title}
          </h1>
          <p className="hidden truncate text-xs text-gray-500 sm:block">{route.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Badge className="hidden sm:inline-flex" tone="info">
          Demo mode
        </Badge>
        {canReviewApprovals && (
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
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-warning-700 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Button>
            {isNotificationOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">Notifications</p>
                    <p className="text-xs text-gray-500">
                      {pendingCount
                        ? `${pendingCount} approval${pendingCount === 1 ? '' : 's'} need your attention`
                        : 'You are all caught up'}
                    </p>
                  </div>
                  {pendingCount > 0 && <Badge tone="warning">{pendingCount} pending</Badge>}
                </div>

                {pendingCount > 0 ? (
                  <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                    {pendingApprovals.slice(0, 3).map((approval) => (
                      <button
                        key={approval.id}
                        type="button"
                        className="block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50"
                        onClick={() => openApproval(approval.id)}
                      >
                        <span className="block text-xs font-medium text-warning-700">
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
                  className="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  onClick={openApprovals}
                >
                  View all approvals
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
            onClick={() => {
              setIsNotificationOpen(false);
              setIsUserMenuOpen((open) => !open);
            }}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden pr-1 text-left sm:block">
              <p className="text-xs font-semibold text-gray-900">{user?.name ?? 'Demo User'}</p>
              <p className="text-[10px] text-gray-500">{roleLabel}</p>
            </div>
            <ChevronDown className="hidden size-3.5 text-gray-400 sm:block" />
          </button>
          {isUserMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
            >
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="truncate text-xs font-semibold text-gray-900">{user?.name}</p>
                <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-950"
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
    </header>
  );
}
