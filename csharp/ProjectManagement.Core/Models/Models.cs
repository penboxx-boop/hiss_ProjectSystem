using System;
using System.Collections.Generic;
using ProjectManagement.Core.Enums;

namespace ProjectManagement.Core.Models;

/// <summary>
/// 團隊成員實體
/// </summary>
public class Member
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = "bg-sky-500";
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

/// <summary>
/// 子任務檢查清單項目
/// </summary>
public class SubTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public bool Completed { get; set; } = false;
}

/// <summary>
/// 任務評論與留言
/// </summary>
public class TaskComment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorColor { get; set; } = "bg-indigo-600";
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 工作項目實體 (Task)
/// </summary>
public class TaskItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProjectId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StatusId { get; set; } = string.Empty;
    public string AssigneeId { get; set; } = string.Empty; // 空字串表示未指派
    public Priority Priority { get; set; } = Priority.Medium;
    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public DateOnly EndDate { get; set; } = DateOnly.FromDateTime(DateTime.Today.AddDays(7));
    public int Progress { get; set; } = 0; // 0 - 100
    public List<SubTask> Subtasks { get; set; } = new();
    public List<TaskComment> Comments { get; set; } = new();

    /// <summary>
    /// 計算工期天數
    /// </summary>
    public int DurationDays => Math.Max(1, EndDate.DayNumber - StartDate.DayNumber + 1);

    /// <summary>
    /// 是否為已確認里程碑 (高優先度且進度100%)
    /// </summary>
    public bool IsMilestone => Priority == Priority.High && Progress == 100;
}

/// <summary>
/// 自訂看板工作流階段 (Workflow Status)
/// </summary>
public class WorkflowStatus
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "bg-slate-500";
    public string TextColor { get; set; } = "text-slate-700";
}

/// <summary>
/// 專案實體 (Project)
/// </summary>
public class Project
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateOnly CreatedAt { get; set; } = DateOnly.FromDateTime(DateTime.Today);
}

/// <summary>
/// 活動審計日誌 (Activity Log)
/// </summary>
public class ActivityLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProjectId { get; set; } = string.Empty;
    public string MemberName { get; set; } = string.Empty;
    public string MemberColor { get; set; } = "bg-indigo-500";
    public string Action { get; set; } = string.Empty;
    public string TargetName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 專案甘特排程詳細計算資訊
/// </summary>
public class GanttScheduleInfo
{
    public bool HasTasks { get; set; }
    public DateOnly EarliestStart { get; set; }
    public DateOnly LatestEnd { get; set; }
    public int TotalSpanDays { get; set; }
    public DateOnly AutoBaselineDate { get; set; }
    public int TimelineProgressPercent { get; set; } // 時間軸已過百分比
    public int DaysRemaining { get; set; }
    public GanttStatusType StatusType { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string StatusBadgeClass { get; set; } = string.Empty;
    public TaskItem? NextMilestoneTask { get; set; }
}

/// <summary>
/// 跨專案大盤單一專案進度指標
/// </summary>
public class ProjectBreakdown
{
    public Project Project { get; set; } = null!;
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    public int AverageProgress { get; set; }
    public int OverdueCount { get; set; }
    public List<Member> AssignedMembers { get; set; } = new();
    public HealthStatus Health { get; set; }
    public string HealthText { get; set; } = string.Empty;
    public string HealthColor { get; set; } = string.Empty;
    public GanttScheduleInfo GanttSchedule { get; set; } = new();
}

/// <summary>
/// 全域跨專案總體數據
/// </summary>
public class PortfolioStats
{
    public int TotalProjects { get; set; }
    public int TotalTasks { get; set; }
    public int TotalCompleted { get; set; }
    public int AverageProgress { get; set; }
    public int TotalOverdue { get; set; }
    public List<ProjectBreakdown> ProjectBreakdowns { get; set; } = new();
}

/// <summary>
/// 甘特圖單日欄位定義
/// </summary>
public class TimelineDay
{
    public DateOnly Date { get; set; }
    public string DateStr => Date.ToString("yyyy-MM-dd");
    public int DayOfMonth => Date.Day;
    public int Month => Date.Month;
    public string DayOfWeekName { get; set; } = string.Empty;
    public bool IsWeekend => Date.DayOfWeek == DayOfWeek.Saturday || Date.DayOfWeek == DayOfWeek.Sunday;
    public bool IsToday { get; set; }
}

/// <summary>
/// 甘特圖任務條位置計算結果
/// </summary>
public class TaskGanttPosition
{
    public int OffsetDays { get; set; }
    public int DurationDays { get; set; }
    public bool IsVisible { get; set; }
    public double LeftPercentage { get; set; }
    public double WidthPercentage { get; set; }
}
