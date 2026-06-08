namespace Requivo.Core.Models;

public class ToolResult
{
    public bool    Success  { get; set; }
    public object? Data     { get; set; }
    public string? Error    { get; set; }
    public ToolMetadata? Metadata { get; set; }
}

public class ToolMetadata
{
    public long   Latency { get; set; }   // ms
    public string Source  { get; set; } = string.Empty;
}
