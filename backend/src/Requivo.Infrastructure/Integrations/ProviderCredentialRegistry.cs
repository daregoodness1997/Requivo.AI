using Requivo.Core.Interfaces;

namespace Requivo.Infrastructure.Integrations;

public class ProviderCredentialRegistry : IProviderCredentialRegistry
{
    private readonly Dictionary<string, ProviderCredentialSpec> _specs =
        ProviderCredentialSpecs.All.ToDictionary(s => s.ProviderId);

    public ProviderCredentialSpec? GetSpec(string providerId)
        => _specs.GetValueOrDefault(providerId);
}
