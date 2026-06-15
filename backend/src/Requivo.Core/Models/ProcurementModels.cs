namespace Requivo.Core.Models;

public class CreatePurchaseOrderRequest
{
    public string SupplierId { get; set; } = string.Empty;
    public string Currency { get; set; } = "USD";
    public string? CostCenter { get; set; }
    public string? Notes { get; set; }
    public string? RequestedBy { get; set; }
    public string? IdempotencyKey { get; set; }
    public List<PurchaseOrderLine> Lines { get; set; } = [];
}

public class PurchaseOrderLine
{
    public string Sku { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Description { get; set; }
}

public class CreatePurchaseOrderResponse
{
    public string ExternalOrderId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = string.Empty;
    public string? ExternalDocumentUrl { get; set; }
    public object? RawResponse { get; set; }
}