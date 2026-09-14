using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

public partial class FinanceTool(ILogger<FinanceTool> logger) : ITool
{
    private static readonly InvoiceRecord[] Invoices =
    [
        new("INV-2041", "Acme Corp", 4500, "USD", DateTime.UtcNow.AddDays(3), "Due"),
        new("INV-2087", "Northwind Logistics", 1250, "USD", DateTime.UtcNow.AddDays(6), "Due"),
        new("INV-1994", "Delta Office Supplies", 980, "USD", DateTime.UtcNow.AddDays(-2), "Overdue"),
        new("INV-1908", "City Utilities", 730, "USD", DateTime.UtcNow.AddDays(-9), "Paid"),
    ];

    public string Name => "FinanceTool";
    public string Description => "Invoice listing, payment processing, expense logging";

    public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var result = HandleFinance(context.UserInput, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = false, Error = ex.Message });
        }
    }

    private static object HandleFinance(string userInput, int stepIndex)
    {
        var normalized = userInput.ToLowerInvariant();

        // Handle pay action
        if (IsPayAction(normalized))
        {
            var invoiceId = ExtractInvoiceId(normalized);
            var invoice = Invoices.FirstOrDefault(i =>
                i.Id.Equals(invoiceId, StringComparison.OrdinalIgnoreCase));
            if (invoice is not null)
            {
                return new
                {
                    type = "payment_result",
                    invoiceId = invoice.Id,
                    vendor = invoice.Vendor,
                    amount = invoice.Amount,
                    currency = invoice.Currency,
                    status = "paid",
                    message = $"Payment of {FormatAmount(invoice.Amount, invoice.Currency)} to {invoice.Vendor} (invoice {invoice.Id}) has been processed.",
                };
            }
        }

        if (IsInvoiceListRequest(normalized))
        {
            var matched = GetMatchingInvoices(normalized);
            return new
            {
                type = "invoice_list",
                count = matched.Length,
                items = matched.Select(i => new
                {
                    i.Id,
                    i.Vendor,
                    i.Amount,
                    i.Currency,
                    i.DueDate,
                    i.Status,
                    actions = BuildActions(i),
                }).ToArray(),
            };
        }

        return new { status = "ok", domain = "Finance", step = stepIndex };
    }

    private static bool IsInvoiceListRequest(string normalized)
        => InvoicesRegex().IsMatch(normalized) || InvoiceIdRegex().IsMatch(normalized);

    private static bool IsPayAction(string normalized)
        => PayInvoiceRegex().IsMatch(normalized);

    private static string? ExtractInvoiceId(string normalized)
    {
        var match = InvoiceIdRegex().Match(normalized);
        return match.Success ? match.Groups[1].Value.ToUpperInvariant() : null;
    }

    private static InvoiceRecord[] GetMatchingInvoices(string normalized)
    {
        // Check for a specific invoice ID first
        var invoiceId = ExtractInvoiceId(normalized);
        if (invoiceId is not null)
        {
            var found = Invoices.FirstOrDefault(i =>
                i.Id.Equals(invoiceId, StringComparison.OrdinalIgnoreCase));
            return found is not null ? [found] : [];
        }

        if (OverdueRegex().IsMatch(normalized))
            return [.. Invoices.Where(i => i.Status == "Overdue")];

        if (PaidRegex().IsMatch(normalized))
            return [.. Invoices.Where(i => i.Status == "Paid")];

        if (DueOpenUnpaidRegex().IsMatch(normalized))
            return [.. Invoices.Where(i => i.Status is "Due" or "Overdue")];

        return [.. Invoices];
    }

    private static object[] BuildActions(InvoiceRecord invoice)
    {
        var canPay = invoice.Status is "Due" or "Overdue";
        var actions = new List<object>
        {
            new { key = "view", label = $"View invoice", prompt = $"View invoice {invoice.Id} details" },
        };
        if (canPay)
        {
            actions.Add(new { key = "pay", label = "Pay invoice", prompt = $"Pay invoice {invoice.Id} to {invoice.Vendor} for ${invoice.Amount:N0}" });
        }
        return [.. actions];
    }

    private static string FormatAmount(decimal amount, string currency)
        => new System.Globalization.CultureInfo("en-US").NumberFormat switch
        {
            var fmt => $"{currency} {amount:N2}"
        };

    [GeneratedRegex(@"\binvoice(s)?\b")]
    private static partial Regex InvoicesRegex();

    [GeneratedRegex(@"\b(inv-\d{3,8})\b")]
    private static partial Regex InvoiceIdRegex();

    [GeneratedRegex(@"\bpay\b.*\binv-\d{3,8}\b")]
    private static partial Regex PayInvoiceRegex();

    [GeneratedRegex(@"\boverdue\b")]
    private static partial Regex OverdueRegex();

    [GeneratedRegex(@"\bpaid\b")]
    private static partial Regex PaidRegex();

    [GeneratedRegex(@"\bdue\b|\bopen\b|\bunpaid\b")]
    private static partial Regex DueOpenUnpaidRegex();

    private sealed record InvoiceRecord(string Id, string Vendor, decimal Amount, string Currency, DateTime DueDate, string Status);
}
