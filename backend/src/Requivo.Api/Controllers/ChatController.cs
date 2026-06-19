using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Requivo.Api.Security;
using Requivo.Core.Enums;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Data;
using Requivo.Orchestration;

namespace Requivo.Api.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController(
    RequivoDbContext db,
    IWorkflowEngine engine,
    IServiceScopeFactory scopeFactory,
    ILogger<ChatController> logger) : ControllerBase
{
    [HttpGet("sessions")]
    [Authorize(Policy = AuthorizationPolicies.WorkflowRead)]
    public async Task<IActionResult> ListSessions(CancellationToken ct)
    {
        var userId = GetUserId();

        var sessions = await db.ChatSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.UpdatedAt)
            .Take(100)
            .Select(s => new ChatSessionDto(
                s.Id,
                s.Title,
                s.CreatedAt,
                s.UpdatedAt,
                db.ChatMessages
                    .Where(m => m.SessionId == s.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => m.Content)
                    .FirstOrDefault() ?? string.Empty
            ))
            .ToListAsync(ct);

        return Ok(sessions);
    }

    [HttpGet("sessions/{sessionId:guid}/messages")]
    [Authorize(Policy = AuthorizationPolicies.WorkflowRead)]
    public async Task<IActionResult> ListMessages(Guid sessionId, CancellationToken ct)
    {
        var userId = GetUserId();
        var exists = await db.ChatSessions.AnyAsync(s => s.Id == sessionId && s.UserId == userId, ct);
        if (!exists) return NotFound();

        var messages = await db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ChatMessageDto(m.Id, m.SessionId, m.Role, m.ContentType, m.Content, m.WorkflowId, m.PlanData, m.CreatedAt))
            .ToListAsync(ct);

        return Ok(messages);
    }

    [HttpPost("messages")]
    [Authorize(Policy = AuthorizationPolicies.WorkflowStart)]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            return BadRequest(new { message = "Message content is required." });

        var userId = GetUserId();
        ChatSession session;

        if (req.SessionId is null)
        {
            session = new ChatSession
            {
                UserId = userId,
                Title = BuildTitle(req.Content),
            };
            db.ChatSessions.Add(session);
            await db.SaveChangesAsync(ct);
        }
        else
        {
            session = await db.ChatSessions.FirstOrDefaultAsync(s => s.Id == req.SessionId && s.UserId == userId, ct)
                      ?? throw new KeyNotFoundException("Chat session not found.");
        }

        // Save user message early so it's visible regardless of the path
        var userMessage = new ChatMessage
        {
            SessionId = session.Id,
            Role = "user",
            Content = req.Content.Trim(),
        };
        db.ChatMessages.Add(userMessage);

        // Check if the session has a workflow waiting for user input
        var waitingWorkflowId = await db.ChatMessages
            .Where(m => m.SessionId == session.Id && m.WorkflowId != null)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => m.WorkflowId)
            .FirstOrDefaultAsync(ct);

        if (waitingWorkflowId.HasValue)
        {
            var wf = await db.Workflows.FindAsync([waitingWorkflowId.Value], ct);
            if (wf?.State == WorkflowState.WaitingInput)
            {
                session.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);

                await engine.SubmitInputAsync(wf.Id, req.Content.Trim(), userId, ct);

                return Ok(new
                {
                    session = new ChatSessionDto(session.Id, session.Title, session.CreatedAt, session.UpdatedAt, userMessage.Content),
                    userMessage = new ChatMessageDto(userMessage.Id, userMessage.SessionId, userMessage.Role, userMessage.ContentType, userMessage.Content, userMessage.WorkflowId, userMessage.PlanData, userMessage.CreatedAt),
                    assistantMessage = (object?)null,
                    workflow = wf,
                });
            }
        }

        // Normal flow: create workflow, persist messages, then start background execution
        // (messages must be saved before background execution queries them)
        var workflow = new Workflow { UserInput = req.Content.Trim() };
        db.Workflows.Add(workflow);
        await db.SaveChangesAsync(ct);

        var assistantMessage = new ChatMessage
        {
            SessionId = session.Id,
            Role = "assistant",
            ContentType = "thinking",
            Content = "Analyzing your request...",
            WorkflowId = workflow.Id,
        };
        db.ChatMessages.Add(assistantMessage);
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Start background execution after messages are persisted
        var capturedWorkflowId = workflow.Id;
        var capturedUserId = userId;
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var scopedEngine = scope.ServiceProvider.GetRequiredService<WorkflowEngine>();
                await scopedEngine.ExecuteWorkflowAsync(capturedWorkflowId, capturedUserId, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background execution failed for workflow {Id}", capturedWorkflowId);
            }
        });

        return Ok(new SendChatMessageResponse(
            new ChatSessionDto(session.Id, session.Title, session.CreatedAt, session.UpdatedAt, assistantMessage.Content),
            new ChatMessageDto(userMessage.Id, userMessage.SessionId, userMessage.Role, userMessage.ContentType, userMessage.Content, userMessage.WorkflowId, userMessage.PlanData, userMessage.CreatedAt),
            new ChatMessageDto(assistantMessage.Id, assistantMessage.SessionId, assistantMessage.Role, assistantMessage.ContentType, assistantMessage.Content, assistantMessage.WorkflowId, assistantMessage.PlanData, assistantMessage.CreatedAt),
            workflow
        ));
    }

    private string GetUserId()
        => User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException("Missing subject claim.");

    private static string BuildTitle(string input)
    {
        var compact = string.Join(' ', input.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return compact.Length <= 56 ? compact : $"{compact[..55].TrimEnd()}...";
    }
}

public record SendChatMessageRequest(Guid? SessionId, string Content);
public record ChatSessionDto(Guid Id, string Title, DateTime CreatedAt, DateTime UpdatedAt, string LastMessagePreview);
public record ChatMessageDto(Guid Id, Guid SessionId, string Role, string ContentType, string Content, Guid? WorkflowId, object? Plan, DateTime CreatedAt);
public record SendChatMessageResponse(ChatSessionDto Session, ChatMessageDto UserMessage, ChatMessageDto AssistantMessage, Workflow Workflow);
