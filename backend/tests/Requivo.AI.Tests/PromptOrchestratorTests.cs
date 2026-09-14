using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Requivo.Core.Enums;
using Requivo.Core.Models;
using Xunit;

namespace Requivo.AI.Tests;

public class PromptOrchestratorTests
{
    private static PromptOrchestrator CreateOrchestrator(bool configureQwen = false, IQwenClient? qwen = null)
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c[It.IsAny<string>()])
            .Returns((string key) => configureQwen && key == "Qwen:ApiKey" ? "test-key" : null);

        return new PromptOrchestrator(
            qwen ?? Mock.Of<IQwenClient>(),
            config.Object,
            NullLogger<PromptOrchestrator>.Instance);
    }

    private static Task<PlanResult> PlanAsync(PromptOrchestrator orchestrator, string userInput) =>
        orchestrator.PlanAsync(
            userInput,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Fallback_InvoiceListRequest_ReturnsFinanceDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "List all due invoices");

        result.Domain.Should().Be(WorkflowDomain.Finance);
        result.NeedsClarification.Should().BeFalse();
        result.Steps.Should().ContainSingle(s => s.ToolName == "FinanceTool");
    }

    [Fact]
    public async Task Fallback_PayInvoiceRequest_ReturnsFinanceDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Pay invoice INV-2041");

        result.Domain.Should().Be(WorkflowDomain.Finance);
        result.NeedsClarification.Should().BeFalse();
    }

    [Fact]
    public async Task Fallback_ProcurementListRequest_RoutesDirectlyToTool()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Show all purchase orders");

        result.Domain.Should().Be(WorkflowDomain.Procurement);
        result.NeedsClarification.Should().BeFalse();
        result.Steps.Should().ContainSingle(s => s.ToolName == "ProcurementTool");
    }

    [Fact]
    public async Task Fallback_ProcurementCreateRequest_RequestsClarificationWithForm()
    {
        var result = await PlanAsync(CreateOrchestrator(), "I want to create a purchase order");

        result.Domain.Should().Be(WorkflowDomain.Procurement);
        result.NeedsClarification.Should().BeTrue();
        result.ClarificationQuestion.Should().NotBeNullOrWhiteSpace();
        result.FormType.Should().Be("purchase_order");
        result.Steps.Should().BeEmpty();
    }

    [Fact]
    public async Task Fallback_CreatePurchaseOrderPrefix_RoutesDirectlyToTool()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Create purchase order for Acme");

        result.Domain.Should().Be(WorkflowDomain.Procurement);
        result.NeedsClarification.Should().BeFalse();
        result.Steps.Should().ContainSingle(s => s.ToolName == "ProcurementTool");
    }

    [Fact]
    public async Task Fallback_StructuredFormData_RoutesDirectlyToTool()
    {
        var result = await PlanAsync(CreateOrchestrator(), "supplier=s-1, sku=MON-003 qty=2");

        result.Domain.Should().Be(WorkflowDomain.Procurement);
        result.NeedsClarification.Should().BeFalse();
        result.Steps.Should().ContainSingle(s => s.ToolName == "ProcurementTool");
    }

    [Fact]
    public async Task Fallback_InventoryQuery_ReturnsInventoryDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Check our stock levels");

        result.Domain.Should().Be(WorkflowDomain.Inventory);
        result.Steps.Should().ContainSingle(s => s.ToolName == "InventoryTool");
    }

    [Fact]
    public async Task Fallback_SalesQuery_ReturnsSalesDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "List sales orders for the month");

        result.Domain.Should().Be(WorkflowDomain.Sales);
        result.Steps.Should().ContainSingle(s => s.ToolName == "SalesTool");
    }

    [Fact]
    public async Task Fallback_EmployeeQuery_ReturnsHRDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Which employees are onboarding?");

        result.Domain.Should().Be(WorkflowDomain.HR);
        result.Steps.Should().ContainSingle(s => s.ToolName == "HRTool");
    }

    [Fact]
    public async Task Fallback_ReportingQuery_ReturnsReportingDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "Build a KPI dashboard report");

        result.Domain.Should().Be(WorkflowDomain.Reporting);
        result.Steps.Should().ContainSingle(s => s.ToolName == "ReportingTool");
    }

    [Fact]
    public async Task Fallback_UnknownQuery_FallsBackToReportingDomain()
    {
        var result = await PlanAsync(CreateOrchestrator(), "doyourthing magically today");

        result.Domain.Should().Be(WorkflowDomain.Reporting);
        result.NeedsClarification.Should().BeFalse();
    }

    [Fact]
    public async Task Qwen_ReturnsValidPlan_ParsesPlanResult()
    {
        var content = """
            {
              "domain": "Inventory",
              "needsClarification": false,
              "clarificationQuestion": null,
              "steps": [
                { "toolName": "InventoryTool", "description": "Check stock for CHAIR-001", "input": { "sku": "CHAIR-001" } }
              ]
            }
            """;

        var qwen = new Mock<IQwenClient>();
        qwen.Setup(q => q.CompleteAsync(It.IsAny<IReadOnlyList<QwenMessage>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new QwenResponse(content, null));

        var result = await PlanAsync(CreateOrchestrator(configureQwen: true, qwen.Object), "Check stock for CHAIR-001");

        result.Domain.Should().Be(WorkflowDomain.Inventory);
        result.NeedsClarification.Should().BeFalse();
        result.Steps.Should().ContainSingle();
        result.Steps[0].ToolName.Should().Be("InventoryTool");
        result.Steps[0].Description.Should().Be("Check stock for CHAIR-001");
    }

    [Fact]
    public async Task Qwen_Throws_FallsBackToLocalPlanner()
    {
        var qwen = new Mock<IQwenClient>();
        qwen.Setup(q => q.CompleteAsync(It.IsAny<IReadOnlyList<QwenMessage>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Qwen endpoint unavailable"));

        var result = await PlanAsync(CreateOrchestrator(configureQwen: true, qwen.Object), "List all invoices");

        result.Domain.Should().Be(WorkflowDomain.Finance);
        result.Steps.Should().ContainSingle(s => s.ToolName == "FinanceTool");
    }
}