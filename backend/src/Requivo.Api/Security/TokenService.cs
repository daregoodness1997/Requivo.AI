using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Requivo.Api.Security;

public class TokenService(IConfiguration cfg) : ITokenService
{
    public string GenerateAccessToken(AppUser user, bool mfaVerified)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new("role", user.Role),
        };

        if (mfaVerified)
        {
            claims.Add(new Claim("amr", "mfa"));
            claims.Add(new Claim("mfa", "true"));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: cfg["Jwt:Issuer"],
            audience: cfg["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
