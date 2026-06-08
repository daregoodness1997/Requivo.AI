import { useState } from 'react';
import type { ApprovalRequest } from '@/types';
import { approvalApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

export default function ApprovalQueue() {
  const { pendingApprovals, removeApproval } = useWorkflowStore();
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const decide = async (approval: ApprovalRequest, decision: 'Approved' | 'Rejected') => {
    setLoading((p) => ({ ...p, [approval.id]: true }));
    try {
      await approvalApi.decide(approval.id, {
        decision,
        rationale: rationale[approval.id] ?? '',
      });
      removeApproval(approval.id);
    } finally {
      setLoading((p) => ({ ...p, [approval.id]: false }));
    }
  };

  if (!pendingApprovals.length) {
    return <p className="text-sm text-gray-400 py-8 text-center">No pending approvals.</p>;
  }

  return (
    <div className="space-y-4">
      {pendingApprovals.map((a) => (
        <div key={a.id} className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">
            {a.triggerReason}
          </p>
          <p className="font-medium text-gray-900 mb-1">{a.proposedAction}</p>
          <p className="text-sm text-gray-600 mb-3">{a.businessContext}</p>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-2 text-sm mb-3 focus:ring-1 focus:ring-blue-500 outline-none"
            rows={2}
            placeholder="Rationale (optional)"
            value={rationale[a.id] ?? ''}
            onChange={(e) => setRationale((p) => ({ ...p, [a.id]: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              onClick={() => decide(a, 'Approved')}
              disabled={loading[a.id]}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => decide(a, 'Rejected')}
              disabled={loading[a.id]}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
