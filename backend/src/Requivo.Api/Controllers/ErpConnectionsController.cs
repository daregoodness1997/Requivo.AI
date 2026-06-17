using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/integrations")]
[Authorize]
public class ErpConnectionsController(
    IErpConnectionManager connectionManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = GetUserId();
        var connections = await connectionManager.ListAsync(userId, ct);
        return Ok(connections);
    }

    [HttpPost]
    public async Task<IActionResult> Connect([FromBody] ConnectErpRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderId))
            return BadRequest(new { message = "ProviderId is required." });
        if (string.IsNullOrWhiteSpace(request.ProviderName))
            return BadRequest(new { message = "ProviderName is required." });

        var userId = GetUserId();
        var result = await connectionManager.ConnectAsync(userId, request, ct);
        return Ok(result);
    }

    [HttpDelete("{connectionId:guid}")]
    public async Task<IActionResult> Disconnect(Guid connectionId, CancellationToken ct)
    {
        var userId = GetUserId();
        await connectionManager.DisconnectAsync(userId, connectionId, ct);
        return NoContent();
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var userId = GetUserId();
        var connections = await connectionManager.GetActiveConnectionsAsync(userId, ct);

        var dto = connections.Select(c => new
        {
            c.ProviderId,
            c.ProviderName,
            c.BaseUrl,
            c.ConnectedAt,
        });

        return Ok(dto);
    }

    private string GetUserId()
        => User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException("Missing subject claim.");
}
