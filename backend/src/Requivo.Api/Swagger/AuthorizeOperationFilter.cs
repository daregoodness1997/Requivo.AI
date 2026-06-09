using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Reflection;

namespace Requivo.Api.Swagger;

public class AuthorizeOperationFilter : IOperationFilter
{
    private static readonly OpenApiSecurityRequirement BearerRequirement = new()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Id   = "Bearer",
                    Type = ReferenceType.SecurityScheme
                }
            },
            Array.Empty<string>()
        }
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Collect [Authorize] attributes from controller + action
        var methodAttrs = context.MethodInfo.GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        var controllerAttrs = context.MethodInfo.DeclaringType?
                                     .GetCustomAttributes<AuthorizeAttribute>(inherit: true)
                              ?? Enumerable.Empty<AuthorizeAttribute>();

        var allAuthorize = methodAttrs.Union(controllerAttrs).ToList();

        if (!allAuthorize.Any())
            return;

        // Add lock icon / security requirement
        operation.Security.Add(BearerRequirement);

        // Collect roles and policies for description
        var roles = allAuthorize.Where(a => !string.IsNullOrEmpty(a.Roles))
                                   .SelectMany(a => a.Roles!.Split(','))
                                   .Select(r => r.Trim())
                                   .Distinct()
                                   .ToList();

        var policies = allAuthorize.Where(a => !string.IsNullOrEmpty(a.Policy))
                                   .Select(a => a.Policy!.Trim())
                                   .Distinct()
                                   .ToList();

        var notes = new List<string> { "**Requires authentication + MFA**." };
        if (policies.Any())
            notes.Add($"Policy: `{string.Join("`, `", policies)}`");
        if (roles.Any())
            notes.Add($"Roles: `{string.Join("`, `", roles)}`");

        var suffix = string.Join("  \n", notes);
        operation.Description = string.IsNullOrWhiteSpace(operation.Description)
            ? suffix
            : $"{operation.Description}  \n\n{suffix}";

        // Mark 401 / 403 responses
        operation.Responses.TryAdd("401", new OpenApiResponse { Description = "Unauthorized – missing or invalid token / MFA not verified." });
        operation.Responses.TryAdd("403", new OpenApiResponse { Description = "Forbidden – authenticated but insufficient role or policy." });
    }
}
