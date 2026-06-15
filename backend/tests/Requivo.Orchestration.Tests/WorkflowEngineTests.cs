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
using System.Text.Json;
using Xunit;

namespace Requivo.Orchestration.Tests;

public class WorkflowEngineTests
{
    [Fact]
    public async Task ResumeApprovedStepAsync_DeferredInput_ExecutesStepAndCompletesWorkflow()
    {
        // Arrange
        var dbName = $"requivo-resume-success-{Guid.NewGuid()}";
        var seededWorkflowId = await SeedWaitingApprovalWorkflowAsync(dbName, "P-001");

        object? receivedInput = null;
        var tool = new Mock<ITool>();
        tool.SetupGet(t => t.Name).Returns("ProcurementTool");
        tool.SetupGet(t => t.Description).Returns("Create PO");
        tool.Setup(t => t.ExecuteAsync(It.IsAny<object?>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .Callback<object?, WorkflowContext, CancellationToken>((input, _, _) => receivedInput = input)
            .ReturnsAsync(new ToolResult
            {
                Success = true,
                Data = new { externalOrderId = "PO-123", status = "created" },
            });

        await using var db = CreateDbContext(dbName);
        var engine = CreateEngine(db, [tool.Object]);

        // Act
        await engine.ResumeApprovedStepAsync(seededWorkflowId, "approver-1", CancellationToken.None);

        // Assert
        receivedInput.Should().BeOfType<JsonElement>();
        var inputElement = (JsonElement)receivedInput!;
        inputElement.GetProperty("supplierId").GetString().Should().Be("supplier-123");
        inputElement.GetProperty("lines")[0].GetProperty("sku").GetString().Should().Be("P-001");

        var updated = await db.Workflows.FindAsync(seededWorkflowId);
        updated.Should().NotBeNull();
        updated!.State.Should().Be(WorkflowState.Completed);
        updated.Steps.Should().ContainSingle();
        updated.Steps[0].State.Should().Be(WorkflowState.Completed);
        updated.Steps[0].CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task ResumeApprovedStepAsync_ToolFailure_FailsWorkflow()
    {
        // Arrange
        var dbName = $"requivo-resume-failure-{Guid.NewGuid()}";
        var seededWorkflowId = await SeedWaitingApprovalWorkflowAsync(dbName, "P-002");

        var tool = new Mock<ITool>();
        tool.SetupGet(t => t.Name).Returns("ProcurementTool");
        tool.SetupGet(t => t.Description).Returns("Create PO");
        tool.Setup(t => t.ExecuteAsync(It.IsAny<object?>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ToolResult
            {
                Success = false,
                Error = "ERP unavailable",
            });

        await using var db = CreateDbContext(dbName);
        var engine = CreateEngine(db, [tool.Object]);

        // Act
        await engine.ResumeApprovedStepAsync(seededWorkflowId, "approver-1", CancellationToken.None);

        // Assert
        var updated = await db.Workflows.FindAsync(seededWorkflowId);
        updated.Should().NotBeNull();
        updated!.State.Should().Be(WorkflowState.Failed);
        updated.FailureReason.Should().Contain("failed after 3 retries");
        updated.Steps[0].State.Should().Be(WorkflowState.Failed);
        updated.Steps[0].CompletedAt.Should().NotBeNull();
    }

    private static async Task<Guid> SeedWaitingApprovalWorkflowAsync(string dbName, string sku)
    {
        await using var db = CreateDbContext(dbName);

        var workflow = new Workflow
        {
            UserInput = "Create purchase order",
            Domain = WorkflowDomain.Procurement,
            State = WorkflowState.WaitingApproval,
            Steps =
            [
                new WorkflowStep
                {
                    Index = 0,
                    ToolName = "ProcurementTool",
                    Description = "Create purchase order",
                    State = WorkflowState.WaitingApproval,
                    StartedAt = DateTime.UtcNow,
                    Output = new
                    {
                        status = "approved",
                        input = new
                        {
                            supplierId = "supplier-123",
                            currency = "USD",
                            lines = new[]
                            {
                                new { sku, quantity = 10, unitPrice = 12.5m }
                            }
                        }
                    },
                }
            ]
        };

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

    private static WorkflowEngine CreateEngine(RequivoDbContext db, IEnumerable<ITool> tools)
    {
        var planner = new Mock<IPromptOrchestrator>();
        var stateStore = new Mock<IStateStore>();
        stateStore.Setup(s => s.SaveAsync(It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        stateStore.Setup(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var approvals = new Mock<IApprovalService>();
        var scopeFactory = new Mock<IServiceScopeFactory>();

        return new WorkflowEngine(
            planner.Object,
            tools,
            stateStore.Object,
            approvals.Object,
            db,
            NullLogger<WorkflowEngine>.Instance,
            scopeFactory.Object);
    }
}
