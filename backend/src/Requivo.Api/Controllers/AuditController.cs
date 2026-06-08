using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Requivo.Infrastructure.Data;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditController(RequivoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? workflowId, CancellationToken ct)
    {
        var query = db.AuditEntries.AsQueryable();
        if (workflowId.HasValue) query = query.Where(e => e.WorkflowId == workflowId.Value);
        var entries = await query.OrderByDescending(e => e.Timestamp).Take(200).ToListAsync(ct);
        return Ok(entries);
    }
}
