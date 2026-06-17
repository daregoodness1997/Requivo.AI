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
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ErpConnection> ErpConnections => Set<ErpConnection>();

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

        mb.Entity<AppUser>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
        });

        mb.Entity<ChatSession>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.UserId).IsRequired();
            e.Property(s => s.Title).IsRequired();
            e.HasIndex(s => new { s.UserId, s.UpdatedAt });
            e.HasMany(s => s.Messages)
             .WithOne(m => m.Session)
             .HasForeignKey(m => m.SessionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<ChatMessage>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.Role).IsRequired();
            e.Property(m => m.ContentType).IsRequired().HasDefaultValue("text");
            e.Property(m => m.Content).IsRequired();
            e.Property(m => m.PlanData)
             .HasConversion(v => SerializeObject(v), v => DeserializeObject(v))
             .HasColumnType("jsonb");
            e.HasIndex(m => new { m.SessionId, m.CreatedAt });
        });

        mb.Entity<ErpConnection>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasIndex(c => new { c.UserId, c.ProviderId }).IsUnique();
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
