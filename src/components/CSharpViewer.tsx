import React, { useState } from 'react';
import { Code2, Copy, Check, FileCode, Server, Layout, Database, ChevronRight, Terminal } from 'lucide-react';

interface CSharpFile {
  name: string;
  category: 'core' | 'service' | 'api' | 'blazor';
  categoryLabel: string;
  description: string;
  code: string;
}

const CSHARP_FILES: CSharpFile[] = [
  {
    name: 'Models.cs',
    category: 'core',
    categoryLabel: '領域實體與模型',
    description: '定義專案、工作項目、子任務清單、成員、工作流程狀態與甘特排程資訊模型。',
    code: `using System;
using System.Collections.Generic;

namespace ProjectManagement.Core.Models;

public enum Priority { Low, Medium, High }

public enum HealthStatus { Healthy, SteadyProgress, Ongoing, NoTasks, WarningOverdue }

public enum GanttStatusType { None, Upcoming, Ongoing, Completed, Overdue }

public class Member
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = "bg-sky-500";
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class SubTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public bool Completed { get; set; } = false;
}

public class TaskComment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorColor { get; set; } = "bg-indigo-600";
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TaskItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProjectId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StatusId { get; set; } = string.Empty;
    public string AssigneeId { get; set; } = string.Empty;
    public Priority Priority { get; set; } = Priority.Medium;
    public DateOnly StartDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public DateOnly EndDate { get; set; } = DateOnly.FromDateTime(DateTime.Today.AddDays(7));
    public int Progress { get; set; } = 0; // 0 - 100
    public List<SubTask> Subtasks { get; set; } = new();
    public List<TaskComment> Comments { get; set; } = new();

    public int DurationDays => Math.Max(1, EndDate.DayNumber - StartDate.DayNumber + 1);
    public bool IsMilestone => Priority == Priority.High && Progress == 100;
}

public class Project
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateOnly CreatedAt { get; set; } = DateOnly.FromDateTime(DateTime.Today);
}

public class GanttScheduleInfo
{
    public bool HasTasks { get; set; }
    public DateOnly EarliestStart { get; set; }
    public DateOnly LatestEnd { get; set; }
    public int TotalSpanDays { get; set; }
    public DateOnly AutoBaselineDate { get; set; }
    public int TimelineProgressPercent { get; set; }
    public int DaysRemaining { get; set; }
    public GanttStatusType StatusType { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string StatusBadgeClass { get; set; } = string.Empty;
    public TaskItem? NextMilestoneTask { get; set; }
}

public class PortfolioStats
{
    public int TotalProjects { get; set; }
    public int TotalTasks { get; set; }
    public int TotalCompleted { get; set; }
    public int AverageProgress { get; set; }
    public int TotalOverdue { get; set; }
    public List<ProjectBreakdown> ProjectBreakdowns { get; set; } = new();
}`
  },
  {
    name: 'GanttService.cs',
    category: 'service',
    categoryLabel: '甘特圖演算法服務',
    description: '依專案任務起訖自動計算最早開始日、最晚結束日與基準日（保留1天緩衝邊界），以及網格定位百分比。',
    code: `using System;
using System.Collections.Generic;
using System.Linq;
using ProjectManagement.Core.Models;

namespace ProjectManagement.Core.Services;

public class GanttService : IGanttService
{
    /// <summary>
    /// 自動計算專案工作的排程區間與基準基準日 (解決硬編碼問題)
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
                StatusText = "尚無排程任務"
            };
        }

        var minStart = taskList.Min(t => t.StartDate);
        var maxEnd = taskList.Max(t => t.EndDate);

        // 防呆校正
        foreach (var t in taskList)
        {
            if (t.EndDate < t.StartDate && t.StartDate > maxEnd)
            {
                maxEnd = t.StartDate;
            }
        }

        var totalSpan = Math.Max(1, maxEnd.DayNumber - minStart.DayNumber + 1);
        
        // 基準日自動保留 1 天視覺邊界，使首項任務對齊第 1 欄
        var autoBaseline = minStart.AddDays(-1);

        var totalDays = maxEnd.DayNumber - minStart.DayNumber;
        var elapsedDays = today.DayNumber - minStart.DayNumber;

        int timelineProgress = totalDays > 0 
            ? Math.Clamp((int)Math.Round((double)elapsedDays / totalDays * 100), 0, 100) 
            : 50;

        return new GanttScheduleInfo
        {
            HasTasks = true,
            EarliestStart = minStart,
            LatestEnd = maxEnd,
            TotalSpanDays = totalSpan,
            AutoBaselineDate = autoBaseline,
            TimelineProgressPercent = timelineProgress,
            StatusText = $"時程進行中 (共 {totalSpan} 天)",
            NextMilestoneTask = taskList.Where(t => t.Progress < 100).OrderBy(t => t.EndDate).FirstOrDefault()
        };
    }

    /// <summary>
    /// 計算任務條在甘特圖網格上的定位與寬度百分比
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
}`
  },
  {
    name: 'PortfolioAnalyticsService.cs',
    category: 'service',
    categoryLabel: '跨專案大盤分析',
    description: '彙總全域專案達成率、逾期警示，並為每個專案結合甘特圖時間軸進度與交付率雙軸比對。',
    code: `using System;
using System.Collections.Generic;
using System.Linq;
using ProjectManagement.Core.Models;

namespace ProjectManagement.Core.Services;

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

        var breakdowns = new List<ProjectBreakdown>();

        foreach (var proj in projList)
        {
            var pTasks = taskList.Where(t => t.ProjectId == proj.Id).ToList();
            var pCompleted = pTasks.Count(t => t.Progress == 100);
            var pAvgProgress = pTasks.Count > 0 ? (int)Math.Round(pTasks.Average(t => t.Progress)) : 0;
            var pOverdue = pTasks.Count(t => t.EndDate < today && t.Progress < 100);

            // 整合甘特圖排程指標
            var ganttInfo = _ganttService.CalculateProjectSchedule(pTasks, today);

            breakdowns.Add(new ProjectBreakdown
            {
                Project = proj,
                TotalTasks = pTasks.Count,
                CompletedTasks = pCompleted,
                AverageProgress = pAvgProgress,
                OverdueCount = pOverdue,
                GanttSchedule = ganttInfo
            });
        }

        return new PortfolioStats
        {
            TotalProjects = projList.Count,
            TotalTasks = taskList.Count,
            TotalCompleted = taskList.Count(t => t.Progress == 100),
            AverageProgress = taskList.Count > 0 ? (int)Math.Round(taskList.Average(t => t.Progress)) : 0,
            ProjectBreakdowns = breakdowns
        };
    }
}`
  },
  {
    name: 'ProjectsController.cs',
    category: 'api',
    categoryLabel: 'ASP.NET Core Web API',
    description: '提供專案 CRUD 與甘特圖資料路由 (/api/projects/{id}/gantt)，包含自動基準日計算。',
    code: `using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Core.Services;

namespace ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectManagementService _service;

    public ProjectsController(IProjectManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetProjectsAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var project = await _service.GetProjectByIdAsync(id);
        return project == null ? NotFound() : Ok(project);
    }

    /// <summary>
    /// 取得該專案之甘特圖時程、網格與任務定位資料
    /// </summary>
    [HttpGet("{id}/gantt")]
    public async Task<IActionResult> GetGanttTimeline(string id, [FromQuery] string? baseDate, [FromQuery] int spanDays = 24)
    {
        DateOnly? parsedDate = null;
        if (!string.IsNullOrEmpty(baseDate) && DateOnly.TryParse(baseDate, out var d))
        {
            parsedDate = d;
        }

        var result = await _service.GetProjectGanttAsync(id, parsedDate, spanDays);
        return Ok(new
        {
            schedule = result.Schedule,
            timelineDays = result.TimelineDays,
            tasks = result.TaskPositions.Select(tp => new { task = tp.Task, position = tp.Position })
        });
    }
}`
  },
  {
    name: 'GanttChart.razor',
    category: 'blazor',
    categoryLabel: 'Blazor UI 元件',
    description: 'Blazor C# 互動甘特圖元件，實作動態網格、前移/後移、基準日自動對齊與任務長條繪製。',
    code: `@using ProjectManagement.Core.Models
@using ProjectManagement.Core.Services
@inject IGanttService GanttService

<div class="bg-white border border-slate-200 rounded-2xl p-6">
    <!-- 控制列 -->
    <div class="flex justify-between items-center pb-4 border-b">
        <h2 class="font-bold text-slate-800">📊 專案甘特圖: @CurrentProject?.Name</h2>
        <div class="flex gap-2">
            <button @onclick="() => ShiftBaseDays(-7)">◀ 前移一週</button>
            <button @onclick="ResetToProjectStart" class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded">
                🎯 自動對齊專案起點 (@ScheduleInfo.EarliestStart.ToString("yyyy-MM-dd"))
            </button>
            <button @onclick="() => ShiftBaseDays(7)">後移一週 ▶</button>
        </div>
    </div>

    <!-- 甘特圖網格 -->
    <div class="overflow-x-auto mt-4">
        @foreach (var task in Tasks)
        {
            var pos = GanttService.CalculateTaskPosition(task, BaseDate, 24);
            <div class="flex items-center py-2 border-b">
                <div class="w-64 font-bold text-xs truncate">@task.Title</div>
                <div class="flex-1 relative h-8 bg-slate-50 rounded">
                    @if (pos.IsVisible)
                    {
                        <div class="absolute h-6 top-1 bg-indigo-600 rounded text-white text-[10px] flex items-center px-2"
                             style="left: @pos.LeftPercentage%; width: @pos.WidthPercentage%;">
                            @task.Title (@task.Progress%)
                        </div>
                    }
                </div>
            </div>
        }
    </div>
</div>

@code {
    [Parameter] public Project? CurrentProject { get; set; }
    [Parameter] public List<TaskItem> Tasks { get; set; } = new();
    private DateOnly BaseDate { get; set; }
    private GanttScheduleInfo ScheduleInfo { get; set; } = new();

    protected override void OnParametersSet()
    {
        ScheduleInfo = GanttService.CalculateProjectSchedule(Tasks, DateOnly.FromDateTime(DateTime.Today));
        BaseDate = ScheduleInfo.AutoBaselineDate;
    }

    private void ShiftBaseDays(int offset) => BaseDate = BaseDate.AddDays(offset);
    private void ResetToProjectStart() => BaseDate = ScheduleInfo.AutoBaselineDate;
}`
  }
];

export default function CSharpViewer() {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = CSHARP_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black shadow-md shadow-violet-200">
              <Code2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">C# / .NET 8 原始碼架構專區</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                  .NET 8.0 / C# 12
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                本系統已完成全功能 C# 轉換，包含領域模型、甘特圖基準日引擎、跨專案大盤分析、ASP.NET Core Web API 與 Blazor 元件
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-600 flex items-center gap-1.5">
            <Terminal size={14} className="text-indigo-600" />
            <span>檔案目錄: /csharp</span>
          </div>
        </div>
      </div>

      {/* Main split view: File list on left, Code editor on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Files Navigation */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-extrabold uppercase text-slate-400 px-1 mb-2 tracking-wider">
            轉換後 C# 核心程式檔清單
          </div>
          {CSHARP_FILES.map((file, idx) => {
            const isSelected = idx === selectedFileIndex;
            return (
              <button
                key={file.name}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/20 shadow-xs ring-1 ring-violet-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  file.category === 'core' ? 'bg-sky-50 text-sky-600' :
                  file.category === 'service' ? 'bg-indigo-50 text-indigo-600' :
                  file.category === 'api' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-violet-50 text-violet-600'
                }`}>
                  <FileCode size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-slate-800 truncate">{file.name}</span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase font-mono">{file.category}</span>
                  </div>
                  <div className="text-[10px] text-violet-600 font-medium mt-0.5">{file.categoryLabel}</div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-relaxed">
                    {file.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Quick CLI tip */}
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <Terminal size={14} className="text-violet-600" />
              如何於本地端執行 C# API？
            </div>
            <pre className="text-[11px] bg-slate-900 text-slate-200 p-2 rounded-lg font-mono overflow-x-auto">
cd csharp/ProjectManagement.Api
dotnet run
            </pre>
            <p className="text-[10px] text-slate-400">
              伺服器將在 https://localhost:5001 啟動，支援 Swagger 視覺化測試介面。
            </p>
          </div>
        </div>

        {/* Right: Code Viewer Container */}
        <div className="lg:col-span-8 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 shadow-sm">
          
          {/* Editor Header Bar */}
          <div className="flex justify-between items-center px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/80 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-mono text-slate-300 font-bold ml-2">{activeFile.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({activeFile.categoryLabel})</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="複製此檔案原始碼"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? '已複製！' : '複製原始碼'}</span>
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 overflow-x-auto max-h-[620px] overflow-y-auto">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
              <code>{activeFile.code}</code>
            </pre>
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2 bg-slate-800/60 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Encoding: UTF-8</span>
            <span>Target: .NET 8.0 C# 12</span>
            <span>Status: Ready to Build</span>
          </div>

        </div>

      </div>

    </div>
  );
}
