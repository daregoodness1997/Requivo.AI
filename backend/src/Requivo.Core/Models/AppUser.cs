namespace Requivo.Core.Models;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>TOTP secret used to verify MFA codes (Base32-encoded).</summary>
    public string? TotpSecret { get; set; }
    public bool MfaEnabled { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
