using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Quote generation, order creation, pricing updates</summary>
public class SalesTool(ILogger<SalesTool> logger) : ITool
{
    public string Name        => "SalesTool";
    public string Description => "Quote generation, order creation, pricing updates";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement Sales business logic
            var result = await HandleSalesAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleSalesAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real Sales service calls
        return Task.FromResult<object>(new { status = "ok", domain = "Sales", step = context.StepIndex });
    }
}
