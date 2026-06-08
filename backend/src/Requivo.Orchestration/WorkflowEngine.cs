using Microsoft.Extensions.Logging;
using Requivo.AI;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;

namespace Requivo.Orchestration;

public class WorkflowEngine(
    IPromptOrchestrator planner,
    IEnumerable<ITool> tools,
    IStateStore stateStore,
    IApprovalService approvals,
    RequivoDbContext db,
    ILogger<WorkflowEngine> logger) : IWorkflowEngine
{
    private readonly Dictionary<string, ITool> _tools = tools.ToDictionary(t => t.Name, StringComparer.OrdinalIgnoreCase);

    public async Task<Workflow> StartAsync(string userInput, string userId, CancellationToken ct = default)
    {
        var workflow = new Workflow { UserInput = userInput };
        db.Workflows.Add(workflow);
        await db.SaveChangesAsync(ct);

        _ = ExecuteAsync(workflow, userId, ct); // fire-and-forget; SSE streams progress
        return workflow;
    }

    public async Task<Workflow> GetAsync(Guid workflowId, CancellationToken ct = default)
        => await db.Workflows.FindAsync([workflowId], ct)
           ?? throw new KeyNotFoundException($"Workflow {workflowId} not found");

    public async Task<IReadOnlyList<Workflow>> ListAsync(string userId, CancellationToken ct = default)
        => await db.Workflows
                   .OrderByDescending(w => w.CreatedAt)
                   .Take(50)
                   .ToListAsync(ct);

    // ─── Private execution pipeline ──────────────────────────────

    private async Task ExecuteAsync(Workflow wf, string userId, CancellationToken ct)
    {
        var context = new WorkflowContext { WorkflowId = wf.Id.ToString(), UserId = userId };

        try
        {
            await TransitionAsync(wf, WorkflowState.Planning, ct);

            // 1. Plan
            var plan = await planner.PlanAsync(wf.UserInput, context, ct);

            if (plan.NeedsClarification)
            {
                wf.FailureReason = plan.ClarificationQuestion;
                await TransitionAsync(wf, WorkflowState.Failed, ct);
                return;
            }

            wf.Domain = plan.Domain;
            wf.Steps  = plan.Steps.Select((s, i) => new WorkflowStep
            {
                Index = i, ToolName = s.ToolName, Description = s.Description
            }).ToList();

            await TransitionAsync(wf, WorkflowState.InProgress, ct);

            // 2. Execute steps
            foreach (var step in wf.Steps)
            {
                context.StepIndex = step.Index;
                await stateStore.SaveAsync(context, ct);

                step.State     = WorkflowState.InProgress;
                step.StartedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);

                if (!_tools.TryGetValue(step.ToolName, out var tool))
                    throw new InvalidOperationException($"Unknown tool: {step.ToolName}");

                var result = await ExecuteWithRetryAsync(tool, null, context, ct);

                step.Output      = result.Data;
                step.CompletedAt = DateTime.UtcNow;
                step.State       = result.Success ? WorkflowState.Completed : WorkflowState.Failed;

                context.AuditTrail.Add(new AuditEntry
                {
                    WorkflowId = wf.Id,
                    UserId     = userId,
                    ToolName   = step.ToolName,
                    Action     = step.Description,
                    Outcome    = result.Success ? "Success" : "Failure",
                    OutputData = result.Data,
                });

                if (!result.Success)
                {
                    wf.FailureReason = result.Error;
                    await TransitionAsync(wf, WorkflowState.Failed, ct);
                    return;
                }

                await db.SaveChangesAsync(ct);
            }

            await TransitionAsync(wf, WorkflowState.Completed, ct);
            await stateStore.DeleteAsync(wf.Id.ToString(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Workflow {Id} failed", wf.Id);
            wf.FailureReason = ex.Message;
            await TransitionAsync(wf, WorkflowState.Failed, ct);
        }
    }

    private static async Task<ToolResult> ExecuteWithRetryAsync(ITool tool, object? input, WorkflowContext ctx, CancellationToken ct)
    {
        int[] delays = [1000, 5000, 30000];
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var result = await tool.ExecuteAsync(input, ctx, ct);
            if (result.Success) return result;
            if (attempt < 2) await Task.Delay(delays[attempt], ct);
        }
        return new ToolResult { Success = false, Error = $"{tool.Name} failed after 3 retries" };
    }

    private async Task TransitionAsync(Workflow wf, WorkflowState next, CancellationToken ct)
    {
        wf.State     = next;
        wf.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Workflow {Id} → {State}", wf.Id, next);
    }
}
