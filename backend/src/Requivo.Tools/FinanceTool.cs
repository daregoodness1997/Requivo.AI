using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Invoice creation, expense logging, payment initiation</summary>
public class FinanceTool(ILogger<FinanceTool> logger) : ITool
{
    public string Name        => "FinanceTool";
    public string Description => "Invoice creation, expense logging, payment initiation";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement Finance business logic
            var result = await HandleFinanceAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleFinanceAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real Finance service calls
        return Task.FromResult<object>(new { status = "ok", domain = "Finance", step = context.StepIndex });
    }
}
