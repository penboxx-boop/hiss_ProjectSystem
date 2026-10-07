using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ProjectManagement.Core.Enums;
using ProjectManagement.Core.Models;

namespace ProjectManagement.Core.Services;

public interface IProjectManagementService
{
    // Projects
    Task<List<Project>> GetProjectsAsync();
    Task<Project?> GetProjectByIdAsync(string id);
    Task<Project> CreateProjectAsync(string name, string description);
    Task<Project?> UpdateProjectAsync(string id, string name, string description);
    Task<bool> DeleteProjectAsync(string id);

    // Tasks
    Task<List<TaskItem>> GetTasksAsync(string? projectId = null);
    Task<TaskItem?> GetTaskByIdAsync(string id);
    Task<TaskItem> CreateTaskAsync(string title, Priority priority, string assigneeId, int durationDays, string? targetProjectId = null);
    Task<TaskItem?> UpdateTaskAsync(TaskItem updatedTask);
    Task<bool> DeleteTaskAsync(string id);
    Task<TaskItem?> ToggleSubTaskAsync(string taskId, string subTaskId);
    Task<TaskItem?> AddCommentAsync(string taskId, string authorName, string authorColor, string text);

    // Members
    Task<List<Member>> GetMembersAsync();
    Task<Member> CreateMemberAsync(string name, string role, string email, string avatarColor);
    Task<Member?> UpdateMemberAsync(Member member);
    Task<bool> DeleteMemberAsync(string id);

    // Workflow Statuses
    Task<List<WorkflowStatus>> GetStatusesAsync();
    Task<WorkflowStatus> CreateStatusAsync(string name, string color, string textColor);
    Task<WorkflowStatus?> UpdateStatusAsync(WorkflowStatus status);
    Task<bool> DeleteStatusAsync(string id);

    // Activities
    Task<List<ActivityLog>> GetActivityLogsAsync(string? projectId = null);

    // Analytics & Gantt
    Task<PortfolioStats> GetPortfolioStatsAsync();
    Task<(GanttScheduleInfo Schedule, List<TimelineDay> TimelineDays, List<(TaskItem Task, TaskGanttPosition Position)> TaskPositions)> 
        GetProjectGanttAsync(string projectId, DateOnly? baseDate = null, int spanDays = 24);
}

public class ProjectManagementService : IProjectManagementService
{
    private readonly ConcurrentDictionary<string, Project> _projects = new();
    private readonly ConcurrentDictionary<string, TaskItem> _tasks = new();
    private readonly ConcurrentDictionary<string, Member> _members = new();
    private readonly ConcurrentDictionary<string, WorkflowStatus> _statuses = new();
    private readonly List<ActivityLog> _activityLogs = new();
    private readonly object _lock = new();

    private readonly IGanttService _ganttService;
    private readonly IPortfolioAnalyticsService _analyticsService;

    public ProjectManagementService(IGanttService ganttService, IPortfolioAnalyticsService analyticsService)
    {
        _ganttService = ganttService;
        _analyticsService = analyticsService;
        SeedDefaultData();
    }

    private void SeedDefaultData()
    {
        var p1 = new Project
        {
            Id = "p1",
            Name = "電子商務平台重構上線",
            Description = "涵蓋前後端分離、購物車流程重構、全站響應式體驗與支付網關整合之大型改版專案。",
            CreatedAt = new DateOnly(2026, 6, 1)
        };
        var p2 = new Project
        {
            Id = "p2",
            Name = "2026 年度品牌形象官網與行銷活動",
            Description = "包含高質感主視覺動畫、中秋形象視覺設計、行銷互動贈品頁面與新聞媒體露出規劃。",
            CreatedAt = new DateOnly(2026, 6, 10)
        };
        _projects[p1.Id] = p1;
        _projects[p2.Id] = p2;

        var st1 = new WorkflowStatus { Id = "st1", Name = "待處理 (To Do)", Color = "bg-slate-500", TextColor = "text-slate-700" };
        var st2 = new WorkflowStatus { Id = "st2", Name = "進行中 (In Progress)", Color = "bg-indigo-600", TextColor = "text-indigo-700" };
        var st3 = new WorkflowStatus { Id = "st3", Name = "程式審查 (In Review)", Color = "bg-amber-500", TextColor = "text-amber-700" };
        var st4 = new WorkflowStatus { Id = "st4", Name = "已完成 (Done)", Color = "bg-emerald-600", TextColor = "text-emerald-700" };
        _statuses[st1.Id] = st1;
        _statuses[st2.Id] = st2;
        _statuses[st3.Id] = st3;
        _statuses[st4.Id] = st4;

        var m1 = new Member { Id = "m1", Name = "李誠敏", Role = "全端架構師", Email = "chengmin@example.com", AvatarColor = "bg-sky-500" };
        var m2 = new Member { Id = "m2", Name = "張雨萱", Role = "後端資深工程師", Email = "yuxuan@example.com", AvatarColor = "bg-violet-500" };
        var m3 = new Member { Id = "m3", Name = "林明傑", Role = "UI/UX 設計師", Email = "mingjie@example.com", AvatarColor = "bg-rose-500" };
        var m4 = new Member { Id = "m4", Name = "王美玲", Role = "產品專案經理", Email = "meiling@example.com", AvatarColor = "bg-amber-500" };
        _members[m1.Id] = m1;
        _members[m2.Id] = m2;
        _members[m3.Id] = m3;
        _members[m4.Id] = m4;

        var t1 = new TaskItem
        {
            Id = "t1",
            ProjectId = "p1",
            Title = "購物車與訂單 API 整合",
            Description = "整合金流扣款及購物車驗證 API，包含錯誤防呆處理與重試機制。",
            StatusId = "st2",
            AssigneeId = "m1",
            Priority = Priority.High,
            StartDate = new DateOnly(2026, 6, 16),
            EndDate = new DateOnly(2026, 6, 22),
            Progress = 65,
            Subtasks = new List<SubTask>
            {
                new() { Id = "sub1_1", Title = "串接綠界支付回傳路由", Completed = true },
                new() { Id = "sub1_2", Title = "撰寫防重複提交冪等性檢查", Completed = true },
                new() { Id = "sub1_3", Title = "單元測試覆蓋率達 85%", Completed = false }
            }
        };

        var t2 = new TaskItem
        {
            Id = "t2",
            ProjectId = "p1",
            Title = "首頁及商品清單 UI 視覺設計",
            Description = "設計符合現代簡約美學的首頁與商品導購頁，支援深色與淺色模式切換。",
            StatusId = "st4",
            AssigneeId = "m3",
            Priority = Priority.High,
            StartDate = new DateOnly(2026, 6, 10),
            EndDate = new DateOnly(2026, 6, 17),
            Progress = 100,
            Subtasks = new List<SubTask>
            {
                new() { Id = "sub2_1", Title = "Figma 設計規範產出", Completed = true },
                new() { Id = "sub2_2", Title = "前端 Tailwind 配色樣式導出", Completed = true }
            }
        };

        var t3 = new TaskItem
        {
            Id = "t3",
            ProjectId = "p1",
            Title = "跨專案推進總覽儀表板開發",
            Description = "建立宏觀多專案大盤面板，呈現甘特圖時程進度、工期比對與工作項目明細檢視。",
            StatusId = "st2",
            AssigneeId = "m1",
            Priority = Priority.High,
            StartDate = new DateOnly(2026, 6, 18),
            EndDate = new DateOnly(2026, 6, 25),
            Progress = 80,
            Subtasks = new List<SubTask>
            {
                new() { Id = "sub3_1", Title = "跨專案統計數據架構實作", Completed = true },
                new() { Id = "sub3_2", Title = "甘特進度條與時程比對邏輯", Completed = true }
            }
        };

        var t4 = new TaskItem
        {
            Id = "t4",
            ProjectId = "p2",
            Title = "中秋宣傳海報設計與主視覺標案",
            Description = "針對圓月與科技品牌之結合進行視覺構圖，完成高畫質促銷圖檔輸出。",
            StatusId = "st2",
            AssigneeId = "m3",
            Priority = Priority.Medium,
            StartDate = new DateOnly(2026, 6, 15),
            EndDate = new DateOnly(2026, 6, 19),
            Progress = 50,
            Subtasks = new List<SubTask>
            {
                new() { Id = "sub4_1", Title = "草圖初稿視覺確認", Completed = true },
                new() { Id = "sub4_2", Title = "科技感圓月融合與亮感修正", Completed = false }
            }
        };

        _tasks[t1.Id] = t1;
        _tasks[t2.Id] = t2;
        _tasks[t3.Id] = t3;
        _tasks[t4.Id] = t4;

        _activityLogs.Add(new ActivityLog
        {
            ProjectId = "p1",
            MemberName = "李誠敏",
            MemberColor = "bg-sky-500",
            Action = "建立了任務",
            TargetName = "購物車與訂單 API 整合"
        });
    }

    public Task<List<Project>> GetProjectsAsync() => 
        Task.FromResult(_projects.Values.OrderByDescending(p => p.CreatedAt).ToList());

    public Task<Project?> GetProjectByIdAsync(string id) =>
        Task.FromResult(_projects.TryGetValue(id, out var p) ? p : null);

    public Task<Project> CreateProjectAsync(string name, string description)
    {
        var proj = new Project
        {
            Name = name,
            Description = description,
            CreatedAt = DateOnly.FromDateTime(DateTime.Today)
        };
        _projects[proj.Id] = proj;

        lock (_lock)
        {
            _activityLogs.Insert(0, new ActivityLog
            {
                ProjectId = proj.Id,
                MemberName = "系統管理員",
                Action = "建立了新專案",
                TargetName = proj.Name
            });
        }

        return Task.FromResult(proj);
    }

    public Task<Project?> UpdateProjectAsync(string id, string name, string description)
    {
        if (_projects.TryGetValue(id, out var proj))
        {
            proj.Name = name;
            proj.Description = description;
            return Task.FromResult<Project?>(proj);
        }
        return Task.FromResult<Project?>(null);
    }

    public Task<bool> DeleteProjectAsync(string id)
    {
        if (_projects.TryRemove(id, out var removed))
        {
            // 級聯移除專案底下所有任務
            var projectTasks = _tasks.Values.Where(t => t.ProjectId == id).Select(t => t.Id).ToList();
            foreach (var tId in projectTasks)
            {
                _tasks.TryRemove(tId, out _);
            }
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<List<TaskItem>> GetTasksAsync(string? projectId = null)
    {
        var q = _tasks.Values.AsEnumerable();
        if (!string.IsNullOrEmpty(projectId))
        {
            q = q.Where(t => t.ProjectId == projectId);
        }
        return Task.FromResult(q.OrderBy(t => t.StartDate).ToList());
    }

    public Task<TaskItem?> GetTaskByIdAsync(string id) =>
        Task.FromResult(_tasks.TryGetValue(id, out var t) ? t : null);

    public Task<TaskItem> CreateTaskAsync(string title, Priority priority, string assigneeId, int durationDays, string? targetProjectId = null)
    {
        var pId = targetProjectId ?? _projects.Keys.FirstOrDefault() ?? "p1";
        var firstStatus = _statuses.Keys.FirstOrDefault() ?? "st1";
        var today = DateOnly.FromDateTime(DateTime.Today);

        var task = new TaskItem
        {
            Title = title,
            ProjectId = pId,
            Priority = priority,
            AssigneeId = assigneeId,
            StatusId = firstStatus,
            StartDate = today,
            EndDate = today.AddDays(Math.Max(1, durationDays)),
            Progress = 0
        };

        _tasks[task.Id] = task;

        lock (_lock)
        {
            _activityLogs.Insert(0, new ActivityLog
            {
                ProjectId = pId,
                MemberName = "團隊成員",
                Action = "建立了任務",
                TargetName = task.Title
            });
        }

        return Task.FromResult(task);
    }

    public Task<TaskItem?> UpdateTaskAsync(TaskItem updatedTask)
    {
        if (_tasks.ContainsKey(updatedTask.Id))
        {
            _tasks[updatedTask.Id] = updatedTask;
            return Task.FromResult<TaskItem?>(updatedTask);
        }
        return Task.FromResult<TaskItem?>(null);
    }

    public Task<bool> DeleteTaskAsync(string id) =>
        Task.FromResult(_tasks.TryRemove(id, out _));

    public Task<TaskItem?> ToggleSubTaskAsync(string taskId, string subTaskId)
    {
        if (_tasks.TryGetValue(taskId, out var task))
        {
            var sub = task.Subtasks.FirstOrDefault(s => s.Id == subTaskId);
            if (sub != null)
            {
                sub.Completed = !sub.Completed;
                // 自動依子任務完成比例校正進度百分比
                if (task.Subtasks.Count > 0)
                {
                    var completedCount = task.Subtasks.Count(s => s.Completed);
                    task.Progress = (int)Math.Round((double)completedCount / task.Subtasks.Count * 100);
                }
            }
            return Task.FromResult<TaskItem?>(task);
        }
        return Task.FromResult<TaskItem?>(null);
    }

    public Task<TaskItem?> AddCommentAsync(string taskId, string authorName, string authorColor, string text)
    {
        if (_tasks.TryGetValue(taskId, out var task))
        {
            task.Comments.Add(new TaskComment
            {
                AuthorName = authorName,
                AuthorColor = authorColor,
                Text = text,
                CreatedAt = DateTime.UtcNow
            });
            return Task.FromResult<TaskItem?>(task);
        }
        return Task.FromResult<TaskItem?>(null);
    }

    public Task<List<Member>> GetMembersAsync() =>
        Task.FromResult(_members.Values.ToList());

    public Task<Member> CreateMemberAsync(string name, string role, string email, string avatarColor)
    {
        var m = new Member
        {
            Name = name,
            Role = role,
            Email = email,
            AvatarColor = avatarColor
        };
        _members[m.Id] = m;
        return Task.FromResult(m);
    }

    public Task<Member?> UpdateMemberAsync(Member member)
    {
        if (_members.ContainsKey(member.Id))
        {
            _members[member.Id] = member;
            return Task.FromResult<Member?>(member);
        }
        return Task.FromResult<Member?>(null);
    }

    public Task<bool> DeleteMemberAsync(string id)
    {
        if (_members.TryRemove(id, out _))
        {
            // 將所有原本指派給此成員的任務轉為未指派，保障任務完整性
            foreach (var t in _tasks.Values.Where(t => t.AssigneeId == id))
            {
                t.AssigneeId = string.Empty;
            }
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<List<WorkflowStatus>> GetStatusesAsync() =>
        Task.FromResult(_statuses.Values.ToList());

    public Task<WorkflowStatus> CreateStatusAsync(string name, string color, string textColor)
    {
        var s = new WorkflowStatus { Name = name, Color = color, TextColor = textColor };
        _statuses[s.Id] = s;
        return Task.FromResult(s);
    }

    public Task<WorkflowStatus?> UpdateStatusAsync(WorkflowStatus status)
    {
        if (_statuses.ContainsKey(status.Id))
        {
            _statuses[status.Id] = status;
            return Task.FromResult<WorkflowStatus?>(status);
        }
        return Task.FromResult<WorkflowStatus?>(null);
    }

    public Task<bool> DeleteStatusAsync(string id) =>
        Task.FromResult(_statuses.TryRemove(id, out _));

    public Task<List<ActivityLog>> GetActivityLogsAsync(string? projectId = null)
    {
        lock (_lock)
        {
            var q = _activityLogs.AsEnumerable();
            if (!string.IsNullOrEmpty(projectId))
            {
                q = q.Where(l => l.ProjectId == projectId);
            }
            return Task.FromResult(q.Take(20).ToList());
        }
    }

    public Task<PortfolioStats> GetPortfolioStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var stats = _analyticsService.ComputePortfolioStats(
            _projects.Values,
            _tasks.Values,
            _members.Values,
            _statuses.Values,
            today
        );
        return Task.FromResult(stats);
    }

    public Task<(GanttScheduleInfo Schedule, List<TimelineDay> TimelineDays, List<(TaskItem Task, TaskGanttPosition Position)> TaskPositions)>
        GetProjectGanttAsync(string projectId, DateOnly? baseDate = null, int spanDays = 24)
    {
        var pTasks = _tasks.Values.Where(t => t.ProjectId == projectId).ToList();
        var today = DateOnly.FromDateTime(DateTime.Today);
        var schedule = _ganttService.CalculateProjectSchedule(pTasks, today);

        var anchorDate = baseDate ?? schedule.AutoBaselineDate;
        var timelineDays = _ganttService.GenerateTimelineDays(anchorDate, spanDays, today);

        var positions = pTasks.Select(t => (
            Task: t,
            Position: _ganttService.CalculateTaskPosition(t, anchorDate, spanDays)
        )).ToList();

        return Task.FromResult((schedule, timelineDays, positions));
    }
}
