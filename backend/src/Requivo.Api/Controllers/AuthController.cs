using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Requivo.Api.Security;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using System.Security.Cryptography;

namespace Requivo.Api.Controllers;

/// <summary>Issues and refreshes JWT access tokens.</summary>
[ApiController]
[Route("api/auth")]
public class AuthController(
    RequivoDbContext db,
    ITokenService tokens) : ControllerBase
{
    // ── POST /api/auth/register ──────────────────────────────────────────────
    /// <summary>Create a new user account. Returns the created user (no token – MFA setup required).</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email, ct))
            return Conflict(new { message = "Email already registered." });

        var user = new AppUser
        {
            Email = req.Email,
            PasswordHash = PasswordHasher.Hash(req.Password),
            Role = req.Role ?? AppRoles.WorkflowOperator,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Register), new RegisterResponse(user.Id, user.Email, user.Role));
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    /// <summary>
    /// Login with email + password (+ optional TOTP code when MFA is enabled for the account).
    /// Returns a short-lived JWT access token and a refresh token.
    /// The token will contain <c>mfa=true</c> and <c>amr=mfa</c> claims only when TOTP was validated.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email, ct);
        if (user is null || !PasswordHasher.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });

        bool mfaVerified = false;

        if (user.MfaEnabled)
        {
            if (string.IsNullOrEmpty(req.TotpCode))
                return Unauthorized(new { message = "MFA required. Supply a TOTP code.", mfaRequired = true });

            if (!VerifyTotp(user.TotpSecret!, req.TotpCode))
                return Unauthorized(new { message = "Invalid TOTP code." });

            mfaVerified = true;
        }

        var accessToken = tokens.GenerateAccessToken(user, mfaVerified);
        var refreshToken = tokens.GenerateRefreshToken();

        return Ok(new TokenResponse(accessToken, refreshToken, mfaVerified));
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────────
    /// <summary>Return the currently authenticated user profile, including MFA status.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")!.Value);
        var user = await db.Users.FindAsync([userId], ct)
                     ?? throw new KeyNotFoundException();

        return Ok(new MeResponse(user.Id, user.Email, user.Role, user.MfaEnabled, user.CreatedAt));
    }

    // ── POST /api/auth/mfa/setup ─────────────────────────────────────────────
    /// <summary>
    /// Generate (or rotate) a TOTP secret for the authenticated user.
    /// Returns the Base32 secret and otpauth URI for QR code generation.
    /// MFA is not enabled until <c>/api/auth/mfa/verify</c> succeeds.
    /// </summary>
    [HttpPost("mfa/setup")]
    [Authorize]
    [ProducesResponseType(typeof(MfaSetupResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MfaSetup(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")!.Value);
        var user = await db.Users.FindAsync([userId], ct)
                     ?? throw new KeyNotFoundException();

        var secret = GenerateTotpSecret();
        user.TotpSecret = secret;
        await db.SaveChangesAsync(ct);

        var issuer = "Requivo";
        var label = Uri.EscapeDataString($"{issuer}:{user.Email}");
        var otpUri =
            $"otpauth://totp/{label}?secret={secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits=6&period=30";
        return Ok(new MfaSetupResponse(secret, otpUri));
    }

    // ── POST /api/auth/mfa/verify ────────────────────────────────────────────
    /// <summary>Confirm a TOTP code and enable MFA for the authenticated user. Re-issue a token with the mfa claim.</summary>
    [HttpPost("mfa/verify")]
    [Authorize]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MfaVerify([FromBody] MfaVerifyRequest req, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")!.Value);
        var user = await db.Users.FindAsync([userId], ct)
                     ?? throw new KeyNotFoundException();

        if (!VerifyTotp(user.TotpSecret!, req.TotpCode))
            return BadRequest(new { message = "Invalid TOTP code." });

        user.MfaEnabled = true;
        await db.SaveChangesAsync(ct);

        var accessToken = tokens.GenerateAccessToken(user, mfaVerified: true);
        var refreshToken = tokens.GenerateRefreshToken();
        return Ok(new TokenResponse(accessToken, refreshToken, MfaVerified: true));
    }

    // ── POST /api/auth/mfa/disable ───────────────────────────────────────────
    /// <summary>Disable MFA for the authenticated user after verifying a current TOTP code.</summary>
    [HttpPost("mfa/disable")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MfaDisable([FromBody] MfaDisableRequest req, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirst("sub")!.Value);
        var user = await db.Users.FindAsync([userId], ct)
                     ?? throw new KeyNotFoundException();

        if (!user.MfaEnabled || string.IsNullOrEmpty(user.TotpSecret))
            return BadRequest(new { message = "MFA is not enabled for this account." });

        if (!VerifyTotp(user.TotpSecret, req.TotpCode))
            return BadRequest(new { message = "Invalid TOTP code." });

        user.MfaEnabled = false;
        user.TotpSecret = null;
        await db.SaveChangesAsync(ct);

        return Ok(new MeResponse(user.Id, user.Email, user.Role, user.MfaEnabled, user.CreatedAt));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GenerateTotpSecret()
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(20);
        return new string(bytes.Select(b => alphabet[b % 32]).ToArray());
    }

    private static bool VerifyTotp(string base32Secret, string code)
    {
        // Accept one window before/after for clock drift
        var key = Base32Decode(base32Secret);
        var step = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30;
        for (long i = step - 1; i <= step + 1; i++)
        {
            if (ComputeTotp(key, i) == code)
                return true;
        }
        return false;
    }

    private static string ComputeTotp(byte[] key, long counter)
    {
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(counterBytes);

        using var hmac = new System.Security.Cryptography.HMACSHA1(key);
        var hash = hmac.ComputeHash(counterBytes);
        var offset = hash[^1] & 0x0F;
        var code = ((hash[offset] & 0x7F) << 24 |
                       hash[offset + 1] << 16 |
                       hash[offset + 2] << 8 |
                       hash[offset + 3]) % 1_000_000;
        return code.ToString("D6");
    }

    private static byte[] Base32Decode(string input)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        input = input.ToUpperInvariant().TrimEnd('=');
        var bits = 0;
        var count = 0;
        var result = new List<byte>();
        foreach (var c in input)
        {
            var val = chars.IndexOf(c);
            if (val < 0) continue;
            bits = (bits << 5) | val;
            count += 5;
            if (count >= 8) { count -= 8; result.Add((byte)(bits >> count)); }
        }
        return result.ToArray();
    }
}

// ── Password hashing (PBKDF2-SHA256, no external packages) ──────────────────
internal static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, HashSize);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var expected = Convert.FromBase64String(parts[1]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, HashSize);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

// ── Request / Response DTOs ───────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string? Role);
public record RegisterResponse(Guid Id, string Email, string Role);
public record LoginRequest(string Email, string Password, string? TotpCode);
public record TokenResponse(string AccessToken, string RefreshToken, bool MfaVerified);
public record MeResponse(Guid Id, string Email, string Role, bool MfaEnabled, DateTime CreatedAt);
public record MfaSetupResponse(string Secret, string OtpAuthUri);
public record MfaVerifyRequest(string TotpCode);
public record MfaDisableRequest(string TotpCode);
