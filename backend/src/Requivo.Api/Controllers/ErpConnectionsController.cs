using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/integrations")]
[Authorize]
public class ErpConnectionsController(
    IErpConnectionManager connectionManager,
    IProviderCredentialRegistry registry) : ControllerBase
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

        var spec = registry.GetSpec(request.ProviderId);
        if (spec is null)
            return BadRequest(new { message = $"Unknown provider: {request.ProviderId}." });

        var errors = ValidateCredentials(request, spec);
        if (errors.Length > 0)
            return BadRequest(new { message = "Missing required fields.", errors });

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

    private static string[] ValidateCredentials(ConnectErpRequest request, ProviderCredentialSpec spec)
    {
        var errors = new List<string>();

        if (spec.RequiresBaseUrl && string.IsNullOrWhiteSpace(request.BaseUrl))
            errors.Add("BaseUrl is required for this provider.");

        if (request.Credentials is null || request.Credentials.Count == 0)
        {
            errors.Add($"Credentials are required for {spec.AuthMethod}. Provide: {string.Join(", ", spec.RequiredCredentialKeys)}.");
            return errors.ToArray();
        }

        foreach (var key in spec.RequiredCredentialKeys)
        {
            if (!request.Credentials.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                errors.Add($"{key} is required.");
        }

        return errors.ToArray();
    }

    private string GetUserId()
        => User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException("Missing subject claim.");
}
