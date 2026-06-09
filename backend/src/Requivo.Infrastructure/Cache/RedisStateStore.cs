using System.Text.Json;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using StackExchange.Redis;

namespace Requivo.Infrastructure.Cache;

public class RedisStateStore(IConnectionMultiplexer redis) : IStateStore
{
    private readonly IDatabase _db = redis.GetDatabase();
    private static string Key(string workflowId) => $"wf:ctx:{workflowId}";

    public async Task SaveAsync(WorkflowContext context, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(context);
        await _db.StringSetAsync(Key(context.WorkflowId), json, TimeSpan.FromHours(24));
    }

    public async Task<WorkflowContext?> LoadAsync(string workflowId, CancellationToken ct = default)
    {
        var json = await _db.StringGetAsync(Key(workflowId));
        if (json.IsNullOrEmpty)
            return null;

        return JsonSerializer.Deserialize<WorkflowContext>(json.ToString());
    }

    public async Task DeleteAsync(string workflowId, CancellationToken ct = default)
        => await _db.KeyDeleteAsync(Key(workflowId));
}
