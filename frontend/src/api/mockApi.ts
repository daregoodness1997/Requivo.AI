import type {
  ApprovalActionRequest,
  ApprovalRequest,
  AuditEntry,
  ChatMessage,
  ChatSession,
  PlanResult,
  SendChatMessageRequest,
  SendChatMessageResponse,
  StartWorkflowRequest,
  Workflow,
  WorkflowDomain,
  WorkflowStep,
} from '@/types';
import { useWorkflowStore } from '@/store/workflowStore';

const DEMO_USER = 'demo.user@requivo.ai';
const latency = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clone = <T>(value: T): T => structuredClone(value);
const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type InvoiceStatus = 'Due' | 'Paid' | 'Overdue';

interface InvoiceRecord {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
}

const financeInvoices: InvoiceRecord[] = [
  {
    id: 'INV-2041',
    vendor: 'Acme Corp',
    amount: 4500,
    currency: 'USD',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Due',
  },
  {
    id: 'INV-2087',
    vendor: 'Northwind Logistics',
    amount: 1250,
    currency: 'USD',
    dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Due',
  },
  {
    id: 'INV-1994',
    vendor: 'Delta Office Supplies',
    amount: 980,
    currency: 'USD',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Overdue',
  },
  {
    id: 'INV-1908',
    vendor: 'City Utilities',
    amount: 730,
    currency: 'USD',
    dueDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Paid',
  },
];

const completedStep = (
  index: number,
  toolName: string,
  description: string,
  minutesAgo: number,
): WorkflowStep => ({
  index,
  toolName,
  description,
  state: 'Completed',
  output: { status: 'ok' },
  startedAt: isoAgo(minutesAgo + 1),
  completedAt: isoAgo(minutesAgo),
});

const workflows: Workflow[] = [
  {
    id: 'wf-demo-invoices-due',
    userInput: 'List all due invoices',
    domain: 'Finance',
    state: 'Completed',
    steps: [
      completedStep(0, 'FinanceTool', 'Retrieve invoices from Accounts Payable', 4),
      {
        index: 1,
        toolName: 'FinanceTool',
        description: 'Prepare invoice list with available actions',
        state: 'Completed',
        output: {
          type: 'invoice_list',
          count: 3,
          items: [
            {
              id: 'INV-2041',
              vendor: 'Acme Corp',
              amount: 4500,
              currency: 'USD',
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'Due',
              actions: [
                {
                  key: 'view',
                  label: 'View invoice',
                  prompt: 'View invoice INV-2041 details',
                },
                {
                  key: 'pay',
                  label: 'Pay invoice',
                  prompt: 'Pay invoice INV-2041 to Acme Corp for $4,500',
                },
              ],
            },
            {
              id: 'INV-2087',
              vendor: 'Northwind Logistics',
              amount: 1250,
              currency: 'USD',
              dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'Due',
              actions: [
                {
                  key: 'view',
                  label: 'View invoice',
                  prompt: 'View invoice INV-2087 details',
                },
                {
                  key: 'pay',
                  label: 'Pay invoice',
                  prompt: 'Pay invoice INV-2087 to Northwind Logistics for $1,250',
                },
              ],
            },
            {
              id: 'INV-1994',
              vendor: 'Delta Office Supplies',
              amount: 980,
              currency: 'USD',
              dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'Overdue',
              actions: [
                {
                  key: 'view',
                  label: 'View invoice',
                  prompt: 'View invoice INV-1994 details',
                },
                {
                  key: 'pay',
                  label: 'Pay invoice',
                  prompt: 'Pay invoice INV-1994 to Delta Office Supplies for $980',
                },
              ],
            },
          ],
        },
        startedAt: isoAgo(4),
        completedAt: isoAgo(3),
      },
    ],
    createdAt: isoAgo(6),
    updatedAt: isoAgo(3),
  },
  {
    id: 'wf-demo-invoices-overdue',
    userInput: 'Show all overdue invoices',
    domain: 'Finance',
    state: 'Completed',
    steps: [
      completedStep(0, 'FinanceTool', 'Retrieve invoices from Accounts Payable', 8),
      completedStep(1, 'FinanceTool', 'Prepare invoice list with available actions', 7),
    ],
    createdAt: isoAgo(9),
    updatedAt: isoAgo(7),
  },
  {
    id: 'wf-demo-view-invoice',
    userInput: 'View invoice INV-2041 details',
    domain: 'Finance',
    state: 'Completed',
    steps: [
      completedStep(0, 'FinanceTool', 'Validate invoice reference and vendor context', 11),
      completedStep(1, 'FinanceTool', 'Retrieve full invoice details and attachments', 10),
      completedStep(2, 'FinanceTool', 'Present invoice summary for review', 9),
    ],
    createdAt: isoAgo(12),
    updatedAt: isoAgo(9),
  },
  {
    id: 'wf-demo-sales-orders',
    userInput: 'Show pending sales orders this week',
    domain: 'Sales',
    state: 'Completed',
    steps: [
      completedStep(0, 'SalesTool', 'Filter sales orders for current week', 13),
      completedStep(1, 'SalesTool', 'Identify pending statuses and blockers', 12),
      completedStep(2, 'SalesTool', 'Prepare pending order summary', 11),
    ],
    createdAt: isoAgo(14),
    updatedAt: isoAgo(11),
  },
  {
    id: 'wf-demo-low-stock',
    userInput: 'Show low-stock SKUs in warehouse A',
    domain: 'Inventory',
    state: 'Completed',
    steps: [
      completedStep(0, 'InventoryTool', 'Retrieve stock levels for warehouse A', 16),
      completedStep(1, 'InventoryTool', 'Apply low-stock thresholds by SKU', 15),
      completedStep(2, 'InventoryTool', 'Prepare replenishment shortlist', 14),
    ],
    createdAt: isoAgo(18),
    updatedAt: isoAgo(14),
  },
  {
    id: 'wf-demo-sales-quote',
    userInput: 'Create a quote for customer ACME-442',
    domain: 'Sales',
    state: 'Completed',
    steps: [
      completedStep(0, 'SalesTool', 'Load customer profile and pricing terms', 20),
      completedStep(1, 'SalesTool', 'Draft quote line items and totals', 19),
      completedStep(2, 'SalesTool', 'Prepare quote for confirmation', 18),
    ],
    createdAt: isoAgo(21),
    updatedAt: isoAgo(18),
  },
  {
    id: 'wf-demo-leave-requests',
    userInput: 'List pending leave requests this month',
    domain: 'HR',
    state: 'Completed',
    steps: [
      completedStep(0, 'HRTool', 'Fetch leave requests for current month', 24),
      completedStep(1, 'HRTool', 'Filter requests in pending status', 23),
      completedStep(2, 'HRTool', 'Prepare leave request queue', 22),
    ],
    createdAt: isoAgo(25),
    updatedAt: isoAgo(22),
  },
  {
    id: 'wf-demo-onboarding',
    userInput: 'Start onboarding workflow for Jane Doe',
    domain: 'HR',
    state: 'WaitingApproval',
    steps: [
      completedStep(0, 'HRTool', 'Validate employee profile and start date', 28),
      completedStep(1, 'HRTool', 'Prepare onboarding checklist and account provisioning', 27),
      {
        index: 2,
        toolName: 'HRTool',
        description: 'Request HR approval to start onboarding process',
        state: 'WaitingApproval',
        output: { status: 'pending_approval' },
        startedAt: isoAgo(26),
        completedAt: null,
      },
    ],
    createdAt: isoAgo(29),
    updatedAt: isoAgo(26),
  },
  {
    id: 'wf-demo-open-po',
    userInput: 'List open purchase orders awaiting approval',
    domain: 'Procurement',
    state: 'Completed',
    steps: [
      completedStep(0, 'ProcurementTool', 'Retrieve open purchase orders', 31),
      completedStep(1, 'ProcurementTool', 'Filter orders awaiting approval', 30),
      completedStep(2, 'ProcurementTool', 'Prepare approval queue summary', 29),
    ],
    createdAt: isoAgo(32),
    updatedAt: isoAgo(29),
  },
  {
    id: 'wf-demo-kpi-monthly',
    userInput: 'Generate KPI summary for this month',
    domain: 'Reporting',
    state: 'Completed',
    steps: [
      completedStep(0, 'ReportingTool', 'Validate monthly KPI filter set', 34),
      completedStep(1, 'ReportingTool', 'Aggregate KPI metrics from ERP modules', 33),
      completedStep(2, 'ReportingTool', 'Generate KPI summary output', 32),
    ],
    createdAt: isoAgo(35),
    updatedAt: isoAgo(32),
  },
  {
    id: 'wf-demo-reporting',
    userInput: 'Show procurement spend by supplier for last quarter',
    domain: 'Reporting',
    state: 'Completed',
    steps: [
      completedStep(0, 'ReportingTool', 'Validate reporting period and filters', 42),
      completedStep(1, 'ReportingTool', 'Aggregate procurement spend by supplier', 41),
      completedStep(2, 'ReportingTool', 'Prepare KPI summary for the dashboard', 40),
    ],
    createdAt: isoAgo(43),
    updatedAt: isoAgo(40),
  },
  {
    id: 'wf-demo-procurement',
    userInput: 'Create a purchase order for 50 office chairs',
    domain: 'Procurement',
    state: 'WaitingApproval',
    steps: [
      completedStep(0, 'InventoryTool', 'Check current office chair stock', 18),
      completedStep(1, 'InventoryTool', 'Forecast demand for the next 30 days', 17),
      completedStep(2, 'ProcurementTool', 'Select the preferred furniture supplier', 16),
      {
        index: 3,
        toolName: 'ProcurementTool',
        description: 'Create purchase order for approval',
        state: 'WaitingApproval',
        output: { amount: 3500, currency: 'USD', supplier: 'ABC Supplies' },
        startedAt: isoAgo(15),
        completedAt: null,
      },
    ],
    createdAt: isoAgo(20),
    updatedAt: isoAgo(15),
  },
  {
    id: 'wf-demo-finance',
    userInput: 'Pay invoice INV-2041 to Acme Corp for $4,500',
    domain: 'Finance',
    state: 'WaitingApproval',
    steps: [
      completedStep(0, 'FinanceTool', 'Validate invoice and payment details', 10),
      completedStep(1, 'FinanceTool', 'Match invoice to purchase order', 9),
      {
        index: 2,
        toolName: 'FinanceTool',
        description: 'Initiate payment after approval',
        state: 'WaitingApproval',
        output: { amount: 4500, currency: 'USD', vendor: 'Acme Corp' },
        startedAt: isoAgo(8),
        completedAt: null,
      },
    ],
    createdAt: isoAgo(12),
    updatedAt: isoAgo(8),
  },
];

const approvals: ApprovalRequest[] = [
  {
    id: 'approval-demo-hr',
    workflowId: 'wf-demo-onboarding',
    triggerReason: 'Employee lifecycle action',
    proposedAction: 'Start onboarding workflow for Jane Doe',
    businessContext:
      'A new hire start date is approaching and onboarding tasks require HR approval before execution.',
    decision: 'Pending',
    decidedBy: null,
    rationale: null,
    decidedAt: null,
    createdAt: isoAgo(26),
  },
  {
    id: 'approval-demo-po',
    workflowId: 'wf-demo-procurement',
    triggerReason: 'Purchase order execution',
    proposedAction: 'Issue PO-2026-0042 to ABC Supplies for $3,500',
    businessContext:
      'Office chair inventory is below its reorder threshold. The preferred supplier can deliver within 7 days.',
    decision: 'Pending',
    decidedBy: null,
    rationale: null,
    decidedAt: null,
    createdAt: isoAgo(15),
  },
  {
    id: 'approval-demo-finance',
    workflowId: 'wf-demo-finance',
    triggerReason: 'Financial threshold',
    proposedAction: 'Pay invoice INV-2041 to Acme Corp for $4,500',
    businessContext:
      'The invoice is due in 3 days and matches the approved purchase order and delivery receipt.',
    decision: 'Pending',
    decidedBy: null,
    rationale: null,
    decidedAt: null,
    createdAt: isoAgo(7),
  },
];

const auditEntries: AuditEntry[] = [
  {
    id: 'audit-demo-1',
    workflowId: 'wf-demo-reporting',
    userId: DEMO_USER,
    toolName: 'ReportingTool',
    action: 'Aggregate procurement spend by supplier',
    outcome: 'Success',
    timestamp: isoAgo(41),
  },
  {
    id: 'audit-demo-2',
    workflowId: 'wf-demo-procurement',
    userId: DEMO_USER,
    toolName: 'InventoryTool',
    action: 'Check current office chair stock',
    outcome: 'Success',
    timestamp: isoAgo(18),
  },
  {
    id: 'audit-demo-3',
    workflowId: 'wf-demo-procurement',
    userId: DEMO_USER,
    toolName: 'ProcurementTool',
    action: 'Create purchase order for approval',
    outcome: 'Pending Approval',
    timestamp: isoAgo(15),
  },
];

function buildPlan(domain: WorkflowDomain): PlanResult {
  const steps = domainSteps[domain].map(([toolName, description]) => ({
    toolName,
    description,
  }));
  return {
    domain,
    steps,
    needsClarification: false,
    clarificationQuestion: null,
  };
}

const chatSessions: ChatSession[] = [];
const chatMessages: Record<string, ChatMessage[]> = {};

function addChatMessage(sessionId: string, msg: ChatMessage) {
  const existing = chatMessages[sessionId] ?? [];
  existing.push(msg);
  chatMessages[sessionId] = existing.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

const thinkingMessageIds: Map<string, string> = new Map();

function updateAssistantMessage(workflowId: string, updates: Partial<ChatMessage>) {
  const msgId = thinkingMessageIds.get(workflowId);
  if (!msgId) return;
  for (const [sessionId, msgs] of Object.entries(chatMessages)) {
    const idx = msgs.findIndex((m) => m.id === msgId);
    if (idx !== -1) {
      msgs[idx] = { ...msgs[idx], ...updates };
      useWorkflowStore.getState().updateMessage(sessionId, msgId, updates);
      break;
    }
  }
}

function seedChatSession(
  id: string,
  title: string,
  minutesAgo: number,
  userMsg: string,
  assistantMsg: string,
  workflowId?: string,
) {
  const now = Date.now();
  const session: ChatSession = {
    id,
    title,
    createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
    updatedAt: new Date(now - (minutesAgo - 1) * 60_000).toISOString(),
    lastMessagePreview: assistantMsg,
  };
  chatSessions.push(session);

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    sessionId: id,
    role: 'user',
    contentType: 'text',
    content: userMsg,
    workflowId: null,
    createdAt: new Date(now - (minutesAgo - 0.5) * 60_000).toISOString(),
  };
  addChatMessage(id, userMessage);

  const assistant: ChatMessage = {
    id: crypto.randomUUID(),
    sessionId: id,
    role: 'assistant',
    contentType: 'text',
    content: assistantMsg,
    workflowId: workflowId ?? null,
    createdAt: new Date(now - (minutesAgo - 1) * 60_000).toISOString(),
  };
  addChatMessage(id, assistant);

  if (workflowId) thinkingMessageIds.set(workflowId, assistant.id);
}

seedChatSession('demo-chat-finance', 'List all due invoices', 6, 'List all due invoices', 'I found 3 due and overdue invoices that need attention.', 'wf-demo-invoices-due');
seedChatSession('demo-chat-procurement', 'Create a purchase order for chairs', 20, 'Create a purchase order for 50 office chairs', 'I created a purchase order plan for 50 office chairs. It needs approval.', 'wf-demo-procurement');
seedChatSession('demo-chat-onboarding', 'Start onboarding for Jane Doe', 29, 'Start onboarding workflow for Jane Doe', 'I started the onboarding process for Jane Doe. HR approval is pending.', 'wf-demo-onboarding');
seedChatSession('demo-chat-sales', 'Show pending sales orders', 14, 'Show pending sales orders this week', 'There are 3 pending sales orders this week.', 'wf-demo-sales-orders');

const domainSteps: Record<WorkflowDomain, Array<[string, string]>> = {
  Inventory: [
    ['InventoryTool', 'Check current stock levels'],
    ['InventoryTool', 'Review reorder thresholds'],
    ['InventoryTool', 'Prepare inventory recommendation'],
  ],
  Procurement: [
    ['InventoryTool', 'Check stock and demand'],
    ['ProcurementTool', 'Select the preferred supplier'],
    ['ProcurementTool', 'Create purchase order for approval'],
  ],
  Finance: [
    ['FinanceTool', 'Validate invoice and payment details'],
    ['FinanceTool', 'Check financial approval threshold'],
    ['FinanceTool', 'Initiate approved payment'],
  ],
  Sales: [
    ['SalesTool', 'Review customer and pricing context'],
    ['SalesTool', 'Prepare quote or sales order'],
    ['SalesTool', 'Confirm sales operation'],
  ],
  HR: [
    ['HRTool', 'Validate employee lifecycle request'],
    ['HRTool', 'Prepare onboarding or HR changes'],
    ['HRTool', 'Request HR approval'],
  ],
  Reporting: [
    ['ReportingTool', 'Validate report filters'],
    ['ReportingTool', 'Aggregate requested ERP data'],
    ['ReportingTool', 'Prepare KPI summary'],
  ],
};

function inferDomain(input: string): WorkflowDomain {
  const normalized = input.toLowerCase();
  if (/invoice|payment|expense|finance|pay /.test(normalized)) return 'Finance';
  if (/employee|onboard|offboard|payroll|leave|hr /.test(normalized)) return 'HR';
  if (/purchase|supplier|vendor|procure|restock/.test(normalized)) return 'Procurement';
  if (/quote|customer|sales|discount|order/.test(normalized)) return 'Sales';
  if (/stock|inventory|warehouse|sku/.test(normalized)) return 'Inventory';
  return 'Reporting';
}

function isInvoiceListRequest(input: string) {
  const normalized = input.toLowerCase();
  return (
    /\binvoices\b/.test(normalized) && /(list|show|view|all|due|overdue|open)/.test(normalized)
  );
}

function getFinanceInvoicesForPrompt(input: string) {
  const normalized = input.toLowerCase();

  if (/\boverdue\b/.test(normalized)) {
    return financeInvoices.filter((invoice) => invoice.status === 'Overdue');
  }

  if (/\bpaid\b/.test(normalized)) {
    return financeInvoices.filter((invoice) => invoice.status === 'Paid');
  }

  if (/\bdue\b|\bopen\b|\bunpaid\b/.test(normalized)) {
    return financeInvoices.filter(
      (invoice) => invoice.status === 'Due' || invoice.status === 'Overdue',
    );
  }

  return financeInvoices;
}

function isReadOnlyFinanceRequest(input: string) {
  const normalized = input.toLowerCase();
  return (
    isInvoiceListRequest(normalized) || /\bview invoice\b|\binvoice details\b/.test(normalized)
  );
}

function buildStepsForInput(input: string, domain: WorkflowDomain): WorkflowStep[] {
  if (domain === 'Finance' && isInvoiceListRequest(input)) {
    return [
      {
        index: 0,
        toolName: 'FinanceTool',
        description: 'Retrieve invoices from Accounts Payable',
        state: 'Pending',
        output: null,
        startedAt: null,
        completedAt: null,
      },
      {
        index: 1,
        toolName: 'FinanceTool',
        description: 'Prepare invoice list with available actions',
        state: 'Pending',
        output: null,
        startedAt: null,
        completedAt: null,
      },
    ];
  }

  return domainSteps[domain].map(([toolName, description], index) => ({
    index,
    toolName,
    description,
    state: 'Pending',
    output: null,
    startedAt: null,
    completedAt: null,
  }));
}

function requiresApproval(domain: WorkflowDomain) {
  return domain === 'Procurement' || domain === 'Finance' || domain === 'HR';
}

function updateWorkflow(id: string, updater: (workflow: Workflow) => void) {
  const workflow = workflows.find((item) => item.id === id);
  if (!workflow) return;
  updater(workflow);
  workflow.updatedAt = new Date().toISOString();
}

function addAudit(workflow: Workflow, step: WorkflowStep, outcome: string) {
  auditEntries.unshift({
    id: crypto.randomUUID(),
    workflowId: workflow.id,
    userId: DEMO_USER,
    toolName: step.toolName,
    action: step.description,
    outcome,
    timestamp: new Date().toISOString(),
  });
}

async function runWorkflow(id: string) {
  await latency(550);
  let workflow = workflows.find((item) => item.id === id);
  if (!workflow) return;

  updateWorkflow(id, (wf) => {
    wf.state = 'Planning';
  });

  const plan = buildPlan(workflow.domain ?? 'Reporting');
  updateAssistantMessage(id, {
    contentType: 'plan',
    content: `I've analyzed your request and created a plan across **${plan.domain}** domain with ${plan.steps.length} step${plan.steps.length === 1 ? '' : 's'}.`,
    plan,
  });

  await latency(800);
  updateWorkflow(id, (wf) => {
    wf.state = 'InProgress';
  });

  updateAssistantMessage(id, {
    contentType: 'text',
    content: `Executing plan in **${workflow.domain ?? 'Reporting'}**...`,
  });

  workflow = workflows.find((item) => item.id === id);
  if (!workflow) return;

  for (const step of workflow.steps) {
    step.state = 'InProgress';
    step.startedAt = new Date().toISOString();
    updateWorkflow(id, () => undefined);
    await latency(700);

    const isApprovalGate =
      requiresApproval(workflow.domain ?? 'Reporting') &&
      !isReadOnlyFinanceRequest(workflow.userInput) &&
      step === workflow.steps[workflow.steps.length - 1];
    if (isApprovalGate) {
      step.state = 'WaitingApproval';
      step.output = { status: 'pending_approval' };
      workflow.state = 'WaitingApproval';
      workflow.updatedAt = new Date().toISOString();
      approvals.unshift({
        id: crypto.randomUUID(),
        workflowId: workflow.id,
        triggerReason:
          workflow.domain === 'Finance'
            ? 'Financial threshold'
            : workflow.domain === 'HR'
              ? 'Employee lifecycle action'
              : 'Purchase order execution',
        proposedAction: step.description,
        businessContext: `Generated from the request: "${workflow.userInput}"`,
        decision: 'Pending',
        decidedBy: null,
        rationale: null,
        decidedAt: null,
        createdAt: new Date().toISOString(),
      });
      addAudit(workflow, step, 'Pending Approval');
      return;
    }

    step.state = 'Completed';
    step.completedAt = new Date().toISOString();
    if (
      workflow.domain === 'Finance' &&
      isInvoiceListRequest(workflow.userInput) &&
      step.index === workflow.steps.length - 1
    ) {
      const invoices = getFinanceInvoicesForPrompt(workflow.userInput);
      step.output = {
        type: 'invoice_list',
        count: invoices.length,
        items: invoices.map((invoice) => {
          const canPay = invoice.status === 'Due' || invoice.status === 'Overdue';
          return {
            id: invoice.id,
            vendor: invoice.vendor,
            amount: invoice.amount,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            status: invoice.status,
            actions: [
              {
                key: 'view',
                label: 'View invoice',
                prompt: `View invoice ${invoice.id} details`,
              },
              ...(canPay
                ? [
                    {
                      key: 'pay',
                      label: 'Pay invoice',
                      prompt: `Pay invoice ${invoice.id} to ${invoice.vendor} for $${invoice.amount.toLocaleString()}`,
                    },
                  ]
                : []),
            ],
          };
        }),
      };
    } else {
      step.output = { status: 'ok', source: 'frontend-demo' };
    }
    addAudit(workflow, step, 'Success');
  }

  workflow.state = 'Completed';
  workflow.updatedAt = new Date().toISOString();

  const completedSteps = workflow.steps.filter((s) => s.state === 'Completed').length;
  const totalSteps = workflow.steps.length;
  updateAssistantMessage(id, {
    contentType: 'result',
    content: `✅ **Workflow completed** — ${completedSteps} of ${totalSteps} step${totalSteps === 1 ? '' : 's'} executed successfully in **${workflow.domain}**.`,
    plan,
  });
}

async function completeApprovedWorkflow(workflowId: string) {
  await latency(700);
  updateWorkflow(workflowId, (workflow) => {
    workflow.state = 'InProgress';
    const waitingStep = workflow.steps.find((step) => step.state === 'WaitingApproval');
    if (waitingStep) waitingStep.state = 'InProgress';
  });

  await latency(900);
  updateWorkflow(workflowId, (workflow) => {
    const activeStep = workflow.steps.find((step) => step.state === 'InProgress');
    if (activeStep) {
      activeStep.state = 'Completed';
      activeStep.completedAt = new Date().toISOString();
      activeStep.output = { status: 'approved_and_executed' };
      addAudit(workflow, activeStep, 'Success');
    }
    workflow.state = 'Completed';
  });
}

export const mockWorkflowApi = {
  async start(body: StartWorkflowRequest) {
    await latency();
    const domain = inferDomain(body.userInput);
    const now = new Date().toISOString();
    const steps = buildStepsForInput(body.userInput, domain);
    const plan = buildPlan(domain, body.userInput);
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      userInput: body.userInput,
      domain,
      state: 'Pending',
      steps,
      plan,
      createdAt: now,
      updatedAt: now,
    };

    workflows.unshift(workflow);
    void runWorkflow(workflow.id);
    return clone(workflow);
  },

  async getById(id: string) {
    await latency(120);
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow) throw new Error('Workflow not found.');
    return clone(workflow);
  },

  async list() {
    await latency();
    return clone(workflows);
  },
};

export const mockApprovalApi = {
  async list() {
    await latency();
    return clone(approvals.filter((approval) => approval.decision === 'Pending'));
  },

  async decide(id: string, body: ApprovalActionRequest) {
    await latency(500);
    const approval = approvals.find((item) => item.id === id);
    if (!approval) throw new Error('Approval request not found.');

    approval.decision = body.decision;
    approval.rationale = body.rationale;
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = DEMO_USER;

    const workflow = workflows.find((item) => item.id === approval.workflowId);
    if (workflow) {
      if (body.decision === 'Rejected') {
        workflow.state = 'Failed';
        workflow.failureReason = body.rationale || 'The proposed operation was rejected.';
        const waitingStep = workflow.steps.find((step) => step.state === 'WaitingApproval');
        if (waitingStep) {
          waitingStep.state = 'Failed';
          waitingStep.completedAt = new Date().toISOString();
          addAudit(workflow, waitingStep, 'Rejected');
        }
      } else {
        void completeApprovedWorkflow(workflow.id);
      }
      workflow.updatedAt = new Date().toISOString();
    }

    return clone(approval);
  },
};

export const mockAuditApi = {
  async list(workflowId?: string) {
    await latency();
    const entries = workflowId
      ? auditEntries.filter((entry) => entry.workflowId === workflowId)
      : auditEntries;
    return clone(entries);
  },
};

export const mockChatApi = {
  async listSessions() {
    await latency();
    return clone(chatSessions);
  },

  async listMessages(sessionId: string) {
    await latency();
    return clone(chatMessages[sessionId] ?? []);
  },

  async sendMessage(body: SendChatMessageRequest) {
    await latency(300);

    const now = new Date().toISOString();
    let session: ChatSession;

    if (body.sessionId) {
      session =
        chatSessions.find((s) => s.id === body.sessionId) ??
        (() => {
          const s: ChatSession = {
            id: crypto.randomUUID(),
            title: 'New chat',
            createdAt: now,
            updatedAt: now,
            lastMessagePreview: '',
          };
          chatSessions.unshift(s);
          return s;
        })();
    } else {
      session = {
        id: crypto.randomUUID(),
        title: body.content.length > 56 ? `${body.content.slice(0, 55).trimEnd()}…` : body.content,
        createdAt: now,
        updatedAt: now,
        lastMessagePreview: '',
      };
      chatSessions.unshift(session);
    }

    const domain = inferDomain(body.content);
    const steps = buildStepsForInput(body.content, domain);
    const plan = buildPlan(domain, body.content);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      role: 'user',
      contentType: 'text',
      content: body.content,
      workflowId: null,
      createdAt: now,
    };
    addChatMessage(session.id, userMessage);

    const workflowId = crypto.randomUUID();
    const thinkingId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: thinkingId,
      sessionId: session.id,
      role: 'assistant',
      contentType: 'thinking',
      content: 'Analyzing your request...',
      workflowId,
      plan: null,
      createdAt: now,
    };
    addChatMessage(session.id, assistantMessage);

    thinkingMessageIds.set(workflowId, thinkingId);

    const workflow: Workflow = {
      id: workflowId,
      userInput: body.content,
      domain,
      state: 'Pending',
      steps,
      plan,
      createdAt: now,
      updatedAt: now,
    };
    workflows.unshift(workflow);

    session.updatedAt = now;
    session.lastMessagePreview = assistantMessage.content;

    void runWorkflow(workflow.id);

    return {
      session,
      userMessage,
      assistantMessage,
      workflow,
    } satisfies SendChatMessageResponse;
  },
};
