using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Requivo.Core.Models;
using Requivo.Tools;
using System.Text.Json;
using Xunit;

namespace Requivo.Tools.Tests;

public class HRToolTests
{
    private static HRTool CreateTool() => new(NullLogger<HRTool>.Instance);

    private static Task<ToolResult> ExecuteAsync(string userInput) =>
        CreateTool().ExecuteAsync(
            null,
            new WorkflowContext { WorkflowId = "wf-1", UserId = "user-1", UserInput = userInput },
            CancellationToken.None);

    [Fact]
    public async Task Name_IsHRTool()
    {
        CreateTool().Name.Should().Be("HRTool");
    }

    [Fact]
    public async Task EmployeeQuery_ReturnsEmployeeList()
    {
        var result = await ExecuteAsync("List all employees");

        result.Success.Should().BeTrue();
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("employee_list");
        root.GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SpecificEmployeeId_ReturnsThatEmployee()
    {
        var result = await ExecuteAsync("Show employee EMP-001");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().ContainSingle();
        items.First().GetProperty("Id").GetString().Should().Be("EMP-001");
    }

    [Fact]
    public async Task DepartmentQuery_ReturnsOnlyDepartmentEmployees()
    {
        var result = await ExecuteAsync("Who works in Engineering?");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Department").GetString() == "Engineering");
    }

    [Fact]
    public async Task OnLeaveQuery_ReturnsOnlyEmployeesOnLeave()
    {
        var result = await ExecuteAsync("Who is on leave?");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var items = doc.RootElement.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.GetProperty("Status").GetString() == "OnLeave");
    }

    [Fact]
    public async Task OnboardingQuery_ReturnsOnboardingList()
    {
        var result = await ExecuteAsync("Show onboarding queue");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("type").GetString().Should().Be("onboarding_list");
        var items = root.GetProperty("items").EnumerateArray();
        items.Should().NotBeEmpty();
        items.Should().OnlyContain(i =>
            i.GetProperty("Id").GetString() == "EMP-006" ||
            i.GetProperty("Id").GetString() == "EMP-007");
    }

    [Fact]
    public async Task NonHRQuery_ReturnsGenericOkResult()
    {
        var result = await ExecuteAsync("List all invoices");

        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
        var root = doc.RootElement;
        root.GetProperty("status").GetString().Should().Be("ok");
        root.GetProperty("domain").GetString().Should().Be("HR");
    }
}