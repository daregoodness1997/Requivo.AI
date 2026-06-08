using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Requivo.AI;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Xunit;

namespace Requivo.Orchestration.Tests;

public class WorkflowEngineTests
{
    [Fact]
    public async Task StartAsync_ValidInput_ReturnsWorkflowInPendingOrPlanning()
    {
        // Arrange
        var planner = new Mock<IPromptOrchestrator>();
        planner.Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<WorkflowContext>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(new PlanResult(WorkflowDomain.Reporting, [], false, null));

        // TODO: wire up in-memory EF context for full test
        // For now this is a placeholder showing the test pattern
        await Task.CompletedTask;
        true.Should().BeTrue(); // placeholder
    }

    [Fact]
    public void WorkflowState_ValidTransitions_Defined()
    {
        // All valid states should be parseable
        var states = Enum.GetValues<WorkflowState>();
        states.Should().HaveCount(6);
        states.Should().Contain(WorkflowState.Pending);
        states.Should().Contain(WorkflowState.Completed);
        states.Should().Contain(WorkflowState.Failed);
    }
}
