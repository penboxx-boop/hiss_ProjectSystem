using System;
using System.Collections.Generic;
using System.Linq;
using ProjectManagement.Core.Enums;
using ProjectManagement.Core.Models;

namespace ProjectManagement.Core.Services;

public interface IPortfolioAnalyticsService
{
    PortfolioStats ComputePortfolioStats(
        IEnumerable<Project> projects,
        IEnumerable<TaskItem> tasks,
        IEnumerable<Member> members,
        IEnumerable<WorkflowStatus> statuses,
        DateOnly today);
}

public class PortfolioAnalyticsService : IPortfolioAnalyticsService
{
    private readonly IGanttService _ganttService;

    public PortfolioAnalyticsService(IGanttService ganttService)
    {
        _ganttService = ganttService;
    }

    public PortfolioStats ComputePortfolioStats(
        IEnumerable<Project> projects,
        IEnumerable<TaskItem> tasks,
        IEnumerable<Member> members,
        IEnumerable<WorkflowStatus> statuses,
        DateOnly today)
    {
        var projList = projects.ToList();
        var taskList = tasks.ToList();
        var memberList = members.ToList();
        var statusList = statuses.ToList();

        var doneStatus = statusList.FirstOrDefault(s => 
            s.Name.Contains("Done", StringComparison.OrdinalIgnoreCase) || 
            s.Name.Contains("完成", StringComparison.OrdinalIgnoreCase));

        var inProgressStatuses = statusList.Where(s => 
            s.Name.Contains("Progress", StringComparison.OrdinalIgnoreCase) || 
            s.Name.Contains("進行中", StringComparison.OrdinalIgnoreCase) ||
            s.Name.Contains("開發中", StringComparison.OrdinalIgnoreCase)).Select(s => s.Id).ToHashSet();

        bool IsTaskDone(TaskItem t) => doneStatus != null ? t.StatusId == doneStatus.Id : t.Progress == 100;

        var totalProj = projList.Count;
        var totalTasks = taskList.Count;
        var totalCompleted = taskList.Count(IsTaskDone);
        var avgProgress = totalTasks > 0 ? (int)Math.Round(taskList.Average(t => t.Progress)) : 0;
        var totalOverdue = taskList.Count(t => t.EndDate < today && !IsTaskDone(t));

        var breakdowns = new List<ProjectBreakdown>();

        foreach (var proj in projList)
        {
            var pTasks = taskList.Where(t => t.ProjectId == proj.id_or_Id(proj.Id)).ToList();
            var pTotal = pTasks.Count;
            var pCompleted = pTasks.Count(IsTaskDone);
            var inProg = pTasks.Count(t => inProgressStatuses.Contains(t.StatusId) && t.Progress < 100);
            var pTodo = pTasks.Count(t => !inProgressStatuses.Contains(t.StatusId) && !IsTaskDone(t));
            var pAvgProgress = pTotal > 0 ? (int)Math.Round(pTasks.Average(t => t.Progress)) : 0;
            var pOverdue = pTasks.Count(t => t.EndDate < today && !IsTaskDone(t));

            var assignedMemberIds = pTasks.Select(t => t.AssigneeId).Where(id => !string.IsNullOrEmpty(id)).Distinct();
            var assignedMembers = memberList.Where(m => assignedMemberIds.Contains(m.Id)).ToList();

            // 健康度評定
            HealthStatus health;
            string healthText;
            string healthColor;

            if (pOverdue > 0)
            {
                health = HealthStatus.WarningOverdue;
                healthText = $"⚠️ 逾期警示 ({pOverdue})";
                healthColor = "text-rose-700 bg-rose-50 border-rose-200";
            }
            else if (pAvgProgress >= 70)
            {
                health = HealthStatus.SteadyProgress;
                healthText = "穩健推進中";
                healthColor = "text-indigo-700 bg-indigo-50 border-indigo-200";
            }
            else if (pTotal == 0)
            {
                health = HealthStatus.NoTasks;
                healthText = "尚無任務";
                healthColor = "text-slate-600 bg-slate-100 border-slate-200";
            }
            else
            {
                health = HealthStatus.Ongoing;
                healthText = "進行中";
                healthColor = "text-sky-700 bg-sky-50 border-sky-200";
            }

            // 甘特圖排程指標
            var ganttInfo = _ganttService.CalculateProjectSchedule(pTasks, today);

            breakdowns.Add(new ProjectBreakdown
            {
                Project = proj,
                TotalTasks = pTotal,
                CompletedTasks = pCompleted,
                InProgressTasks = inProg,
                TodoTasks = pTodo,
                AverageProgress = pAvgProgress,
                OverdueCount = pOverdue,
                AssignedMembers = assignedMembers,
                Health = health,
                HealthText = healthText,
                HealthColor = healthColor,
                GanttSchedule = ganttInfo
            });
        }

        return new PortfolioStats
        {
            TotalProjects = totalProj,
            TotalTasks = totalTasks,
            TotalCompleted = totalCompleted,
            AverageProgress = avgProgress,
            TotalOverdue = totalOverdue,
            ProjectBreakdowns = breakdowns
        };
    }
}

internal static class ProjectExtensions
{
    public static string id_or_Id(this Project p, string id) => id;
}
