namespace Requivo.Core.Interfaces;

/// <summary>
/// Defines the credential fields a provider requires and whether a base URL is mandatory.
/// Used to validate <see cref="ConnectErpRequest"/> before persisting a connection.
/// </summary>
public record ProviderCredentialSpec(
    string ProviderId,
    string AuthMethod,
    bool RequiresBaseUrl,
    string[] RequiredCredentialKeys
);

public interface IProviderCredentialRegistry
{
    ProviderCredentialSpec? GetSpec(string providerId);
}

public static class ProviderCredentialSpecs
{
    public static readonly ProviderCredentialSpec[] All = [
        new("sap",       "OAuth 2.0 Client Credentials", true,  ["clientId", "clientSecret"]),
        new("quickbooks","OAuth 2.0 Authorization Code", false, ["clientId", "clientSecret"]),
        new("zoho",      "OAuth 2.0 Authorization Code", false, ["clientId", "clientSecret"]),
        new("netsuite",  "Token-Based Authentication",   true,  ["accountId", "consumerKey", "consumerSecret", "tokenId", "tokenSecret"]),
        new("dynamics",  "OAuth 2.0 via Entra ID",       true,  ["clientId", "clientSecret", "tenantId"]),
        new("salesforce","OAuth 2.0 Connected App",      true,  ["consumerKey", "consumerSecret"]),
        new("xero",      "OAuth 2.0 with PKCE",          false, ["clientId"]),
        new("odoo",      "XML-RPC / API Key",            true,  ["database", "username", "apiKey"]),
    ];
}
