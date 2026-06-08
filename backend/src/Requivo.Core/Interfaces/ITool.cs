using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface ITool
{
    string Name        { get; }
    string Description { get; }

    /// <summary>Validate input and execute the tool operation.</summary>
    Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default);
}
