using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using ProjectManagement.Core.Enums;
using ProjectManagement.Core.Models;

namespace ProjectManagement.Core.Services;

public interface IGanttService
{
    GanttScheduleInfo CalculateProjectSchedule(IEnumerable<TaskItem> tasks, DateOnly today);
    List<TimelineDay> GenerateTimelineDays(DateOnly baseDate, int spanDays, DateOnly today);
    TaskGanttPosition CalculateTaskPosition(TaskItem task, DateOnly baseDate, int spanDays);
}

public class GanttService : IGanttService
{
    private static readonly CultureInfo TaiwanCulture = new("zh-TW");

    /// <summary>
    /// 自動計算專案工作的排程區間與基準日
    /// </summary>
    public GanttScheduleInfo CalculateProjectSchedule(IEnumerable<TaskItem> tasks, DateOnly today)
    {
        var taskList = tasks.ToList();
        if (taskList.Count == 0)
        {
            return new GanttScheduleInfo
            {
                HasTasks = false,
                EarliestStart = today,
                LatestEnd = today,
                TotalSpanDays = 1,
                AutoBaselineDate = today,
                TimelineProgressPercent = 0,
                DaysRemaining = 0,
                StatusType = GanttStatusType.None,
                StatusText = "尚無排程任務",
                StatusBadgeClass = "text-slate-500 bg-slate-100 border-slate-200"
            };
        }

        var minStart = taskList.Min(t => t.StartDate);
        var maxEnd = taskList.Max(t => t.EndDate);

        // 如果個別任務結束日早於開始日，校正防呆
        foreach (var t in taskList)
        {
            if (t.EndDate < t.StartDate && t.StartDate > maxEnd)
            {
                maxEnd = t.StartDate;
            }
        }

        var totalSpan = Math.Max(1, maxEnd.DayNumber - minStart.DayNumber + 1);
        // 基準日保留1天視覺緩衝邊界
        var autoBaseline = minStart.AddDays(-1);

        var totalCompleted = taskList.Count(t => t.Progress == 100);
        var isAllDone = totalCompleted == taskList.Count && taskList.Count > 0;

        var totalDays = maxEnd.DayNumber - minStart.DayNumber;
        var elapsedDays = today.DayNumber - minStart.DayNumber;

        GanttStatusType statusType;
        string statusText;
        string badgeClass;
        int timelineProgressPercent;
        int daysRemaining = 0;

        if (isAllDone)
        {
            statusType = GanttStatusType.Completed;
            statusText = "🎉 排程已全數交付";
            badgeClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
            timelineProgressPercent = 100;
        }
        else if (today < minStart)
        {
            var daysToStart = minStart.DayNumber - today.DayNumber;
            statusType = GanttStatusType.Upcoming;
            statusText = $"⏳ 距啟動 {daysToStart} 天";
            badgeClass = "text-sky-700 bg-sky-50 border-sky-200";
            timelineProgressPercent = 0;
            daysRemaining = totalSpan;
        }
        else if (today > maxEnd)
        {
            var daysOverdue = today.DayNumber - maxEnd.DayNumber;
            statusType = GanttStatusType.Overdue;
            statusText = $"⚠️ 逾期 {daysOverdue} 天";
            badgeClass = "text-rose-700 bg-rose-50 border-rose-200";
            timelineProgressPercent = 100;
        }
        else
        {
            var dayIndex = Math.Max(1, elapsedDays + 1);
            daysRemaining = Math.Max(0, maxEnd.DayNumber - today.DayNumber);
            timelineProgressPercent = totalDays > 0 ? Math.Clamp((int)Math.Round((double)elapsedDays / totalDays * 100), 0, 100) : 50;
            statusType = GanttStatusType.Ongoing;
            statusText = $"⚡ 進行中 (第 {dayIndex}/{totalSpan} 天)";
            badgeClass = "text-indigo-700 bg-indigo-50 border-indigo-200";
        }

        // 找出下一個即將到期之任務
        var nextMilestone = taskList
            .Where(t => t.Progress < 100)
            .OrderBy(t => t.EndDate)
            .FirstOrDefault();

        return new GanttScheduleInfo
        {
            HasTasks = true,
            EarliestStart = minStart,
            LatestEnd = maxEnd,
            TotalSpanDays = totalSpan,
            AutoBaselineDate = autoBaseline,
            TimelineProgressPercent = timelineProgressPercent,
            DaysRemaining = daysRemaining,
            StatusType = statusType,
            StatusText = statusText,
            StatusBadgeClass = badgeClass,
            NextMilestoneTask = nextMilestone
        };
    }

    /// <summary>
    /// 產生甘特圖的時間軸欄位陣列 (例如 24 或 30 天)
    /// </summary>
    public List<TimelineDay> GenerateTimelineDays(DateOnly baseDate, int spanDays, DateOnly today)
    {
        var days = new List<TimelineDay>(spanDays);
        for (int i = 0; i < spanDays; i++)
        {
            var d = baseDate.AddDays(i);
            var dt = d.ToDateTime(TimeOnly.MinValue);
            var dayOfWeekName = dt.ToString("ddd", TaiwanCulture); // "週一", "週二" 等

            days.Add(new TimelineDay
            {
                Date = d,
                DayOfWeekName = dayOfWeekName,
                IsToday = d == today
            });
        }
        return days;
    }

    /// <summary>
    /// 計算個別任務在甘特圖網格中的位置與長度百分比
    /// </summary>
    public TaskGanttPosition CalculateTaskPosition(TaskItem task, DateOnly baseDate, int spanDays)
    {
        var offsetDays = task.StartDate.DayNumber - baseDate.DayNumber;
        var durationDays = Math.Max(1, task.EndDate.DayNumber - task.StartDate.DayNumber + 1);

        var barStartCol = offsetDays;
        var barEndCol = offsetDays + durationDays - 1;

        var isVisible = barStartCol < spanDays && barEndCol >= 0;
        var cellPercent = 100.0 / spanDays;

        double leftPct = 0;
        double widthPct = 0;

        if (isVisible)
        {
            var visibleStart = Math.Max(0, barStartCol);
            var visibleEnd = Math.Min(spanDays - 1, barEndCol);
            leftPct = visibleStart * cellPercent;
            widthPct = (visibleEnd - visibleStart + 1) * cellPercent;
        }

        return new TaskGanttPosition
        {
            OffsetDays = offsetDays,
            DurationDays = durationDays,
            IsVisible = isVisible,
            LeftPercentage = leftPct,
            WidthPercentage = widthPct
        };
    }
}
