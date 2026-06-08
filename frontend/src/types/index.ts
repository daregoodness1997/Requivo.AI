export type WorkflowState =
  | 'Pending'
  | 'Planning'
  | 'WaitingApproval'
  | 'InProgress'
  | 'Completed'
  | 'Failed';

export type WorkflowDomain =
  | 'Inventory'
  | 'Procurement'
  | 'Finance'
  | 'Sales'
  | 'HR'
  | 'Reporting';

export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected';

export interface Workflow {
  id: string;
  userInput: string;
  domain: WorkflowDomain | null;
  state: WorkflowState;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  index: number;
  toolName: string;
  description: string;
  state: WorkflowState;
  output: unknown;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  triggerReason: string;
  proposedAction: string;
  businessContext: string;
  decision: ApprovalDecision;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  workflowId: string;
  userId: string;
  toolName: string;
  action: string;
  outcome: string;
  timestamp: string;
}

export interface StartWorkflowRequest {
  userInput: string;
}

export interface ApprovalActionRequest {
  decision: 'Approved' | 'Rejected';
  rationale: string;
}
