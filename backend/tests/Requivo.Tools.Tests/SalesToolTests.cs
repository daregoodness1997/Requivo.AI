using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class SalesToolTests
{
    private static SalesTool CreateTool() => new(NullLogger<SalesTool>.Instance);

    private static Task<ToolResult> ExecuteAsync(string userInput) =>
        CreateTool().ExecuteAsync(
            null,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Name_IsSalesTool()
    {
        CreateTool().Name.Should().Be("SalesTool");
    }

    [Fact]
    public async Task SalesQuery_ReturnsSalesOrderList()
    {
        var result = await ExecuteAsync("List all sales orders");

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("sales_order_list");
        root.GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task PendingQuery_ReturnsOnlyPendingAndDraftOrders()
    {
        var result = await ExecuteAsync("Show pending sales orders");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i =>
            i.GetProperty("Status").GetString() == "Pending" ||
            i.GetProperty("Status").GetString() == "Draft");
    }

    [Fact]
    public async Task ShippedQuery_ReturnsOnlyShippedOrders()
    {
        var result = await ExecuteAsync("Show shipped sales orders");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "Shipped");
    }

    [Fact]
    public async Task DeliveredQuery_ReturnsOnlyDeliveredOrders()
    {
        var result = await ExecuteAsync("Show delivered sales orders");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "Delivered");
    }

    [Fact]
    public async Task SpecificOrderId_ReturnsThatOrder()
    {
        var result = await ExecuteAsync("Order SO-1001 status");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().ContainSingle();
        items.First().GetProperty("Id").GetString().Should().Be("SO-1001");
    }

    [Fact]
    public async Task NonSalesQuery_ReturnsGenericOkResult()
    {
        var result = await ExecuteAsync("Check stock inventory");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("status").GetString().Should().Be("ok");
        root.GetProperty("domain").GetString().Should().Be("Sales");
    }
}