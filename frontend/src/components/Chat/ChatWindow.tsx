import type { Workflow } from '@/types';

const STATE_COLORS: Record<string, string> = {
  Pending:         'bg-gray-100 text-gray-600',
  Planning:        'bg-blue-100 text-blue-700',
  InProgress:      'bg-yellow-100 text-yellow-700',
  WaitingApproval: 'bg-orange-100 text-orange-700',
  Completed:       'bg-green-100 text-green-700',
  Failed:          'bg-red-100 text-red-700',
};

interface Props {
  workflows: Workflow[];
}

export default function ChatWindow({ workflows }: Props) {
  if (!workflows.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
        Send a business request to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {workflows.map((wf) => (
        <div key={wf.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-gray-900">{wf.userInput}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_COLORS[wf.state] ?? ''}`}>
              {wf.state}
            </span>
          </div>
          {wf.steps.length > 0 && (
            <ol className="mt-3 space-y-1 border-t border-gray-100 pt-3">
              {wf.steps.map((step) => (
                <li key={step.index} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600">
                    {step.index + 1}
                  </span>
                  <span className="font-medium text-gray-700">{step.toolName}</span>
                  <span>— {step.description}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
