export type WorkflowState =
  | 'Pending'
  | 'Planning'
  | 'WaitingApproval'
  | 'InProgress'
  | 'Completed'
  | 'Failed';

export type WorkflowDomain = 'Inventory' | 'Procurement' | 'Finance' | 'Sales' | 'HR' | 'Reporting';

export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected';

export interface Workflow {
  id: string;
  userInput: string;
  domain: WorkflowDomain | null;
  state: WorkflowState;
  steps: WorkflowStep[];
  failureReason?: string | null;
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
  rationale?: string | null;
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

export type UserRole =
  | 'SystemAdmin'
  | 'FinanceManager'
  | 'ProcurementLead'
  | 'HRManager'
  | 'SalesRep'
  | 'Auditor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResult {
  mfaRequired: boolean;
  challengeId: string;
}

export interface VerifyMfaRequest {
  challengeId: string;
  code: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}
