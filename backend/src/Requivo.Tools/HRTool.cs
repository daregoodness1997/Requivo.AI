using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>Onboarding, leave management, payroll, contracts, appraisals</summary>
public class HRTool(ILogger<HRTool> logger) : ITool
{
    public string Name        => "HRTool";
    public string Description => "Onboarding, leave management, payroll, contracts, appraisals";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement HR business logic
            var result = await HandleHRAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleHRAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real HR service calls
        return Task.FromResult<object>(new { status = "ok", domain = "HR", step = context.StepIndex });
    }
}
