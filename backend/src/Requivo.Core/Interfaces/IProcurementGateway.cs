using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface IProcurementGateway
{
    Task<CreatePurchaseOrderResponse> CreatePurchaseOrderAsync(
        CreatePurchaseOrderRequest request,
        WorkflowContext context,
        CancellationToken ct = default);
}