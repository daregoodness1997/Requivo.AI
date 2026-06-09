using Microsoft.EntityFrameworkCore;
using Requivo.Core.Models;
using System.Text.Json;

namespace Requivo.Infrastructure.Data;

public class RequivoDbContext(DbContextOptions<RequivoDbContext> options) : DbContext(options)
{
    private static string? SerializeObject(object? value)
        => value is null ? null : JsonSerializer.Serialize(value);

    private static object? DeserializeObject(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : JsonSerializer.Deserialize<object>(value);

    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Workflow>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.State).HasConversion<string>();
            e.Property(w => w.Domain).HasConversion<string>();
            e.OwnsMany(w => w.Steps, s =>
            {
                s.WithOwner().HasForeignKey("WorkflowId");
                s.Property(x => x.State).HasConversion<string>();
                s.Property(x => x.Output)
                 .HasConversion(v => SerializeObject(v), v => DeserializeObject(v))
                 .HasColumnType("jsonb");
            });
        });

        mb.Entity<ApprovalRequest>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Decision).HasConversion<string>();
        });

        mb.Entity<AuditEntry>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.WorkflowId);
            e.HasIndex(a => a.Timestamp);
            e.Property(a => a.InputData)
             .HasConversion(v => SerializeObject(v), v => DeserializeObject(v))
             .HasColumnType("jsonb");
            e.Property(a => a.OutputData)
             .HasConversion(v => SerializeObject(v), v => DeserializeObject(v))
             .HasColumnType("jsonb");
        });
    }
}
