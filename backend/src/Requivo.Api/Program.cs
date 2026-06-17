using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.Text;
using Requivo.AI;
using Requivo.Core.Interfaces;
using Requivo.Infrastructure.Cache;
using Requivo.Infrastructure.Data;
using Requivo.Infrastructure.Integrations;
using Requivo.Orchestration;
using Requivo.Tools;
using Requivo.Api.Security;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;

EnvFileLoader.Load();

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// ── Database ───────────────────────────────────────────────────
builder.Services.AddDbContext<RequivoDbContext>(opt =>
    opt.UseNpgsql(cfg.GetConnectionString("Postgres")));

// ── Redis ──────────────────────────────────────────────────────
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(cfg.GetConnectionString("Redis")!));
builder.Services.AddScoped<IStateStore, RedisStateStore>();

// ── AI ─────────────────────────────────────────────────────────
builder.Services.AddHttpClient();
builder.Services.AddScoped<IQwenClient, QwenClient>();
builder.Services.AddScoped<IPromptOrchestrator, PromptOrchestrator>();

// ── Tools ──────────────────────────────────────────────────────
builder.Services.AddScoped<ITool, InventoryTool>();
builder.Services.AddScoped<ITool, ProcurementTool>();
builder.Services.AddScoped<ITool, FinanceTool>();
builder.Services.AddScoped<ITool, SalesTool>();
builder.Services.AddScoped<ITool, HRTool>();
builder.Services.AddScoped<ITool, ReportingTool>();

// ── Orchestration ──────────────────────────────────────────────
builder.Services.AddScoped<WorkflowEngine>();
builder.Services.AddScoped<IWorkflowEngine>(sp => sp.GetRequiredService<WorkflowEngine>());
builder.Services.AddScoped<IApprovalService, HitlService>();
builder.Services.AddScoped<IEmailService, SendGridEmailService>();
builder.Services.AddScoped<ISlackService, SlackService>();
builder.Services.AddScoped<IProcurementGateway, ErpProcurementGateway>();
builder.Services.AddScoped<IErpConnectionManager, ErpConnectionManager>();

// ── Auth (JWT) ─────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        // Keep JWT claims as issued (sub, role, mfa, amr) so policy checks match.
        opt.MapInboundClaims = false;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = cfg["Jwt:Issuer"],
            ValidAudience = cfg["Jwt:Audience"],
            NameClaimType = "sub",
            RoleClaimType = "role",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(cfg["Jwt:SecretKey"]!))
        };
    });
builder.Services.AddSingleton<IAuthorizationHandler, MfaRequirementHandler>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(AuthorizationPolicies.WorkflowStart, policy =>
        policy.RequireRole(AppRoles.WorkflowOperator, AppRoles.Admin));

    options.AddPolicy(AuthorizationPolicies.WorkflowRead, policy =>
        policy.RequireRole(AppRoles.WorkflowOperator, AppRoles.Auditor, AppRoles.Admin));

    options.AddPolicy(AuthorizationPolicies.ApprovalRead, policy =>
        policy.RequireRole(AppRoles.Approver, AppRoles.Admin));

    options.AddPolicy(AuthorizationPolicies.ApprovalDecide, policy =>
        policy.RequireRole(AppRoles.Approver, AppRoles.Admin));

    options.AddPolicy(AuthorizationPolicies.AuditRead, policy =>
        policy.RequireRole(AppRoles.Auditor, AppRoles.Admin));
});

// ── API / Swagger ──────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Requivo AI API",
        Version = "v1",
        Description = "Autonomous ERP operations platform. All endpoints require a valid JWT with an MFA claim. " +
                      "Use the Authorize button below to supply a Bearer token."
    });

    // JWT auth definition
    var jwtScheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Paste your JWT token here (without the 'Bearer ' prefix)."
    };
    c.AddSecurityDefinition("Bearer", jwtScheme);

    // Apply [Authorize] lock icon to all protected operations
    c.OperationFilter<Requivo.Api.Swagger.AuthorizeOperationFilter>();
});

// ── CORS ───────────────────────────────────────────────────────
var allowedCorsOrigins = cfg.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(opt => opt.AddPolicy("Frontend", p =>
    p.WithOrigins(allowedCorsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Auto-migrate and seed test users on startup ───────────────
var seedTestUsers = cfg.GetValue("Auth:SeedTestUsers", false);
if (seedTestUsers || app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<RequivoDbContext>();

    if (app.Environment.IsDevelopment())
    {
        db.Database.Migrate();
    }

    if (seedTestUsers)
    {
        await DevUserSeeder.SeedAsync(db);
    }
}

app.Run();

internal static class EnvFileLoader
{
    public static void Load()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.env")),
        };

        var envPath = candidates.FirstOrDefault(File.Exists);
        if (string.IsNullOrWhiteSpace(envPath))
        {
            return;
        }

        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#'))
            {
                continue;
            }

            var separator = trimmed.IndexOf('=');
            if (separator <= 0)
            {
                continue;
            }

            var key = trimmed[..separator].Trim();
            var value = trimmed[(separator + 1)..].Trim();

            if (value.Length >= 2 && value.StartsWith('"') && value.EndsWith('"'))
            {
                value = value[1..^1];
            }

            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
