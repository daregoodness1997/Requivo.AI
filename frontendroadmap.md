# Requivo AI Frontend Roadmap

This roadmap breaks the frontend work into small, manageable steps. Complete and test each step before moving to the next one.

## Progress Summary

**Last updated:** June 10, 2026

**Current position:** Frontend feature-complete in demo mode; backend integration handoff next

- [x] Phase 1: Frontend setup and tooling
- [x] Phase 2: UI foundation
- [~] Phase 3: Authentication
- [~] Phase 4: API and application state
- [x] Phase 5: Chat and workflow creation
- [~] Phase 6: Real-time workflow updates
- [x] Phase 7: Approval experience
- [~] Phase 8: Audit log
- [~] Phase 9: Accessibility and responsive design
- [~] Phase 10: Frontend testing
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
- Notification bell completed with pending-approval previews, accessible dismissal, and approvals
  navigation.
- Chat redesigned as user and agent messages with reusable workflow cards.
- Workflow and approval detail routes added.
- Approval priority, trigger, and text filters added with explicit decision confirmations.
- Audit URL filters, entry details, date filtering, pagination, and CSV export added.
- Role-based route protection and role-aware navigation added.
- Live-update connection feedback and active workflow detail polling added.
- Error boundary, offline banner, modal focus management, and lazy-loaded routes added.
- Vitest and React Testing Library configured with critical component and route tests.
- A not-found route and page-level error states added.
- Production build and local browser verification completed.

### Verification Status

The following commands currently pass:

- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm test` (7 tests)
- `npm run build`
- `npm audit --omit=dev` (0 production vulnerabilities)

### Next Task

The standalone frontend is ready for backend integration. The next handoff tasks are:

1. Finalize authentication, workflow, approval, audit, and SSE backend contracts.
2. Set `VITE_USE_MOCK_API=false` and connect the typed API adapters.
3. Add refresh-token and server-role behavior.
4. Replace client audit pagination/export with server endpoints.
5. Run end-to-end and accessibility audits against the integrated environment.

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

The frontend now runs as a feature-complete standalone demo using local mock services. Login, MFA,
chat workflows, workflow details, approvals, audit entries, role-aware navigation, loading states,
error handling, responsive layouts, and automated component tests work without the backend.
Real token refresh, server authorization, production SSE, server pagination/export, deployment
observability, and integrated end-to-end tests remain dependent on the backend environment.

---

## Phase 1: Make the Frontend Easy to Run

### [x] Step 1.1: Install and verify dependencies

- [x] Run `npm install`.
- [x] Confirm `npm run dev` starts the application.
- [x] Confirm `npm run build` succeeds.
- [x] Generate `package-lock.json`.
- [x] Commit and publish the completed frontend foundation.

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

### [x] Step 2.2: Create basic shared components

Build small reusable components:

- [x] `Button` using shadcn/ui
- [x] `Input`
- [x] `Textarea` using shadcn/ui
- [x] `Badge`
- [x] `Card`
- [x] `Spinner`
- [x] `EmptyState`
- [x] `Alert`
- [x] `Modal`
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
- [x] Restrict approvals to approver roles.
- [x] Restrict audit views to auditor/admin roles.
- [x] Add a friendly unauthorized page.

**Done when:** Navigation and direct URLs respect the user's permissions.

---

## Phase 4: Reliable API and Application State

### [~] Step 4.1: Standardize API error handling

- [x] Add a shared API error-message helper.
- [x] Handle validation, authentication, authorization, network, and server errors in current flows.
- [x] Replace `catch(console.error)` with user-facing feedback.
- [x] Prevent repeated redirects on `401` responses.

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

### [~] Step 4.3: Decide on server-state management

Decision: keep the current typed API layer and Zustand store during frontend-only development.
Reassess TanStack Query when real endpoint caching and invalidation behavior is known.

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

### [x] Step 5.2: Separate chat messages from workflow cards

- [x] Create a `UserMessage` component.
- [x] Create an `AgentMessage` component.
- [x] Create a `WorkflowCard` component.
- [x] Present workflow responses as agent messages.
- [x] Display timestamps and workflow domain.

**Done when:** The interface reads like a conversation rather than a list of database records.

### [x] Step 5.3: Show detailed workflow progress

Completed in the current chat view:

- [x] Workflow status badges
- [x] Workflow step list and step state icons
- [x] Failure feedback
- [x] Approval-pending banner
- [x] Extract these into dedicated reusable components.
- [x] Add step timing and structured output summaries.

Show step state, description, timing, output summary, and failure details.

**Done when:** Users can understand what the agent is doing and where execution stopped.

### [x] Step 5.4: Add a workflow detail page

- [x] Add `/workflows/:id`.
- [x] Load the workflow directly by ID.
- [x] Show the original request, domain, state, steps, timestamps, and errors.
- [x] Add a link from each workflow card.
- [x] Handle unknown workflow IDs.

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
- [x] Poll active workflow detail views until they settle.
- [ ] Subscribe through the real endpoint when the backend contract is ready.
- [ ] Handle finalized workflow and step events.
- [x] Add capped reconnect behavior.
- [ ] Confirm the real-API polling fallback with the backend.

**Done when:** Workflow progress updates without manually refreshing the page.

### [x] Step 6.3: Add connection feedback

- [x] Show connecting, connected, reconnecting, and disconnected states.
- [x] Avoid intrusive notifications for short reconnects.
- [x] Provide retry actions on detail-page loading failures.

**Done when:** Users can tell whether displayed workflow progress is current.

---

## Phase 7: Approval Experience

### [x] Step 7.1: Improve the approval queue

- [x] Show age, trigger type, requested action, and workflow context.
- [x] Add loading, error, and empty states.
- [x] Add a header notification panel with pending-approval previews and queue navigation.
- [x] Add priority, trigger, and text filters. Pending status is implicit in the queue endpoint.
- [x] Add workflow links.

**Done when:** Approvers can quickly identify which requests need attention.

### [x] Step 7.2: Add an approval detail page

- [x] Add `/approvals/:id`.
- [x] Show full workflow and business context.
- [x] Show priority, trigger, and proposed action.
- [x] Show creation time and workflow identity.
- [x] Provide approve and reject controls.

**Done when:** An approver has enough information to make a responsible decision.

### [~] Step 7.3: Make decisions safe and explicit

- [x] Require rationale for rejection.
- Consider requiring rationale for approval.
- [x] Add confirmation before submitting.
- [x] Prevent duplicate submissions.
- [x] Show success or failure feedback.
- [x] Refresh the local approval queue after the decision.
- [ ] Refresh the related backend workflow after integration.

**Done when:** Approval decisions are deliberate, traceable, and resistant to accidental double submission.

---

## Phase 8: Audit Log

### [x] Step 8.1: Add audit filters

Support:

- [x] text search across the visible audit data
- [x] user
- [x] tool
- [x] outcome
- [x] date range

- [x] Keep filters in the URL so views can be shared and refreshed.

**Done when:** Users can narrow the audit log without manually scanning all rows.

### [x] Step 8.2: Add audit entry details

- [x] Open an entry in an accessible modal.
- [x] Show masked input and output JSON.
- [x] Show the related workflow and user.
- [x] Format timestamps consistently.

**Done when:** An auditor can inspect an operation without leaving the audit workflow.

### [~] Step 8.3: Add pagination and export

- [x] Add client-side pagination for demo mode.
- [x] Add filtered CSV export for demo mode.
- [ ] Replace these with server-side pagination and export after endpoints exist.

**Done when:** The audit view remains useful with large data volumes.

---

## Phase 9: Accessibility and Responsive Design

### [~] Step 9.1: Keyboard and screen-reader support

- [x] Use semantic HTML across the application shell and primary forms.
- [x] Add labels to current form inputs.
- [x] Add accessible names to current icon buttons.
- [x] Support Escape and outside-click dismissal for header menus.
- [x] Add focus trapping and focus restoration for modals.
- [x] Announce workflow connection status changes with a live status.

**Done when:** Core tasks can be completed using only a keyboard and common screen readers.

### [~] Step 9.2: Responsive verification

Verified manually:

- [x] mobile navigation and content layout
- [x] wide desktop navigation and content layout
- [x] tablet
- [x] laptop

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

### [x] Step 10.1: Set up unit and component tests

Recommended tools:

- [x] Vitest
- [x] React Testing Library
- [x] `@testing-library/user-event`
- [ ] Add MSW when the real API contracts are finalized.

**Done when:** Tests run through a single `npm test` command.

### [~] Step 10.2: Test shared components and stores

Cover:

- [x] approval validation and confirmation
- [x] route protection
- [x] role permission rules
- [x] workflow card rendering
- [x] audit interaction
- [ ] Expand auth session and API formatting coverage during backend integration.

**Done when:** The frontend foundation has reliable automated coverage.

### [~] Step 10.3: Test critical user flows

Cover:

- [x] Manually verify login and MFA.
- [x] Manually verify workflow creation and live progress.
- [x] Automate approval rejection safeguards.
- [x] Manually verify approval confirmation and audit filtering/details.
- [ ] Automate integrated journeys after the backend test environment exists.

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

### [x] Step 11.1: Add global failure handling

- [x] Add an application error boundary.
- [x] Add a not-found page.
- [x] Add an offline state.
- [x] Add safe retry actions on detail pages.

### Step 11.2: Add frontend observability

- Capture runtime errors.
- Track API failures and page performance.
- Avoid logging tokens, PII, or sensitive business data.
- Add correlation/workflow IDs to useful diagnostics.

### Step 11.3: Optimize the build

- [x] Lazy-load major pages.
- [x] Review bundle output and confirm route-level chunks.
- Remove unused dependencies.
- [~] Verify production environment variables after deployment values are supplied.
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
