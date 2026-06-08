using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Requivo.Infrastructure.Integrations;

public interface IEmailService
{
    Task SendApprovalRequestAsync(string toEmail, string subject, string body, CancellationToken ct = default);
}

public class SendGridEmailService(IConfiguration config, ILogger<SendGridEmailService> logger) : IEmailService
{
    private readonly string _apiKey = config["SendGrid:ApiKey"] ?? throw new InvalidOperationException("SendGrid:ApiKey not configured");
    private readonly string _fromEmail = config["SendGrid:FromEmail"] ?? "noreply@requivo.ai";

    public async Task SendApprovalRequestAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        // TODO: integrate SendGrid SDK — SendGrid.SendEmailAsync(...)
        logger.LogInformation("Email queued → {To} | {Subject}", toEmail, subject);
        await Task.CompletedTask;
    }
}
