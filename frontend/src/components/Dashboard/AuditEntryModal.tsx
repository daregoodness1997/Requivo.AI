import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import type { AuditEntry } from '@/types';

function outcomeTone(outcome: string) {
  if (outcome === 'Success') return 'success';
  if (outcome === 'Pending Approval') return 'warning';
  return 'danger';
}

export default function AuditEntryModal({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={entry !== null}
      title="Audit entry details"
      description="Inputs and outputs are masked by the API before they reach this view."
      onClose={onClose}
    >
      {entry && (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{entry.action}</p>
              <p className="mt-1 text-xs text-gray-500">{entry.toolName}</p>
            </div>
            <Badge tone={outcomeTone(entry.outcome)}>{entry.outcome}</Badge>
          </div>

          <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-gray-400">Timestamp</dt>
              <dd className="mt-1 font-medium text-gray-700">
                {new Date(entry.timestamp).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">User</dt>
              <dd className="mt-1 font-medium text-gray-700">{entry.userId}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-400">Workflow</dt>
              <dd className="mt-1">
                <Link
                  to={`/workflows/${entry.workflowId}`}
                  className="font-mono font-medium text-brand-700 hover:text-brand-900"
                  onClick={onClose}
                >
                  {entry.workflowId}
                </Link>
              </dd>
            </div>
          </dl>

          {[
            ['Input', entry.input],
            ['Output', entry.output],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                {label as string}
              </p>
              <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-5 text-gray-100">
                {JSON.stringify(value ?? { message: 'No structured data recorded.' }, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
