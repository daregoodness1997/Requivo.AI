import type { ChatMessage, Workflow, WorkflowStep, PlanResult } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, Circle, Clock3, LoaderCircle, SendHorizontal, Sparkles, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import PurchaseOrderForm from './PurchaseOrderForm';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { cn } from '@/lib/utils';
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

interface StockItem {
  sku: string;
  name: string;
  quantity: number;
  reorderThreshold: number;
  location: string;
  lowStock: boolean;
}

interface StockListOutput {
  type: 'stock_list';
  count: number;
  items: StockItem[];
}

interface SalesOrderItem {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  orderDate: string;
  status: string;
}

interface SalesOrderListOutput {
  type: 'sales_order_list';
  count: number;
  items: SalesOrderItem[];
}

interface EmployeeItem {
  id: string;
  name: string;
  department: string;
  status: string;
  hireDate: string;
}

interface EmployeeListOutput {
  type: 'employee_list';
  count: number;
  items: EmployeeItem[];
}

interface OnboardingItem {
  id: string;
  name: string;
  department: string;
  hireDate: string;
}

interface OnboardingListOutput {
  type: 'onboarding_list';
  count: number;
  items: OnboardingItem[];
}

interface KpiMetric {
  label: string;
  value: string;
  trend: string;
  change: string;
}

interface KpiDashboardOutput {
  type: 'kpi_dashboard';
  metrics: KpiMetric[];
}

interface PurchaseOrderItem {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  orderDate: string;
  status: string;
}

interface PurchaseOrderListOutput {
  type: 'purchase_order_list';
  count: number;
  items: PurchaseOrderItem[];
}

interface SpendCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface SpendSummaryOutput {
  type: 'spend_summary';
  totalSpend: number;
  currency: string;
  period: string;
  categories: SpendCategory[];
}

interface PaymentResultOutput {
  type: 'payment_result';
  invoiceId: string;
  vendor: string;
  amount: number;
  currency: string;
  status: string;
  message: string;
}

type StepOutput = InvoiceListOutput | StockListOutput | SalesOrderListOutput | EmployeeListOutput | OnboardingListOutput | KpiDashboardOutput | SpendSummaryOutput | PurchaseOrderListOutput | PaymentResultOutput;

function isStepOutput(value: unknown): value is StepOutput {
  return isInvoiceListOutput(value) || isStockListOutput(value) || isSalesOrderListOutput(value) || isEmployeeListOutput(value) || isOnboardingListOutput(value) || isKpiDashboardOutput(value) || isSpendSummaryOutput(value) || isPurchaseOrderListOutput(value) || isPaymentResultOutput(value);
}

function isTypedOutput<T extends StepOutput>(type: T['type']): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { type?: unknown; items?: unknown };
    return candidate.type === type;
  };
}

const isInvoiceListOutput = isTypedOutput<InvoiceListOutput>('invoice_list');
const isStockListOutput = isTypedOutput<StockListOutput>('stock_list');
const isSalesOrderListOutput = isTypedOutput<SalesOrderListOutput>('sales_order_list');
const isEmployeeListOutput = isTypedOutput<EmployeeListOutput>('employee_list');
const isOnboardingListOutput = isTypedOutput<OnboardingListOutput>('onboarding_list');
const isKpiDashboardOutput = isTypedOutput<KpiDashboardOutput>('kpi_dashboard');
const isSpendSummaryOutput = isTypedOutput<SpendSummaryOutput>('spend_summary');
const isPurchaseOrderListOutput = isTypedOutput<PurchaseOrderListOutput>('purchase_order_list');
const isPaymentResultOutput = isTypedOutput<PaymentResultOutput>('payment_result');

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

const OUTPUT_BADGE_TONES: Record<string, 'neutral' | 'warning' | 'danger' | 'success' | 'info'> = {
  Due: 'warning',
  Overdue: 'danger',
  Paid: 'success',
  Pending: 'warning',
  Shipped: 'info',
  Delivered: 'success',
  Draft: 'neutral',
  Active: 'success',
  Onboarding: 'info',
  OnLeave: 'warning',
  up: 'success',
  down: 'danger',
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

function useStepOutput(steps?: WorkflowStep[]) {
  return useMemo(() => {
    if (!steps) return null;
    for (const step of steps) {
      const o = step.output;
      if (isInvoiceListOutput(o) || isStockListOutput(o) || isSalesOrderListOutput(o) || isEmployeeListOutput(o) || isOnboardingListOutput(o) || isKpiDashboardOutput(o) || isSpendSummaryOutput(o) || isPurchaseOrderListOutput(o) || isPaymentResultOutput(o)) {
        return o;
      }
    }
    return null;
  }, [steps]);
}

function InvoiceTable({ output }: { output: InvoiceListOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Invoices ({output.count})
      </p>
      {output.items.map((invoice) => (
        <div
          key={invoice.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{invoice.id}</p>
            <p className="text-xs text-slate-500">{invoice.vendor}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              {formatMoney(invoice.amount, invoice.currency)}
            </span>
            <Badge tone={OUTPUT_BADGE_TONES[invoice.status] ?? 'neutral'}>
              {invoice.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function StockTable({ output }: { output: StockListOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Stock ({output.count} items)
      </p>
      {output.items.map((item) => (
        <div key={item.sku} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">{item.sku} · {item.location}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${item.lowStock ? 'text-danger-600' : 'text-slate-800'}`}>
              {item.quantity}
            </span>
            {item.lowStock && <Badge tone="danger">Low</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesOrderTable({ output }: { output: SalesOrderListOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Orders ({output.count})
      </p>
      {output.items.map((order) => (
        <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{order.id}</p>
            <p className="text-xs text-slate-500">{order.customer}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              {formatMoney(order.amount, order.currency)}
            </span>
            <Badge tone={OUTPUT_BADGE_TONES[order.status] ?? 'neutral'}>
              {order.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmployeeTable({ output }: { output: EmployeeListOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Employees ({output.count})
      </p>
      {output.items.map((emp) => (
        <div key={emp.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{emp.name}</p>
            <p className="text-xs text-slate-500">{emp.department} · {emp.id}</p>
          </div>
          <Badge tone={OUTPUT_BADGE_TONES[emp.status] ?? 'neutral'}>
            {emp.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function KpiTable({ output }: { output: KpiDashboardOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KPI Dashboard</p>
      <div className="grid grid-cols-2 gap-2">
        {output.metrics.map((m, i) => (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
            <p className="text-[11px] text-slate-500">{m.label}</p>
            <p className="text-sm font-semibold text-slate-800">{m.value}</p>
            <span className={`text-[11px] ${m.trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
              {m.trend === 'up' ? '↑' : '↓'} {m.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendTable({ output }: { output: SpendSummaryOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Spend Summary ({output.period})
      </p>
      <p className="text-lg font-bold text-slate-800">{formatMoney(output.totalSpend, output.currency)}</p>
      <div className="space-y-1">
        {output.categories.map((cat, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50/50 px-3 py-1.5 text-sm">
            <span className="text-slate-600">{cat.category}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{formatMoney(cat.amount, output.currency)}</span>
              <span className="text-xs text-slate-400">{cat.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentResult({ output }: { output: PaymentResultOutput }) {
  return (
    <div className="rounded-xl border border-success-200 bg-success-50/70 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Check className="size-4 text-success-600" />
        <p className="font-medium text-success-800">Payment processed</p>
      </div>
      <p className="mt-1 text-success-700">{output.message}</p>
    </div>
  );
}

function PurchaseOrderTable({ output }: { output: PurchaseOrderListOutput }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Purchase Orders ({output.count})
      </p>
      {output.items.map((po) => (
        <div key={po.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800">{po.id}</p>
            <p className="text-xs text-slate-500">{po.vendor}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">
              {formatMoney(po.amount, po.currency)}
            </span>
            <Badge tone={OUTPUT_BADGE_TONES[po.status] ?? 'neutral'}>
              {po.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepOutputRenderer({ output }: { output: StepOutput }) {
  switch (output.type) {
    case 'invoice_list':
      return <InvoiceTable output={output} />;
    case 'stock_list':
      return <StockTable output={output} />;
    case 'sales_order_list':
      return <SalesOrderTable output={output} />;
    case 'employee_list':
    case 'onboarding_list':
      return <EmployeeTable output={output as unknown as EmployeeListOutput} />;
    case 'kpi_dashboard':
      return <KpiTable output={output} />;
    case 'spend_summary':
      return <SpendTable output={output} />;
    case 'purchase_order_list':
      return <PurchaseOrderTable output={output} />;
    case 'payment_result':
      return <PaymentResult output={output} />;
  }
}

function StepOutputRendererCompact({ output, onAction }: { output: StepOutput; onAction?: Props['onAction'] }) {
  if (isInvoiceListOutput(output)) {
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/75 p-3">
        <p className="text-xs font-medium text-slate-600">
          {output.count} invoice{output.count === 1 ? '' : 's'} found
        </p>
        {output.items.map((invoice) => (
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
            {invoice.actions.length > 0 && (
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
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <StepOutputRenderer output={output} />
    </div>
  );
}

function ResultBubble({ content, plan, steps }: { content: string; plan?: PlanResult | null; steps?: WorkflowStep[] }) {
  const stepOutput = useStepOutput(steps);

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
      {stepOutput && <StepOutputRenderer output={stepOutput} />}
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

function PromptBubble({ data, onRespond, sessionId }: { data: Record<string, unknown> & { question: string; options?: string[]; stepToolName?: string; stepDescription?: string; formType?: string }; onRespond?: Props['onRespond']; sessionId: string }) {
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

  if (data.formType === 'purchase_order') {
    return <PurchaseOrderForm onSubmit={send} isSending={isSending} />;
  }

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

function AssistantContent({ message, onRespond, workflowSteps }: { message: ChatMessage; onRespond?: Props['onRespond']; workflowSteps?: WorkflowStep[] }) {
  const type = message.contentType ?? 'text';
  const stepOutput = useStepOutput(workflowSteps);

  switch (type) {
    case 'thinking':
      return <ThinkingBubble />;
    case 'plan':
      return message.plan ? <PlanBubble plan={message.plan} /> : <span>{message.content}</span>;
    case 'result':
      return <ResultBubble content={message.content} plan={message.plan} steps={workflowSteps} />;
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
        <div className="space-y-3">
          <MessageContent markdown className="max-w-[90%]">
            {message.content}
          </MessageContent>
          {stepOutput && <StepOutputRenderer output={stepOutput} />}
        </div>
      );
  }
}

function WorkflowReviewContent({ workflow, onAction }: { workflow: Workflow; onAction?: Props['onAction'] }) {
  return (
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
                  {isStepOutput(step.output) && <StepOutputRendererCompact output={step.output} onAction={onAction} />}
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
  );
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
      <WorkflowReviewContent workflow={workflow} onAction={onAction} />
    </div>
  );
}

export default function ChatWindow({ messages, workflows, activeSessionId, onAction, onRespond }: Props) {
  const lastWorkflowId = [...messages].reverse().find((m) => m.workflowId)?.workflowId ?? null;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(lastWorkflowId);

  const activeWorkflow = (selectedWorkflowId ?? lastWorkflowId)
    ? workflows.find((w) => w.id === (selectedWorkflowId ?? lastWorkflowId))
    : undefined;

  const [rightWidth, setRightWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [showReviewMobile, setShowReviewMobile] = useState(false);
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
      <ChatContainerRoot className="flex-1 overflow-hidden p-2 sm:p-4">
        <ChatContainerContent className="gap-3 sm:gap-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const hasWorkflow = !!message.workflowId;
            const isSelected = hasWorkflow && selectedWorkflowId === message.workflowId;

            return (
              <div
                key={message.id}
                onClick={() => {
                  if (message.workflowId) {
                    setSelectedWorkflowId(message.workflowId);
                  }
                }}
                className={cn(
                  hasWorkflow && 'cursor-pointer rounded-lg transition-colors hover:bg-slate-50/50',
                  isSelected && 'ring-1 ring-cyan-200 bg-cyan-50/30',
                )}
              >
                <Message className={cn(isUser ? 'justify-end' : '', 'gap-1.5 sm:gap-3')}>
                  {!isUser && (
                    <MessageAvatar
                      src=""
                      alt="Assistant"
                      fallback="AI"
                      className="hidden sm:flex size-6 sm:size-8"
                    />
                  )}

                  {isUser ? (
                    <MessageContent className="max-w-[85%] sm:max-w-[80%] bg-cyan-50 text-cyan-950 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm">
                      {message.content}
                    </MessageContent>
                  ) : (
                    <AssistantContent message={message} onRespond={onRespond} workflowSteps={workflows.find((w) => w.id === message.workflowId)?.steps} />
                  )}

                  {isUser && (
                    <MessageAvatar
                      src=""
                      alt="You"
                      fallback="You"
                      className="hidden sm:flex size-6 sm:size-8"
                    />
                  )}
                </Message>
              </div>
            );
          })}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>

      {activeWorkflow && (
        <>
          <div className="hidden lg:flex h-full">
            <div
              className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-slate-200 active:bg-slate-300"
              onMouseDown={handleMouseDown}
            >
              <div className="h-8 w-0.5 rounded-full bg-slate-300" />
            </div>
            <WorkflowReviewPanel
              workflow={activeWorkflow}
              onAction={onAction}
              style={{ width: rightWidth }}
            />
          </div>

          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setShowReviewMobile(true)}
              className="flex size-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 transition-colors hover:bg-slate-50 active:scale-95 fixed bottom-6 right-4 z-30"
              aria-label="Show workflow review"
            >
              <PanelRightOpen className="size-5 text-cyan-700" />
              <span className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[10px] font-bold text-white shadow-xs">
                {(activeWorkflow.steps.filter((s) => s.state === 'InProgress' || s.state === 'WaitingApproval').length || activeWorkflow.steps.length).toString()}
              </span>
            </button>
          </div>

          {showReviewMobile && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={() => setShowReviewMobile(false)}
              />
              <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-800">Review</h2>
                  <button
                    type="button"
                    onClick={() => setShowReviewMobile(false)}
                    className="flex size-7 items-center justify-center rounded-full hover:bg-slate-100"
                    aria-label="Close review panel"
                  >
                    <PanelRightClose className="size-4 text-slate-500" />
                  </button>
                </div>
                <WorkflowReviewContent workflow={activeWorkflow} onAction={onAction} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
