using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using Requivo.Infrastructure.Integrations;

namespace Requivo.Orchestration;

public class HitlService(
    RequivoDbContext db,
    IEmailService email,
    ISlackService slack,
    IServiceScopeFactory scopeFactory,
    ILogger<HitlService> logger) : IApprovalService
{
    public async Task<ApprovalRequest> CreateAsync(ApprovalRequest request, CancellationToken ct = default)
    {
        db.ApprovalRequests.Add(request);
        await db.SaveChangesAsync(ct);

        var msg = $"[Requivo AI] Approval needed — {request.TriggerReason}\n{request.ProposedAction}";
        await slack.SendAlertAsync(msg, ct);
        await email.SendApprovalRequestAsync("approvals@requivo.ai", $"Approval Required: {request.TriggerReason}", msg, ct);

        logger.LogInformation("HITL approval created {Id} for workflow {WorkflowId}", request.Id, request.WorkflowId);
        return request;
    }

    public async Task<IReadOnlyList<ApprovalRequest>> GetPendingAsync(CancellationToken ct = default)
        => await db.ApprovalRequests
                   .Where(a => a.Decision == ApprovalDecision.Pending)
                   .OrderBy(a => a.CreatedAt)
                   .ToListAsync(ct);

    public async Task<ApprovalRequest> DecideAsync(Guid approvalId, ApprovalDecision decision, string decidedBy, string rationale, CancellationToken ct = default)
    {
        var approval = await db.ApprovalRequests.FindAsync([approvalId], ct)
                       ?? throw new KeyNotFoundException($"Approval {approvalId} not found");

        var workflow = await db.Workflows.FindAsync([approval.WorkflowId], ct);

        approval.Decision = decision;
        approval.DecidedBy = decidedBy;
        approval.Rationale = rationale;
        approval.DecidedAt = DateTime.UtcNow;

        if (workflow is not null)
        {
            var waitingStep = workflow.Steps
                .OrderByDescending(step => step.Index)
                .FirstOrDefault(step => step.State == WorkflowState.WaitingApproval);

            if (decision == ApprovalDecision.Approved)
            {
                if (waitingStep is not null)
                {
                    waitingStep.State = WorkflowState.WaitingApproval;
                    waitingStep.CompletedAt = null;
                    waitingStep.Output = new
                    {
                        status = "approved",
                        decidedBy,
                        rationale,
                        input = ExtractPendingInput(waitingStep.Output),
                    };
                }

                workflow.State = WorkflowState.InProgress;
                workflow.FailureReason = null;
            }
            else
            {
                if (waitingStep is not null)
                {
                    waitingStep.State = WorkflowState.Failed;
                    waitingStep.CompletedAt = DateTime.UtcNow;
                    waitingStep.Output = new
                    {
                        status = "rejected",
                        decidedBy,
                        rationale,
                    };
                }

                workflow.State = WorkflowState.Failed;
                workflow.FailureReason = string.IsNullOrWhiteSpace(rationale)
                    ? "Approval request was rejected."
                    : rationale;
            }

            workflow.UpdatedAt = DateTime.UtcNow;

            db.AuditEntries.Add(new AuditEntry
            {
                WorkflowId = workflow.Id,
                UserId = decidedBy,
                ToolName = "ApprovalService",
                Action = $"Approval decision: {approval.TriggerReason}",
                Outcome = decision == ApprovalDecision.Approved ? "Success" : "Failure",
                OutputData = new
                {
                    approvalId,
                    decision = decision.ToString(),
                    rationale,
                },
            });
        }

        await db.SaveChangesAsync(ct);

        if (decision == ApprovalDecision.Approved && workflow is not null)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    var engine = scope.ServiceProvider.GetRequiredService<WorkflowEngine>();
                    await engine.ResumeApprovedStepAsync(workflow.Id, decidedBy, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to resume approved workflow {WorkflowId}", workflow.Id);
                }
            });
        }

        logger.LogInformation("Approval {Id} → {Decision} by {User}", approvalId, decision, decidedBy);
        return approval;
    }

    private static object? ExtractPendingInput(object? output)
    {
        if (output is not System.Text.Json.JsonElement outputElement)
        {
            return null;
        }

        if (!outputElement.TryGetProperty("input", out var inputElement))
        {
            return null;
        }

        return inputElement;
    }
}
