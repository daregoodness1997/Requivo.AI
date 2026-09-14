using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class FinanceToolTests
{
    private static FinanceTool CreateTool() => new(NullLogger<FinanceTool>.Instance);

    private static Task<ToolResult> ExecuteAsync(string userInput) =>
        CreateTool().ExecuteAsync(
            null,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Name_IsFinanceTool()
    {
        CreateTool().Name.Should().Be("FinanceTool");
    }

    [Fact]
    public async Task InvoiceListRequest_ReturnsInvoiceList()
    {
        var result = await ExecuteAsync("List all invoices");

        result.Success.Should().BeTrue();

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("invoice_list");
        root.GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task OverdueQuery_ReturnsOnlyOverdueInvoices()
    {
        var result = await ExecuteAsync("Show overdue invoices");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "Overdue");
    }

    [Fact]
    public async Task PaidQuery_ReturnsOnlyPaidInvoices()
    {
        var result = await ExecuteAsync("Show paid invoices");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "Paid");
    }

    [Fact]
    public async Task DueQuery_ReturnsOnlyDueAndOverdueInvoices()
    {
        var result = await ExecuteAsync("Show due and open invoices");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i =>
            i.GetProperty("Status").GetString() == "Due" ||
            i.GetProperty("Status").GetString() == "Overdue");
    }

    [Fact]
    public async Task SpecificInvoiceId_ReturnsThatInvoice()
    {
        var result = await ExecuteAsync("Show invoice INV-2041 details");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().ContainSingle();
        items.First().GetProperty("Id").GetString().Should().Be("INV-2041");
    }

    [Fact]
    public async Task PayAction_ReturnsPaymentResult()
    {
        var result = await ExecuteAsync("Pay invoice INV-2041");

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("payment_result");
        root.GetProperty("invoiceId").GetString().Should().Be("INV-2041");
        root.GetProperty("status").GetString().Should().Be("paid");
    }

    [Fact]
    public async Task NonFinanceQuery_ReturnsGenericOkResult()
    {
        var result = await ExecuteAsync("List all employees");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("status").GetString().Should().Be("ok");
        root.GetProperty("domain").GetString().Should().Be("Finance");
    }
}