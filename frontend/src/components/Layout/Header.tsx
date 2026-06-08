import { useWorkflowStore } from '@/store/workflowStore';

export default function Header() {
  const pendingCount = useWorkflowStore((s) => s.pendingApprovals.length);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <span className="text-sm text-gray-500">Autonomous ERP Operations Agent</span>
      <div className="flex items-center gap-4">
        {pendingCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
            {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-semibold">
          GD
        </div>
      </div>
    </header>
  );
}
