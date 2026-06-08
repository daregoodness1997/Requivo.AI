namespace Requivo.Core.Enums;

public enum WorkflowState
{
    Pending,
    Planning,
    WaitingApproval,
    InProgress,
    Completed,
    Failed
}

public enum WorkflowDomain
{
    Inventory,
    Procurement,
    Finance,
    Sales,
    HR,
    Reporting
}

public enum ApprovalDecision
{
    Pending,
    Approved,
    Rejected
}
