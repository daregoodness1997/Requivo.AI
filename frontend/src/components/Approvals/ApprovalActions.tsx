import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { approvalApi } from '@/api/workflow';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/errors';
import type { ApprovalDecision, ApprovalRequest } from '@/types';

export default function ApprovalActions({
  approval,
  onDecided,
}: {
  approval: ApprovalRequest;
  onDecided: (decision: Exclude<ApprovalDecision, 'Pending'>) => void;
}) {
  const [rationale, setRationale] = useState('');
  const [decision, setDecision] = useState<Exclude<ApprovalDecision, 'Pending'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestDecision = (nextDecision: Exclude<ApprovalDecision, 'Pending'>) => {
    if (nextDecision === 'Rejected' && !rationale.trim()) {
      setError('Add a reason before rejecting this request.');
      return;
    }
    setError(null);
    setDecision(nextDecision);
  };

  const submitDecision = async () => {
    if (!decision) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await approvalApi.decide(approval.id, {
        decision,
        rationale: rationale.trim(),
      });
      setDecision(null);
      onDecided(decision);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'The approval decision could not be submitted.'));
      setDecision(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (approval.decision !== 'Pending') {
    return (
      <Alert tone={approval.decision === 'Approved' ? 'success' : 'danger'}>
        This request was {approval.decision.toLowerCase()}
        {approval.rationale ? `: ${approval.rationale}` : '.'}
      </Alert>
    );
  }

  return (
    <>
      {error && (
        <Alert className="mb-3" role="alert" tone="danger">
          {error}
        </Alert>
      )}
      <label className="sr-only" htmlFor={`rationale-${approval.id}`}>
        Decision rationale
      </label>
      <textarea
        id={`rationale-${approval.id}`}
        className="mb-3 min-h-24 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm placeholder:text-gray-400"
        placeholder="Add a rationale. Required when rejecting."
        value={rationale}
        onChange={(event) => {
          setRationale(event.target.value);
          if (error) setError(null);
        }}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          onClick={() => requestDecision('Rejected')}
          disabled={isSubmitting}
          variant="destructive"
        >
          Reject
        </Button>
        <Button
          onClick={() => requestDecision('Approved')}
          disabled={isSubmitting}
          variant="success"
        >
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          Approve
        </Button>
      </div>

      <Modal
        open={decision !== null}
        title={`${decision === 'Approved' ? 'Approve' : 'Reject'} this request?`}
        description="This decision is recorded in the audit trail and changes the related workflow."
        onClose={() => setDecision(null)}
      >
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{approval.proposedAction}</p>
            {rationale.trim() && (
              <p className="mt-2 text-xs leading-5 text-gray-500">Rationale: {rationale.trim()}</p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision === 'Approved' ? 'success' : 'destructive'}
              disabled={isSubmitting}
              onClick={() => void submitDecision()}
            >
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              Confirm {decision?.toLowerCase()}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
