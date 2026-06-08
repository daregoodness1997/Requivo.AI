import { useEffect } from 'react';
import ApprovalQueue from '@/components/Approvals/ApprovalQueue';
import { approvalApi } from '@/api/workflow';
import { useWorkflowStore } from '@/store/workflowStore';

export default function DashboardPage() {
  const { setPendingApprovals, pendingApprovals } = useWorkflowStore();

  useEffect(() => {
    approvalApi.list().then(setPendingApprovals).catch(console.error);
  }, [setPendingApprovals]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500">{pendingApprovals.length} pending</p>
      </div>
      <ApprovalQueue />
    </div>
  );
}
