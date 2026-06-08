import type { AuditEntry } from '@/types';
import { format } from 'date-fns';

interface Props { entries: AuditEntry[]; }

export default function AuditLog({ entries }: Props) {
  if (!entries.length) return <p className="text-sm text-gray-400 text-center py-8">No audit entries yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 bg-white text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
          <tr>
            {['Time', 'Workflow', 'Tool', 'Action', 'User', 'Outcome'].map((h) => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{format(new Date(e.timestamp), 'dd MMM HH:mm:ss')}</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{e.workflowId.slice(0, 8)}…</td>
              <td className="px-4 py-2 font-medium text-gray-700">{e.toolName}</td>
              <td className="px-4 py-2 text-gray-600">{e.action}</td>
              <td className="px-4 py-2 text-gray-600">{e.userId}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  e.outcome === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{e.outcome}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
