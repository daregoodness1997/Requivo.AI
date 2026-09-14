using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

public partial class SalesTool(ILogger<SalesTool> logger) : ITool
{
    private static readonly SalesOrder[] Orders =
    [
        new("SO-1001", "TechCorp Inc", 15200, "USD", DateTime.UtcNow.AddDays(-1), "Pending"),
        new("SO-1002", "GreenLeaf Ltd", 8300, "USD", DateTime.UtcNow.AddDays(-3), "Shipped"),
        new("SO-1003", "BlueOcean Partners", 22100, "USD", DateTime.UtcNow.AddDays(-7), "Delivered"),
        new("SO-1004", "RedSun Systems", 4750, "USD", DateTime.UtcNow.AddDays(2), "Pending"),
        new("SO-1005", "GoldStar Enterprises", 18900, "USD", DateTime.UtcNow.AddDays(-14), "Delivered"),
        new("SO-1006", "SilverLine Corp", 3200, "USD", DateTime.UtcNow.AddDays(-5), "Shipped"),
        new("SO-1007", "PurpleDot Inc", 11000, "USD", DateTime.UtcNow.AddDays(5), "Draft"),
    ];

    public string Name => "SalesTool";
    public string Description => "Quote generation, order creation, pricing updates";

    public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var result = HandleSales(context.UserInput, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = false, Error = ex.Message });
        }
    }

    private static object HandleSales(string userInput, int stepIndex)
    {
        var normalized = userInput.ToLowerInvariant();

        if (IsSalesQuery(normalized))
        {
            var matched = GetMatchingOrders(normalized);
            return new
            {
                type = "sales_order_list",
                count = matched.Length,
                items = matched.Select(o => new
                {
                    o.Id,
                    o.Customer,
                    o.Amount,
                    o.Currency,
                    o.OrderDate,
                    o.Status,
                }).ToArray(),
            };
        }

        return new { status = "ok", domain = "Sales", step = stepIndex };
    }

    private static bool IsSalesQuery(string normalized)
        => SalesQueryRegex().IsMatch(normalized);

    private static SalesOrder[] GetMatchingOrders(string normalized)
    {
        var orderId = ExtractOrderId(normalized);
        if (orderId is not null)
        {
            var found = Orders.FirstOrDefault(o =>
                o.Id.Equals(orderId, StringComparison.OrdinalIgnoreCase));
            return found is not null ? [found] : [];
        }

        if (PendingRegex().IsMatch(normalized))
            return [.. Orders.Where(o => o.Status is "Pending" or "Draft")];

        if (ShippedRegex().IsMatch(normalized))
            return [.. Orders.Where(o => o.Status == "Shipped")];

        if (DeliveredRegex().IsMatch(normalized))
            return [.. Orders.Where(o => o.Status == "Delivered")];

        return [.. Orders];
    }

    private static string? ExtractOrderId(string normalized)
    {
        var match = OrderIdRegex().Match(normalized);
        return match.Success ? match.Groups[1].Value.ToUpperInvariant() : null;
    }

    [GeneratedRegex(@"\b(sales|order|quote|customer)\b")]
    private static partial Regex SalesQueryRegex();

    [GeneratedRegex(@"\b(so-\d{3,8})\b")]
    private static partial Regex OrderIdRegex();

    [GeneratedRegex(@"\b(pending|draft|open|new)\b")]
    private static partial Regex PendingRegex();

    [GeneratedRegex(@"\b(shipped|fulfilled|dispatched)\b")]
    private static partial Regex ShippedRegex();

    [GeneratedRegex(@"\b(delivered|completed|closed)\b")]
    private static partial Regex DeliveredRegex();

    private sealed record SalesOrder(string Id, string Customer, decimal Amount, string Currency, DateTime OrderDate, string Status);
}
