using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Supplier selection, purchase order creation and submission</summary>
public class ProcurementTool(ILogger<ProcurementTool> logger) : ITool
{
    public string Name        => "ProcurementTool";
    public string Description => "Supplier selection, purchase order creation and submission";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement Procurement business logic
            var result = await HandleProcurementAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleProcurementAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real Procurement service calls
        return Task.FromResult<object>(new { status = "ok", domain = "Procurement", step = context.StepIndex });
    }
}
