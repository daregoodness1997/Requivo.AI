using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using System.Text.Json;

namespace Requivo.Infrastructure.Integrations;

public class ErpConnectionManager(
    RequivoDbContext db,
    ICredentialProtector protector,
    ILogger<ErpConnectionManager> logger) : IErpConnectionManager
{
    public async Task<List<ErpConnectionDto>> ListAsync(string userId, CancellationToken ct = default)
    {
        var connections = await db.ErpConnections
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);

        return connections.Select(c => new ErpConnectionDto(
            c.Id, c.ProviderId, c.ProviderName, c.IsConnected, c.BaseUrl, c.ConnectedAt
        )).ToList();
    }

    public async Task<ErpConnectionDto> ConnectAsync(string userId, ConnectErpRequest request, CancellationToken ct = default)
    {
        var existing = await db.ErpConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ProviderId == request.ProviderId, ct);

        var encryptedCredentials = EncryptCredentials(request.Credentials);

        if (existing is not null)
        {
            existing.IsConnected = true;
            existing.BaseUrl = request.BaseUrl ?? existing.BaseUrl;
            existing.Credentials = encryptedCredentials ?? existing.Credentials;
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
                BaseUrl = request.BaseUrl,
                Credentials = encryptedCredentials,
            };
            db.ErpConnections.Add(existing);
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("User {UserId} connected to {Provider}", userId, request.ProviderName);

        return new ErpConnectionDto(
            existing.Id, existing.ProviderId, existing.ProviderName, existing.IsConnected, existing.BaseUrl, existing.ConnectedAt
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
        var connection = await db.ErpConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ProviderId == providerId && c.IsConnected, ct);

        if (connection is null) return null;

        DecryptCredentialsInto(connection);
        return connection;
    }

    public async Task<List<ErpConnection>> GetActiveConnectionsAsync(string userId, CancellationToken ct = default)
    {
        var connections = await db.ErpConnections
            .Where(c => c.UserId == userId && c.IsConnected)
            .ToListAsync(ct);

        foreach (var c in connections)
            DecryptCredentialsInto(c);

        return connections;
    }

    private string? EncryptCredentials(Dictionary<string, string>? credentials)
    {
        if (credentials is null || credentials.Count == 0) return null;
        var json = JsonSerializer.Serialize(credentials);
        return protector.Encrypt(json);
    }

    private void DecryptCredentialsInto(ErpConnection connection)
    {
        if (string.IsNullOrEmpty(connection.Credentials)) return;
        try
        {
            var json = protector.Decrypt(connection.Credentials);
            connection.Credentials = json;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to decrypt credentials for connection {Id}", connection.Id);
            connection.Credentials = null;
        }
    }
}
