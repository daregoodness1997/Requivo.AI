import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useWorkflowStore } from '@/store/workflowStore';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import ApprovalCard from './ApprovalCard';

export default function ApprovalQueue() {
  const { pendingApprovals, removeApproval } = useWorkflowStore();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('All');
  const [trigger, setTrigger] = useState('All');

  const triggers = useMemo(
    () => ['All', ...Array.from(new Set(pendingApprovals.map((item) => item.triggerReason)))],
    [pendingApprovals],
  );

  const filteredApprovals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return pendingApprovals
      .filter((approval) => {
        const matchesQuery =
          !normalized ||
          [approval.proposedAction, approval.businessContext, approval.workflowId].some((value) =>
            value.toLowerCase().includes(normalized),
          );
        return (
          matchesQuery &&
          (priority === 'All' || approval.priority === priority) &&
          (trigger === 'All' || approval.triggerReason === trigger)
        );
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [pendingApprovals, priority, query, trigger]);

  if (!pendingApprovals.length) {
    return (
      <Card className="min-h-64">
        <EmptyState
          title="No pending approvals"
          description="Approval requests that require your attention will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search approvals</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm"
            placeholder="Search action, context, or workflow"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
          Priority
          <select
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            {['All', 'High', 'Medium', 'Low'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
          Trigger
          <select
            className="h-10 max-w-56 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            value={trigger}
            onChange={(event) => setTrigger(event.target.value)}
          >
            {triggers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </Card>

      {filteredApprovals.length ? (
        filteredApprovals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onDecided={() => removeApproval(approval.id)}
          />
        ))
      ) : (
        <Card className="min-h-52">
          <EmptyState
            title="No matching approvals"
            description="Try changing the search text or filters."
          />
        </Card>
      )}
    </div>
  );
}
