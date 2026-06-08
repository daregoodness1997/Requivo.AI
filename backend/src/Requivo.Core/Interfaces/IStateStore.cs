using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface IStateStore
{
    Task SaveAsync(WorkflowContext context, CancellationToken ct = default);
    Task<WorkflowContext?> LoadAsync(string workflowId, CancellationToken ct = default);
    Task DeleteAsync(string workflowId, CancellationToken ct = default);
}
