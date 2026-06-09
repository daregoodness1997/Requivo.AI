namespace Requivo.Api.Security;

public static class AuthorizationPolicies
{
    public const string WorkflowStart = "workflow.start";
    public const string WorkflowRead = "workflow.read";
    public const string ApprovalRead = "approval.read";
    public const string ApprovalDecide = "approval.decide";
    public const string AuditRead = "audit.read";
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string WorkflowOperator = "WorkflowOperator";
    public const string Approver = "Approver";
    public const string Auditor = "Auditor";
}