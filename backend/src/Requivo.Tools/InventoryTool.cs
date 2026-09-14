using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

public partial class InventoryTool(ILogger<InventoryTool> logger) : ITool
{
    private static readonly StockItem[] Stock =
    [
        new("CHAIR-001", "Ergonomic Office Chair", 12, 20, "Aisle-B3"),
        new("DESK-002", "Standing Desk 60in", 5, 8, "Aisle-A1"),
        new("MON-003", "27in 4K Monitor", 3, 10, "Aisle-C2"),
        new("LAP-004", "Developer Laptop 16GB", 2, 5, "Aisle-C1"),
        new("KEY-005", "Wireless Keyboard", 45, 30, "Aisle-D1"),
        new("MOU-006", "Ergonomic Mouse", 38, 25, "Aisle-D1"),
        new("CAB-007", "USB-C Cable 2m", 120, 100, "Aisle-D2"),
        new("CHAIR-008", "Visitor Chair", 4, 6, "Aisle-B3"),
    ];

    public string Name => "InventoryTool";
    public string Description => "Check stock levels, update inventory, forecast demand, manage thresholds";

    public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var result = HandleInventory(context.UserInput, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = false, Error = ex.Message });
        }
    }

    private static object HandleInventory(string userInput, int stepIndex)
    {
        var normalized = userInput.ToLowerInvariant();

        if (IsStockQuery(normalized))
        {
            var matched = GetMatchingStock(normalized);
            return new
            {
                type = "stock_list",
                count = matched.Length,
                items = matched.Select(s => new
                {
                    s.Sku,
                    s.Name,
                    s.Quantity,
                    s.ReorderThreshold,
                    s.Location,
                    lowStock = s.Quantity <= s.ReorderThreshold,
                }).ToArray(),
            };
        }

        return new { status = "ok", domain = "Inventory", step = stepIndex };
    }

    private static bool IsStockQuery(string normalized)
        => StockQueryRegex().IsMatch(normalized);

    private static StockItem[] GetMatchingStock(string normalized)
    {
        if (LowStockRegex().IsMatch(normalized))
            return [.. Stock.Where(s => s.Quantity <= s.ReorderThreshold)];

        if (SkuQueryRegex().IsMatch(normalized))
        {
            var match = SkuQueryRegex().Match(normalized);
            var sku = match.Groups[1].Value.ToUpperInvariant();
            return [.. Stock.Where(s => s.Sku.Contains(sku))];
        }

        return [.. Stock];
    }

    [GeneratedRegex(@"\b(stock|inventory|warehouse|sku)\b")]
    private static partial Regex StockQueryRegex();

    [GeneratedRegex(@"\b(low|reorder|restock|below|short)\b")]
    private static partial Regex LowStockRegex();

    [GeneratedRegex(@"\b([a-z]{3,8}-\d{3,8})\b")]
    private static partial Regex SkuQueryRegex();

    private sealed record StockItem(string Sku, string Name, int Quantity, int ReorderThreshold, string Location);
}
