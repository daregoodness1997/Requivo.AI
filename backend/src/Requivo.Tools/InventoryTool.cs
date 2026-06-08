using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Check stock levels, update inventory, forecast demand, manage thresholds</summary>
public class InventoryTool(ILogger<InventoryTool> logger) : ITool
{
    public string Name        => "InventoryTool";
    public string Description => "Check stock levels, update inventory, forecast demand, manage thresholds";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement Inventory business logic
            var result = await HandleInventoryAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleInventoryAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real Inventory service calls
        return Task.FromResult<object>(new { status = "ok", domain = "Inventory", step = context.StepIndex });
    }
}
