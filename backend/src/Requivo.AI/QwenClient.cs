using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Requivo.AI;

public record QwenMessage(string Role, string Content);

public record QwenRequest(
    string Model,
    List<QwenMessage> Messages,
    float Temperature = 0.2f,
    int MaxTokens = 2048
);

public record QwenResponse(string Content, float? ConfidenceScore);

public interface IQwenClient
{
    Task<QwenResponse> CompleteAsync(IReadOnlyList<QwenMessage> messages, CancellationToken ct = default);
}

public class QwenClient(IHttpClientFactory httpFactory, IConfiguration config, ILogger<QwenClient> logger) : IQwenClient
{
    private readonly string _endpoint = config["Qwen:EndpointUrl"] ?? throw new InvalidOperationException("Qwen:EndpointUrl not configured");
    private readonly string _model    = config["Qwen:Model"] ?? "qwen-turbo";
    private readonly string _apiKey   = config["Qwen:ApiKey"] ?? string.Empty;

    public async Task<QwenResponse> CompleteAsync(IReadOnlyList<QwenMessage> messages, CancellationToken ct = default)
    {
        using var http = httpFactory.CreateClient();
        if (!string.IsNullOrEmpty(_apiKey))
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

        var payload = new QwenRequest(_model, [.. messages]);
        var response = await http.PostAsJsonAsync(_endpoint, payload, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var content = json.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;

        logger.LogDebug("Qwen response received ({Length} chars)", content.Length);
        return new QwenResponse(content, null);
    }
}
