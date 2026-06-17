namespace Requivo.Core.Models;

public class ErpConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public string? ApiKey { get; set; }
    public string? BearerToken { get; set; }
    public string? BaseUrl { get; set; }
    public string? ExtraConfig { get; set; }
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public record ErpConnectionDto(
    Guid Id,
    string ProviderId,
    string ProviderName,
    bool IsConnected,
    DateTime ConnectedAt
);

public record ConnectErpRequest(
    string ProviderId,
    string ProviderName,
    string? ApiKey,
    string? BearerToken,
    string? BaseUrl,
    string? ExtraConfig
);
