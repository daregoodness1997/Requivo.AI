using System.Text.Json;
using Microsoft.Extensions.Logging;
using Requivo.Core.Enums;
using Requivo.Core.Models;

namespace Requivo.AI;

public record PlanResult(WorkflowDomain Domain, List<PlannedStep> Steps, bool NeedsClarification, string? ClarificationQuestion);
public record PlannedStep(string ToolName, string Description, object? Input);

public interface IPromptOrchestrator
{
    Task<PlanResult> PlanAsync(string userInput, WorkflowContext context, CancellationToken ct = default);
}

public class PromptOrchestrator(IQwenClient qwen, ILogger<PromptOrchestrator> logger) : IPromptOrchestrator
{
    private const string SystemPrompt = """
        You are Requivo AI, an autonomous ERP operations agent.
        Given a natural language business request, return a JSON plan with the shape:
        {
          "domain": "Inventory|Procurement|Finance|Sales|HR|Reporting",
          "needsClarification": false,
          "clarificationQuestion": null,
          "steps": [
            { "toolName": "InventoryTool", "description": "Check stock levels for office chairs", "input": {} }
          ]
        }
        Available tools: InventoryTool, ProcurementTool, FinanceTool, SalesTool, HRTool, ReportingTool.
        Respond ONLY with valid JSON. No markdown.
        """;

    public async Task<PlanResult> PlanAsync(string userInput, WorkflowContext context, CancellationToken ct = default)
    {
        var messages = new List<QwenMessage>
        {
            new("system", SystemPrompt),
            new("user", userInput)
        };

        var response = await qwen.CompleteAsync(messages, ct);

        try
        {
            var doc = JsonSerializer.Deserialize<JsonElement>(response.Content);
            var domain   = Enum.Parse<WorkflowDomain>(doc.GetProperty("domain").GetString()!);
            var needsQ   = doc.GetProperty("needsClarification").GetBoolean();
            var clarQ    = doc.TryGetProperty("clarificationQuestion", out var cq) ? cq.GetString() : null;
            var steps    = doc.GetProperty("steps").EnumerateArray()
                              .Select(s => new PlannedStep(
                                  s.GetProperty("toolName").GetString()!,
                                  s.GetProperty("description").GetString()!,
                                  s.TryGetProperty("input", out var inp) ? inp : (object?)null))
                              .ToList();

            return new PlanResult(domain, steps, needsQ, clarQ);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse Qwen plan response: {Raw}", response.Content);
            throw new InvalidOperationException("Qwen returned an unparseable plan.", ex);
        }
    }
}
