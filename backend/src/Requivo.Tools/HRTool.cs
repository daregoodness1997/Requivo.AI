using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;

namespace Requivo.Tools;

public partial class HRTool(ILogger<HRTool> logger) : ITool
{
    private static readonly EmployeeRecord[] Employees =
    [
        new("EMP-001", "Alice Johnson", "Engineering", "Active", new DateTime(2023, 3, 1)),
        new("EMP-002", "Bob Chen", "Engineering", "Active", new DateTime(2022, 7, 15)),
        new("EMP-003", "Clara Martinez", "Marketing", "Active", new DateTime(2024, 1, 10)),
        new("EMP-004", "David Kim", "Sales", "Active", new DateTime(2023, 9, 5)),
        new("EMP-005", "Eva Müller", "HR", "Active", new DateTime(2021, 11, 20)),
        new("EMP-006", "Frank Okafor", "Engineering", "Onboarding", new DateTime(2026, 6, 15)),
        new("EMP-007", "Grace Patel", "Marketing", "Onboarding", new DateTime(2026, 6, 18)),
        new("EMP-008", "Henry Zhao", "Finance", "Active", new DateTime(2024, 5, 8)),
        new("EMP-009", "Iris Thompson", "Sales", "OnLeave", new DateTime(2023, 4, 12)),
        new("EMP-010", "Jorge Santos", "Engineering", "Active", new DateTime(2025, 2, 1)),
    ];

    public string Name => "HRTool";
    public string Description => "Onboarding, leave management, payroll, contracts, appraisals";

    public Task<ToolResult> ExecuteAsync(object? input, WorkflowContext context, CancellationToken ct = default)
    {
        logger.LogInformation("[{Tool}] Executing step {Step} for workflow {Workflow}",
            Name, context.StepIndex, context.WorkflowId);

        try
        {
            var result = HandleHR(context.UserInput, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = true, Data = result, Metadata = new ToolMetadata { Source = Name } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[{Tool}] Failed on step {Step}", Name, context.StepIndex);
            return Task.FromResult(new ToolResult { Success = false, Error = ex.Message });
        }
    }

    private static object HandleHR(string userInput, int stepIndex)
    {
        var normalized = userInput.ToLowerInvariant();

        if (IsEmployeeQuery(normalized))
        {
            var matched = GetMatchingEmployees(normalized);
            return new
            {
                type = "employee_list",
                count = matched.Length,
                items = matched.Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Department,
                    e.Status,
                    e.HireDate,
                }).ToArray(),
            };
        }

        if (IsOnboardingQuery(normalized))
        {
            var onboarding = Employees.Where(e => e.Status == "Onboarding").ToArray();
            return new
            {
                type = "onboarding_list",
                count = onboarding.Length,
                items = onboarding.Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Department,
                    e.HireDate,
                }).ToArray(),
            };
        }

        return new { status = "ok", domain = "HR", step = stepIndex };
    }

    private static bool IsEmployeeQuery(string normalized)
        => EmployeeQueryRegex().IsMatch(normalized);

    private static bool IsOnboardingQuery(string normalized)
        => OnboardingQueryRegex().IsMatch(normalized);

    private static EmployeeRecord[] GetMatchingEmployees(string normalized)
    {
        var empId = ExtractEmployeeId(normalized);
        if (empId is not null)
        {
            var found = Employees.FirstOrDefault(e =>
                e.Id.Equals(empId, StringComparison.OrdinalIgnoreCase));
            return found is not null ? [found] : [];
        }

        if (DepartmentQueryRegex().IsMatch(normalized))
        {
            var match = DepartmentQueryRegex().Match(normalized);
            var dept = match.Groups[1].Value;
            return [.. Employees.Where(e => e.Department.Contains(dept, StringComparison.OrdinalIgnoreCase))];
        }

        if (OnLeaveRegex().IsMatch(normalized))
            return [.. Employees.Where(e => e.Status == "OnLeave")];

        return [.. Employees];
    }

    private static string? ExtractEmployeeId(string normalized)
    {
        var match = EmployeeIdRegex().Match(normalized);
        return match.Success ? match.Groups[1].Value.ToUpperInvariant() : null;
    }

    [GeneratedRegex(@"\b(employee|employees|staff|people|who)\b")]
    private static partial Regex EmployeeQueryRegex();

    [GeneratedRegex(@"\b(emp-\d{3,8})\b")]
    private static partial Regex EmployeeIdRegex();

    [GeneratedRegex(@"\b(onboard|onboarding|new hire|starting)\b")]
    private static partial Regex OnboardingQueryRegex();

    [GeneratedRegex(@"\b(engineering|marketing|sales|finance|hr)\b")]
    private static partial Regex DepartmentQueryRegex();

    [GeneratedRegex(@"\b(leave|vacation|off|absent|on leave)\b")]
    private static partial Regex OnLeaveRegex();

    private sealed record EmployeeRecord(string Id, string Name, string Department, string Status, DateTime HireDate);
}
