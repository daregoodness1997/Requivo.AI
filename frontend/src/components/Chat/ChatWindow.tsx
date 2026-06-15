import type { ChatMessage, Workflow } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Check, Circle, Clock3, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { getWorkflowPreview, getWorkflowTitle } from '@/lib/chat';

const STATE_TONES = {
  Pending: 'neutral',
  Planning: 'info',
  InProgress: 'warning',
  WaitingApproval: 'warning',
  Completed: 'success',
  Failed: 'danger',
} as const;

const STEP_MARKERS = {
  Pending: 'bg-gray-100 text-gray-600',
  Planning: 'bg-brand-100 text-brand-700',
  InProgress: 'bg-warning-100 text-warning-700',
  WaitingApproval: 'bg-warning-100 text-warning-700',
  Completed: 'bg-success-100 text-success-700',
  Failed: 'bg-danger-100 text-danger-700',
};

const STEP_ICONS = {
  Pending: Circle,
  Planning: Clock3,
  InProgress: Clock3,
  WaitingApproval: Clock3,
  Completed: Check,
  Failed: X,
};

interface Props {
  messages: ChatMessage[];
  workflows: Workflow[];
  activeSessionId: string | null;
  onAction?: (prompt: string) => Promise<unknown> | unknown;
}

interface InvoiceAction {
  key: string;
  label: string;
  prompt: string;
}

interface InvoiceItem {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'Due' | 'Paid' | 'Overdue' | string;
  actions: InvoiceAction[];
}

interface InvoiceListOutput {
  type: 'invoice_list';
  count: number;
  items: InvoiceItem[];
}

function isInvoiceListOutput(value: unknown): value is InvoiceListOutput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; items?: unknown };
  return candidate.type === 'invoice_list' && Array.isArray(candidate.items);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const OUTPUT_BADGE_TONES = {
  Due: 'warning',
  Overdue: 'danger',
  Paid: 'success',
} as const;

export default function ChatWindow({ messages, workflows, activeSessionId, onAction }: Props) {
  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

  if (!activeSessionId) {
    return (
      <EmptyState
        title="Ready for your first request"
        description="Ask Requivo to inspect ERP data or carry out a business operation."
      />
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Send your first message to start this chat session."
      />
    );
  }

  return (
    <ChatContainerRoot className="flex-1 p-4">
      <ChatContainerContent className="gap-4">
        {messages.map((message) => {
          const relatedWorkflow = message.workflowId
            ? workflowById.get(message.workflowId)
            : undefined;
          const isUser = message.role === 'user';

          return (
            <div key={message.id} className="space-y-3">
              <Message className={isUser ? 'justify-end' : ''}>
                {!isUser && <MessageAvatar src="" alt="Assistant" fallback="AI" />}
                <MessageContent
                  className={isUser ? 'max-w-[80%] bg-cyan-50 text-cyan-950' : 'max-w-[90%]'}
                  markdown={!isUser}
                >
                  {message.content}
                </MessageContent>
                {isUser && <MessageAvatar src="" alt="You" fallback="You" />}
              </Message>

              {relatedWorkflow && (
                <Card
                  key={relatedWorkflow.id}
                  className="flex flex-col ring-1 ring-white/70 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {getWorkflowTitle(relatedWorkflow)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {getWorkflowPreview(relatedWorkflow)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          {relatedWorkflow.domain && <span>{relatedWorkflow.domain}</span>}
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(new Date(relatedWorkflow.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <Badge className="shrink-0" tone={STATE_TONES[relatedWorkflow.state]}>
                        {relatedWorkflow.state === 'WaitingApproval'
                          ? 'Waiting approval'
                          : relatedWorkflow.state}
                      </Badge>
                    </div>
                    {relatedWorkflow.failureReason && (
                      <Alert className="mt-4" tone="danger">
                        {relatedWorkflow.failureReason}
                      </Alert>
                    )}
                    {relatedWorkflow.steps.length > 0 && (
                      <ol className="mt-4 space-y-3 border-t border-slate-200/70 pt-4">
                        {relatedWorkflow.steps.map((step) => (
                          <li
                            key={step.index}
                            className="flex items-start gap-3 text-xs text-slate-500"
                          >
                            <span
                              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-medium ${STEP_MARKERS[step.state]}`}
                            >
                              {(() => {
                                const StepIcon = STEP_ICONS[step.state];
                                return <StepIcon className="size-3.5" />;
                              })()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <span className="font-semibold text-gray-700">{step.toolName}</span>
                                <span className="font-mono text-slate-400">
                                  Step {step.index + 1}
                                </span>
                              </div>
                              <p className="mt-0.5 text-slate-500">{step.description}</p>
                              {isInvoiceListOutput(step.output) && (
                                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/75 p-3">
                                  <p className="text-xs font-medium text-slate-600">
                                    {step.output.count} invoice{step.output.count === 1 ? '' : 's'}{' '}
                                    found
                                  </p>
                                  {step.output.items.map((invoice) => (
                                    <div
                                      key={invoice.id}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800">
                                            {invoice.id}
                                          </p>
                                          <p className="text-[11px] text-slate-500">
                                            {invoice.vendor}
                                          </p>
                                        </div>
                                        <Badge
                                          className="shrink-0"
                                          tone={
                                            OUTPUT_BADGE_TONES[
                                              invoice.status as keyof typeof OUTPUT_BADGE_TONES
                                            ] ?? 'neutral'
                                          }
                                        >
                                          {invoice.status}
                                        </Badge>
                                      </div>
                                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                        <span>{formatMoney(invoice.amount, invoice.currency)}</span>
                                        <span>
                                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {invoice.actions.map((action) => (
                                          <button
                                            key={`${invoice.id}-${action.key}`}
                                            type="button"
                                            onClick={() => {
                                              void onAction?.(action.prompt);
                                            }}
                                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                                          >
                                            {action.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  {relatedWorkflow.state === 'WaitingApproval' && (
                    <div className="border-t border-warning-100 bg-warning-50 px-4 py-3 text-xs font-medium text-warning-700 sm:px-5">
                      This workflow is paused until an approver makes a decision.
                    </div>
                  )}
                </Card>
              )}
            </div>
          );
        })}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>
  );
}
