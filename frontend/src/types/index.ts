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
  plan?: PlanResult | null;
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

export type UserRole = 'Admin' | 'WorkflowOperator' | 'Approver' | 'Auditor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterResponse {
  id: string;
  email: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  mfaVerified: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface MfaSetupResponse {
  secret: string;
  otpAuthUri: string;
}

export interface MfaVerifyRequest {
  totpCode: string;
}

export interface MfaDisableRequest {
  totpCode: string;
}

export type ChatRole = 'user' | 'assistant';

export type MessageContentType = 'text' | 'thinking' | 'plan' | 'result' | 'error' | 'prompt';

export interface PlannedStep {
  toolName: string;
  description: string;
}

export interface PlanResult {
  domain: WorkflowDomain;
  steps: PlannedStep[];
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
}

export interface PromptData {
  promptType: 'clarification' | 'retry' | 'confirmation' | 'error_recovery';
  question: string;
  options?: string[];
  stepToolName?: string;
  stepDescription?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  contentType?: MessageContentType;
  content: string;
  workflowId: string | null;
  plan?: PlanResult | null;
  promptData?: PromptData | null;
  createdAt: string;
}

export interface SendChatMessageRequest {
  sessionId?: string;
  content: string;
}

export interface SendChatMessageResponse {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage | null;
  workflow: Workflow;
}
