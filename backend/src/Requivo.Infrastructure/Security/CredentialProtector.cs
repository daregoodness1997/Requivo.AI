using Microsoft.AspNetCore.DataProtection;
using Requivo.Core.Interfaces;

namespace Requivo.Infrastructure.Security;

public class CredentialProtector(IDataProtectionProvider provider) : ICredentialProtector
{
    private readonly IDataProtector _protector = provider.CreateProtector("Requivo.ErpCredentials");

    public string Encrypt(string plaintext)
        => _protector.Protect(plaintext);

    public string Decrypt(string ciphertext)
        => _protector.Unprotect(ciphertext);
}
