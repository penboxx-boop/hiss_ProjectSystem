using System.Text.Json.Serialization;

namespace ProjectManagement.Core.Enums;

/// <summary>
/// 工作項目優先級
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Priority
{
    Low,
    Medium,
    High
}

/// <summary>
/// 專案健康評級
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum HealthStatus
{
    Healthy,       // 良好
    SteadyProgress,// 穩健推進中
    Ongoing,       // 進行中
    NoTasks,       // 尚無任務
    WarningOverdue // 逾期警示
}

/// <summary>
/// 甘特圖排程推進狀態
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GanttStatusType
{
    None,       // 尚無排程
    Upcoming,   // 尚未開始 (倒數計日)
    Ongoing,    // 進行中 (時程推進)
    Completed,  // 全案排程已全數交付
    Overdue     // 已逾期
}
