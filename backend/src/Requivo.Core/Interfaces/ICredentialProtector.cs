namespace Requivo.Core.Interfaces;

public interface ICredentialProtector
{
    string Encrypt(string plaintext);
    string Decrypt(string ciphertext);
}
