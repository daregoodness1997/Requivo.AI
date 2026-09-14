import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Workflow } from '@/types';
import ChatWindow from './ChatWindow';

const BASE_TIME = '2026-09-01T00:00:00.000Z';

function makeMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm-1',
    sessionId: 's-1',
    role: 'assistant',
    contentType: 'text',
    content: '',
    workflowId: null,
    plan: null,
    createdAt: BASE_TIME,
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<Workflow>): Workflow {
  return {
    id: 'wf-1',
    userInput: '',
    domain: null,
    state: 'Completed',
    steps: [],
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  };
}

describe('ChatWindow', () => {
  it('shows an empty state before a session is selected', () => {
    render(<ChatWindow messages={[]} workflows={[]} activeSessionId={null} />);

    expect(screen.getByText(/ready for your first request/i)).toBeInTheDocument();
  });

  it('renders user text and assistant text messages', () => {
    const messages: ChatMessage[] = [
      makeMessage({ id: 'm-1', role: 'user', content: 'List purchase orders' }),
      makeMessage({ id: 'm-2', role: 'assistant', content: 'Here are the open purchase orders.' }),
    ];

    render(<ChatWindow messages={messages} workflows={[]} activeSessionId="s-1" />);

    expect(screen.getByText('List purchase orders')).toBeInTheDocument();
    expect(screen.getByText('Here are the open purchase orders.')).toBeInTheDocument();
  });

  it('renders a purchase order table from a completed workflow step', () => {
    const workflow = makeWorkflow({
      id: 'wf-1',
      userInput: 'List purchase orders',
      domain: 'Procurement',
      steps: [
        {
          index: 0,
          toolName: 'ProcurementTool',
          description: 'List purchase orders',
          state: 'Completed',
          output: {
            type: 'purchase_order_list',
            count: 1,
            items: [
              {
                id: 'PO-101',
                vendor: 'Acme Corp',
                amount: 1250,
                currency: 'USD',
                orderDate: '2026-09-01',
                status: 'Open',
              },
            ],
          },
          startedAt: BASE_TIME,
          completedAt: BASE_TIME,
        },
      ],
    });

    const messages: ChatMessage[] = [
      makeMessage({
        id: 'm-3',
        role: 'assistant',
        contentType: 'result',
        content: 'Found 1 purchase order.',
        workflowId: 'wf-1',
      }),
    ];

    render(<ChatWindow messages={messages} workflows={[workflow]} activeSessionId="s-1" />);

    expect(screen.getByText('Workflow completed')).toBeInTheDocument();
    expect(screen.getByText('Found 1 purchase order.')).toBeInTheDocument();
    expect(screen.getAllByText('PO-101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('renders the purchase order form for a clarification prompt with formType purchase_order', () => {
    const messages: ChatMessage[] = [
      makeMessage({
        id: 'm-4',
        role: 'assistant',
        contentType: 'prompt',
        content: 'need more info',
        workflowId: 'wf-1',
        plan: {
          domain: 'Procurement',
          steps: [],
          needsClarification: true,
          clarificationQuestion: 'To create a purchase order, provide supplier ID, line items.',
          question: 'To create a purchase order, provide supplier ID, line items.',
          formType: 'purchase_order',
        } as unknown as ChatMessage['plan'],
      }),
    ];

    render(<ChatWindow messages={messages} workflows={[]} activeSessionId="s-1" />);

    expect(screen.getByText('Create Purchase Order')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit purchase order/i })).toBeInTheDocument();
  });

  it('renders option buttons and calls onRespond for a clarification prompt', async () => {
    const onRespond = vi.fn(async () => {});
    const messages: ChatMessage[] = [
      makeMessage({
        id: 'm-5',
        role: 'assistant',
        contentType: 'prompt',
        content: 'pick one',
        workflowId: 'wf-1',
        plan: {
          domain: 'Procurement',
          steps: [],
          needsClarification: true,
          clarificationQuestion: 'Which supplier?',
          question: 'Which supplier?',
          options: ['SUPPLIER-001', 'SUPPLIER-002'],
        } as unknown as ChatMessage['plan'],
      }),
    ];

    render(
      <ChatWindow messages={messages} workflows={[]} activeSessionId="s-1" onRespond={onRespond} />,
    );

    expect(screen.getByText('Which supplier?')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'SUPPLIER-001' }));
    expect(onRespond).toHaveBeenCalledWith('s-1', 'SUPPLIER-001');
  });

  it('renders an error message bubble', () => {
    const messages: ChatMessage[] = [
      makeMessage({
        id: 'm-6',
        role: 'assistant',
        contentType: 'error',
        content: 'The ERP system is unavailable right now.',
      }),
    ];

    render(<ChatWindow messages={messages} workflows={[]} activeSessionId="s-1" />);

    expect(screen.getByText('The ERP system is unavailable right now.')).toBeInTheDocument();
  });

  it('shows the review panel with a waiting-for-approval notice', () => {
    const workflow = makeWorkflow({
      id: 'wf-1',
      userInput: 'Create purchase order',
      domain: 'Procurement',
      state: 'WaitingApproval',
      steps: [
        {
          index: 0,
          toolName: 'ProcurementTool',
          description: 'Create purchase order',
          state: 'WaitingApproval',
          output: null,
          startedAt: BASE_TIME,
          completedAt: null,
        },
      ],
    });

    const messages: ChatMessage[] = [
      makeMessage({
        id: 'm-7',
        role: 'user',
        content: 'Create purchase order',
        workflowId: 'wf-1',
      }),
    ];

    render(<ChatWindow messages={messages} workflows={[workflow]} activeSessionId="s-1" />);

    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Waiting approval')).toBeInTheDocument();
    expect(screen.getByText(/paused until an approver/i)).toBeInTheDocument();
  });
});