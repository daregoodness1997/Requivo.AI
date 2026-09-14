using FluentAssertions;
using Requivo.Core.Enums;
using Requivo.Core.Models;
using Xunit;

namespace Requivo.Core.Tests;

public class CoreModelTests
{
    [Fact]
    public void WorkflowContext_UserInput_DefaultsToEmptyString()
    {
        var ctx = new WorkflowContext();
        ctx.UserInput.Should().BeEmpty();
        ctx.WorkflowId.Should().BeEmpty();
        ctx.UserId.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowContext_UserInput_CanBePopulated()
    {
        var ctx = new WorkflowContext { UserInput = "Create purchase order" };
        ctx.UserInput.Should().Be("Create purchase order");
    }

    [Fact]
    public void CreatePurchaseOrderRequest_DefaultsToUsd()
    {
        var request = new CreatePurchaseOrderRequest();
        request.Currency.Should().Be("USD");
        request.Lines.Should().BeEmpty();
    }

    [Fact]
    public void CreatePurchaseOrderResponse_DefaultsAreEmpty()
    {
        var response = new CreatePurchaseOrderResponse();
        response.ExternalOrderId.Should().BeEmpty();
        response.Status.Should().BeEmpty();
        response.SourceSystem.Should().BeEmpty();
    }

    [Fact]
    public void ApprovalRequest_DefaultsToPending()
    {
        var approval = new ApprovalRequest();
        approval.Decision.Should().Be(ApprovalDecision.Pending);
        approval.DecidedBy.Should().BeNull();
    }

    [Fact]
    public void Workflow_NewInstance_HasEmptyStepsAndUtcTimestamps()
    {
        var workflow = new Workflow();
        workflow.Steps.Should().BeEmpty();
        workflow.CreatedAt.Kind.Should().Be(DateTimeKind.Utc);
        workflow.UpdatedAt.Should().BeCloseTo(workflow.CreatedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void ChatMessage_DefaultsToUserTextRole()
    {
        var message = new ChatMessage { SessionId = Guid.NewGuid(), Content = "hello" };
        message.Role.Should().Be("user");
        message.ContentType.Should().Be("text");
    }

    [Fact]
    public void ErpConnection_DefaultsToDisconnected()
    {
        var connection = new ErpConnection();
        connection.IsConnected.Should().BeFalse();
        connection.BaseUrl.Should().BeNull();
    }

    [Fact]
    public void PurchaseOrderLine_HoldsOrderedFields()
    {
        var line = new PurchaseOrderLine { Sku = "CHAIR-001", Quantity = 10, UnitPrice = 12.5m };
        line.Sku.Should().Be("CHAIR-001");
        line.Quantity.Should().Be(10);
        line.UnitPrice.Should().Be(12.5m);
    }
}