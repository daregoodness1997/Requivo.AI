using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Supplier selection, purchase order creation and submission</summary>
public partial class ProcurementTool(
    ILogger<ProcurementTool> logger,
    IProcurementGateway procurementGateway) : ITool
{
    private static readonly PurchaseOrderRecord[] PurchaseOrders =
    [
        new("PO-2024-001", "Acme Office Supplies", 15_000, "USD", DateTime.UtcNow.AddDays(-5), "Open"),
        new("PO-2024-002", "TechVendor Inc", 4_500, "USD", DateTime.UtcNow.AddDays(-2), "Pending Approval"),
        new("PO-2024-003", "Global Logistics Co", 8_900, "USD", DateTime.UtcNow.AddDays(3), "Delivered"),
        new("PO-2024-004", "OfficeMart", 2_300, "USD", DateTime.UtcNow.AddDays(-1), "Open"),
    ];

    public string Name => "ProcurementTool";
    public string Description => "Purchase order listing, creation and supplier management";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var normalized = context.UserInput?.ToLowerInvariant() ?? "";
            if (IsPurchaseOrderListRequest(normalized))
            {
                var matched = GetMatchingPurchaseOrders(normalized);
                return new ToolResult
                {
                    Success = true,
                    Data = new
                    {
                        type = "purchase_order_list",
                        count = matched.Length,
                        items = matched.Select(po => new
                        {
                            po.Id,
                            po.Vendor,
                            po.Amount,
                            po.Currency,
                            po.OrderDate,
                            po.Status,
                        }).ToArray(),
                    },
                    Metadata = new ToolMetadata { Source = Name },
                };
            }

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var request = ParseRequest(input, context);
            var response = await procurementGateway.CreatePurchaseOrderAsync(request, context, ct);
            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Data = response,
                Metadata = new ToolMetadata
                {
                    Source = response.SourceSystem,
                    Latency = stopwatch.ElapsedMilliseconds,
                }
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private static bool IsPurchaseOrderListRequest(string normalized)
        => ListPoRegex().IsMatch(normalized);

    private static PurchaseOrderRecord[] GetMatchingPurchaseOrders(string normalized)
    {
        if (OpenRegex().IsMatch(normalized))
            return [.. PurchaseOrders.Where(po => po.Status is "Open" or "Pending Approval")];

        if (DeliveredRegex().IsMatch(normalized))
            return [.. PurchaseOrders.Where(po => po.Status == "Delivered")];

        return [.. PurchaseOrders];
    }

    private static CreatePurchaseOrderRequest ParseRequest(object? input, WorkflowContext context)
    {
        if (input is null)
        {
            throw new InvalidOperationException(
                "ProcurementTool requires structured input. Provide supplierId and at least one line item.");
        }

        var request = input switch
        {
            System.Text.Json.JsonElement jsonElement => System.Text.Json.JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(jsonElement.GetRawText()),
            string rawJson => System.Text.Json.JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(rawJson),
            _ => System.Text.Json.JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(System.Text.Json.JsonSerializer.Serialize(input))
        };

        if (request is null)
        {
            throw new InvalidOperationException("Procurement input is invalid JSON.");
        }

        request.IdempotencyKey ??= $"{context.WorkflowId}:{context.StepIndex}:create-po";
        request.RequestedBy ??= context.UserId;

        if (string.IsNullOrWhiteSpace(request.SupplierId))
        {
            throw new InvalidOperationException("Procurement input is missing supplierId.");
        }

        if (request.Lines.Count == 0)
        {
            throw new InvalidOperationException("Procurement input must include at least one line item.");
        }

        if (request.Lines.Any(line => string.IsNullOrWhiteSpace(line.Sku) || line.Quantity <= 0 || line.UnitPrice < 0))
        {
            throw new InvalidOperationException(
                "Each line item must include sku, quantity > 0 and unitPrice >= 0.");
        }

        return request;
    }

    [GeneratedRegex(@"\b(list|show|all|open|view|find|search)\b.*\b(purchase\s*order|po|pos|procurement|purchases)\b|\b(purchase\s*order|po|pos|procurement|purchases)\b.*\b(list|show|all|open|view|find|search)\b", RegexOptions.IgnoreCase)]
    private static partial Regex ListPoRegex();

    [GeneratedRegex(@"\bopen\b|\bpending\b|\bunapproved\b")]
    private static partial Regex OpenRegex();

    [GeneratedRegex(@"\bdelivered\b|\breceived\b|\bclosed\b")]
    private static partial Regex DeliveredRegex();

    private sealed record PurchaseOrderRecord(string Id, string Vendor, decimal Amount, string Currency, DateTime OrderDate, string Status);
}
