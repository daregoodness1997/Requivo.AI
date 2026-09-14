using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Requivo.AI;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using Requivo.Orchestration;
using Requivo.Tools;
using Xunit;

namespace Requivo.Orchestration.Tests;

public class WorkflowEngineExecutionTests
{
    private sealed class EngineFixture
    {
        public required RequivoDbContext Db { get; init; }
        public required Mock<IPromptOrchestrator> Planner { get; init; }
        public required Mock<IApprovalService> Approvals { get; init; }
        public required Mock<IStateStore> StateStore { get; init; }
        public required List<object?> ToolInputs { get; init; }
        public required WorkflowEngine Engine { get; init; }
    }

    private static EngineFixture CreateFixture(string dbName, PlanResult plan, params ITool[] tools)
    {
        var db = CreateDbContext(dbName);
        var planner = new Mock<IPromptOrchestrator>();
        planner.Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(plan);

        var approvals = new Mock<IApprovalService>();
        approvals.Setup(a => a.CreateAsync(It.IsAny<ApprovalRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApprovalRequest req, CancellationToken _) => req);

        var stateStore = new Mock<IStateStore>();
        stateStore.Setup(s => s.SaveAsync(It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        stateStore.Setup(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var erpConnections = new Mock<IErpConnectionManager>();
        erpConnections.Setup(e => e.GetActiveConnectionsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ErpConnection>());

        var scopeFactory = new Mock<IServiceScopeFactory>();

        var engine = new WorkflowEngine(
            planner.Object,
            tools,
            stateStore.Object,
            approvals.Object,
            erpConnections.Object,
            db,
            NullLogger<WorkflowEngine>.Instance,
            scopeFactory.Object);

        return new EngineFixture
        {
            Db = db,
            Planner = planner,
            Approvals = approvals,
            StateStore = stateStore,
            ToolInputs = [],
            Engine = engine,
        };
    }

    private static async Task<Guid> SeedPendingWorkflowAsync(RequivoDbContext db, string userInput)
    {
        var workflow = new Workflow { UserInput = userInput, State = WorkflowState.Pending };
        db.Workflows.Add(workflow);
        await db.SaveChangesAsync();
        return workflow.Id;
    }

    private static RequivoDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RequivoDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new RequivoDbContext(options);
    }

    [Fact]
    public async Task ExecuteWorkflowAsync_ReadOnlyFinanceRequest_CompletesWithoutApproval()
    {
        var dbName = $"requivo-finance-readonly-{Guid.NewGuid()}";
        var tool = new FinanceTool(NullLogger<FinanceTool>.Instance);
        var plan = new PlanResult(
            WorkflowDomain.Finance,
            [new PlannedStep("FinanceTool", "List due invoices", null)],
            false,
            null);

        var fixture = CreateFixture(dbName, plan, tool);
        var workflowId = await SeedPendingWorkflowAsync(fixture.Db, "List all due invoices");

        // Act
        await fixture.Engine.ExecuteWorkflowAsync(workflowId, "user-1", CancellationToken.None);

        // Assert - read-only finance requests must NOT require human approval
        fixture.Approvals.Verify(
            a => a.CreateAsync(It.IsAny<ApprovalRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);

        var updated = await fixture.Db.Workflows.FindAsync(workflowId);
        updated!.State.Should().Be(WorkflowState.Completed);
        updated.Steps.Should().ContainSingle();
        updated.Steps[0].State.Should().Be(WorkflowState.Completed);
        updated.Steps[0].ToolName.Should().Be("FinanceTool");
    }

    [Fact]
    public async Task ExecuteWorkflowAsync_ActionableFinanceRequest_WaitsForApproval()
    {
        var dbName = $"requivo-finance-action-{Guid.NewGuid()}";
        var tool = new FinanceTool(NullLogger<FinanceTool>.Instance);
        var plan = new PlanResult(
            WorkflowDomain.Finance,
            [new PlannedStep("FinanceTool", "Pay invoice INV-2041", null)],
            false,
            null);

        var fixture = CreateFixture(dbName, plan, tool);
        var workflowId = await SeedPendingWorkflowAsync(fixture.Db, "Pay invoice INV-2041");

        // Act
        await fixture.Engine.ExecuteWorkflowAsync(workflowId, "user-1", CancellationToken.None);

        // Assert - non-read-only finance requests must require human approval
        fixture.Approvals.Verify(
            a => a.CreateAsync(It.IsAny<ApprovalRequest>(), It.IsAny<CancellationToken>()),
            Times.Once);

        var updated = await fixture.Db.Workflows.FindAsync(workflowId);
        updated!.State.Should().Be(WorkflowState.WaitingApproval);
        updated.Steps[0].State.Should().Be(WorkflowState.WaitingApproval);
    }

    [Fact]
    public async Task ExecuteWorkflowAsync_ProcurementRequest_WaitsForApproval()
    {
        var dbName = $"requivo-procurement-{Guid.NewGuid()}";
        var tool = new ProcurementTool(NullLogger<ProcurementTool>.Instance, Mock.Of<IProcurementGateway>());
        var plan = new PlanResult(
            WorkflowDomain.Procurement,
            [new PlannedStep("ProcurementTool", "Create purchase order", null)],
            false,
            null);

        var fixture = CreateFixture(dbName, plan, tool);
        var workflowId = await SeedPendingWorkflowAsync(fixture.Db, "Create purchase order");

        // Act
        await fixture.Engine.ExecuteWorkflowAsync(workflowId, "user-1", CancellationToken.None);

        // Assert - procurement requests always require human approval
        fixture.Approvals.Verify(
            a => a.CreateAsync(It.IsAny<ApprovalRequest>(), It.IsAny<CancellationToken>()),
            Times.Once);

        var updated = await fixture.Db.Workflows.FindAsync(workflowId);
        updated!.State.Should().Be(WorkflowState.WaitingApproval);
    }

    [Fact]
    public async Task ExecuteWorkflowAsync_PassesUserInputIntoToolContext()
    {
        var dbName = $"requivo-userinput-{Guid.NewGuid()}";
        WorkflowContext? received = null;
        var tool = new Mock<ITool>();
        tool.SetupGet(t => t.Name).Returns("ReportingTool");
        tool.SetupGet(t => t.Description).Returns("Build report");
        tool.Setup(t => t.ExecuteAsync(It.IsAny<object?>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .Callback<object?, WorkflowContext, CancellationToken>((_, ctx, _) => received = ctx)
            .ReturnsAsync(new ToolResult { Success = true, Data = new { ok = true } });

        var plan = new PlanResult(
            WorkflowDomain.Reporting,
            [new PlannedStep("ReportingTool", "Build report", null)],
            false,
            null);

        var fixture = CreateFixture(dbName, plan, tool.Object);
        var workflowId = await SeedPendingWorkflowAsync(fixture.Db, "Show KPI dashboard");

        // Act
        await fixture.Engine.ExecuteWorkflowAsync(workflowId, "user-42", CancellationToken.None);

        // Assert - tools must receive the user's original input
        received.Should().NotBeNull();
        received!.UserInput.Should().Be("Show KPI dashboard");
        received.UserId.Should().Be("user-42");
        received.WorkflowId.Should().Be(workflowId.ToString());
    }
}