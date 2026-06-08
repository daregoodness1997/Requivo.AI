using Requivo.Core.Enums;

namespace Requivo.Core.Models;

public class WorkflowContext
{
    public string WorkflowId  { get; set; } = string.Empty;
    public string UserId      { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = [];
    public int  StepIndex     { get; set; }
    public List<AuditEntry> AuditTrail { get; set; } = [];
}
