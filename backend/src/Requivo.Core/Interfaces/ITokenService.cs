using Requivo.Core.Models;

namespace Requivo.Core.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(AppUser user, bool mfaVerified);
    string GenerateRefreshToken();
}
