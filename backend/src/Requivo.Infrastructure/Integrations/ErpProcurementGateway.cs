using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Infrastructure.Integrations;

public class ErpProcurementGateway(
    IHttpClientFactory httpClientFactory,
    IConfiguration config,
    ILogger<ErpProcurementGateway> logger) : IProcurementGateway
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<CreatePurchaseOrderResponse> CreatePurchaseOrderAsync(
        CreatePurchaseOrderRequest request,
        WorkflowContext context,
        CancellationToken ct = default)
    {
        var baseUrl = config["Erp:Procurement:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException("Erp:Procurement:BaseUrl is not configured.");
        }

        var createPath = config["Erp:Procurement:CreatePurchaseOrderPath"];
        if (string.IsNullOrWhiteSpace(createPath))
        {
            createPath = "/purchase-orders";
        }

        var authMode = (config["Erp:Procurement:AuthMode"] ?? "None").Trim();
        var sourceSystem = config["Erp:Procurement:SourceSystem"] ?? "ExternalERP";

        using var http = httpClientFactory.CreateClient();
        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, BuildUri(baseUrl, createPath))
        {
            Content = new StringContent(JsonSerializer.Serialize(request, JsonOptions), Encoding.UTF8, "application/json")
        };

        ApplyAuth(requestMessage, authMode);

        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            requestMessage.Headers.TryAddWithoutValidation("Idempotency-Key", request.IdempotencyKey);
        }

        requestMessage.Headers.TryAddWithoutValidation("X-Requivo-Workflow-Id", context.WorkflowId);
        requestMessage.Headers.TryAddWithoutValidation("X-Requivo-User-Id", context.UserId);

        using var response = await http.SendAsync(requestMessage, ct);
        var rawBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = rawBody.Length > 1000 ? rawBody[..1000] : rawBody;
            throw new InvalidOperationException(
                $"ERP procurement call failed with {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");
        }

        string externalOrderId = string.Empty;
        string status = "accepted";
        string? externalDocumentUrl = null;

        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(rawBody);
                externalOrderId = FindFirstString(json, "purchaseOrderId", "poId", "poNumber", "id") ?? string.Empty;
                status = FindFirstString(json, "status", "state") ?? status;
                externalDocumentUrl = FindFirstString(json, "documentUrl", "url", "link");
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "ERP procurement response was not valid JSON for workflow {WorkflowId}", context.WorkflowId);
            }
        }

        if (string.IsNullOrWhiteSpace(externalOrderId))
        {
            externalOrderId = response.Headers.Location?.ToString() ?? $"http-{(int)response.StatusCode}";
        }

        return new CreatePurchaseOrderResponse
        {
            ExternalOrderId = externalOrderId,
            Status = status,
            SourceSystem = sourceSystem,
            ExternalDocumentUrl = externalDocumentUrl,
            RawResponse = string.IsNullOrWhiteSpace(rawBody) ? null : JsonSerializer.Deserialize<object>(rawBody),
        };
    }

    private static Uri BuildUri(string baseUrl, string path)
        => new(new Uri(baseUrl.TrimEnd('/') + "/"), path.TrimStart('/'));

    private static string? FindFirstString(JsonElement json, params string[] names)
    {
        foreach (var name in names)
        {
            if (json.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
            {
                return value.GetString();
            }
        }

        return null;
    }

    private void ApplyAuth(HttpRequestMessage request, string authMode)
    {
        if (authMode.Equals("ApiKey", StringComparison.OrdinalIgnoreCase))
        {
            var header = config["Erp:Procurement:ApiKeyHeader"] ?? "X-API-Key";
            var apiKey = config["Erp:Procurement:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Erp:Procurement:ApiKey is not configured.");
            }

            request.Headers.TryAddWithoutValidation(header, apiKey);
            return;
        }

        if (authMode.Equals("Bearer", StringComparison.OrdinalIgnoreCase))
        {
            var token = config["Erp:Procurement:BearerToken"];
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Erp:Procurement:BearerToken is not configured.");
            }

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }
}