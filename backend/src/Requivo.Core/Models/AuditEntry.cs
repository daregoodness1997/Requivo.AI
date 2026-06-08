namespace Requivo.Core.Models;

public class AuditEntry
{
    public Guid     Id         { get; set; } = Guid.NewGuid();
    public Guid     WorkflowId { get; set; }
    public string   UserId     { get; set; } = string.Empty;
    public string   ToolName   { get; set; } = string.Empty;
    public string   Action     { get; set; } = string.Empty;
    public string   Outcome    { get; set; } = string.Empty;
    public object?  InputData  { get; set; }
    public object?  OutputData { get; set; }
    public DateTime Timestamp  { get; set; } = DateTime.UtcNow;
}
