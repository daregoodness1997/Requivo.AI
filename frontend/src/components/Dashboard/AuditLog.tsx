import { useState } from 'react';
import type { AuditEntry } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';

interface Props {
  entries: AuditEntry[];
}

function outcomeTone(outcome: string) {
  if (outcome === 'Success') return 'success';
  if (outcome === 'Pending Approval') return 'warning';
  return 'danger';
}

export default function AuditLog({ entries }: Props) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(entries[0]?.id ?? null);
  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? (entries.length ? entries[0] : null);

  if (!entries.length) {
    return (
      <Card className="min-h-64">
        <EmptyState
          title="No matching audit entries"
          description="Try changing your search text or outcome filter."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {entries.map((entry) => (
          <Card key={entry.id} className="p-4 ring-1 ring-white/70">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{entry.action}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{entry.toolName}</p>
              </div>
              <Badge tone={outcomeTone(entry.outcome)}>{entry.outcome}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/70 pt-3 text-xs">
              <div>
                <dt className="text-gray-400">Workflow</dt>
                <dd className="mt-1 font-mono text-gray-600">{entry.workflowId.slice(0, 12)}…</dd>
              </div>
              <div>
                <dt className="text-gray-400">Time</dt>
                <dd className="mt-1 text-gray-600">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-400">User</dt>
                <dd className="mt-1 text-gray-600">{entry.userId}</dd>
              </div>
            </dl>
            <Button variant="outline" className="mt-4" onClick={() => setSelectedEntryId(entry.id)}>
              View details
            </Button>
          </Card>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white/80 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.65)] md:block">
        <table className="min-w-full divide-y divide-slate-200/70 bg-white/60 text-sm backdrop-blur-sm">
          <thead className="bg-slate-50/85 text-xs font-semibold uppercase text-slate-500">
            <tr>
              {['Time', 'Workflow', 'Tool', 'Action', 'User', 'Outcome', 'Details'].map(
                (heading) => (
                  <th key={heading} className="px-4 py-3 text-left">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={
                  selectedEntry?.id === entry.id ? 'bg-cyan-50/60' : 'hover:bg-slate-50/80'
                }
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-400">
                  {format(new Date(entry.timestamp), 'dd MMM HH:mm:ss')}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {entry.workflowId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 font-medium text-gray-700">{entry.toolName}</td>
                <td className="px-4 py-3 text-gray-600">{entry.action}</td>
                <td className="px-4 py-3 text-gray-600">{entry.userId}</td>
                <td className="px-4 py-3">
                  <Badge tone={outcomeTone(entry.outcome)}>{entry.outcome}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => setSelectedEntryId(entry.id)}>
                    View details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <Card className="mt-4 p-4 ring-1 ring-cyan-100/80 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                Audit details
              </p>
              <h3 className="text-base font-semibold text-slate-900">{selectedEntry.action}</h3>
            </div>
            <Badge tone={outcomeTone(selectedEntry.outcome)}>{selectedEntry.outcome}</Badge>
          </div>

          <dl className="grid grid-cols-1 gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Entry ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-700">
                {selectedEntry.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Workflow ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-700">
                {selectedEntry.workflowId}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Tool</dt>
              <dd className="mt-1 font-medium text-slate-800">{selectedEntry.toolName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">User</dt>
              <dd className="mt-1 text-slate-800">{selectedEntry.userId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Timestamp</dt>
              <dd className="mt-1 text-slate-800">
                {format(new Date(selectedEntry.timestamp), 'dd MMM yyyy, HH:mm:ss')}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Relative time</dt>
              <dd className="mt-1 text-slate-800">
                {formatDistanceToNow(new Date(selectedEntry.timestamp), { addSuffix: true })}
              </dd>
            </div>
          </dl>
        </Card>
      )}
    </>
  );
}
