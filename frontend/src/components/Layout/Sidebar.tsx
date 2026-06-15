import { formatDistanceToNow } from 'date-fns';
import {
  ClipboardCheck,
  FileClock,
  MessageSquareText,
  Plus,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';

const links = [
  { to: '/chat', label: 'Chat', icon: MessageSquareText },
  { to: '/dashboard', label: 'Approvals', icon: ClipboardCheck },
  { to: '/audit', label: 'Audit Log', icon: FileClock },
  { to: '/profile', label: 'Profile', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = useLocation().pathname;
  const sessions = useWorkflowStore((state) => state.sessions);
  const activeSessionId = useWorkflowStore((state) => state.activeSessionId);
  const clearChatContext = useWorkflowStore((state) => state.clearChatContext);
  const setActiveSession = useWorkflowStore((state) => state.setActiveSession);

  const sortedHistory = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

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
              <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-200/85">
                ERP operations agent
              </p>
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
        <nav className="flex flex-1 flex-col overflow-hidden px-3 py-5">
          <div className="space-y-1">
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
          </div>

          <div className="mt-4 min-h-0 flex-1 border-t border-white/10 pt-4">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              Chat History
            </p>

            <NavLink
              to="/chat"
              onClick={() => {
                clearChatContext();
                onClose();
              }}
              className="mb-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <Plus className="size-4" />
              New chat
            </NavLink>

            <div className="h-full space-y-1 overflow-y-auto pr-1">
              {sortedHistory.length === 0 ? (
                <p className="px-3 text-xs text-cyan-200/70">No chats yet</p>
              ) : (
                sortedHistory.map((session) => {
                  const isActiveChat = pathname === '/chat' && activeSessionId === session.id;

                  return (
                    <NavLink
                      key={session.id}
                      to="/chat"
                      onClick={() => {
                        setActiveSession(session.id);
                        onClose();
                      }}
                      className={cn(
                        'block rounded-xl px-3 py-2 text-left transition-colors',
                        isActiveChat
                          ? 'bg-white/95 text-slate-900 shadow-[0_14px_28px_-18px_rgba(2,132,199,0.8)]'
                          : 'text-cyan-100/95 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <p className="line-clamp-2 text-sm font-medium leading-5">{session.title}</p>
                      <p
                        className={cn(
                          'mt-1 line-clamp-2 text-[11px] leading-4',
                          isActiveChat ? 'text-slate-500' : 'text-cyan-200/80',
                        )}
                      >
                        {session.lastMessagePreview}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-[11px]',
                          isActiveChat ? 'text-slate-500' : 'text-cyan-200/70',
                        )}
                      >
                        {formatDistanceToNow(new Date(session.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </NavLink>
                  );
                })
              )}
            </div>
          </div>
        </nav>
        <div className="ambient-line border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[0.08] px-3 py-3 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-100">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]" />
              Backend connected
            </div>
            <p className="mt-1 text-[11px] leading-4 text-cyan-200/80">
              Authentication and authorization enforced by API policies.
            </p>
          </div>
          <p className="mt-4 px-1 font-mono text-[11px] tracking-wide text-cyan-300/75">
            v0.2.0 · Lumenware Technologies
          </p>
        </div>
      </aside>
    </>
  );
}
