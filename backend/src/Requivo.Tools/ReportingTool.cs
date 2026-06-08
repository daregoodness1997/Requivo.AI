using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

/// <summary>KPI dashboards, analytics queries, data export</summary>
public class ReportingTool(ILogger<ReportingTool> logger) : ITool
{
    public string Name        => "ReportingTool";
    public string Description => "KPI dashboards, analytics queries, data export";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            // TODO: implement Reporting business logic
            var result = await HandleReportingAsync(input, context, ct);
            return new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private Task<object> HandleReportingAsync(object? input, WorkflowContext context, CancellationToken ct)
    {
        // TODO: replace with real Reporting service calls
        return Task.FromResult<object>(new { status = "ok", domain = "Reporting", step = context.StepIndex });
    }
}
