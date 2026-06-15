using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using System.Diagnostics;
using System.Text.Json;

namespace Requivo.Tools;

/// <summary>Supplier selection, purchase order creation and submission</summary>
public class ProcurementTool(
    ILogger<ProcurementTool> logger,
    IProcurementGateway procurementGateway) : ITool
{
    public string Name => "ProcurementTool";
    public string Description => "Supplier selection, purchase order creation and submission";

    public async Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var stopwatch = Stopwatch.StartNew();
            var request = ParseRequest(input, context);
            var response = await procurementGateway.CreatePurchaseOrderAsync(request, context, ct);
            stopwatch.Stop();

            return new ToolResult
            {
                Success = true,
                Data = response,
                Metadata = new ToolMetadata
                {
                    Source = response.SourceSystem,
                    Latency = stopwatch.ElapsedMilliseconds,
                }
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return new ToolResult { Success = false, Error = ex.Message };
        }
    }

    private static CreatePurchaseOrderRequest ParseRequest(object? input, WorkflowContext context)
    {
        if (input is null)
        {
            throw new InvalidOperationException(
                "ProcurementTool requires structured input. Provide supplierId and at least one line item.");
        }

        var request = input switch
        {
            JsonElement jsonElement => JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(jsonElement.GetRawText()),
            string rawJson => JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(rawJson),
            _ => JsonSerializer.Deserialize<CreatePurchaseOrderRequest>(JsonSerializer.Serialize(input))
        };

        if (request is null)
        {
            throw new InvalidOperationException("Procurement input is invalid JSON.");
        }

        request.IdempotencyKey ??= $"{context.WorkflowId}:{context.StepIndex}:create-po";
        request.RequestedBy ??= context.UserId;

        if (string.IsNullOrWhiteSpace(request.SupplierId))
        {
            throw new InvalidOperationException("Procurement input is missing supplierId.");
        }

        if (request.Lines.Count == 0)
        {
            throw new InvalidOperationException("Procurement input must include at least one line item.");
        }

        if (request.Lines.Any(line => string.IsNullOrWhiteSpace(line.Sku) || line.Quantity <= 0 || line.UnitPrice < 0))
        {
            throw new InvalidOperationException(
                "Each line item must include sku, quantity > 0 and unitPrice >= 0.");
        }

        return request;
    }
}
