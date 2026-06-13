import { ClipboardCheck, FileClock, MessageSquareText, Sparkles, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const links = [
  { to: '/chat', label: 'Chat', icon: MessageSquareText },
  { to: '/dashboard', label: 'Approvals', icon: ClipboardCheck },
  { to: '/audit', label: 'Audit Log', icon: FileClock },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-cyan-900/30 bg-[linear-gradient(180deg,#0f2f43_0%,#11263a_44%,#132336_100%)] text-white shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="ambient-line flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/chat" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-bold tracking-tight">Requivo AI</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-200/85">ERP operations agent</p>
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
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
            Workspace
          </p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-white/70',
                  isActive
                    ? 'bg-white/95 text-slate-900 shadow-[0_14px_28px_-18px_rgba(2,132,199,0.8)]'
                    : 'text-cyan-100/95 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ambient-line border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[0.08] px-3 py-3 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-100">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]" />
              Frontend demo mode
            </div>
            <p className="mt-1 text-[11px] leading-4 text-cyan-200/80">
              Local data is active until backend integration.
            </p>
          </div>
          <p className="mt-4 px-1 font-mono text-[11px] tracking-wide text-cyan-300/75">v0.2.0 · Lumenware Technologies</p>
        </div>
      </aside>
    </>
  );
}
