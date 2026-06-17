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

        var assistantMsg = await db.ChatMessages.FirstOrDefaultAsync(m => m.WorkflowId == workflow.Id, ct);

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

        if (assistantMsg != null)
        {
            assistantMsg.ContentType = "text";
            assistantMsg.Content = $"Resuming approval step **{waitingStep.ToolName}**...";
        }

        if (!_tools.TryGetValue(waitingStep.ToolName, out var tool))
        {
            workflow.FailureReason = $"Unknown tool: {waitingStep.ToolName}";
            waitingStep.State = WorkflowState.Failed;
            waitingStep.CompletedAt = DateTime.UtcNow;
            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "prompt";
                assistantMsg.PlanData = new
                {
                    promptType = "error_recovery",
                    question = $"Unknown tool '{waitingStep.ToolName}'. How would you like to proceed?",
                    options = new[] { "Skip this step", "Cancel workflow" },
                    stepToolName = waitingStep.ToolName,
                    stepDescription = waitingStep.Description,
                };
                assistantMsg.Content = $"Unknown tool '{waitingStep.ToolName}'.";
            }
            await TransitionAsync(workflow, WorkflowState.WaitingInput, ct);
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
            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "prompt";
                assistantMsg.PlanData = new
                {
                    promptType = "retry",
                    question = result.Error ?? $"Step '{waitingStep.ToolName}' failed. How would you like to proceed?",
                    options = new[] { "Retry", "Skip this step", "Cancel workflow" },
                    stepToolName = waitingStep.ToolName,
                    stepDescription = waitingStep.Description,
                };
                assistantMsg.Content = result.Error ?? $"Step '{waitingStep.ToolName}' failed.";
            }
            await db.SaveChangesAsync(ct);
            await TransitionAsync(workflow, WorkflowState.WaitingInput, ct);
            return;
        }

        if (assistantMsg != null)
        {
            assistantMsg.ContentType = "result";
            assistantMsg.Content = $"Workflow completed — all steps executed successfully in **{workflow.Domain}**.";
        }

        await db.SaveChangesAsync(ct);
        await TransitionAsync(workflow, WorkflowState.Completed, ct);
        await stateStore.DeleteAsync(workflow.Id.ToString(), ct);
    }

    public async Task<Workflow> SubmitInputAsync(Guid workflowId, string userInput, string userId, CancellationToken ct = default)
    {
        var workflow = await db.Workflows.FindAsync([workflowId], ct)
                      ?? throw new KeyNotFoundException($"Workflow {workflowId} not found");

        if (workflow.State != WorkflowState.WaitingInput)
            throw new InvalidOperationException($"Workflow {workflowId} is not waiting for input (state: {workflow.State})");

        var assistantMsg = await db.ChatMessages.FirstOrDefaultAsync(m => m.WorkflowId == workflow.Id, ct);
        var promptType = assistantMsg?.PlanData is System.Text.Json.JsonElement planData
            ? planData.TryGetProperty("promptType", out var pt) ? pt.GetString() : null
            : null;

        switch (promptType)
        {
            case "clarification":
                workflow.UserInput = $"{workflow.UserInput} — {userInput}";
                await db.SaveChangesAsync(ct);
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
                        logger.LogError(ex, "Background re-execution failed for workflow {Id}", workflow.Id);
                    }
                });
                return workflow;

            case "retry":
            case "error_recovery":
                var lower = userInput.ToLowerInvariant();
                if (lower is "cancel" or "cancel workflow")
                {
                    workflow.FailureReason = "Cancelled by user";
                    if (assistantMsg != null)
                    {
                        assistantMsg.ContentType = "text";
                        assistantMsg.Content = "Workflow cancelled.";
                    }
                    await TransitionAsync(workflow, WorkflowState.Failed, ct);
                    return workflow;
                }

                if (lower is "skip" or "skip this step")
                {
                    var nextStep = workflow.Steps.FirstOrDefault(s => s.State is WorkflowState.InProgress or WorkflowState.Failed);
                    if (nextStep != null)
                    {
                        nextStep.State = WorkflowState.Completed;
                        nextStep.CompletedAt = DateTime.UtcNow;
                        nextStep.Output = new { status = "skipped", reason = "Skipped by user" };
                    }
                    if (assistantMsg != null)
                    {
                        assistantMsg.ContentType = "text";
                        assistantMsg.Content = "Step skipped. Continuing workflow...";
                    }
                    await db.SaveChangesAsync(ct);
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
                            logger.LogError(ex, "Background re-execution failed for workflow {Id}", workflow.Id);
                        }
                    });
                    return workflow;
                }

                // Retry: re-execute the failed step
                if (assistantMsg != null)
                {
                    assistantMsg.ContentType = "text";
                    assistantMsg.Content = "Retrying...";
                }
                await db.SaveChangesAsync(ct);
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
                        logger.LogError(ex, "Background re-execution failed for workflow {Id}", workflow.Id);
                    }
                });
                return workflow;

            default:
                // Unknown prompt type — treat as new context and continue
                workflow.UserInput = userInput;
                await db.SaveChangesAsync(ct);
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
                        logger.LogError(ex, "Background re-execution failed for workflow {Id}", workflow.Id);
                    }
                });
                return workflow;
        }
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
        ChatMessage? assistantMsg = null;
        Requivo.AI.PlanResult? plan = null;
        var isResume = wf.State is WorkflowState.WaitingInput or WorkflowState.WaitingApproval;
        var hasPlan = wf.Domain is not null && wf.Steps.Count > 0;

        try
        {
            assistantMsg = await db.ChatMessages.FirstOrDefaultAsync(m => m.WorkflowId == wf.Id, ct);

            var approvalStepIndex = -1;

            if (isResume && hasPlan)
            {
                // Resume execution — skip planning, go straight to InProgress
                approvalStepIndex = ComputeApprovalStepIndex(wf);
                await TransitionAsync(wf, WorkflowState.InProgress, ct);
                if (assistantMsg != null)
                {
                    assistantMsg.ContentType = "text";
                    assistantMsg.Content = $"Resuming execution in **{wf.Domain}**...";
                }
                await db.SaveChangesAsync(ct);
                goto executeSteps;
            }

            await TransitionAsync(wf, WorkflowState.Planning, ct);

            // 1. Plan
            plan = await planner.PlanAsync(wf.UserInput, context, ct);

            if (plan.NeedsClarification)
            {
                if (assistantMsg != null)
                {
                    assistantMsg.ContentType = "prompt";
                    assistantMsg.PlanData = new
                    {
                        promptType = "clarification",
                        question = plan.ClarificationQuestion ?? "Could you provide more details?",
                        options = Array.Empty<string>(),
                        formType = plan.FormType,
                    };
                    assistantMsg.Content = plan.ClarificationQuestion ?? "Could you provide more details?";
                }
                await TransitionAsync(wf, WorkflowState.WaitingInput, ct);
                return;
            }

            wf.Domain = plan.Domain;
            wf.Steps = plan.Steps.Select((s, i) => new WorkflowStep
            {
                Index = i,
                ToolName = s.ToolName,
                Description = s.Description
            }).ToList();

            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "plan";
                assistantMsg.PlanData = new
                {
                    domain = plan.Domain.ToString(),
                    steps = plan.Steps.Select(s => new { s.ToolName, s.Description }),
                    needsClarification = false,
                    clarificationQuestion = (string?)null,
                    formType = (string?)null,
                };
                assistantMsg.Content = $"I've analyzed your request. Here's my plan across **{plan.Domain}** with {plan.Steps.Count} step{(plan.Steps.Count == 1 ? "" : "s")}.";
            }

            await TransitionAsync(wf, WorkflowState.InProgress, ct);

            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "text";
                assistantMsg.Content = $"Executing plan in **{wf.Domain}**...";
            }
            await db.SaveChangesAsync(ct);

            approvalStepIndex = ComputeApprovalStepIndex(wf);

            // 2. Execute steps
            executeSteps:
            foreach (var step in wf.Steps)
            {
                if (step.State == WorkflowState.Completed) continue;

                var plannedInput = plan is not null && step.Index < plan.Steps.Count ? plan.Steps[step.Index].Input : null;

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
                    if (assistantMsg != null)
                    {
                        assistantMsg.ContentType = "text";
                        assistantMsg.Content = $"Waiting for approval before completing **{step.ToolName}**.";
                    }
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
                    if (assistantMsg != null)
                    {
                        assistantMsg.ContentType = "prompt";
                        assistantMsg.PlanData = new
                        {
                            promptType = "retry",
                            question = result.Error ?? $"Step '{step.ToolName}' failed. How would you like to proceed?",
                            options = new[] { "Retry", "Skip this step", "Cancel workflow" },
                            stepToolName = step.ToolName,
                            stepDescription = step.Description,
                        };
                        assistantMsg.Content = result.Error ?? $"Step '{step.ToolName}' failed.";
                    }
                    await TransitionAsync(wf, WorkflowState.WaitingInput, ct);
                    return;
                }

                await db.SaveChangesAsync(ct);
            }

            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "result";
                assistantMsg.Content = $"Workflow completed — all {wf.Steps.Count} step{(wf.Steps.Count == 1 ? "" : "s")} executed successfully in **{wf.Domain}**.";
            }
            await TransitionAsync(wf, WorkflowState.Completed, ct);
            await stateStore.DeleteAsync(wf.Id.ToString(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Workflow {Id} failed", wf.Id);
            if (assistantMsg != null)
            {
                assistantMsg.ContentType = "prompt";
                assistantMsg.PlanData = new
                {
                    promptType = "error_recovery",
                    question = $"An unexpected error occurred: {ex.Message}. What would you like to do?",
                    options = new[] { "Retry", "Cancel workflow" },
                };
                assistantMsg.Content = $"An unexpected error occurred: {ex.Message}";
            }
            await TransitionAsync(wf, WorkflowState.WaitingInput, ct);
        }
    }

    private static int ComputeApprovalStepIndex(Workflow wf)
    {
        var approvalRequired = RequiresHumanApproval(wf.UserInput, wf.Domain);
        return approvalRequired && wf.Steps.Count > 0 ? wf.Steps.Count - 1 : -1;
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
