using Microsoft.EntityFrameworkCore;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;

namespace Requivo.Api.Security;

public static class DevUserSeeder
{
    private const string DefaultPassword = "Pass@1234";

    private static readonly (string Email, string Role, string TotpSecret)[] Users =
    [
        ("admin.test@requivo.ai", AppRoles.Admin, "JBSWY3DPEHPK3PXP"),
        ("operator.test@requivo.ai", AppRoles.WorkflowOperator, "KRSXG5DSNFXGOIDB"),
        ("approver.test@requivo.ai", AppRoles.Approver, "GEZDGNBVGY3TQOJQ"),
        ("auditor.test@requivo.ai", AppRoles.Auditor, "MJQXGZJTGI2DSNBU"),
    ];

    public static async Task SeedAsync(RequivoDbContext db, CancellationToken ct = default)
    {
        foreach (var seed in Users)
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == seed.Email, ct);
            if (existing is null)
            {
                db.Users.Add(new AppUser
                {
                    Email = seed.Email,
                    PasswordHash = Requivo.Api.Controllers.PasswordHasher.Hash(DefaultPassword),
                    Role = seed.Role,
                    TotpSecret = seed.TotpSecret,
                    MfaEnabled = true,
                });
                continue;
            }

            existing.Role = seed.Role;
            existing.PasswordHash = Requivo.Api.Controllers.PasswordHasher.Hash(DefaultPassword);
            existing.TotpSecret = seed.TotpSecret;
            existing.MfaEnabled = true;
        }

        await db.SaveChangesAsync(ct);
    }
}
