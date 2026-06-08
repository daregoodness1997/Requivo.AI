using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;

namespace Requivo.Infrastructure.Integrations;

public interface ISlackService
{
    Task SendAlertAsync(string message, CancellationToken ct = default);
}

public class SlackService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<SlackService> logger) : ISlackService
{
    private readonly string _webhookUrl = config["Slack:WebhookUrl"] ?? throw new InvalidOperationException("Slack:WebhookUrl not configured");

    public async Task SendAlertAsync(string message, CancellationToken ct = default)
    {
        try
        {
            using var http = httpFactory.CreateClient();
            await http.PostAsJsonAsync(_webhookUrl, new { text = message }, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Slack notification failed — non-critical");
        }
    }
}
