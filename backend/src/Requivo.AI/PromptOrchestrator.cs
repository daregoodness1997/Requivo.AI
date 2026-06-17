using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Requivo.Core.Enums;
using Requivo.Core.Models;

namespace Requivo.AI;

public record PlanResult(WorkflowDomain Domain, List<PlannedStep> Steps, bool NeedsClarification, string? ClarificationQuestion, string? FormType = null);
public record PlannedStep(string ToolName, string Description, object? Input);

public interface IPromptOrchestrator
{
    Task<PlanResult> PlanAsync(string userInput, WorkflowContext context, CancellationToken ct = default);
}

public class PromptOrchestrator(
    IQwenClient qwen,
    IConfiguration config,
    ILogger<PromptOrchestrator> logger) : IPromptOrchestrator
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
                For ProcurementTool create-purchase-order steps, input MUST include:
                {
                    "supplierId": "supplier-123",
                    "currency": "USD",
                    "costCenter": "OPS",
                    "notes": "optional",
                    "idempotencyKey": "optional-stable-key",
                    "lines": [
                        { "sku": "CHAIR-001", "quantity": 50, "unitPrice": 70.00, "description": "Office chair" }
                    ]
                }
        Available tools: InventoryTool, ProcurementTool, FinanceTool, SalesTool, HRTool, ReportingTool.
        Respond ONLY with valid JSON. No markdown.
        """;

    public async Task<PlanResult> PlanAsync(string userInput, WorkflowContext context, CancellationToken ct = default)
    {
        var apiKey = config["Qwen:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogInformation("Qwen API key not configured. Using local fallback planner.");
            return BuildFallbackPlan(userInput);
        }

        var messages = new List<QwenMessage>
        {
            new("system", SystemPrompt),
            new("user", userInput)
        };

        QwenResponse? response = null;
        try
        {
            response = await qwen.CompleteAsync(messages, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Qwen planning unavailable. Falling back to local planner.");
            return BuildFallbackPlan(userInput);
        }

        try
        {
            var doc = JsonSerializer.Deserialize<JsonElement>(response.Content);
            var domain = Enum.Parse<WorkflowDomain>(doc.GetProperty("domain").GetString()!);
            var needsQ = doc.GetProperty("needsClarification").GetBoolean();
            var clarQ = doc.TryGetProperty("clarificationQuestion", out var cq) ? cq.GetString() : null;
            var steps = doc.GetProperty("steps").EnumerateArray()
                              .Select(s => new PlannedStep(
                                  s.GetProperty("toolName").GetString()!,
                                  s.GetProperty("description").GetString()!,
                                  s.TryGetProperty("input", out var inp) ? inp : (object?)null))
                              .ToList();
            var formType = doc.TryGetProperty("formType", out var ft) ? ft.GetString() : null;

            return new PlanResult(domain, steps, needsQ, clarQ, formType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse Qwen plan response: {Raw}", response.Content);
            return BuildFallbackPlan(userInput);
        }
    }

    private static PlanResult BuildFallbackPlan(string userInput)
    {
        var input = userInput.Trim();
        var lower = input.ToLowerInvariant();

        if (ContainsAny(lower, "invoice", "payment", "pay", "due", "overdue"))
        {
            return new PlanResult(
                WorkflowDomain.Finance,
                [new PlannedStep("FinanceTool", input, null)],
                NeedsClarification: false,
                ClarificationQuestion: null);
        }

        if (ContainsAny(lower, "purchase order", "procurement", "supplier", "po"))
        {
            return new PlanResult(
                WorkflowDomain.Procurement,
                Steps: [],
                NeedsClarification: true,
                ClarificationQuestion: "To create a purchase order, provide supplier ID, line items (SKU, quantity, unit price), and optional currency/cost center.",
                FormType: "purchase_order");
        }

        if (ContainsAny(lower, "inventory", "stock", "warehouse", "sku", "restock"))
        {
            return new PlanResult(
                WorkflowDomain.Inventory,
                [new PlannedStep("InventoryTool", input, null)],
                NeedsClarification: false,
                ClarificationQuestion: null);
        }

        if (ContainsAny(lower, "sales", "quote", "order", "customer", "deal"))
        {
            return new PlanResult(
                WorkflowDomain.Sales,
                [new PlannedStep("SalesTool", input, null)],
                NeedsClarification: false,
                ClarificationQuestion: null);
        }

        if (ContainsAny(lower, "employee", "hr", "onboarding", "offboarding", "leave"))
        {
            return new PlanResult(
                WorkflowDomain.HR,
                [new PlannedStep("HRTool", input, null)],
                NeedsClarification: false,
                ClarificationQuestion: null);
        }

        if (ContainsAny(lower, "report", "kpi", "dashboard", "analytics"))
        {
            return new PlanResult(
                WorkflowDomain.Reporting,
                [new PlannedStep("ReportingTool", input, null)],
                NeedsClarification: false,
                ClarificationQuestion: null);
        }

        return new PlanResult(
            WorkflowDomain.Reporting,
            [new PlannedStep("ReportingTool", input, null)],
            NeedsClarification: false,
            ClarificationQuestion: null);
    }

    private static bool ContainsAny(string value, params string[] terms)
        => terms.Any(value.Contains);
}
