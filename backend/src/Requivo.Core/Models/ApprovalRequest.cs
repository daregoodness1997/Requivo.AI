using Requivo.Core.Enums;

namespace Requivo.Core.Models;

public class ApprovalRequest
{
    public Guid             Id              { get; set; } = Guid.NewGuid();
    public Guid             WorkflowId      { get; set; }
    public string           TriggerReason   { get; set; } = string.Empty;
    public string           ProposedAction  { get; set; } = string.Empty;
    public string           BusinessContext { get; set; } = string.Empty;
    public ApprovalDecision Decision        { get; set; } = ApprovalDecision.Pending;
    public string?          DecidedBy       { get; set; }
    public string?          Rationale       { get; set; }
    public DateTime?        DecidedAt       { get; set; }
    public DateTime         CreatedAt       { get; set; } = DateTime.UtcNow;
}
