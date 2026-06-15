using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
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
    ILogger<WorkflowEngine> logger,
    IServiceScopeFactory scopeFactory) : IWorkflowEngine
{
    private readonly Dictionary<string, ITool> _tools = tools.ToDictionary(t => t.Name, StringComparer.OrdinalIgnoreCase);

    public async Task<Workflow> StartAsync(string userInput, string userId, CancellationToken ct = default)
    {
        var workflow = new Workflow { UserInput = userInput };
        db.Workflows.Add(workflow);
        await db.SaveChangesAsync(ct);

        // Run execution in an isolated scope to avoid sharing scoped services/DbContext.
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var scopedEngine = scope.ServiceProvider.GetRequiredService<WorkflowEngine>();
                await scopedEngine.ExecuteWorkflowAsync(workflow.Id, userId, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background execution failed for workflow {Id}", workflow.Id);
            }
        });

        return workflow;
    }

    public async Task ExecuteWorkflowAsync(Guid workflowId, string userId, CancellationToken ct = default)
    {
        var workflow = await db.Workflows.FindAsync([workflowId], ct)
                      ?? throw new KeyNotFoundException($"Workflow {workflowId} not found");

        await ExecuteAsync(workflow, userId, ct);
    }

    public async Task ResumeApprovedStepAsync(Guid workflowId, string userId, CancellationToken ct = default)
    {
        var workflow = await db.Workflows.FindAsync([workflowId], ct)
                      ?? throw new KeyNotFoundException($"Workflow {workflowId} not found");

        var waitingStep = workflow.Steps
            .OrderBy(step => step.Index)
            .FirstOrDefault(step => step.State == WorkflowState.WaitingApproval);

        if (waitingStep is null)
        {
            logger.LogInformation("Workflow {Id} has no waiting approval step to resume", workflowId);
            return;
        }

        await TransitionAsync(workflow, WorkflowState.InProgress, ct);

        var context = new WorkflowContext
        {
            WorkflowId = workflow.Id.ToString(),
            UserId = userId,
            StepIndex = waitingStep.Index,
        };

        waitingStep.State = WorkflowState.InProgress;
        waitingStep.StartedAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        if (!_tools.TryGetValue(waitingStep.ToolName, out var tool))
        {
            workflow.FailureReason = $"Unknown tool: {waitingStep.ToolName}";
            waitingStep.State = WorkflowState.Failed;
            waitingStep.CompletedAt = DateTime.UtcNow;
            await TransitionAsync(workflow, WorkflowState.Failed, ct);
            return;
        }

        var deferredInput = ExtractDeferredInput(waitingStep.Output);
        var result = await ExecuteWithRetryAsync(tool, deferredInput, context, ct);

        waitingStep.Output = result.Data;
        waitingStep.CompletedAt = DateTime.UtcNow;
        waitingStep.State = result.Success ? WorkflowState.Completed : WorkflowState.Failed;

        db.AuditEntries.Add(new AuditEntry
        {
            WorkflowId = workflow.Id,
            UserId = userId,
            ToolName = waitingStep.ToolName,
            Action = waitingStep.Description,
            Outcome = result.Success ? "Success" : "Failure",
            OutputData = result.Data,
        });

        if (!result.Success)
        {
            workflow.FailureReason = result.Error;
            await db.SaveChangesAsync(ct);
            await TransitionAsync(workflow, WorkflowState.Failed, ct);
            return;
        }

        await db.SaveChangesAsync(ct);
        await TransitionAsync(workflow, WorkflowState.Completed, ct);
        await stateStore.DeleteAsync(workflow.Id.ToString(), ct);
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
            wf.Steps = plan.Steps.Select((s, i) => new WorkflowStep
            {
                Index = i,
                ToolName = s.ToolName,
                Description = s.Description
            }).ToList();

            await TransitionAsync(wf, WorkflowState.InProgress, ct);

            var approvalRequired = RequiresHumanApproval(wf.UserInput, wf.Domain);
            var approvalStepIndex = approvalRequired && wf.Steps.Count > 0 ? wf.Steps.Count - 1 : -1;

            // 2. Execute steps
            foreach (var step in wf.Steps)
            {
                var plannedInput = step.Index < plan.Steps.Count ? plan.Steps[step.Index].Input : null;

                if (step.Index == approvalStepIndex)
                {
                    var approval = await approvals.CreateAsync(new ApprovalRequest
                    {
                        WorkflowId = wf.Id,
                        TriggerReason = ApprovalReasonForDomain(wf.Domain),
                        ProposedAction = wf.UserInput,
                        BusinessContext = step.Description,
                    }, ct);

                    step.State = WorkflowState.WaitingApproval;
                    step.StartedAt = DateTime.UtcNow;
                    step.Output = new
                    {
                        status = "pending_approval",
                        approvalId = approval.Id,
                        reason = approval.TriggerReason,
                        input = plannedInput,
                    };

                    db.AuditEntries.Add(new AuditEntry
                    {
                        WorkflowId = wf.Id,
                        UserId = userId,
                        ToolName = step.ToolName,
                        Action = step.Description,
                        Outcome = "Pending Approval",
                        OutputData = step.Output,
                    });

                    await db.SaveChangesAsync(ct);
                    await TransitionAsync(wf, WorkflowState.WaitingApproval, ct);
                    return;
                }

                context.StepIndex = step.Index;
                await stateStore.SaveAsync(context, ct);

                step.State = WorkflowState.InProgress;
                step.StartedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);

                if (!_tools.TryGetValue(step.ToolName, out var tool))
                    throw new InvalidOperationException($"Unknown tool: {step.ToolName}");

                var result = await ExecuteWithRetryAsync(tool, plannedInput, context, ct);

                step.Output = result.Data;
                step.CompletedAt = DateTime.UtcNow;
                step.State = result.Success ? WorkflowState.Completed : WorkflowState.Failed;

                context.AuditTrail.Add(new AuditEntry
                {
                    WorkflowId = wf.Id,
                    UserId = userId,
                    ToolName = step.ToolName,
                    Action = step.Description,
                    Outcome = result.Success ? "Success" : "Failure",
                    OutputData = result.Data,
                });

                db.AuditEntries.Add(new AuditEntry
                {
                    WorkflowId = wf.Id,
                    UserId = userId,
                    ToolName = step.ToolName,
                    Action = step.Description,
                    Outcome = result.Success ? "Success" : "Failure",
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

    private static bool RequiresHumanApproval(string userInput, WorkflowDomain? domain)
    {
        if (string.IsNullOrWhiteSpace(userInput)) return false;

        var normalized = userInput.ToLowerInvariant();
        if (normalized.Contains("pay invoice") || normalized.Contains("payment")) return true;
        if (normalized.Contains("purchase order") || normalized.Contains("create po")) return true;
        if (normalized.Contains("onboarding")) return true;

        return domain is WorkflowDomain.Finance or WorkflowDomain.Procurement;
    }

    private static string ApprovalReasonForDomain(WorkflowDomain? domain)
        => domain switch
        {
            WorkflowDomain.Finance => "Financial threshold",
            WorkflowDomain.Procurement => "Purchase order execution",
            WorkflowDomain.HR => "Employee lifecycle action",
            _ => "Policy-controlled operation",
        };

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

    private static object? ExtractDeferredInput(object? stepOutput)
    {
        if (stepOutput is not System.Text.Json.JsonElement outputElement)
        {
            return null;
        }

        if (!outputElement.TryGetProperty("input", out var inputElement))
        {
            return null;
        }

        return inputElement;
    }

    private async Task TransitionAsync(Workflow wf, WorkflowState next, CancellationToken ct)
    {
        wf.State = next;
        wf.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Workflow {Id} → {State}", wf.Id, next);
    }
}
