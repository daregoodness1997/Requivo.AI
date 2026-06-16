import type { ChatMessage, Workflow, PlanResult } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Circle, Clock3, LoaderCircle, SendHorizontal, Sparkles, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { getWorkflowPreview, getWorkflowTitle } from '@/lib/chat';

const STATE_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  Pending: 'neutral',
  Planning: 'info',
  InProgress: 'warning',
  WaitingApproval: 'warning',
  Completed: 'success',
  Failed: 'danger',
};

const STEP_MARKERS: Record<string, string> = {
  Pending: 'bg-gray-100 text-gray-600',
  Planning: 'bg-brand-100 text-brand-700',
  InProgress: 'bg-warning-100 text-warning-700',
  WaitingApproval: 'bg-warning-100 text-warning-700',
  Completed: 'bg-success-100 text-success-700',
  Failed: 'bg-danger-100 text-danger-700',
};

const STEP_ICONS: Record<string, typeof Circle> = {
  Pending: Circle,
  Planning: Clock3,
  InProgress: Clock3,
  WaitingApproval: Clock3,
  Completed: Check,
  Failed: X,
};

const DOMAIN_BADGE_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  Inventory: 'neutral',
  Procurement: 'warning',
  Finance: 'info',
  Sales: 'success',
  HR: 'danger',
  Reporting: 'neutral',
};

interface Props {
  messages: ChatMessage[];
  workflows: Workflow[];
  activeSessionId: string | null;
  onAction?: (prompt: string) => Promise<unknown> | unknown;
  onRespond?: (sessionId: string, input: string) => Promise<unknown>;
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
  status: string;
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

const OUTPUT_BADGE_TONES: Record<string, 'neutral' | 'warning' | 'danger' | 'success'> = {
  Due: 'warning',
  Overdue: 'danger',
  Paid: 'success',
};

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:300ms]" />
    </span>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-slate-100 px-5 py-3.5 text-sm text-slate-600">
      <LoaderCircle className="size-4 animate-spin text-brand-600" />
      <span>Analyzing your request</span>
      <TypingDots />
    </div>
  );
}

function PlanBubble({ plan }: { plan: PlanResult }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <Sparkles className="size-4 text-brand-600" />
        <span>
          I've analyzed your request. Here's my plan across{' '}
          <Badge tone={DOMAIN_BADGE_TONES[plan.domain] ?? 'neutral'}>{plan.domain}</Badge>:
        </span>
      </div>
      <ol className="space-y-2">
        {plan.steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-gray-800">{step.toolName}</span>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultBubble({ content, plan }: { content: string; plan?: PlanResult | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-success-200/80 bg-success-50/70 px-4 py-3 text-sm">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-100">
          <Check className="size-3.5 text-success-700" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-success-800">Workflow completed</p>
          <p className="mt-0.5 text-success-700">{content}</p>
        </div>
        {plan && (
          <Badge tone={DOMAIN_BADGE_TONES[plan.domain] ?? 'neutral'}>{plan.domain}</Badge>
        )}
      </div>
    </div>
  );
}

function ErrorBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-danger-200/80 bg-danger-50/70 px-4 py-3 text-sm">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-100">
        <X className="size-3.5 text-danger-700" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-danger-800">Workflow failed</p>
        <p className="mt-0.5 text-danger-700">{content}</p>
      </div>
    </div>
  );
}

function PromptBubble({ data, onRespond, sessionId }: { data: Record<string, unknown> & { question: string; options?: string[]; stepToolName?: string; stepDescription?: string }; onRespond?: Props['onRespond']; sessionId: string }) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onRespond?.(sessionId, trimmed);
      setInput('');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm">
        <p className="font-medium text-amber-800">{data.question}</p>
        {data.stepToolName && (
          <p className="mt-0.5 text-xs text-amber-600">
            While processing <span className="font-semibold">{data.stepToolName}</span>
            {data.stepDescription && <> — {data.stepDescription}</>}
          </p>
        )}
      </div>

      {data.options && data.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={isSending}
              onClick={() => void send(option)}
              className="rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response..."
          disabled={isSending}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
        >
          {isSending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}

function AssistantContent({ message, onRespond }: { message: ChatMessage; onRespond?: Props['onRespond'] }) {
  const type = message.contentType ?? 'text';

  switch (type) {
    case 'thinking':
      return <ThinkingBubble />;
    case 'plan':
      return message.plan ? <PlanBubble plan={message.plan} /> : <span>{message.content}</span>;
    case 'result':
      return <ResultBubble content={message.content} plan={message.plan} />;
    case 'error':
      return <ErrorBubble content={message.content} />;
    case 'prompt':
      return message.plan ? (
        <PromptBubble data={message.plan as unknown as Record<string, unknown> & { question: string }} onRespond={onRespond} sessionId={message.sessionId} />
      ) : (
        <ErrorBubble content={message.content} />
      );
    default:
      return (
        <MessageContent markdown className="max-w-[90%]">
          {message.content}
        </MessageContent>
      );
  }
}

function WorkflowReviewPanel({ workflow, onAction, style }: { workflow: Workflow; onAction?: Props['onAction']; style?: CSSProperties }) {
  return (
    <div style={style} className="shrink-0 overflow-y-auto border-l border-slate-200 bg-white/50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Review</h2>
          <Badge className="shrink-0" tone={STATE_TONES[workflow.state]}>
            {workflow.state === 'WaitingApproval' ? 'Waiting approval' : workflow.state}
          </Badge>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <p className="text-sm font-semibold text-gray-900">{getWorkflowTitle(workflow)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{getWorkflowPreview(workflow)}</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
            {workflow.domain && <Badge tone={DOMAIN_BADGE_TONES[workflow.domain]}>{workflow.domain}</Badge>}
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {workflow.failureReason && (
          <Alert tone="danger">{workflow.failureReason}</Alert>
        )}

        {workflow.steps.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Steps
            </h4>
            <ol className="space-y-3">
              {workflow.steps.map((step) => (
                <li key={step.index} className="flex items-start gap-3 text-xs text-slate-500">
                  <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-medium ${STEP_MARKERS[step.state]}`}>
                    {(() => {
                      const StepIcon = STEP_ICONS[step.state];
                      return <StepIcon className="size-3.5" />;
                    })()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold text-gray-700">{step.toolName}</span>
                      <span className="font-mono text-slate-400">Step {step.index + 1}</span>
                    </div>
                    <p className="mt-0.5 text-slate-500">{step.description}</p>
                    {isInvoiceListOutput(step.output) && (
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/75 p-3">
                        <p className="text-xs font-medium text-slate-600">
                          {step.output.count} invoice{step.output.count === 1 ? '' : 's'} found
                        </p>
                        {step.output.items.map((invoice) => (
                          <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{invoice.id}</p>
                                <p className="text-[11px] text-slate-500">{invoice.vendor}</p>
                              </div>
                              <Badge className="shrink-0" tone={OUTPUT_BADGE_TONES[invoice.status] ?? 'neutral'}>
                                {invoice.status}
                              </Badge>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span>{formatMoney(invoice.amount, invoice.currency)}</span>
                              <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {invoice.actions.map((action) => (
                                <button
                                  key={`${invoice.id}-${action.key}`}
                                  type="button"
                                  onClick={() => void onAction?.(action.prompt)}
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
          </div>
        )}

        {workflow.state === 'WaitingApproval' && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs font-medium text-warning-700">
            This workflow is paused until an approver makes a decision.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, workflows, activeSessionId, onAction, onRespond }: Props) {
  const lastWorkflowMessage = [...messages].reverse().find((m) => m.workflowId);
  const activeWorkflow = lastWorkflowMessage?.workflowId
    ? workflows.find((w) => w.id === lastWorkflowMessage.workflowId)
    : undefined;

  const [rightWidth, setRightWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(280, Math.min(800, rect.right - e.clientX));
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      <ChatContainerRoot className="flex-1 overflow-hidden p-4">
        <ChatContainerContent className="gap-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div key={message.id}>
                <Message className={isUser ? 'justify-end' : ''}>
                  {!isUser && <MessageAvatar src="" alt="Assistant" fallback="AI" />}

                  {isUser ? (
                    <MessageContent className="max-w-[80%] bg-cyan-50 text-cyan-950">
                      {message.content}
                    </MessageContent>
                  ) : (
                    <AssistantContent message={message} onRespond={onRespond} />
                  )}

                  {isUser && <MessageAvatar src="" alt="You" fallback="You" />}
                </Message>
              </div>
            );
          })}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>

      {activeWorkflow && (
        <>
          <div
            className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-slate-200 active:bg-slate-300"
            onMouseDown={handleMouseDown}
          >
            <div className="h-8 w-0.5 rounded-full bg-slate-300" />
          </div>
          <WorkflowReviewPanel workflow={activeWorkflow} onAction={onAction} style={{ width: rightWidth }} />
        </>
      )}
    </div>
  );
}
