using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

public partial class ReportingTool(ILogger<ReportingTool> logger) : ITool
{
    public string Name => "ReportingTool";
    public string Description => "KPI dashboards, analytics queries, data export";

    public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var result = HandleReporting(context.UserInput, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = false, Error = ex.Message });
        }
    }

    private static object HandleReporting(string userInput, int stepIndex)
    {
        var normalized = userInput.ToLowerInvariant();

        if (IsSpendQuery(normalized))
        {
            return new
            {
                type = "spend_summary",
                totalSpend = 187_500m,
                currency = "USD",
                period = "last-30-days",
                categories = new[]
                {
                    new { category = "Office Supplies", amount = 42_300m, percentage = 22.6 },
                    new { category = "Software Licenses", amount = 38_700m, percentage = 20.6 },
                    new { category = "Contractor Services", amount = 55_000m, percentage = 29.3 },
                    new { category = "Travel & Expense", amount = 28_500m, percentage = 15.2 },
                    new { category = "Hardware", amount = 23_000m, percentage = 12.3 },
                },
            };
        }

        if (IsKpiQuery(normalized))
        {
            return new
            {
                type = "kpi_dashboard",
                metrics = new[]
                {
                    new { label = "Revenue (MTD)", value = "$342,000", trend = "up", change = "+8.2%" },
                    new { label = "Operating Expenses", value = "$187,500", trend = "up", change = "+3.1%" },
                    new { label = "Gross Margin", value = "64.3%", trend = "down", change = "-1.2%" },
                    new { label = "Customer Acq. Cost", value = "$1,240", trend = "down", change = "-4.5%" },
                    new { label = "Net Promoter Score", value = "72", trend = "up", change = "+5" },
                    new { label = "Inventory Turnover", value = "4.8x", trend = "up", change = "+0.3x" },
                },
            };
        }

        return new { status = "ok", domain = "Reporting", step = stepIndex };
    }

    private static bool IsSpendQuery(string normalized)
        => SpendPattern().IsMatch(normalized);

    private static bool IsKpiQuery(string normalized)
        => KpiPattern().IsMatch(normalized);

    [GeneratedRegex(@"\b(spend|spending|expense|cost|budget)\b")]
    private static partial Regex SpendPattern();

    [GeneratedRegex(@"\b(kpi|dashboard|metric|performance|summary|report)\b")]
    private static partial Regex KpiPattern();
}
