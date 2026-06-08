using FluentAssertions;
using Requivo.Core.Enums;
using Requivo.Core.Models;
using Xunit;

namespace Requivo.Core.Tests;

public class WorkflowModelTests
{
    [Fact]
    public void Workflow_DefaultState_IsPending()
    {
        var wf = new Workflow();
        wf.State.Should().Be(WorkflowState.Pending);
    }

    [Fact]
    public void Workflow_NewInstance_HasUniqueId()
    {
        var wf1 = new Workflow();
        var wf2 = new Workflow();
        wf1.Id.Should().NotBe(wf2.Id);
    }

    [Fact]
    public void ToolResult_SuccessTrue_ErrorIsNull()
    {
        var result = new ToolResult { Success = true, Data = new { } };
        result.Error.Should().BeNull();
        result.Success.Should().BeTrue();
    }

    [Fact]
    public void WorkflowContext_DefaultPermissions_IsEmpty()
    {
        var ctx = new WorkflowContext();
        ctx.Permissions.Should().BeEmpty();
        ctx.AuditTrail.Should().BeEmpty();
    }
}
