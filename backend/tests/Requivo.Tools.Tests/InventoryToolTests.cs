using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class InventoryToolTests
{
    private static InventoryTool CreateTool() => new(NullLogger<InventoryTool>.Instance);

    private static Task<ToolResult> ExecuteAsync(string userInput) =>
        CreateTool().ExecuteAsync(
            null,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Name_IsInventoryTool()
    {
        CreateTool().Name.Should().Be("InventoryTool");
    }

    [Fact]
    public async Task StockQuery_ReturnsStockListWithCountAndItems()
    {
        var result = await ExecuteAsync("List all stock levels");

        result.Success.Should().BeTrue();
        result.Metadata!.Source.Should().Be("InventoryTool");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("stock_list");
        root.GetProperty("count").GetInt32().Should().BeGreaterThan(0);
        root.GetProperty("items").GetArrayLength().Should().Be(root.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task LowStockQuery_ReturnsOnlyLowStockItems()
    {
        var result = await ExecuteAsync("Show low stock items");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        var items = root.GetProperty("items").EnumerateArray();

        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("lowStock").GetBoolean());
    }

    [Fact]
    public async Task SkuQuery_ReturnsMatchingItem()
    {
        var result = await ExecuteAsync("Stock level for CHAIR-001");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        var items = root.GetProperty("items");

        items.GetArrayLength().Should().BeGreaterThan(0);
        items.EnumerateArray().Should().OnlyContain(i =>
            i.GetProperty("Sku").GetString()!.Contains("CHAIR-001"));
    }

    [Fact]
    public async Task StockItem_IncludesLowStockFlag()
    {
        var result = await ExecuteAsync("Check stock inventory");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var first = doc.RootElement.GetProperty("items").EnumerateArray().First();

        first.GetProperty("Sku").GetString().Should().NotBeNullOrEmpty();
        first.GetProperty("Name").GetString().Should().NotBeNullOrEmpty();
        first.GetProperty("Quantity").TryGetInt32(out _).Should().BeTrue();
        first.GetProperty("ReorderThreshold").TryGetInt32(out _).Should().BeTrue();
        first.GetProperty("lowStock").GetBoolean().Should().Be(
            first.GetProperty("Quantity").GetInt32() <= first.GetProperty("ReorderThreshold").GetInt32());
    }

    [Fact]
    public async Task NonInventoryQuery_ReturnsGenericOkResult()
    {
        var result = await ExecuteAsync("Please draft a budget report");

        result.Success.Should().BeTrue();

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("status").GetString().Should().Be("ok");
        root.GetProperty("domain").GetString().Should().Be("Inventory");
    }
}