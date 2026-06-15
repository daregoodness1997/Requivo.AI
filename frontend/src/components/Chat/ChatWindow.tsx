import type { Workflow } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import WorkflowCard from '@/components/Workflow/WorkflowCard';
import AgentMessage from './AgentMessage';
import UserMessage from './UserMessage';

interface Props {
  workflows: Workflow[];
}

export default function ChatWindow({ workflows }: Props) {
  if (!workflows.length) {
    return (
      <EmptyState
        title="Ready for your first request"
        description="Ask Requivo to inspect ERP data or carry out a business operation."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="space-y-4">
          <UserMessage>{workflow.userInput}</UserMessage>
          <AgentMessage>
            <WorkflowCard workflow={workflow} showRequest={false} />
          </AgentMessage>
        </div>
      ))}
    </div>
  );
}
