using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Requivo.Core.Enums;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using Xunit;

namespace Requivo.Infrastructure.Tests;

public class RequivoDbContextTests
{
    private static RequivoDbContext CreateSqliteContext(SqliteConnection connection, out bool created)
        => CreateContext(connection, out created);

    private static RequivoDbContext CreateContext(SqliteConnection connection, out bool created)
    {
        var options = new DbContextOptionsBuilder<RequivoDbContext>()
            .UseSqlite(connection)
            .Options;
        var db = new RequivoDbContext(options);
        created = db.Database.EnsureCreated();
        return db;
    }

    private sealed class SqliteScope : IDisposable
    {
        private readonly SqliteConnection _connection;

        public SqliteScope()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();
            var db = CreateContext(_connection, out _);
            db.Dispose();
        }

        public string? ScalarString(string sql, (string Name, object Value) parameter)
        {
            using var command = _connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddWithValue(parameter.Name, parameter.Value);
            return command.ExecuteScalar() as string;
        }

        public RequivoDbContext NewContext()
            => new(new DbContextOptionsBuilder<RequivoDbContext>().UseSqlite(_connection).Options);

        public void Dispose() => _connection.Dispose();
    }

    private static RequivoDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RequivoDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new RequivoDbContext(options);
    }

    [Fact]
    public async Task ChatMessagePlanData_SerializesWithCamelCaseKeys()
    {
        using var scope = new SqliteScope();

        var session = new ChatSession { UserId = "user-1", Title = "Chat" };
        var message = new ChatMessage
        {
            SessionId = session.Id,
            Role = "assistant",
            Content = "plan",
            WorkflowId = Guid.NewGuid(),
            PlanData = new
            {
                Domain = "Finance",
                NeedsClarification = false,
                Steps = new[]
                {
                    new { ToolName = "FinanceTool", Description = "List invoices" }
                }
            }
        };
        session.Messages.Add(message);

        var db = scope.NewContext();
        db.ChatSessions.Add(session);
        await db.SaveChangesAsync();

        var raw = scope.ScalarString(
            "SELECT \"PlanData\" FROM \"ChatMessages\" WHERE \"Id\" = @id",
            ("@id", message.Id));

        raw.Should().NotBeNullOrEmpty();
        raw!.Should().Contain("\"domain\":\"Finance\"");
        raw.Should().Contain("\"needsClarification\":false");
        raw.Should().Contain("\"toolName\":\"FinanceTool\"");
        raw.Should().NotContain("\"Domain\"");
        raw.Should().NotContain("\"ToolName\"");
    }

    [Fact]
    public async Task WorkflowSteps_RoundTrip_PreservesOrderAndOutput()
    {
        var dbName = $"roundtrip-{Guid.NewGuid()}";
        var db = CreateInMemoryContext(dbName);

        var workflow = new Workflow
        {
            UserInput = "List overdue invoices",
            Domain = WorkflowDomain.Finance,
            State = WorkflowState.Completed,
            Steps =
            [
                new WorkflowStep { Index = 0, ToolName = "FinanceTool", Description = "List overdue invoices", State = WorkflowState.Completed, Output = new { count = 3 } }
            ]
        };

        db.Workflows.Add(workflow);
        await db.SaveChangesAsync();

        var loaded = await CreateInMemoryContext(dbName)
            .Workflows
            .AsNoTracking()
            .Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflow.Id);

        loaded.Steps.Should().ContainSingle();
        loaded.Steps[0].ToolName.Should().Be("FinanceTool");
        loaded.Steps[0].State.Should().Be(WorkflowState.Completed);
        loaded.Steps[0].Index.Should().Be(0);
    }

    [Fact]
    public async Task ApprovalRequest_SavesAndReloadsWithDecision()
    {
        using var scope = new SqliteScope();

        var approval = new ApprovalRequest
        {
            WorkflowId = Guid.NewGuid(),
            TriggerReason = "Create purchase order",
            ProposedAction = "Create PO with supplier-123",
            BusinessContext = "wf-1"
        };

        var db = scope.NewContext();
        db.ApprovalRequests.Add(approval);
        await db.SaveChangesAsync();

        var loaded = await scope.NewContext().ApprovalRequests
            .AsNoTracking()
            .SingleAsync(a => a.Id == approval.Id);

        loaded.TriggerReason.Should().Be("Create purchase order");
        loaded.ProposedAction.Should().Be("Create PO with supplier-123");
        loaded.Decision.Should().Be(ApprovalDecision.Pending);
    }
}