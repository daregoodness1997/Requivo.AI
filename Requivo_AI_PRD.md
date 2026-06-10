# Requivo AI — Product Requirements Document
**Version:** 1.0 | **Status:** Draft | **Date:** June 2026  
**Prepared by:** Lumenware Technologies  
**Classification:** Internal — Confidential

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Models & Database Schema](#4-data-models--database-schema)
5. [Workflow State Machine](#5-workflow-state-machine)
6. [AI Reasoning Layer](#6-ai-reasoning-layer)
7. [Business Tool Layer — All 6 Tools](#7-business-tool-layer--all-6-tools)
8. [Human-in-the-Loop (HITL) System](#8-human-in-the-loop-hitl-system)
9. [API Contracts](#9-api-contracts)
10. [RBAC & Permissions](#10-rbac--permissions)
11. [Security Requirements](#11-security-requirements)
12. [Integration Layer](#12-integration-layer)
13. [Observability & Monitoring](#13-observability--monitoring)
14. [Performance Targets](#14-performance-targets)
15. [Frontend — Component Breakdown](#15-frontend--component-breakdown)
16. [Error Handling & Retry Logic](#16-error-handling--retry-logic)
17. [Acceptance Criteria](#17-acceptance-criteria)
18. [End-to-End Scenarios](#18-end-to-end-scenarios)
19. [Definition of Done](#19-definition-of-done)

---

## 1. What We Are Building

**Requivo AI** is an autonomous ERP operations agent. A user types a plain-English business request — "We need to restock office chairs" — and the system autonomously figures out every step required (check stock, forecast demand, select a supplier, generate a PO, get approval, send the PO, update inventory, notify via Slack, write audit log) and executes all of it through connected ERP systems, pausing only when human approval is mandatory.

### Core Capabilities
- **Natural language → executable multi-step workflow** across 6 ERP domains: Inventory, Procurement, Finance, Sales, HR, Reporting
- **Autonomous task orchestration** — the agent plans, decomposes, sequences, and executes all steps
- **Human-in-the-Loop (HITL)** — mandatory approval gates for high-risk operations (payments > $1,000, all POs, all HR lifecycle events, etc.)
- **Full audit trail** — every action logged immutably with user, timestamp, inputs, outputs, and outcome
- **RBAC enforcement at the action level** — not just at the API gateway

### What This Is NOT
- Not a chatbot that just answers questions
- Not a simple form automation tool
- Not a workflow builder — users never configure flows; the AI figures it out
- Not a replacement for the ERP UI — it sits on top of ERP APIs

---

## 2. Tech Stack

### Backend
| Layer | Technology | Notes |
|---|---|---|
| Runtime | .NET 10 (ASP.NET Core) | All backend services |
| Language | C# | Primary backend language |
| Workflow Engine | Custom state machine | Built in ASP.NET Core, not a third-party workflow engine |
| AI Model | Qwen LLM | Hosted inference endpoint — REST calls |
| Primary Database | PostgreSQL 18+ | All persistent entities, audit logs, approval history |
| Cache / State Store | Redis 7+ | Active workflow state, session data, agent memory snapshots |
| Message Queue | (Dead-Letter Queue) | For failed workflow storage — can use Redis lists or RabbitMQ |

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Framework | React with TypeScript | SPA |
| State Management | Zustand or React Context | UI state only |
| Real-time | WebSocket or SSE | Workflow progress updates |
| Auth | OAuth 2.0 / SSO | Via middleware |

### Infrastructure
| Concern | Specification |
|---|---|
| Encryption at Rest | AES-256 on all PII and financial fields |
| Encryption in Transit | TLS 1.3 minimum |
| Auth tokens | JWT, 1-hour expiry, refresh token rotation on use |
| Accessibility | WCAG 2.1 AA |

---

## 3. System Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER  (React + TypeScript)                   │
│  Chat UI │ Admin Dashboard │ Approval UI │ Audit View       │
└──────────────────────┬──────────────────────────────────────┘
                       │ NL Request (HTTP/WS)
┌──────────────────────▼──────────────────────────────────────┐
│  AGENT ORCHESTRATION LAYER  (.NET 10 / ASP.NET Core)        │
│  Workflow Engine │ State Machine │ Retry/Failure Handler     │
└──────┬───────────────────────────────────────┬──────────────┘
       │ LLM calls                             │ invoke tools
┌──────▼────────────────┐          ┌───────────▼──────────────┐
│  AI REASONING LAYER   │          │  BUSINESS TOOL LAYER     │
│  Qwen LLM             │          │  Inventory │ Procurement  │
│  Prompt Orchestrator  │          │  Finance   │ Sales        │
└───────────────────────┘          │  HR        │ Reporting    │
                                   └───────────┬──────────────┘
                        sensitive ops │         │ external calls
┌──────────────────────┐   ┌──────────▼─────┐  ┌▼─────────────────────┐
│  HITL LAYER          │   │  DATA LAYER    │  │  INTEGRATION LAYER   │
│  Propose → Context   │   │  PostgreSQL    │  │  Email │ Slack        │
│  → Approve/Reject    │   │  Redis         │  │  ERP/SAP │ Suppliers  │
└──────────────────────┘   └────────────────┘  └─────────────────────┘
```

### Request Flow (Happy Path)

```
User types NL request
  → Presentation Layer sends to Orchestration Layer (POST /api/workflows)
  → Orchestration Layer creates Workflow record (state: PENDING)
  → Calls AI Reasoning Layer with request + user context + tool schemas
  → LLM returns structured task plan (JSON array of tool calls)
  → Workflow state → PLANNING → IN_PROGRESS
  → For each task in plan:
      → Check RBAC for user's permissions
      → Call Business Tool (ITool.ExecuteAsync)
      → If tool triggers HITL condition → state → WAITING_APPROVAL → pause
      → On HITL approval → resume from paused step
      → Write audit log entry for every step
  → All tasks complete → state → COMPLETED
  → SSE/WS push progress to frontend throughout
```

---

## 4. Data Models & Database Schema

### 4.1 Workflow

```sql
CREATE TABLE workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  natural_language  TEXT NOT NULL,                      -- original user input
  intent            VARCHAR(100),                       -- extracted domain: inventory|procurement|finance|sales|hr|reporting
  state             VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- see state machine
  plan              JSONB,                              -- array of planned tasks from LLM
  current_step      INT DEFAULT 0,
  context           JSONB,                              -- agent memory, resolved entities
  error             TEXT,                               -- if state = FAILED
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,

  CONSTRAINT chk_state CHECK (state IN (
    'PENDING','PLANNING','IN_PROGRESS','WAITING_APPROVAL','COMPLETED','FAILED'
  ))
);

CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_state ON workflows(state);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);
```

### 4.2 Workflow Steps

```sql
CREATE TABLE workflow_steps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_index     INT NOT NULL,
  tool_name      VARCHAR(100) NOT NULL,        -- e.g. "InventoryTool.CheckStock"
  input          JSONB NOT NULL,               -- inputs passed to tool
  output         JSONB,                        -- tool response
  state          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING|RUNNING|COMPLETED|FAILED|SKIPPED
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  latency_ms     INT,
  error          TEXT,
  retry_count    INT DEFAULT 0,

  CONSTRAINT chk_step_state CHECK (state IN (
    'PENDING','RUNNING','COMPLETED','FAILED','SKIPPED'
  ))
);

CREATE INDEX idx_steps_workflow_id ON workflow_steps(workflow_id);
```

### 4.3 Audit Log

```sql
CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID REFERENCES workflows(id),
  step_id        UUID REFERENCES workflow_steps(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  action         VARCHAR(200) NOT NULL,           -- e.g. "Procurement.CreatePO"
  domain         VARCHAR(50) NOT NULL,
  input          JSONB,                           -- PII fields masked
  output         JSONB,                           -- PII fields masked
  outcome        VARCHAR(20) NOT NULL,            -- SUCCESS|FAILURE|PENDING_APPROVAL|REJECTED
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Append-only: no UPDATE or DELETE allowed on this table
  CONSTRAINT audit_logs_no_delete CHECK (true)  -- enforced via trigger/policy
);

CREATE INDEX idx_audit_workflow_id ON audit_logs(workflow_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
-- Retention: 7 years (tiered storage policy)
```

### 4.4 Approval Requests (HITL)

```sql
CREATE TABLE approval_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         UUID NOT NULL REFERENCES workflows(id),
  step_id             UUID REFERENCES workflow_steps(id),
  trigger_type        VARCHAR(50) NOT NULL,    -- FINANCIAL_THRESHOLD|VENDOR_CREATION|PO_EXECUTION|HR_LIFECYCLE|BULK_MODIFICATION|LOW_AI_CONFIDENCE
  trigger_detail      JSONB NOT NULL,          -- e.g. {amount: 4500, currency: "USD"}
  proposed_action     TEXT NOT NULL,           -- human-readable description
  business_context    TEXT NOT NULL,
  escalation_level    VARCHAR(100) NOT NULL,   -- LINE_MANAGER|PROCUREMENT_LEAD|FINANCE_APPROVER|HR_LEAD|SYSTEM_ADMIN|ASSIGNED_OPERATOR
  approver_user_id    UUID REFERENCES users(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED|EXPIRED
  decision_at         TIMESTAMPTZ,
  decision_by         UUID REFERENCES users(id),
  rationale           TEXT,
  notification_sent_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_approval_status CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED'))
);

CREATE INDEX idx_approvals_workflow_id ON approval_requests(workflow_id);
CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_approver ON approval_requests(approver_user_id);
```

### 4.5 Users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(50) NOT NULL,   -- SYSTEM_ADMIN|FINANCE_MANAGER|PROCUREMENT_LEAD|HR_MANAGER|SALES_REP|AUDITOR
  org_id          UUID NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  mfa_enabled     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_role CHECK (role IN (
    'SYSTEM_ADMIN','FINANCE_MANAGER','PROCUREMENT_LEAD',
    'HR_MANAGER','SALES_REP','AUDITOR','AI_AGENT'
  ))
);
```

### 4.6 Dead-Letter Queue

```sql
CREATE TABLE dead_letter_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID NOT NULL REFERENCES workflows(id),
  failure_reason  TEXT NOT NULL,
  execution_trace JSONB NOT NULL,   -- full step history at time of failure
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES users(id)
);
```

### 4.7 Redis Key Patterns

```
# Active workflow state (TTL: 24 hours)
workflow:{workflow_id}:state        → JSON snapshot of current WorkflowContext

# Agent memory per workflow (TTL: 24 hours)
workflow:{workflow_id}:memory       → JSON of resolved entities, prior step outputs

# Session data (TTL: 1 hour)
session:{user_id}:{session_id}      → JWT claims + permissions

# HITL pending queue
hitl:pending                        → Redis sorted set, score = created_at timestamp
hitl:{approval_id}                  → JSON of ApprovalRequest
```

---

## 5. Workflow State Machine

### States

| State | Meaning | Terminal? |
|---|---|---|
| `PENDING` | Received, not yet processed | No |
| `PLANNING` | LLM decomposing into tasks | No |
| `IN_PROGRESS` | Tools executing | No |
| `WAITING_APPROVAL` | Paused at HITL gate | No |
| `COMPLETED` | All steps done successfully | **Yes** |
| `FAILED` | Unrecoverable error or rejected | **Yes** |

### Valid Transitions

```
PENDING           → PLANNING
PENDING           → FAILED

PLANNING          → IN_PROGRESS
PLANNING          → WAITING_APPROVAL
PLANNING          → FAILED

IN_PROGRESS       → WAITING_APPROVAL
IN_PROGRESS       → COMPLETED
IN_PROGRESS       → FAILED

WAITING_APPROVAL  → IN_PROGRESS        (on approval)
WAITING_APPROVAL  → FAILED             (on rejection or expiry)
```

Any transition not in the above list must be **rejected with an error and logged**.

### State Persistence Rules

- After **every state transition**: write new state to PostgreSQL (`workflows.state`) AND update Redis (`workflow:{id}:state`)
- After **every completed step**: persist step output to `workflow_steps` table AND update Redis memory snapshot
- On **service restart**: rehydrate in-flight `IN_PROGRESS` workflows from Redis; resume from `current_step`
- `COMPLETED` and `FAILED` workflows: flush from Redis, persist final state to PostgreSQL only

### WorkflowContext Object (passed to every tool)

```csharp
public class WorkflowContext
{
    public string WorkflowId { get; set; }
    public string UserId { get; set; }
    public List<string> Permissions { get; set; }   // resolved RBAC permissions
    public int StepIndex { get; set; }
    public List<AuditEntry> AuditTrail { get; set; }
    public Dictionary<string, object> Memory { get; set; } // agent memory
    public string OrgId { get; set; }
    public Dictionary<string, object> OrgConfig { get; set; } // e.g. financial thresholds
}
```

---

## 6. AI Reasoning Layer

### Role

The AI Reasoning Layer translates a natural language request into a structured task plan and drives decision-making throughout execution.

### LLM Configuration

| Parameter | Value |
|---|---|
| Model | Qwen LLM (hosted inference endpoint) |
| Context Window | Min 32k tokens; 128k preferred for complex workflows |
| Response Format | Structured JSON for tool calls; natural language for explanations |
| Confidence Threshold | < 0.7 → escalate to HITL |
| Max Retries on LLM Error | 2 retries with prompt reformulation |
| Latency Target | P95 < 5 seconds per LLM call |

### Prompt Structure (every request)

```
SYSTEM PROMPT:
  - Agent identity and role
  - Available tools + their schemas (injected from ITool.InputSchema)
  - Org config (HITL thresholds, permissions for this user)
  - Memory from prior steps (if multi-step continuation)
  - Output format specification

USER MESSAGE:
  - Original natural language request
  - Current workflow state (if continuing)
  - Results from prior steps (if applicable)
```

### LLM Response Schema

```json
{
  "intent": "procurement",
  "confidence": 0.93,
  "needs_clarification": false,
  "clarification_question": null,
  "plan": [
    {
      "step": 1,
      "tool": "InventoryTool",
      "action": "CheckStock",
      "params": { "sku": "CHAIR-001", "location": "warehouse-a" },
      "explanation": "Checking current stock levels before placing a restock order.",
      "requires_hitl": false
    },
    {
      "step": 2,
      "tool": "ProcurementTool",
      "action": "CreatePO",
      "params": { "supplier_id": "SUP-042", "items": [{"sku": "CHAIR-001", "qty": 50}], "amount": 3500, "delivery_date": "2026-07-15" },
      "explanation": "Creating a purchase order for 50 office chairs from the preferred supplier.",
      "requires_hitl": true,
      "hitl_reason": "All PO issuances require approval"
    }
  ]
}
```

### Clarification Rules

- If `confidence < 0.7` OR request is ambiguous → return `needs_clarification: true` with a specific `clarification_question`
- **Never proceed with a task plan when clarification is needed**
- Clarification must identify: which domain, what specific item/entity, and what action is intended

### Agent Memory Injection

- After each completed step, the step's output is written into `WorkflowContext.Memory`
- On the next LLM call, resolved entities (supplier IDs, SKUs, employee IDs, amounts) from prior steps are injected into the prompt
- This ensures step N+1 can reference specific data resolved in step N without re-asking the user

---

## 7. Business Tool Layer — All 6 Tools

### ITool Interface Contract (C#)

```csharp
namespace AgentFramework.Tools
{
    public interface ITool
    {
        string Name { get; }                    // e.g. "InventoryTool"
        string Description { get; }             // human-readable for LLM prompt
        JsonSchema InputSchema { get; }          // injected into LLM system prompt
        Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context);
    }

    public class ToolResult
    {
        public bool Success { get; set; }
        public object? Data { get; set; }
        public string? Error { get; set; }      // structured error message, never an exception
        public ToolMetadata? Metadata { get; set; }
        public bool RequiresHITL { get; set; }  // set true to trigger HITL gate
        public string? HitlTriggerType { get; set; }
    }

    public class ToolMetadata
    {
        public long LatencyMs { get; set; }
        public string Source { get; set; }      // which ERP system was called
    }
}
```

### Rules that apply to ALL tools

1. **Input validation**: Validate against `InputSchema` before executing. On invalid input → return `ToolResult { Success = false, Error = "..." }` — never throw unhandled exception
2. **Audit log**: Every write operation MUST create an `audit_logs` entry with: `workflow_id`, `step_id`, `user_id`, `action`, `input` (PII masked), `output`, `outcome`
3. **RBAC check**: Before executing, verify `WorkflowContext.Permissions` allows this action. On deny → return 403-equivalent error in `ToolResult`
4. **Latency**: P95 < 10 seconds per tool call
5. **HITL flag**: If operation meets a HITL trigger condition, set `ToolResult.RequiresHITL = true` and return immediately — do not execute the operation yet

---

### 7.1 Inventory Tool

**Purpose:** Manage stock levels, thresholds, and demand forecasting.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `CheckStock` | Query current stock for a SKU/location | No |
| `UpdateStockLevel` | Set quantity for a SKU | Yes if qty change > 100 units |
| `ForecastDemand` | Predict demand for a SKU over a period | No |
| `SetReorderThreshold` | Configure low-stock alert threshold | No |

#### Input Schemas

```typescript
CheckStock: { sku: string; location?: string }
UpdateStockLevel: { sku: string; quantity: number; location: string; reason: string }
ForecastDemand: { sku: string; forecast_period_days: number }
SetReorderThreshold: { sku: string; threshold_qty: number; location: string }
```

#### Business Rules

- `UpdateStockLevel` where `abs(new_qty - current_qty) > 100` → set `RequiresHITL = true`, `HitlTriggerType = "BULK_MODIFICATION"`
- `CheckStock` response must include: `current_qty`, `threshold_qty`, `below_threshold: bool`, `forecast_data` (if available)
- When `below_threshold = true`, the response **must** include a `forecast` object from `ForecastDemand`

---

### 7.2 Procurement Tool

**Purpose:** Supplier selection, Purchase Order generation and submission.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `SelectSupplier` | Find best supplier by category/criteria | No |
| `CreatePO` | Generate a PO document | **Yes — always** |
| `SubmitPO` | Send PO to supplier (post-approval only) | No (already approved) |
| `GetPOStatus` | Check status of a submitted PO | No |

#### Input Schemas

```typescript
SelectSupplier: { category: string; criteria?: string[]; preferred_supplier_id?: string }
CreatePO: {
  supplier_id: string;
  items: Array<{ sku: string; qty: number; unit_price: number }>;
  amount: number;
  currency: string;
  delivery_date: string;  // ISO 8601
  delivery_address: string;
}
SubmitPO: { po_id: string; delivery_instructions?: string }
GetPOStatus: { po_id: string }
```

#### Business Rules

- `CreatePO` ALWAYS triggers `RequiresHITL = true`, `HitlTriggerType = "PO_EXECUTION"`
- PO document must conform to this structure before being stored and sent to HITL:

```json
{
  "po_id": "PO-2026-0042",
  "created_at": "2026-06-10T14:00:00Z",
  "supplier": { "id": "SUP-042", "name": "...", "contact_email": "..." },
  "items": [{ "sku": "...", "description": "...", "qty": 0, "unit_price": 0, "line_total": 0 }],
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "currency": "USD",
  "delivery_date": "...",
  "delivery_address": "...",
  "status": "PENDING_APPROVAL"
}
```

- `SubmitPO` can only be called when a corresponding `approval_requests` record with `status = APPROVED` exists for this PO
- Vendor creation/modification in any form triggers `HitlTriggerType = "VENDOR_CREATION"`

---

### 7.3 Finance Tool

**Purpose:** Invoice management, expense logging, payment initiation.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `CreateInvoice` | Generate an invoice record | No |
| `LogExpense` | Record an expense | No |
| `InitiatePayment` | Execute a payment | Yes if amount > $1,000 (configurable) |
| `GetPaymentStatus` | Check payment state | No |

#### Input Schemas

```typescript
CreateInvoice: {
  amount: number;
  currency: string;
  account_code: string;
  vendor_id: string;
  due_date: string;
  line_items: Array<{ description: string; amount: number }>;
}
LogExpense: {
  amount: number;
  currency: string;
  category: string;
  vendor_id: string;
  receipt_ref?: string;
}
InitiatePayment: {
  amount: number;
  currency: string;
  account_code: string;
  vendor_id: string;
  due_date: string;
  reference: string;   // e.g. invoice number
}
```

#### Business Rules

- `InitiatePayment` where `amount > org_config.financial_threshold` (default $1,000) → `RequiresHITL = true`, `HitlTriggerType = "FINANCIAL_THRESHOLD"`
- `financial_threshold` is per-org configurable, stored in `OrgConfig`
- Payment execution is **blocked** until `approval_requests` record `status = APPROVED` exists
- All `InitiatePayment` calls must be written to audit log regardless of approval status

---

### 7.4 Sales Tool

**Purpose:** Quote generation, order creation, pricing management.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `GenerateQuote` | Create a customer quote | Yes if discount > 20% |
| `CreateOrder` | Create a confirmed sales order | No |
| `UpdatePricing` | Update product pricing | No |
| `GetOrderStatus` | Check order state | No |

#### Input Schemas

```typescript
GenerateQuote: {
  customer_id: string;
  items: Array<{ sku: string; qty: number; unit_price: number }>;
  discount_pct: number;    // 0–100
  valid_until: string;     // ISO 8601
}
CreateOrder: {
  customer_id: string;
  quote_id?: string;
  items: Array<{ sku: string; qty: number; unit_price: number }>;
  delivery_date: string;
  shipping_address: string;
}
UpdatePricing: {
  product_id: string;
  new_price: number;
  currency: string;
  effective_date: string;
}
```

#### Business Rules

- `GenerateQuote` where `discount_pct > 20` → `RequiresHITL = true`, `HitlTriggerType = "FINANCIAL_THRESHOLD"`
- `discount_pct` must be between 0 and 100; reject with structured error otherwise

---

### 7.5 HR Tool

**Purpose:** Full employee lifecycle management.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `OnboardEmployee` | Create employee record + provision access | **Yes — always** |
| `OffboardEmployee` | Terminate access and update records | **Yes — always** |
| `UpdatePayroll` | Change salary, bank details, or pay schedule | **Yes — always** |
| `ManageLeave` | Submit or approve leave requests | No |
| `ManageContract` | Create or modify employment contract | **Yes — always** |
| `ScheduleAppraisal` | Create appraisal record | No |
| `ScheduleInterview` | Schedule interview and send calendar invites | No |

#### Input Schemas

```typescript
OnboardEmployee: {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  start_date: string;
  salary: number;
  currency: string;
  contract_type: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  manager_id: string;
}
OffboardEmployee: {
  employee_id: string;
  last_date: string;
  reason: "RESIGNATION" | "TERMINATION" | "REDUNDANCY" | "END_OF_CONTRACT";
  exit_interview_scheduled: boolean;
}
UpdatePayroll: {
  employee_id: string;
  change_type: "SALARY_CHANGE" | "BANK_DETAILS" | "PAY_SCHEDULE";
  new_value: object;   // typed by change_type
  effective_date: string;
}
ManageLeave: {
  employee_id: string;
  leave_type: "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID";
  start_date: string;
  end_date: string;
  action: "REQUEST" | "APPROVE" | "REJECT";
}
```

#### Business Rules

- `OnboardEmployee`, `OffboardEmployee`, `UpdatePayroll`, `ManageContract` ALWAYS trigger `RequiresHITL = true`, `HitlTriggerType = "HR_LIFECYCLE"`
- **No HR lifecycle action may execute until `approval_requests` record with `status = APPROVED` exists**
- Attempting an HR lifecycle action without approval → `ToolResult { Success = false, Error = "HR lifecycle action requires prior approval. No approved record found." }`
- `salary` field and `bank_details` are PII — must be masked in audit logs

---

### 7.6 Reporting Tool

**Purpose:** KPI dashboards, analytics queries, data export.

#### Operations

| Action | Description | HITL Required |
|---|---|---|
| `GetKPIDashboard` | Return structured KPI data for a domain | **Never** |
| `RunAnalyticsQuery` | Ad-hoc analytics query | **Never** |
| `ExportReport` | Generate downloadable report | **Never** |

#### Input Schemas

```typescript
GetKPIDashboard: {
  report_type: "PROCUREMENT_SPEND" | "INVENTORY_LEVELS" | "SALES_PERFORMANCE" | "HR_HEADCOUNT" | "FINANCE_SUMMARY";
  date_range: { from: string; to: string };
  filters?: Record<string, string | string[]>;
}
RunAnalyticsQuery: {
  metric: string;
  dimensions: string[];
  date_range: { from: string; to: string };
  filters?: Record<string, string>;
}
ExportReport: {
  report_type: string;
  format: "PDF" | "CSV" | "XLSX";
  date_range: { from: string; to: string };
}
```

#### Business Rules

- Reporting Tool **never** triggers HITL
- Reporting Tool **never** writes to ERP systems — read-only
- RBAC still applies: `AUDITOR` role can access all reports; `SALES_REP` can only access sales reports

---

## 8. Human-in-the-Loop (HITL) System

### 8.1 HITL Trigger Matrix

| Trigger Type | Condition | Escalation Role | Notify Via |
|---|---|---|---|
| `FINANCIAL_THRESHOLD` | Payment or discount > $1,000 (configurable) | `FINANCE_APPROVER` | Email + Slack |
| `VENDOR_CREATION` | Any new/modified vendor record | `PROCUREMENT_LEAD` | Email + Slack |
| `PO_EXECUTION` | Any PO issuance (all amounts) | `FINANCE_APPROVER` | Email + Slack |
| `HR_LIFECYCLE` | Onboarding, offboarding, payroll, contracts | `HR_LEAD` | Email + Slack |
| `BULK_MODIFICATION` | > 100 records in single action | `SYSTEM_ADMIN` | Email + Slack |
| `LOW_AI_CONFIDENCE` | LLM confidence score < 0.7 | `ASSIGNED_OPERATOR` | Email |

### 8.2 HITL Flow

```
1. Tool returns ToolResult { RequiresHITL = true }
2. Orchestration Layer:
   a. Does NOT execute the operation
   b. Creates approval_requests record (status: PENDING)
   c. Transitions workflow state: IN_PROGRESS → WAITING_APPROVAL
   d. Persists WorkflowContext to Redis with suspended step index
   e. Dispatches notification (email + Slack) within 60 seconds
3. Approver receives notification, reviews, and submits decision
4a. APPROVED:
   a. Update approval_requests.status = APPROVED, decision_at, decision_by, rationale
   b. Write audit log (outcome: APPROVED)
   c. Transition workflow: WAITING_APPROVAL → IN_PROGRESS
   d. Resume execution from suspended step_index (re-invoke same tool — it will now find APPROVED record)
   e. Tool checks for APPROVED record → executes the actual operation
4b. REJECTED:
   a. Update approval_requests.status = REJECTED
   b. Write audit log with rejection reason
   c. Transition workflow: WAITING_APPROVAL → FAILED
   d. Store rejection reason in workflows.error
```

### 8.3 Approval Notification Payload

Every notification (email + Slack) must include:

```json
{
  "workflow_id": "...",
  "workflow_summary": "Create PO for 50 office chairs from ABC Supplies — $3,500",
  "proposed_action": "Issue Purchase Order PO-2026-0042 to ABC Supplies Ltd for $3,500",
  "business_context": "Initiated by Jane Smith (Operations Manager) — Inventory below reorder threshold",
  "trigger_type": "PO_EXECUTION",
  "risk_detail": { "amount": 3500, "currency": "USD", "supplier": "ABC Supplies Ltd" },
  "initiated_by": { "name": "Jane Smith", "role": "Operations Manager" },
  "created_at": "2026-06-10T14:05:00Z",
  "approve_url": "https://app.requivo.ai/approvals/{approval_id}/approve",
  "reject_url": "https://app.requivo.ai/approvals/{approval_id}/reject",
  "dashboard_url": "https://app.requivo.ai/approvals/{approval_id}"
}
```

### 8.4 HITL Expiry

- Approval requests expire after **org-configurable timeout** (default: 48 hours)
- On expiry: `approval_requests.status = EXPIRED`, workflow transitions to `FAILED`
- Admin is notified of expired approvals

---

## 9. API Contracts

### Base URL: `/api/v1`

### 9.1 Workflow Endpoints

```
POST   /workflows               Create and start a new workflow
GET    /workflows               List workflows for authenticated user
GET    /workflows/:id           Get workflow detail + step history
GET    /workflows/:id/trace     Get full execution trace
DELETE /workflows/:id           Cancel a PENDING/PLANNING workflow (not IN_PROGRESS)
```

#### POST /workflows — Request

```json
{
  "input": "We need to restock office chairs",
  "context": {}  // optional additional context from user
}
```

#### POST /workflows — Response (201)

```json
{
  "workflow_id": "wf_abc123",
  "state": "PENDING",
  "created_at": "2026-06-10T14:00:00Z",
  "sse_url": "/api/v1/workflows/wf_abc123/events"
}
```

#### GET /workflows/:id — Response (200)

```json
{
  "workflow_id": "...",
  "input": "...",
  "intent": "procurement",
  "state": "COMPLETED",
  "current_step": 10,
  "steps": [
    {
      "step_index": 1,
      "tool_name": "InventoryTool.CheckStock",
      "state": "COMPLETED",
      "explanation": "...",
      "latency_ms": 420,
      "output": { "current_qty": 3, "below_threshold": true }
    }
  ],
  "created_at": "...",
  "completed_at": "..."
}
```

### 9.2 Approval Endpoints

```
GET    /approvals               List approvals (filtered by status, role)
GET    /approvals/:id           Get approval detail
POST   /approvals/:id/approve   Submit approval decision
POST   /approvals/:id/reject    Submit rejection decision
```

#### POST /approvals/:id/approve — Request

```json
{ "rationale": "Supplier is on approved vendor list; amount within budget" }
```

#### POST /approvals/:id/reject — Request

```json
{ "reason": "Supplier not on approved vendor list. Please raise a vendor creation request first." }
```

### 9.3 Audit Endpoints

```
GET    /audit                   Query audit logs (filters: workflow_id, user_id, domain, date_range, outcome)
GET    /audit/:id               Get single audit log entry
POST   /audit/export            Export audit logs (returns signed download URL)
```

### 9.4 Real-Time Events (SSE)

```
GET /workflows/:id/events       Server-Sent Events stream
```

#### Event Types

```
event: workflow.state_change    data: { "state": "IN_PROGRESS", "step": 2 }
event: step.started             data: { "step_index": 2, "tool": "ProcurementTool.CreatePO", "explanation": "..." }
event: step.completed           data: { "step_index": 2, "output": {...}, "latency_ms": 812 }
event: step.failed              data: { "step_index": 2, "error": "..." }
event: hitl.triggered           data: { "approval_id": "...", "trigger_type": "PO_EXECUTION" }
event: workflow.completed       data: { "workflow_id": "...", "total_steps": 10 }
event: workflow.failed          data: { "workflow_id": "...", "error": "..." }
```

### 9.5 Auth Endpoints

```
POST   /auth/login              OAuth / SSO redirect or credentials
POST   /auth/refresh            Refresh JWT using rotation token
POST   /auth/logout             Invalidate session
```

### HTTP Status Codes Used Throughout

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated (missing/invalid token) |
| 403 | Authenticated but not authorised (RBAC denied) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate action) |
| 422 | Unprocessable entity (business rule violation) |
| 500 | Internal server error |

---

## 10. RBAC & Permissions

### Permission Strings

```
inventory:read
inventory:write

procurement:read
procurement:write
procurement:approve

finance:read
finance:write
finance:approve

sales:read
sales:write

hr:read
hr:write

reporting:read

admin:all
```

### Role → Permission Mapping

| Role | Permissions |
|---|---|
| `SYSTEM_ADMIN` | All permissions |
| `FINANCE_MANAGER` | `inventory:read`, `procurement:read`, `procurement:approve`, `finance:read`, `finance:write`, `finance:approve`, `sales:read`, `hr:read`, `reporting:read` |
| `PROCUREMENT_LEAD` | `inventory:read`, `inventory:write`, `procurement:read`, `procurement:write`, `finance:read`, `sales:read`, `reporting:read` |
| `HR_MANAGER` | `finance:read`, `hr:read`, `hr:write`, `reporting:read` |
| `SALES_REP` | `inventory:read`, `sales:read`, `sales:write`, `reporting:read` |
| `AUDITOR` | `inventory:read`, `procurement:read`, `finance:read`, `sales:read`, `hr:read`, `reporting:read` |
| `AI_AGENT` | Per-workflow only (resolved at runtime from the initiating user's permissions) |

### Enforcement Rules

1. Permissions are **checked at the tool level** (`ExecuteAsync`), not only at the API gateway
2. The AI Agent inherits the permissions of the user who initiated the workflow — it cannot act beyond what the initiating user is allowed to do
3. A `403` response from a tool must be written to `audit_logs` as an unauthorised attempt
4. Bypassing the API gateway and calling internal services directly must still be rejected at the tool level

---

## 11. Security Requirements

### Authentication

- MFA mandatory for all users (enforced at login)
- JWT with 1-hour expiry; refresh token rotated on every use
- Bearer token required on all internal service-to-service calls
- Dedicated service accounts per tool; no shared credentials

### Data Protection

| Requirement | Implementation |
|---|---|
| PII fields at rest | AES-256 encryption at field level (name, email, salary, bank details) |
| All data in transit | TLS 1.3 minimum |
| PII in logs | Masked — never appear in plaintext in logs |
| Audit log integrity | Append-only table; no UPDATE/DELETE via application layer |
| Secrets in code | Zero hardcoded credentials; secrets scanning on every CI build (Trufflesecurity) |

### GDPR

- API endpoint for Article 17 (right to erasure) must be implemented
- PII must only be stored within customer-defined geographic region
- Data retention: audit logs 7 years, workflow data 3 years

### CI/CD Security Gates

- SAST (Semgrep or Snyk) on every build — critical/high findings block release
- DAST (OWASP ZAP) on every build — critical/high findings block release
- Annual third-party penetration test; critical findings resolved within 30 days

---

## 12. Integration Layer

### Integration Specifications

| Integration | Protocol | Auth | Timeout | Retry |
|---|---|---|---|---|
| Email (SendGrid) | REST API | API Key | Async / best-effort | 3 retries |
| Slack | Slack Web API | Bot OAuth Token | < 3 seconds | 3 retries |
| Legacy ERP | REST / SOAP adapter | API Key / Basic Auth | < 10 seconds | 3 retries |
| QuickBooks / SAP | REST | OAuth 2.0 | < 5 seconds | 3 retries |
| Supplier APIs | REST / EDI | API Key (per supplier) | < 10 seconds | 3 retries |
| Google Calendar / Exchange | REST | OAuth 2.0 | < 3 seconds | 3 retries |

### Resilience Rules

- Integration failure must **never crash or block the Orchestration Layer**
- All integration errors are: caught → logged with full context → escalated via notification
- Circuit breaker pattern on all external API calls (open after 5 consecutive failures; half-open after 30s)
- DL queue entry must include full integration error context when a workflow fails due to an integration

### Slack Message Format

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "⚠️ Approval Required — Requivo AI" }
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Action:* Create PO for 50 office chairs — $3,500\n*Initiated by:* Jane Smith (Operations Manager)\n*Trigger:* Purchase Order Execution" }
    },
    {
      "type": "actions",
      "elements": [
        { "type": "button", "text": { "type": "plain_text", "text": "✅ Approve" }, "url": "...", "style": "primary" },
        { "type": "button", "text": { "type": "plain_text", "text": "❌ Reject" }, "url": "...", "style": "danger" }
      ]
    }
  ]
}
```

---

## 13. Observability & Monitoring

### Structured Execution Trace

Every workflow must produce a trace with these fields:

```json
{
  "workflow_id": "...",
  "user_id": "...",
  "intent": "procurement",
  "input": "...",
  "plan": [...],
  "steps": [
    {
      "step_index": 1,
      "tool": "...",
      "action": "...",
      "explanation": "...",
      "input": {...},
      "output": {...},
      "state": "COMPLETED",
      "latency_ms": 420,
      "hitl_triggered": false
    }
  ],
  "llm_snapshots": [
    {
      "step_index": 0,
      "prompt_summary": "...",
      "response_summary": "...",
      "confidence": 0.93,
      "latency_ms": 1200
    }
  ],
  "final_state": "COMPLETED",
  "total_latency_ms": 8420,
  "created_at": "...",
  "completed_at": "..."
}
```

### Required Monitoring Dashboards

| Dashboard | Key Metrics |
|---|---|
| Workflow Health | Success rate, failure rate (excl. rejections), workflows per hour |
| Tool Performance | P50/P95/P99 latency per tool, error rate per tool |
| HITL Queue | Pending approvals count, average age, oldest pending |
| System Health | CPU/memory per service, Redis memory, DB connection pool |

### Alert Rules

| Alert | Condition | SLA |
|---|---|---|
| High workflow failure rate | > 5% FAILED (excl. rejections) over any 10-minute window | Alert within 5 minutes |
| HITL notification delay | Notification sent > 60s after trigger | Alert immediately |
| Tool latency spike | Any tool P95 > 15s | Alert within 5 minutes |
| Redis memory | > 3.5 GB used | Alert (warning before 4 GB limit) |
| DB slow queries | P99 query > 200ms | Alert |

---

## 14. Performance Targets

| Metric | Target | Method |
|---|---|---|
| System uptime | 99.9% (< 8.7 hrs/year) | Uptime monitoring |
| Simple workflow latency | < 30s P95 end-to-end | Trace timestamps |
| Complex workflow latency | < 5 min P95 (excl. approval wait) | Trace timestamps |
| LLM inference | < 5s P95 per call | LLM span |
| Tool execution | < 10s P95 per tool | Tool span |
| HITL notification | < 60s from trigger | Notification delta |
| Concurrent workflows | >= 50 per instance | Load test |
| Throughput | >= 500 starts/hour | Load test |
| DB indexed queries | < 100ms P99 | Slow query log |
| Redis operations | < 5ms P99 | Redis metrics |
| RTO after failure | < 15 minutes | DR drill |
| RPO (max data loss) | < 15 minutes | DR drill |

---

## 15. Frontend — Component Breakdown

### Pages

| Page | Route | Auth Required | Description |
|---|---|---|---|
| Chat | `/` | Yes | Main NL input interface |
| Workflow Detail | `/workflows/:id` | Yes | Live progress + step history |
| Approval Dashboard | `/approvals` | Yes (approver roles only) | All pending approvals |
| Approval Detail | `/approvals/:id` | Yes (approver) | Full context + approve/reject |
| Audit Log | `/audit` | Yes | Searchable/filterable audit trail |
| Admin | `/admin` | SYSTEM_ADMIN only | RBAC, thresholds, system config |
| Login | `/login` | No | OAuth / SSO |

### Key Components

```
<ChatInterface>
  <MessageList />              — conversation history
  <TypingIndicator />          — while LLM processes
  <WorkflowProgressCard>       — live step progress via SSE
    <StepList />
    <StepStatusBadge />
    <HITLPendingBanner />      — when WAITING_APPROVAL
  </WorkflowProgressCard>
  <ClarificationPrompt />      — when needs_clarification = true
  <MessageInput />
</ChatInterface>

<ApprovalDashboard>
  <ApprovalQueueTable>         — sortable by age, type, priority
    <ApprovalRow>
      <ApprovalContextCard>    — collapsible full context
      <ApproveRejectButtons>
    </ApprovalRow>
  </ApprovalQueueTable>
</ApprovalDashboard>

<AuditLog>
  <AuditFilter />              — domain, date range, outcome, user
  <AuditTable />
  <AuditExportButton />
</AuditLog>
```

### Real-Time Behaviour

- Chat page subscribes to SSE at `/api/v1/workflows/:id/events` immediately on workflow creation
- Step status updates, HITL triggers, and completion events all pushed over SSE
- On HITL trigger: show `HITLPendingBanner` with link to approval dashboard
- On `workflow.completed`: show summary with total steps, time taken

---

## 16. Error Handling & Retry Logic

### Retry Policy (Orchestration Layer)

```
Attempt 1: immediate
Attempt 2: wait 1 second
Attempt 3: wait 5 seconds
Attempt 4 (final): wait 30 seconds
→ After 4 attempts with no success: move to FAILED, push to DL queue
```

This applies to **transient errors only** (network timeouts, 5xx responses from integrations). Do NOT retry:
- RBAC rejections (403)
- Validation errors (400)
- Business rule violations (422)
- HITL-blocked operations (these wait for approval, not retry)

### LLM Error Handling

```
LLM call fails or returns malformed response:
  → Retry up to 2 times with reformulated prompt
  → If still failing: escalate to HITL (operator review), log with full context
  → Never proceed with a partially formed plan
```

### Dead-Letter Queue

When a workflow moves to `FAILED` after exhausting retries:
1. Write to `dead_letter_queue` with full execution trace
2. Notify system admin via email
3. Workflow remains queryable — full history preserved
4. Admin can manually trigger re-execution from last successful step

### Partial Workflow Rollback

For multi-step workflows that fail mid-execution after a write operation:

```
If step N fails after steps 1..N-1 have written data:
  → Run compensating actions for each completed write step (in reverse order)
  → Compensating actions are defined per-tool (e.g. DeletePO for CreatePO, RestoreStock for UpdateStockLevel)
  → Log each compensating action to audit_logs
  → If compensating action also fails: flag for manual review, notify admin
```

---

## 17. Acceptance Criteria

### AC-W — Workflow Orchestration

| ID | Criterion | Pass Condition |
|---|---|---|
| ACW01 | NL input correctly classified to one of 6 domains | >= 95% accuracy on 20 representative requests |
| ACW02 | All state machine transitions valid | Zero undefined transitions in unit + integration tests |
| ACW03 | Workflow resumes from last checkpoint after restart | Kill process mid-workflow; restart; confirm continuation |
| ACW04 | Failed workflows appear in DL queue with full trace | Inject failure; verify DL queue entry contains all steps |
| ACW05 | >= 50 concurrent workflows run within SLA | Load test: 50 concurrent; all complete within latency targets |
| ACW06 | Compensating rollback runs on mid-execution failure | Trigger failure post-write; verify compensating actions logged |

### AC-AI — AI Reasoning

| ID | Criterion | Pass Condition |
|---|---|---|
| ACAI01 | LLM decomposes >= 90% of valid requests into correct task sequences | 50-request eval, human-graded |
| ACAI02 | Ambiguous requests receive clarification prompt | 10 ambiguous inputs; >= 8 return clarification, 0 proceed |
| ACAI03 | LLM latency < 5s P95 | 100-call benchmark via tracing |
| ACAI04 | Every proposed action has a non-empty explanation field | 100% of workflow traces inspected |
| ACAI05 | LLM confidence < 0.7 triggers HITL | Inject low-confidence; verify HITL raised |
| ACAI06 | Step N+1 correctly references entities resolved in step N | Multi-step trace inspection |

### AC-T — Business Tools

| ID | Criterion | Pass Condition |
|---|---|---|
| ACT01 | Invalid input returns structured ToolResult error (not exception) | Invalid inputs to all 6 tools |
| ACT02 | Tool latency < 10s P95 for all 6 tools | 50-request benchmark per tool |
| ACT03 | Every write creates audit log with all required fields | 1 write per tool; inspect 6 entries |
| ACT04 | Inventory Tool flags below-threshold stock + includes forecast | Set threshold; deplete stock; verify response |
| ACT05 | Procurement Tool generates valid PO structure + HITL queue entry | End-to-end PO workflow |
| ACT06 | Finance Tool blocks payments > $1,000 without approval | Submit $1,500 payment; verify suspension |
| ACT07 | HR Tool rejects lifecycle action without approved record | Attempt onboarding without approval |
| ACT08 | Underprivileged role blocked at tool level with 403 | Attempt out-of-role actions with valid auth |

### AC-H — HITL

| ID | Criterion | Pass Condition |
|---|---|---|
| ACH01 | All 6 trigger conditions pause workflow and create approval request | Trigger each; verify WAITING_APPROVAL |
| ACH02 | Notification sent < 60s from HITL trigger | Measure across 10 events |
| ACH03 | Notification includes all required fields | Inspect 5 sample approval payloads |
| ACH04 | Approved workflow resumes from correct step | Approve 5; verify completion |
| ACH05 | Rejected workflow transitions to FAILED with reason in audit | Reject 5; verify state + audit entry |
| ACH06 | Approval decision recorded with identity, timestamp, rationale | Inspect audit for all required fields |

### AC-S — Security

| ID | Criterion | Pass Condition |
|---|---|---|
| ACS01 | All endpoints return 401 for unauthenticated requests | Send requests with no token to all endpoints |
| ACS02 | RBAC enforced at action level, not gateway only | Bypass gateway; call internal tools with wrong role |
| ACS03 | PII masked in all log outputs | Trigger PII-touching workflow; inspect logs |
| ACS04 | Inter-service comms use TLS 1.3+ | Automated TLS audit scan |
| ACS05 | SAST + DAST pass with zero critical/high findings | CI pipeline gate output |
| ACS06 | No hardcoded credentials anywhere in codebase | Trufflesecurity scan result |

### AC-O — Observability

| ID | Criterion | Pass Condition |
|---|---|---|
| ACO01 | Every workflow produces complete structured trace | 10 diverse workflows; trace completeness check |
| ACO02 | All 4 monitoring dashboards populated with live data | Dashboard verification in staging |
| ACO03 | High failure rate alert fires within 5 minutes | Inject failures past threshold; measure alert time |
| ACO04 | Per-tool latency metrics visible in dashboard | Real-time dashboard inspection |

### AC-I — Integrations

| ID | Criterion | Pass Condition |
|---|---|---|
| ACI01 | Email delivered for all HITL events and completions | 10 trigger events; verify test mailbox |
| ACI02 | Slack alert posted with correct format | Trigger events; verify Slack channel |
| ACI03 | ERP adapter maps data with no field loss | Data mapping test suite: input vs ERP-received |
| ACI04 | Integration downtime does not crash orchestration layer | Simulate downtime; verify graceful handling |

---

## 18. End-to-End Scenarios

All 8 must pass in staging before production release.

### Scenario 1: Restock Procurement

**Input:** `"We need to restock office chairs."`

**Expected steps:**
1. LLM extracts intent: `procurement`, plans 10 steps
2. `InventoryTool.CheckStock` → `below_threshold: true`
3. `InventoryTool.ForecastDemand` → forecast for next 30 days
4. `ProcurementTool.SelectSupplier` → returns preferred supplier
5. `ProcurementTool.CreatePO` → triggers HITL (`PO_EXECUTION`)
6. Workflow pauses → approval notification sent within 60s
7. Manager approves → workflow resumes
8. `ProcurementTool.SubmitPO` → PO sent to supplier
9. `InventoryTool.UpdateStockLevel` → expected quantity updated
10. Slack notification posted + audit log written

**Pass condition:** All 10 steps complete, PO document is valid, audit log has all steps, Slack message received

---

### Scenario 2: Finance Payment

**Input:** `"Pay invoice INV-2041 for $4,500 to Acme Corp"`

**Expected:** Finance tool creates payment record → HITL triggered (> $1,000) → manager notified → on approval payment executes → audit log records approver identity

**Pass condition:** Payment blocked before approval, executes after, approver identity in audit log

---

### Scenario 3: HR Onboarding

**Input:** `"Onboard Jane Smith as a Sales Engineer starting July 1"`

**Expected:** HR tool creates record → HITL triggered → IT access provisioned post-approval → payroll entry created → calendar updated

**Pass condition:** No HR records created before approval, all records created after, calendar invite sent

---

### Scenario 4: Ambiguous Request

**Input:** `"Sort out the supply issue"`

**Expected:** Agent returns clarification question asking for domain, item, and urgency. No workflow starts.

**Pass condition:** Response has `needs_clarification: true`, no `plan` array, no tool calls made

---

### Scenario 5: Rejected Approval

**Input:** `"Create a new vendor: Unknown Supplies Ltd"`

**Expected:** Vendor creation paused → sent to HITL → approver rejects → workflow transitions to `FAILED` → rejection reason in audit log

**Pass condition:** `workflows.state = FAILED`, `approval_requests.status = REJECTED`, `audit_logs.outcome = REJECTED` with reason

---

### Scenario 6: Partial Failure Recovery

**Input:** Multi-step inventory update — step 3 fails due to tool timeout

**Expected:** Steps 1 & 2 outputs preserved → retry triggered for step 3 (3 attempts with backoff) → if still failing, compensating actions run for steps 1 & 2 → DL queue entry created

**Pass condition:** Compensating actions in audit log, DL queue entry exists with full trace

---

### Scenario 7: RBAC Enforcement

**Input:** Sales Rep (authenticated) attempts to initiate a payment

**Expected:** `FinanceTool.InitiatePayment` returns `{ Success: false }` with 403-equivalent error → audit log records unauthorised attempt

**Pass condition:** Payment never created, `audit_logs` entry with `outcome = UNAUTHORIZED`

---

### Scenario 8: Reporting Query

**Input:** `"Show me procurement spend by supplier for last quarter"`

**Expected:** `ReportingTool.GetKPIDashboard` called → structured KPI data returned → rendered in frontend → no HITL triggered → no writes to any ERP system

**Pass condition:** Response within 10s, HITL not triggered, zero write operations in audit log

---

## 19. Definition of Done

A module is production-ready when ALL conditions below are met:

| # | Condition | Owner |
|---|---|---|
| 1 | All MUST-priority acceptance criteria pass | QA Lead |
| 2 | Unit + integration test coverage >= 80% on orchestration and tool layers | Engineering Lead |
| 3 | SAST + DAST scans clear — zero critical/high findings | Security Lead |
| 4 | Load test run at 2x expected peak throughput; no SLA breach | Engineering Lead |
| 5 | Audit logging verified for all write ops across all 6 tools | QA Lead |
| 6 | RBAC matrix tested for all 7 roles | Security Lead |
| 7 | All 8 end-to-end scenarios pass in staging | QA Lead |
| 8 | All 4 monitoring dashboards live and alert rules configured | Platform Lead |
| 9 | HITL tested end-to-end for all 6 trigger types | Product Owner |
| 10 | No hardcoded secrets, credentials, or env-specific values in code | Engineering Lead |
| 11 | API reference and deployment runbook updated | Technical Writer |
| 12 | Final sign-off: Product Owner + Security Lead | Product Owner |

---

*Document Version: 1.0 | Lumenware Technologies | June 2026 | Internal — Confidential*
