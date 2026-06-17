using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface IErpConnectionManager
{
    Task<List<ErpConnectionDto>> ListAsync(string userId, CancellationToken ct = default);
    Task<ErpConnectionDto> ConnectAsync(string userId, ConnectErpRequest request, CancellationToken ct = default);
    Task DisconnectAsync(string userId, Guid connectionId, CancellationToken ct = default);
    Task<ErpConnection?> GetAsync(string userId, string providerId, CancellationToken ct = default);
    Task<List<ErpConnection>> GetActiveConnectionsAsync(string userId, CancellationToken ct = default);
}
