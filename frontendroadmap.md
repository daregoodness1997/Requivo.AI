# Requivo AI Frontend Roadmap

This roadmap breaks the frontend work into small, manageable steps. Complete and test each step before moving to the next one.

## Progress Summary

**Last updated:** June 10, 2026

**Current position:** Phase 5, Step 5.2

- [x] Phase 1: Frontend setup and tooling
- [x] Phase 2: UI foundation
- [~] Phase 3: Authentication
- [~] Phase 4: API and application state
- [~] Phase 5: Chat and workflow creation
- [~] Phase 6: Real-time workflow updates
- [~] Phase 7: Approval experience
- [~] Phase 8: Audit log
- [~] Phase 9: Accessibility and responsive design
- [ ] Phase 10: Frontend testing
- [~] Phase 11: Production readiness

Legend:

- `[x]` Completed
- `[~]` In progress or partially completed
- `[ ]` Not started

### Completed So Far

- Dependencies installed and `package-lock.json` generated.
- React upgraded from 18 to 19.
- shadcn/ui initialized with the Nova preset.
- Prompt Kit `PromptInput` installed and used for the chat composer.
- Geist font and shadcn theme variables configured.
- Typed environment configuration added.
- ESLint and Prettier configured.
- Shared UI components added for buttons, cards, badges, alerts, spinners, and empty states.
- Chat request loading, error handling, character limits, and keyboard behavior added.
- Workflow loading and empty states added.
- Responsive desktop and mobile application shell completed.
- Frontend-only demo API added for workflows, approvals, and audit entries.
- Demo login, MFA verification, persisted session, protected routes, user menu, and logout added.
- Workflow progress simulation and polling added for frontend development without the backend.
- Approval cards, decision feedback, rejection rationale validation, and audit filtering added.
- A not-found route and page-level error states added.
- Production build and local browser verification completed.

### Verification Status

The following commands currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm run build`

### Next Task

Continue with **Phase 5, Step 5.2: Separate chat messages from workflow cards**:

1. Create clear user and agent message components.
2. Extract the existing workflow presentation into a reusable workflow card.
3. Add a frontend-only workflow detail route.
4. Add approval detail and audit detail views.
5. Set up automated frontend tests before backend integration.

---

## Current Frontend

The frontend currently uses:

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- Axios
- Tailwind CSS
- shadcn/ui
- Prompt Kit
- Radix UI
- Lucide icons

Existing pages:

- Chat
- Approvals
- Audit Log

The frontend now runs as a standalone demo using local mock services. Login, MFA, chat
workflows, approvals, audit entries, responsive navigation, loading states, and error states can
be developed and reviewed without the backend. Backend API contracts, role authorization,
real SSE, detail pages, and automated tests are still pending.

---

## Phase 1: Make the Frontend Easy to Run

### [x] Step 1.1: Install and verify dependencies

- [x] Run `npm install`.
- [x] Confirm `npm run dev` starts the application.
- [x] Confirm `npm run build` succeeds.
- [x] Generate `package-lock.json`.
- [ ] Commit the completed frontend work when requested.

**Done when:** The frontend runs locally and produces a successful production build.

### [~] Step 1.2: Add frontend environment configuration

- [ ] Create a local `.env` from `.env.example` when the backend environment is available.
- [~] Confirm `VITE_API_BASE_URL` points to the backend. The default is configured, but the backend is not running locally yet.
- [ ] Remove or postpone `VITE_SSE_URL` until the backend SSE contract is finalized.
- [x] Add a typed environment helper instead of reading `import.meta.env` throughout the app.
- [x] Add `VITE_USE_MOCK_API` so frontend development can continue independently.

**Done when:** API configuration is defined in one place and works in development.

### [x] Step 1.3: Add code-quality tooling

- [x] Add an ESLint configuration.
- [x] Add Prettier.
- [x] Add scripts for `lint`, `format`, and `typecheck`.
- [x] Fix lint and TypeScript errors.

**Done when:** `npm run lint`, `npm run typecheck`, and `npm run build` all pass.

---

## Phase 2: Establish the UI Foundation

### [x] Step 2.1: Define reusable design tokens

- [x] Initialize shadcn theme variables.
- [x] Add Geist typography.
- [x] Extend the Tailwind theme with semantic colors:
  - primary
  - success
  - warning
  - danger
  - neutral
- [~] Continue standardizing spacing, page widths, borders, and shadows as screens are built.

**Done when:** Components no longer rely on scattered, inconsistent color choices.

### [~] Step 2.2: Create basic shared components

Build small reusable components:

- [x] `Button` using shadcn/ui
- [ ] `Input`
- [x] `Textarea` using shadcn/ui
- [x] `Badge`
- [x] `Card`
- [x] `Spinner`
- [x] `EmptyState`
- [x] `Alert`
- [ ] `Modal`
- [x] `PromptInput` using Prompt Kit

Support disabled, loading, error, and accessible focus states.

**Done when:** New pages can be assembled from shared components rather than repeated Tailwind markup.

### [x] Step 2.3: Improve the application layout

- [x] Make the sidebar responsive.
- [x] Add a mobile navigation menu.
- [x] Replace hardcoded user initials with authenticated user information.
- [x] Add a user menu and logout action.
- [x] Add active-route and keyboard focus styling.

**Done when:** The layout works on desktop and mobile without hardcoded user information.

---

## Phase 3: Authentication

This phase depends on finalizing the backend login, refresh-token, and role contract.

### [~] Step 3.1: Add authentication types and API methods

- [x] Define typed user, role, login, MFA, and session models.
- [x] Add isolated demo API methods for login and MFA verification.
- [ ] Align login, refresh, logout, registration, and MFA setup methods with the backend contract.

**Done when:** Auth API calls are typed and isolated from UI components.

### [~] Step 3.2: Create an authentication store

- [x] Store the current user, authentication challenge, and status.
- [x] Centralize demo token access.
- [x] Restore the authenticated demo session on page reload.
- [x] Add a clean logout operation.
- [ ] Add backend refresh-token behavior when its contract is available.

**Done when:** Components can reliably determine the current user and role.

### [x] Step 3.3: Build the login page

- [x] Add `/login`.
- [x] Add email and password validation.
- [x] Show loading and API error states.
- [x] Redirect authenticated users to `/chat`.

**Done when:** A user can log in and enter the protected application.

### [~] Step 3.4: Build the MFA flow

- [x] Detect an MFA-required login response.
- [x] Add a six-digit verification screen.
- [ ] Support initial MFA setup if required by the backend.
- [ ] Display QR-code/setup information securely if required.

**Done when:** MFA-enabled users can complete authentication without using Swagger.

### [~] Step 3.5: Protect routes by authentication and role

- [x] Add a protected-route component.
- [x] Redirect unauthenticated users to `/login`.
- [ ] Restrict approvals to approver roles.
- [ ] Restrict audit views to auditor/admin roles.
- [ ] Add a friendly unauthorized page.

**Done when:** Navigation and direct URLs respect the user's permissions.

---

## Phase 4: Reliable API and Application State

### [~] Step 4.1: Standardize API error handling

- [x] Add a shared API error-message helper.
- [~] Handle validation, authentication, authorization, network, and server errors.
- [~] Replace `catch(console.error)` with user-facing feedback. Chat is complete; approvals and audit still need this.
- Prevent repeated redirects on `401` responses.

**Done when:** Users see understandable errors and the console is not the main error interface.

### [x] Step 4.2: Add page-level loading and empty states

Add clear states for:

- [x] loading workflows
- [x] starting a workflow
- [x] loading approvals
- [x] submitting an approval decision
- [x] loading audit entries
- [x] empty workflow, approval, and audit states
- [x] failed requests

**Done when:** Every asynchronous screen handles loading, success, empty, and error states.

### Step 4.3: Decide on server-state management

Recommended: add TanStack Query for API data and keep Zustand for UI-only state.

- Use queries for workflows, approvals, and audit entries.
- Use mutations for workflow creation and approval decisions.
- Add cache invalidation after mutations.
- Remove duplicated server data from Zustand.

**Done when:** API fetching, caching, refetching, and mutation state follow one consistent pattern.

---

## Phase 5: Chat and Workflow Creation

### [x] Step 5.1: Improve the workflow request form

- [x] Disable submission while a request is being created.
- [x] Preserve the input when submission fails.
- [x] Add basic validation and a 2,000-character limit.
- [x] Add starter example prompts. Expand these to all six ERP domains as domain screens mature.
- [x] Support Enter to send and Shift+Enter for a new line.
- [x] Use Prompt Kit `PromptInput`.

**Done when:** Submitting a business request is clear, resilient, and accessible.

### Step 5.2: Separate chat messages from workflow cards

- Create a `UserMessage` component.
- Create an `AgentMessage` component.
- Create a `WorkflowCard` component.
- Show clarification questions as agent messages.
- Display timestamps and workflow domain.

**Done when:** The interface reads like a conversation rather than a list of database records.

### [~] Step 5.3: Show detailed workflow progress

Completed in the current chat view:

- [x] Workflow status badges
- [x] Workflow step list and step state icons
- [x] Failure feedback
- [x] Approval-pending banner
- [ ] Extract these into dedicated reusable components.
- [ ] Add step timing and output summaries when the backend payload is finalized.

Show step state, description, timing, output summary, and failure details.

**Done when:** Users can understand what the agent is doing and where execution stopped.

### Step 5.4: Add a workflow detail page

- Add `/workflows/:id`.
- Load the workflow directly by ID.
- Show the original request, domain, state, steps, timestamps, and errors.
- Add a link from each workflow card.
- Handle unknown workflow IDs.

**Done when:** A workflow can be inspected independently of the chat history.

---

## Phase 6: Real-Time Workflow Updates

This phase depends on the backend providing a finalized real-time endpoint and authentication strategy.

### Step 6.1: Agree on the real-time contract

Confirm:

- SSE endpoint URL
- event names
- event payload shapes
- authentication method
- reconnection behavior
- terminal events

The current native `EventSource` implementation cannot attach the JWT bearer header.

**Done when:** Frontend and backend share one documented event contract.

### [~] Step 6.2: Rebuild the live-update hook

- [x] Poll local workflow state while mock mode is enabled.
- [x] Close polling when a workflow reaches a terminal or approval state.
- [ ] Subscribe through the real endpoint when the backend contract is ready.
- [ ] Handle finalized workflow and step events.
- [ ] Add capped reconnect behavior and a real-API polling fallback.

**Done when:** Workflow progress updates without manually refreshing the page.

### Step 6.3: Add connection feedback

- Show connecting, connected, reconnecting, and disconnected states.
- Avoid intrusive notifications for short reconnects.
- Offer a manual refresh after persistent failure.

**Done when:** Users can tell whether displayed workflow progress is current.

---

## Phase 7: Approval Experience

### [~] Step 7.1: Improve the approval queue

- [x] Show age, trigger type, requested action, and workflow context.
- [x] Add loading, error, and empty states.
- [ ] Add priority, status, and trigger filters.
- [ ] Add workflow links after the workflow detail page exists.

**Done when:** Approvers can quickly identify which requests need attention.

### Step 7.2: Add an approval detail page

- Add `/approvals/:id`.
- Show full workflow and business context.
- Show risk details and proposed action.
- Show initiator and creation time.
- Provide approve and reject controls.

**Done when:** An approver has enough information to make a responsible decision.

### [~] Step 7.3: Make decisions safe and explicit

- [x] Require rationale for rejection.
- Consider requiring rationale for approval.
- Add confirmation before submitting.
- [x] Prevent duplicate submissions.
- [x] Show success or failure feedback.
- [x] Refresh the local approval queue after the decision.
- [ ] Refresh the related backend workflow after integration.

**Done when:** Approval decisions are deliberate, traceable, and resistant to accidental double submission.

---

## Phase 8: Audit Log

### [~] Step 8.1: Add audit filters

Support:

- [x] text search across the visible audit data
- user
- domain/tool
- [x] outcome
- date range

Keep filters in the URL so views can be shared and refreshed.

**Done when:** Users can narrow the audit log without manually scanning all rows.

### Step 8.2: Add audit entry details

- Open an entry in a modal or detail page.
- Show masked input and output JSON.
- Show the related workflow and user.
- Format timestamps consistently.

**Done when:** An auditor can inspect an operation without leaving the audit workflow.

### Step 8.3: Add pagination and export

- Use server-side pagination.
- Add page-size controls.
- Add audit export after the backend endpoint exists.
- Show export progress and errors.

**Done when:** The audit view remains useful with large data volumes.

---

## Phase 9: Accessibility and Responsive Design

### Step 9.1: Keyboard and screen-reader support

- Use semantic HTML.
- Add labels to every input.
- Add accessible names to icon buttons.
- Add focus management for modals.
- Announce workflow status changes with appropriate live regions.

**Done when:** Core tasks can be completed using only a keyboard and common screen readers.

### [~] Step 9.2: Responsive verification

Verified manually:

- [x] mobile navigation and content layout
- [x] wide desktop navigation and content layout
- [ ] tablet
- [ ] laptop

Pay special attention to tables, navigation, workflow steps, and approval controls.

**Done when:** No primary task requires horizontal page scrolling on mobile.

### Step 9.3: Accessibility audit

- Run automated accessibility checks.
- Verify color contrast.
- Verify focus order.
- Verify zoom at 200%.

**Done when:** No critical accessibility violations remain.

---

## Phase 10: Frontend Testing

### Step 10.1: Set up unit and component tests

Recommended tools:

- Vitest
- React Testing Library
- `@testing-library/user-event`
- MSW for API mocking

**Done when:** Tests run through a single `npm test` command.

### Step 10.2: Test shared components and stores

Cover:

- validation
- loading and disabled states
- auth session behavior
- route protection
- API error formatting

**Done when:** The frontend foundation has reliable automated coverage.

### Step 10.3: Test critical user flows

Cover:

- login and MFA
- create workflow
- clarification response
- live workflow progress
- approve and reject actions
- audit filtering

**Done when:** The highest-risk workflows are protected from common regressions.

### Step 10.4: Add end-to-end tests

Recommended: Playwright.

Start with:

1. User logs in and starts a reporting workflow.
2. Approver reviews and approves a purchase order.
3. Auditor filters and opens an audit entry.

**Done when:** Critical journeys can be verified against a running application.

---

## Phase 11: Production Readiness

### Step 11.1: Add global failure handling

- Add an application error boundary.
- Add a not-found page.
- Add maintenance and offline states where appropriate.
- Add safe retry actions.

### Step 11.2: Add frontend observability

- Capture runtime errors.
- Track API failures and page performance.
- Avoid logging tokens, PII, or sensitive business data.
- Add correlation/workflow IDs to useful diagnostics.

### Step 11.3: Optimize the build

- Lazy-load major pages.
- Review bundle size.
- Remove unused dependencies.
- Verify production environment variables.
- Add a secure frontend deployment configuration.

**Done when:** The frontend is observable, performant, and deployable without development assumptions.

---

## Recommended First Milestone

Do not begin by building every screen. Start with one complete, low-risk vertical slice:

1. Set up dependencies, linting, formatting, and environment handling.
2. Build shared UI components.
3. Implement login and protected routes.
4. Build a polished chat request form.
5. Start a Reporting workflow.
6. Poll the workflow endpoint until SSE is ready.
7. Display its steps, completion result, loading state, and errors.
8. Add automated tests for this flow.

This milestone proves the frontend structure and backend integration before adding high-risk approval and write operations.

## Suggested Work Rhythm

For each roadmap step:

1. Confirm the backend contract needed by the step.
2. Implement the smallest useful UI change.
3. Add loading, empty, error, and success states.
4. Test keyboard and mobile behavior.
5. Add or update automated tests.
6. Run lint, typecheck, tests, and build.
7. Commit the completed step separately.
