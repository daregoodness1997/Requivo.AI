import { NavLink } from 'react-router-dom';

const links = [
  { to: '/chat',      label: 'Chat' },
  { to: '/dashboard', label: 'Approvals' },
  { to: '/audit',     label: 'Audit Log' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-blue-900 text-white flex flex-col">
      <div className="px-6 py-5 text-xl font-bold tracking-tight border-b border-blue-800">
        Requivo AI
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-blue-400 border-t border-blue-800">
        v0.1.0 · Lumenware Technologies
      </div>
    </aside>
  );
}
