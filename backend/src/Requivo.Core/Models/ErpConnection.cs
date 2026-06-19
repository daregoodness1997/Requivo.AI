namespace Requivo.Core.Models;

public class ErpConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public string? BaseUrl { get; set; }
    public string? Credentials { get; set; }
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public record ErpConnectionDto(
    Guid Id,
    string ProviderId,
    string ProviderName,
    bool IsConnected,
    string? BaseUrl,
    DateTime ConnectedAt
);

public record ConnectErpRequest(
    string ProviderId,
    string ProviderName,
    string? BaseUrl,
    Dictionary<string, string>? Credentials
);
