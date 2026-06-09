using Microsoft.AspNetCore.Authorization;

namespace Requivo.Api.Security;

public sealed class MfaRequirement : IAuthorizationRequirement;

public sealed class MfaRequirementHandler : AuthorizationHandler<MfaRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, MfaRequirement requirement)
    {
        if (HasMfa(context.User))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }

    private static bool HasMfa(System.Security.Claims.ClaimsPrincipal user)
    {
        // Common JWT shapes:
        // - amr: "mfa" or array-like values including mfa
        // - mfa: true|1
        if (user.HasClaim(c => c.Type.Equals("mfa", StringComparison.OrdinalIgnoreCase)
                               && (string.Equals(c.Value, "true", StringComparison.OrdinalIgnoreCase)
                                   || c.Value == "1")))
            return true;

        return user.HasClaim(c => c.Type.Equals("amr", StringComparison.OrdinalIgnoreCase)
                                  && c.Value.Contains("mfa", StringComparison.OrdinalIgnoreCase));
    }
}