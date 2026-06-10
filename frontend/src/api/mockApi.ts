import type {
  ApprovalActionRequest,
  ApprovalRequest,
  AuditEntry,
  StartWorkflowRequest,
  Workflow,
  WorkflowDomain,
  WorkflowStep,
} from '@/types';

const DEMO_USER = 'demo.user@requivo.ai';
const latency = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms));
const clone = <T>(value: T): T => structuredClone(value);
const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

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
  updateWorkflow(id, (workflow) => {
    workflow.state = 'Planning';
  });

  await latency(800);
  updateWorkflow(id, (workflow) => {
    workflow.state = 'InProgress';
  });

  const workflow = workflows.find((item) => item.id === id);
  if (!workflow) return;

  for (const step of workflow.steps) {
    step.state = 'InProgress';
    step.startedAt = new Date().toISOString();
    updateWorkflow(id, () => undefined);
    await latency(700);

    const isApprovalGate =
      requiresApproval(workflow.domain ?? 'Reporting') &&
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
    step.output = { status: 'ok', source: 'frontend-demo' };
    addAudit(workflow, step, 'Success');
  }

  workflow.state = 'Completed';
  workflow.updatedAt = new Date().toISOString();
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
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      userInput: body.userInput,
      domain,
      state: 'Pending',
      steps: domainSteps[domain].map(([toolName, description], index) => ({
        index,
        toolName,
        description,
        state: 'Pending',
        output: null,
        startedAt: null,
        completedAt: null,
      })),
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
