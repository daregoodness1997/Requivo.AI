import { ClipboardCheck, FileClock, MessageSquareText, Sparkles, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { approvalRoles, auditRoles, hasRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const role = useAuthStore((state) => state.user?.role);
  const links = [
    { to: '/chat', label: 'Chat', icon: MessageSquareText, visible: true },
    {
      to: '/dashboard',
      label: 'Approvals',
      icon: ClipboardCheck,
      visible: hasRole(role, approvalRoles),
    },
    { to: '/audit', label: 'Audit Log', icon: FileClock, visible: hasRole(role, auditRoles) },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className={cn(
          'fixed inset-0 z-40 bg-gray-950/45 backdrop-blur-[1px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 text-white shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/chat" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight">Requivo AI</p>
              <p className="text-[11px] text-blue-200">ERP operations agent</p>
            </div>
          </NavLink>
          <Button
            aria-label="Close navigation"
            className="text-white hover:bg-white/10 hover:text-white lg:hidden"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
            Workspace
          </p>
          {links
            .filter((link) => link.visible)
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-white/70',
                    isActive
                      ? 'bg-white text-brand-900 shadow-sm'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon className="size-[18px]" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[0.08] px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]" />
              Frontend demo mode
            </div>
            <p className="mt-1 text-[11px] leading-4 text-blue-300">
              Local data is active until backend integration.
            </p>
          </div>
          <p className="mt-4 px-1 text-[11px] text-blue-400">
            v0.3.0 &middot; Lumenware Technologies
          </p>
        </div>
      </aside>
    </>
  );
}
