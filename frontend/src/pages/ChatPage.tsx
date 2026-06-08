import { useEffect } from 'react';
import ChatWindow from '@/components/Chat/ChatWindow';
import ChatInput from '@/components/Chat/ChatInput';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useSSE } from '@/hooks/useSSE';
import { useWorkflowStore } from '@/store/workflowStore';
import { workflowApi } from '@/api/workflow';

export default function ChatPage() {
  const { startWorkflow } = useWorkflow();
  const { workflows, activeWorkflowId, setWorkflows } = useWorkflowStore();

  useSSE(activeWorkflowId);

  useEffect(() => {
    workflowApi.list().then(setWorkflows).catch(console.error);
  }, [setWorkflows]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-900">ERP Assistant</h1>
        <p className="text-xs text-gray-500">Describe a business task in plain English</p>
      </div>
      <ChatWindow workflows={workflows} />
      <ChatInput onSubmit={startWorkflow} />
    </div>
  );
}
