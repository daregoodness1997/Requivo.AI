using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Requivo.Api.Security;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApprovalController(IApprovalService approvals) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.ApprovalRead)]
    public async Task<IActionResult> GetPending(CancellationToken ct)
        => Ok(await approvals.GetPendingAsync(ct));

    [HttpPost("{id:guid}/decide")]
    [Authorize(Policy = AuthorizationPolicies.ApprovalDecide)]
    public async Task<IActionResult> Decide(Guid id, [FromBody] DecideRequest req, CancellationToken ct)
    {
        var decidedBy = User.Identity?.Name ?? "anonymous";
        var updated = await approvals.DecideAsync(id, req.Decision, decidedBy, req.Rationale, ct);
        return Ok(updated);
    }
}

public record DecideRequest(ApprovalDecision Decision, string Rationale);
