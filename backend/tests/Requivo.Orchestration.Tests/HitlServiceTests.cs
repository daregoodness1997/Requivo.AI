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
using Requivo.Infrastructure.Integrations;
using Requivo.Orchestration;
using Xunit;

namespace Requivo.Orchestration.Tests;

public class HitlServiceTests
{
    [Fact]
    public async Task DecideAsync_Approved_ResumesWorkflowAndCompletesStep()
    {
        var dbName = $"requivo-hitl-approve-{Guid.NewGuid()}";
        var services = BuildServiceProvider(dbName, success: true);

        Guid workflowId;
        Guid approvalId;

        await using (var scope = services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RequivoDbContext>();
            var seeded = await SeedWorkflowWithApprovalAsync(db);
            workflowId = seeded.WorkflowId;
            approvalId = seeded.ApprovalId;

            var hitl = new HitlService(
                db,
                new NoopEmailService(),
                new NoopSlackService(),
                services.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<HitlService>.Instance);

            await hitl.DecideAsync(approvalId, ApprovalDecision.Approved, "approver-1", "Looks good", CancellationToken.None);
        }

        var completed = await WaitForWorkflowStateAsync(services, workflowId, WorkflowState.Completed, TimeSpan.FromSeconds(3));
        completed.Should().BeTrue("approved workflows should resume deferred execution and complete");

        await using var verifyScope = services.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<RequivoDbContext>();
        var workflow = await verifyDb.Workflows.FindAsync(workflowId);

        workflow.Should().NotBeNull();
        workflow!.State.Should().Be(WorkflowState.Completed);
        workflow.FailureReason.Should().BeNull();
        workflow.Steps.Should().ContainSingle();
        workflow.Steps[0].State.Should().Be(WorkflowState.Completed);
    }

    [Fact]
    public async Task DecideAsync_Rejected_MarksWorkflowFailedWithoutResuming()
    {
        var dbName = $"requivo-hitl-reject-{Guid.NewGuid()}";
        var services = BuildServiceProvider(dbName, success: true);

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RequivoDbContext>();
        var seeded = await SeedWorkflowWithApprovalAsync(db);

        var hitl = new HitlService(
            db,
            new NoopEmailService(),
            new NoopSlackService(),
            services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<HitlService>.Instance);

        await hitl.DecideAsync(seeded.ApprovalId, ApprovalDecision.Rejected, "approver-1", "Budget exceeded", CancellationToken.None);

        var workflow = await db.Workflows.FindAsync(seeded.WorkflowId);
        workflow.Should().NotBeNull();
        workflow!.State.Should().Be(WorkflowState.Failed);
        workflow.FailureReason.Should().Be("Budget exceeded");
        workflow.Steps.Should().ContainSingle();
        workflow.Steps[0].State.Should().Be(WorkflowState.Failed);
    }

    private static ServiceProvider BuildServiceProvider(string dbName, bool success)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<RequivoDbContext>(options => options.UseInMemoryDatabase(dbName));

        var planner = new Mock<IPromptOrchestrator>();
        services.AddSingleton(planner.Object);

        var stateStore = new Mock<IStateStore>();
        stateStore.Setup(s => s.SaveAsync(It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        stateStore.Setup(s => s.LoadAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((WorkflowContext?)null);
        stateStore.Setup(s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        services.AddSingleton(stateStore.Object);

        var approvals = new Mock<IApprovalService>();
        services.AddSingleton(approvals.Object);

        services.AddSingleton<ITool>(_ => new DeferredProcurementTool(success));
        services.AddScoped<WorkflowEngine>();

        return services.BuildServiceProvider();
    }

    private static async Task<(Guid WorkflowId, Guid ApprovalId)> SeedWorkflowWithApprovalAsync(RequivoDbContext db)
    {
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
                        status = "pending_approval",
                        input = new
                        {
                            supplierId = "supplier-123",
                            lines = new[]
                            {
                                new { sku = "SKU-1", quantity = 2, unitPrice = 10m }
                            }
                        }
                    }
                }
            ]
        };

        var approval = new ApprovalRequest
        {
            WorkflowId = workflow.Id,
            TriggerReason = "Purchase order execution",
            ProposedAction = "Create purchase order",
            BusinessContext = "Create purchase order",
        };

        db.Workflows.Add(workflow);
        db.ApprovalRequests.Add(approval);
        await db.SaveChangesAsync();

        return (workflow.Id, approval.Id);
    }

    private static async Task<bool> WaitForWorkflowStateAsync(
        ServiceProvider services,
        Guid workflowId,
        WorkflowState target,
        TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;

        while (DateTime.UtcNow < deadline)
        {
            await using var scope = services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<RequivoDbContext>();
            var workflow = await db.Workflows.FindAsync(workflowId);
            if (workflow?.State == target)
            {
                return true;
            }

            await Task.Delay(100);
        }

        return false;
    }

    private sealed class DeferredProcurementTool(bool success) : ITool
    {
        public string Name => "ProcurementTool";
        public string Description => "Deferred procurement test tool";

        public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
        {
            if (!success)
            {
                return Task.FromResult(new ToolResult { Success = false, Error = "Simulated failure" });
            }

            return Task.FromResult(new ToolResult
            {
                Success = true,
                Data = new { status = "created", source = "test-tool", workflowId = context.WorkflowId },
            });
        }
    }

    private sealed class NoopEmailService : IEmailService
    {
        public Task SendApprovalRequestAsync(string toEmail, string subject, string body, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class NoopSlackService : ISlackService
    {
        public Task SendAlertAsync(string message, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}