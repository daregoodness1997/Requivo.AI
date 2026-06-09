using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Requivo.Core.Interfaces;
using Requivo.Api.Security;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkflowController(IWorkflowEngine engine) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.WorkflowStart)]
    public async Task<IActionResult> Start([FromBody] StartWorkflowRequest req, CancellationToken ct)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var workflow = await engine.StartAsync(req.UserInput, userId, ct);
        return Accepted(workflow);
    }

    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.WorkflowRead)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var workflows = await engine.ListAsync(userId, ct);
        return Ok(workflows);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.WorkflowRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var workflow = await engine.GetAsync(id, ct);
        return Ok(workflow);
    }
}

public record StartWorkflowRequest(string UserInput);
