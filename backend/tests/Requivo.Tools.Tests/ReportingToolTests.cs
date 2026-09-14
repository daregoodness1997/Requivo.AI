using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class ReportingToolTests
{
    private static ReportingTool CreateTool() => new(NullLogger<ReportingTool>.Instance);

    private static Task<ToolResult> ExecuteAsync(string userInput) =>
        CreateTool().ExecuteAsync(
            null,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Name_IsReportingTool()
    {
        CreateTool().Name.Should().Be("ReportingTool");
    }

    [Fact]
    public async Task SpendQuery_ReturnsSpendSummary()
    {
        var result = await ExecuteAsync("Show spend analysis");

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("spend_summary");
        root.GetProperty("totalSpend").TryGetDecimal(out var total).Should().BeTrue();
        total.Should().BeGreaterThan(0);
        root.GetProperty("categories").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task KpiQuery_ReturnsKpiDashboard()
    {
        var result = await ExecuteAsync("Show KPI dashboard metrics");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("kpi_dashboard");
        var metrics = root.GetProperty("metrics").EnumerateArray();
        metrics.Should().NotBeEmpty();
        metrics.Should().OnlyContain(m => m.GetProperty("label").GetString()!.Length > 0);
    }

    [Fact]
    public async Task NonReportingQuery_ReturnsGenericOkResult()
    {
        var result = await ExecuteAsync("List all invoices");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("status").GetString().Should().Be("ok");
        root.GetProperty("domain").GetString().Should().Be("Reporting");
    }
}