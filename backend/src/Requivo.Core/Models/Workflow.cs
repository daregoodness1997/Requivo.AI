using Requivo.Core.Enums;

namespace Requivo.Core.Models;

public class Workflow
{
    public Guid            Id            { get; set; } = Guid.NewGuid();
    public string          UserInput     { get; set; } = string.Empty;
    public WorkflowDomain? Domain        { get; set; }
    public WorkflowState   State         { get; set; } = WorkflowState.Pending;
    public List<WorkflowStep> Steps      { get; set; } = [];
    public string?         FailureReason { get; set; }
    public DateTime        CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime        UpdatedAt     { get; set; } = DateTime.UtcNow;
}

public class WorkflowStep
{
    public int           Index       { get; set; }
    public string        ToolName    { get; set; } = string.Empty;
    public string        Description { get; set; } = string.Empty;
    public WorkflowState State       { get; set; } = WorkflowState.Pending;
    public object?       Output      { get; set; }
    public DateTime?     StartedAt   { get; set; }
    public DateTime?     CompletedAt { get; set; }
}
