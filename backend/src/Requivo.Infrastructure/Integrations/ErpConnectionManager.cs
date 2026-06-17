using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;

namespace Requivo.Infrastructure.Integrations;

public class ErpConnectionManager(
    RequivoDbContext db,
    ILogger<ErpConnectionManager> logger) : IErpConnectionManager
{
    public async Task<List<ErpConnectionDto>> ListAsync(string userId, CancellationToken ct = default)
    {
        var connections = await db.ErpConnections
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);

        return connections.Select(c => new ErpConnectionDto(
            c.Id, c.ProviderId, c.ProviderName, c.IsConnected, c.ConnectedAt
        )).ToList();
    }

    public async Task<ErpConnectionDto> ConnectAsync(string userId, ConnectErpRequest request, CancellationToken ct = default)
    {
        var existing = await db.ErpConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ProviderId == request.ProviderId, ct);

        if (existing is not null)
        {
            existing.IsConnected = true;
            existing.ApiKey = request.ApiKey ?? existing.ApiKey;
            existing.BearerToken = request.BearerToken ?? existing.BearerToken;
            existing.BaseUrl = request.BaseUrl ?? existing.BaseUrl;
            existing.ExtraConfig = request.ExtraConfig ?? existing.ExtraConfig;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new ErpConnection
            {
                UserId = userId,
                ProviderId = request.ProviderId,
                ProviderName = request.ProviderName,
                IsConnected = true,
                ApiKey = request.ApiKey,
                BearerToken = request.BearerToken,
                BaseUrl = request.BaseUrl,
                ExtraConfig = request.ExtraConfig,
            };
            db.ErpConnections.Add(existing);
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("User {UserId} connected to {Provider}", userId, request.ProviderName);

        return new ErpConnectionDto(
            existing.Id, existing.ProviderId, existing.ProviderName, existing.IsConnected, existing.ConnectedAt
        );
    }

    public async Task DisconnectAsync(string userId, Guid connectionId, CancellationToken ct = default)
    {
        var connection = await db.ErpConnections
            .FirstOrDefaultAsync(c => c.Id == connectionId && c.UserId == userId, ct);

        if (connection is null)
        {
            throw new KeyNotFoundException("ERP connection not found.");
        }

        connection.IsConnected = false;
        connection.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("User {UserId} disconnected from {Provider}", userId, connection.ProviderName);
    }

    public async Task<ErpConnection?> GetAsync(string userId, string providerId, CancellationToken ct = default)
    {
        return await db.ErpConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ProviderId == providerId && c.IsConnected, ct);
    }

    public async Task<List<ErpConnection>> GetActiveConnectionsAsync(string userId, CancellationToken ct = default)
    {
        return await db.ErpConnections
            .Where(c => c.UserId == userId && c.IsConnected)
            .ToListAsync(ct);
    }
}
