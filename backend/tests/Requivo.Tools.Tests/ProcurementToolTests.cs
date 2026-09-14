using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class ProcurementToolTests
{
    private static WorkflowContext CreateContext(string userInput) =>
        new() { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput, StepIndex = 0 };

    [Fact]
    public async Task Name_IsProcurementTool()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        tool.Name.Should().Be("ProcurementTool");
    }

    [Fact]
    public async Task ListRequest_ReturnsPurchaseOrderList()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var result = await tool.ExecuteAsync(null, CreateContext("List all purchase order"), CancellationToken.None);

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("purchase_order_list");
        root.GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task OpenListRequest_FiltersToOpenAndPendingOrders()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var result = await tool.ExecuteAsync(null, CreateContext("Show open purchase order"), CancellationToken.None);

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i =>
            i.GetProperty("Status").GetString() == "Open" ||
            i.GetProperty("Status").GetString() == "Pending Approval");
    }

    [Fact]
    public async Task DeliveredListRequest_FiltersToDeliveredOrders()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var result = await tool.ExecuteAsync(null, CreateContext("Show delivered purchase order"), CancellationToken.None);

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "Delivered");
    }

    [Fact]
    public async Task CreateRequest_DelegatesToGatewayAndReturnsItsResponse()
    {
        var gateway = new Mock<IProcurementGateway>();
        gateway.Setup(g => g.CreatePurchaseOrderAsync(It.IsAny<CreatePurchaseOrderRequest>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreatePurchaseOrderResponse
            {
                ExternalOrderId = "PO-999",
                Status = "created",
                SourceSystem = "test-erp",
            });

        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, gateway.Object);
        var input = new CreatePurchaseOrderRequest
        {
            SupplierId = "supplier-123",
            Lines =
            [
                new PurchaseOrderLine { Sku = "CHAIR-001", Quantity = 5, UnitPrice = 70.00m },
            ],
        };

        var result = await tool.ExecuteAsync(input, CreateContext("Create purchase order"), CancellationToken.None);

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        doc.RootElement.GetProperty("ExternalOrderId").GetString().Should().Be("PO-999");
        result.Metadata!.Source.Should().Be("test-erp");
        gateway.Verify(
            g => g.CreatePurchaseOrderAsync(It.IsAny<CreatePurchaseOrderRequest>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateRequest_SetsIdempotencyKeyAndRequesterWhenMissing()
    {
        var gateway = new Mock<IProcurementGateway>();
        gateway.Setup(g => g.CreatePurchaseOrderAsync(It.IsAny<CreatePurchaseOrderRequest>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreatePurchaseOrderResponse { ExternalOrderId = "PO-1", Status = "created", SourceSystem = "test" });

        CreatePurchaseOrderRequest? received = null;
        gateway.Setup(g => g.CreatePurchaseOrderAsync(It.IsAny<CreatePurchaseOrderRequest>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .Callback<CreatePurchaseOrderRequest, WorkflowContext, CancellationToken>((req, _, _) => received = req)
            .ReturnsAsync(new CreatePurchaseOrderResponse { ExternalOrderId = "PO-1", Status = "created", SourceSystem = "test" });

        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, gateway.Object);
        var input = new CreatePurchaseOrderRequest
        {
            SupplierId = "supplier-123",
            Lines = [new PurchaseOrderLine { Sku = "MON-003", Quantity = 2, UnitPrice = 400m }],
        };

        await tool.ExecuteAsync(input, CreateContext("Create purchase order"), CancellationToken.None);

        received.Should().NotBeNull();
        received!.IdempotencyKey.Should().Be("wf-1:0:create-po");
        received.RequestedBy.Should().Be("user-1");
    }

    [Fact]
    public async Task CreateRequest_MissingSupplierId_FailsWithMessage()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var input = new CreatePurchaseOrderRequest
        {
            Lines = [new PurchaseOrderLine { Sku = "MON-003", Quantity = 2, UnitPrice = 400m }],
        };

        var result = await tool.ExecuteAsync(input, CreateContext("Create purchase order"), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("supplierId");
    }

    [Fact]
    public async Task CreateRequest_EmptyLines_FailsWithMessage()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var input = new CreatePurchaseOrderRequest { SupplierId = "supplier-123" };

        var result = await tool.ExecuteAsync(input, CreateContext("Create purchase order"), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("line item");
    }

    [Fact]
    public async Task CreateRequest_NullInput_FailsWithMessage()
    {
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var result = await tool.ExecuteAsync(null, CreateContext("Create purchase order"), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("structured input");
    }

    [Fact]
    public async Task GatewayThrows_ReturnsFailureResult()
    {
        var gateway = new Mock<IProcurementGateway>();
        gateway.Setup(g => g.CreatePurchaseOrderAsync(It.IsAny<CreatePurchaseOrderRequest>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("ERP unreachable"));

        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, gateway.Object);
        var input = new CreatePurchaseOrderRequest
        {
            SupplierId = "supplier-123",
            Lines = [new PurchaseOrderLine { Sku = "MON-003", Quantity = 1, UnitPrice = 400m }],
        };

        var result = await tool.ExecuteAsync(input, CreateContext("Create purchase order"), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("ERP unreachable");
    }
}