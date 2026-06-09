using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
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

        approval.Decision = decision;
        approval.DecidedBy = decidedBy;
        approval.Rationale = rationale;
        approval.DecidedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Approval {Id} → {Decision} by {User}", approvalId, decision, decidedBy);
        return approval;
    }
}
