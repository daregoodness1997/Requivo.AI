using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface IWorkflowEngine
{
    Task<Workflow> StartAsync(string userInput, string userId, CancellationToken ct = default);
    Task<Workflow> GetAsync(Guid workflowId, CancellationToken ct = default);
    Task<IReadOnlyList<Workflow>> ListAsync(string userId, CancellationToken ct = default);
}
