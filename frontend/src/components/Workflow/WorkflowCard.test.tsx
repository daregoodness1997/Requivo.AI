import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Workflow } from '@/types';
import WorkflowCard from './WorkflowCard';

const workflow: Workflow = {
  id: 'wf-test',
  userInput: 'Create a supplier report',
  domain: 'Reporting',
  state: 'Completed',
  steps: [
    {
      index: 0,
      toolName: 'ReportingTool',
      description: 'Aggregate supplier data',
      state: 'Completed',
      output: { rows: 12 },
      startedAt: '2026-06-10T10:00:00.000Z',
      completedAt: '2026-06-10T10:00:01.000Z',
    },
  ],
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:01.000Z',
};

describe('WorkflowCard', () => {
  it('shows the workflow state, steps, and detail link', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WorkflowCard workflow={workflow} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Create a supplier report')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Aggregate supplier data')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view workflow details/i })).toHaveAttribute(
      'href',
      '/workflows/wf-test',
    );
  });
});
