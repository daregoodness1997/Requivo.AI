using Requivo.Core.Enums;
using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface IApprovalService
{
    Task<ApprovalRequest> CreateAsync(ApprovalRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ApprovalRequest>> GetPendingAsync(CancellationToken ct = default);
    Task<ApprovalRequest> DecideAsync(Guid approvalId, ApprovalDecision decision, string decidedBy, string rationale, CancellationToken ct = default);
}
