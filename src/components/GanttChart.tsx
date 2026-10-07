import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Task, Member, WorkflowStatus } from '../types';
import { 
  Calendar, ChevronLeft, ChevronRight, Milestone, AlertCircle, 
  Clock, CheckCircle, Plus, Edit3, Trash2, Crosshair, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskEditModal from './TaskEditModal';

interface GanttChartProps {
  currentProject: Project | null;
  tasks: Task[];
  members: Member[];
  statuses: WorkflowStatus[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
}

// Timezone-safe local date parser and formatter
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  return new Date(dateStr);
};

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function GanttChart({
  currentProject,
  tasks,
  members,
  statuses,
  onUpdateTask,
  onDeleteTask,
}: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter tasks belonging strictly to the current active project
  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === currentProject?.id);
  }, [tasks, currentProject]);

  // Dynamically compute the project's entire work date range
  const projectDateRange = useMemo(() => {
    if (projectTasks.length === 0) {
      const today = formatLocalDate(new Date());
      return {
        hasTasks: false,
        earliestStart: today,
        latestEnd: today,
        totalSpanDays: 1,
        autoBaseline: today,
      };
    }

    let minStart = projectTasks[0].startDate || formatLocalDate(new Date());
    let maxEnd = projectTasks[0].endDate || minStart;

    for (const task of projectTasks) {
      if (task.startDate) {
        if (!minStart || task.startDate < minStart) minStart = task.startDate;
      }
      if (task.endDate) {
        if (!maxEnd || task.endDate > maxEnd) maxEnd = task.endDate;
      }
      // Safeguard if startDate > endDate
      if (task.startDate && task.endDate && task.startDate > maxEnd) {
        maxEnd = task.startDate;
      }
    }

    const startObj = parseLocalDate(minStart);
    const endObj = parseLocalDate(maxEnd);
    const span = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Auto baseline: start 1 day before earliest start date for clean visual margin, or exactly on start date
    const autoBaseObj = new Date(startObj);
    autoBaseObj.setDate(autoBaseObj.getDate() - 1);
    const autoBaseline = formatLocalDate(autoBaseObj);

    return {
      hasTasks: true,
      earliestStart: minStart,
      latestEnd: maxEnd,
      totalSpanDays: span,
      autoBaseline,
    };
  }, [projectTasks]);

  // Selected timeline span horizon (e.g. 24, 30, or auto fit full project)
  const [viewSpanDays, setViewSpanDays] = useState<number>(24);
  
  // Baseline anchor date string (YYYY-MM-DD)
  const [baseDateStr, setBaseDateStr] = useState<string>(projectDateRange.autoBaseline);

  const prevProjectIdRef = useRef<string | null>(null);
  const prevTaskCountRef = useRef<number>(projectTasks.length);

  // Auto-synchronize baseline date whenever the project switches
  useEffect(() => {
    if (currentProject?.id !== prevProjectIdRef.current) {
      prevProjectIdRef.current = currentProject?.id || null;
      setBaseDateStr(projectDateRange.autoBaseline);

      // If project has longer span, adapt view span seamlessly
      if (projectDateRange.totalSpanDays > 24) {
        setViewSpanDays(Math.min(60, Math.max(24, projectDateRange.totalSpanDays + 3)));
      } else {
        setViewSpanDays(24);
      }
    }
  }, [currentProject?.id, projectDateRange.autoBaseline, projectDateRange.totalSpanDays]);

  // Auto-synchronize baseline date when project transitions from 0 tasks to having tasks
  useEffect(() => {
    if (prevTaskCountRef.current === 0 && projectTasks.length > 0) {
      setBaseDateStr(projectDateRange.autoBaseline);
    }
    prevTaskCountRef.current = projectTasks.length;
  }, [projectTasks.length, projectDateRange.autoBaseline]);

  // Helper: parse date to Javascript Date
  const baseDate = useMemo(() => parseLocalDate(baseDateStr), [baseDateStr]);

  // Generate sequential days for columns based on viewSpanDays
  const timelineDays = useMemo(() => {
    const days = [];
    const todayStr = formatLocalDate(new Date());
    for (let i = 0; i < viewSpanDays; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const str = formatLocalDate(d);
      days.push({
        dateStr: str,
        dayOfMonth: d.getDate(),
        month: d.getMonth() + 1,
        dayOfWeek: d.toLocaleDateString('zh-TW', { weekday: 'narrow' }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: str === todayStr,
      });
    }
    return days;
  }, [baseDate, viewSpanDays]);

  // Shift timeline window helpers
  const handleShiftBase = (daysOffset: number) => {
    const newBase = new Date(baseDate);
    newBase.setDate(baseDate.getDate() + daysOffset);
    setBaseDateStr(formatLocalDate(newBase));
  };

  const handleResetToProjectStart = () => {
    setBaseDateStr(projectDateRange.autoBaseline);
  };

  const handleAlignToday = () => {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    setBaseDateStr(formatLocalDate(t));
  };

  const handleJumpToTaskDate = (targetDateStr: string) => {
    const d = parseLocalDate(targetDateStr);
    d.setDate(d.getDate() - 1);
    setBaseDateStr(formatLocalDate(d));
  };

  // Calculate task offsets relative to timeline base
  const calculateTaskTimelinePosition = (startDateStr: string, endDateStr: string) => {
    const start = parseLocalDate(startDateStr);
    const end = parseLocalDate(endDateStr);
    
    // Difference from base date in days
    const diffTimeStart = start.getTime() - baseDate.getTime();
    const offsetDays = Math.round(diffTimeStart / (1000 * 60 * 60 * 24));
    
    const diffTimeRange = end.getTime() - start.getTime();
    const durationDays = Math.max(1, Math.round(diffTimeRange / (1000 * 60 * 60 * 24)) + 1);

    return {
      offsetDays, // can be negative if starts before base date
      durationDays,
    };
  };

  // Convert status color to Gantt bar specific accent colors
  const getStatusColorClass = (statusId: string, progress: number) => {
    const statusObj = statuses.find(s => s.id === statusId);
    if (!statusObj) return 'bg-slate-400';
    
    if (statusObj.name.includes('Done') || statusObj.name.includes('已完成') || progress === 100) {
      return 'bg-emerald-500 hover:bg-emerald-600';
    }
    if (statusObj.name.includes('Progress') || statusObj.name.includes('進行中')) {
      return 'bg-indigo-500 hover:bg-indigo-600';
    }
    if (statusObj.name.includes('Review') || statusObj.name.includes('審查') || statusObj.name.includes('測試')) {
      return 'bg-amber-500 hover:bg-amber-600';
    }
    return 'bg-indigo-400 hover:bg-indigo-500';
  };

  // Task Range Adjuster Handler (inline sliders/inputs helper)
  const adjustTaskDates = (task: Task, startDelta: number, endDelta: number) => {
    const start = parseLocalDate(task.startDate);
    const end = parseLocalDate(task.endDate);

    start.setDate(start.getDate() + startDelta);
    end.setDate(end.getDate() + endDelta);

    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);

    onUpdateTask({
      ...task,
      startDate: startStr,
      endDate: endStr < startStr ? startStr : endStr,
    });
  };

  // Calculate project completion summary
  const completedCount = projectTasks.filter(t => t.progress === 100).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-sm transition-shadow p-6 space-y-6 overflow-hidden">
      
      {/* Gantt View Header controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Milestone className="text-indigo-600" size={18} /> 專案時程分佈 (甘特圖 Gantt)
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
              {currentProject?.name || '未選擇專案'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            基準基準日已自動相對應此專案工作項目的排程區間。可縮放視野天數或微調日期以挪移工期。
          </p>
        </div>

        {/* Navigation timeline shifter and range controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          
          {/* Timeline View Span Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewSpanDays(24)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewSpanDays === 24 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              24 天
            </button>
            <button
              type="button"
              onClick={() => setViewSpanDays(30)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewSpanDays === 30 
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 天
            </button>
            {projectDateRange.totalSpanDays > 30 && (
              <button
                type="button"
                onClick={() => setViewSpanDays(Math.min(90, projectDateRange.totalSpanDays + 4))}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewSpanDays > 30 
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全案 ({projectDateRange.totalSpanDays + 4}天)
              </button>
            )}
          </div>

          {/* Quick Shift Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleShiftBase(-7)}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="前移一週 (-7天)"
            >
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={() => handleShiftBase(7)}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="後移一週 (+7天)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Automatic align button */}
          <button
            onClick={handleResetToProjectStart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            title="自動對齊此專案工作項目的起始日期區間"
          >
            <Crosshair size={14} className="text-indigo-600" />
            <span>自動對齊專案起點</span>
            <span className="font-mono text-[11px] text-indigo-400">({projectDateRange.earliestStart})</span>
          </button>

          {/* Align today button */}
          <button
            onClick={handleAlignToday}
            className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="對齊今天日期"
          >
            今日
          </button>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-500 font-medium">基準：</span>
            <input 
              type="date"
              value={baseDateStr}
              onChange={(e) => {
                if (e.target.value) setBaseDateStr(e.target.value);
              }}
              className="bg-transparent text-xs font-mono font-medium text-slate-700 outline-none cursor-pointer"
              title="直接選取甘特圖起始基準日"
            />
          </div>

        </div>
      </div>

      {/* Project Schedule Range Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">專案工作排程區間</div>
            <div className="font-mono font-bold text-slate-700">
              {projectDateRange.hasTasks ? (
                <span>{projectDateRange.earliestStart} ~ {projectDateRange.latestEnd}</span>
              ) : (
                <span className="text-slate-400">無排程任務</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">工期跨度與進度</div>
            <div className="font-bold text-slate-700">
              {projectDateRange.hasTasks ? (
                <span>共 {projectDateRange.totalSpanDays} 天 <span className="text-slate-400 font-normal">({completedCount}/{projectTasks.length} 完成)</span></span>
              ) : (
                <span className="text-slate-400">0 天</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Crosshair size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">目前甘特圖基準日</div>
            <div className="font-mono font-bold text-indigo-600 flex items-center gap-1">
              <span>{baseDateStr}</span>
              <span className="text-[10px] font-normal text-slate-400">(第 1 欄)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">基準對齊狀態</div>
            <div className="font-medium text-slate-700">
              {baseDateStr === projectDateRange.autoBaseline ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  ✓ 已自動對齊專案起點
                </span>
              ) : (
                <button 
                  onClick={handleResetToProjectStart} 
                  className="text-indigo-600 hover:underline font-semibold text-[11px]"
                >
                  ⚡ 點此一鍵重新對齊
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Legend references */}
      <div className="flex flex-wrap gap-4 text-xs items-center">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-3 h-3 bg-indigo-500 rounded-md" /> 進行中 / 開發中
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-3 h-3 bg-emerald-500 rounded-md" /> 已完成任務
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-3 h-3 bg-amber-500 rounded-md" /> 程式覆核 / 待測試
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" /> 今日標記
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 font-medium ml-auto font-mono text-[11px] text-slate-400">
          🔍 視圖範圍：{timelineDays[0]?.dateStr} 至 {timelineDays[timelineDays.length - 1]?.dateStr}（為期 {viewSpanDays} 天）
        </div>
      </div>

      {/* Gantt Chart Main Table */}
      <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
        <div className="min-w-[950px] divide-y divide-slate-100">
          
          {/* Header row: Days list */}
          <div className="flex bg-slate-50/70 border-b border-slate-100">
            {/* Left side empty space (Task Title sidebar placeholder) */}
            <div className="w-72 p-3 font-bold text-xs text-slate-600 shrink-0 border-r border-slate-100 self-center flex items-center justify-between">
              <span>工作項目名稱及指派人員</span>
              <span className="text-[10px] text-slate-400 font-normal">({projectTasks.length} 項)</span>
            </div>

            {/* Right side Timeline dates header list */}
            <div className="flex-1 flex font-mono text-[10px]">
              {timelineDays.map((day) => (
                <div 
                  key={day.dateStr} 
                  className={`flex-1 text-center py-2.5 border-r border-slate-100 last:border-0 font-medium shrink-0 flex flex-col justify-center relative ${
                    day.isToday 
                      ? 'bg-indigo-50/70 font-bold text-indigo-700' 
                      : day.isWeekend 
                        ? 'bg-amber-50/20 text-amber-700/70' 
                        : 'text-slate-600'
                  }`}
                  style={{ minWidth: '35px' }}
                >
                  {day.isToday && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 bg-rose-500 text-white rounded-full text-[8px] font-bold">
                      今日
                    </span>
                  )}
                  <span className={`text-[9px] ${day.isToday ? 'text-indigo-600 font-bold' : 'text-slate-400 font-semibold'}`}>
                    {day.month}/{day.dayOfMonth}
                  </span>
                  <span className="text-[10px]">{day.dayOfWeek}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body Rows: Tasks list and timeline bars */}
          <div className="divide-y divide-slate-100 bg-white">
            {projectTasks.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                <div className="text-slate-300">
                  <Milestone size={32} className="mx-auto" />
                </div>
                <div className="font-semibold text-slate-500">本專案目前無工作項目</div>
                <p className="text-[11px] max-w-sm mx-auto text-slate-400">
                  請至「儀表板」或「工作看板」建立工作項目，甘特圖將自動依工作項目的日期區間繪製時程進度！
                </p>
              </div>
            ) : (
              projectTasks.map((task) => {
                const assigneeObj = members.find(m => m.id === task.assigneeId);
                const { offsetDays, durationDays } = calculateTaskTimelinePosition(task.startDate, task.endDate);

                // Math bounds to fit the timeline window (0 to viewSpanDays - 1)
                const barStartCol = offsetDays;
                const barEndCol = offsetDays + durationDays - 1;

                // Visibility in current timeline window
                const isVisible = barStartCol < viewSpanDays && barEndCol >= 0;

                // Percent positioning representation for high-fidelity grid mapping
                const cellPercent = 100 / viewSpanDays;

                let leftPct = 0;
                let widthPct = 0;

                if (isVisible) {
                  const visibleStart = Math.max(0, barStartCol);
                  const visibleEnd = Math.min(viewSpanDays - 1, barEndCol);
                  leftPct = visibleStart * cellPercent;
                  widthPct = (visibleEnd - visibleStart + 1) * cellPercent;
                }

                return (
                  <div key={task.id} className="flex hover:bg-slate-50/50 transition-colors">
                    
                    {/* Left Sidebar task metadata description */}
                    <div className="w-72 p-3 border-r border-slate-100 shrink-0 flex flex-col justify-between space-y-1 bg-white">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 
                            onClick={() => setEditingTask(task)}
                            className="font-bold text-xs text-slate-800 line-clamp-1 hover:text-indigo-600 cursor-pointer transition-colors"
                            title="點擊修改工作項目"
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => setEditingTask(task)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="修改工作項目"
                            >
                              <Edit3 size={12} />
                            </button>
                            {onDeleteTask && (
                              <button
                                onClick={() => setEditingTask(task)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="刪除工作項目"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-mono items-center">
                          <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            {task.startDate.substring(5)} 至 {task.endDate.substring(5)}
                          </span>
                          <span>({durationDays}天)</span>
                        </div>
                      </div>

                      {/* Display assignee avatar and name and adjustments block */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          {assigneeObj ? (
                            <>
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${assigneeObj.avatarColor}`}>
                                {assigneeObj.name.substring(0, 1)}
                              </span>
                              <span className="font-medium text-slate-700">{assigneeObj.name}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">👤 未指派</span>
                          )}
                        </div>

                        {/* Inline Timeline adjusters */}
                        <div className="flex items-center gap-0.5 border border-slate-200 bg-white rounded shadow-2xs divide-x divide-slate-100">
                          <button
                            onClick={() => adjustTaskDates(task, -1, -1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-[10px] font-bold text-slate-500"
                            title="整體往左移動 1 天"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => adjustTaskDates(task, 0, -1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-[9px] font-medium text-slate-600"
                            title="縮短工期 1 天"
                          >
                            縮短
                          </button>
                          <button
                            onClick={() => adjustTaskDates(task, 0, 1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-[9px] font-medium text-slate-600"
                            title="延長工期 1 天"
                          >
                            延長
                          </button>
                          <button
                            onClick={() => adjustTaskDates(task, 1, 1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-[10px] font-bold text-slate-500"
                            title="整體往右移動 1 天"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right timeline range grid bars */}
                    <div className="flex-1 relative min-h-16 py-3 shrink-0 flex">
                      {/* Grid background lines */}
                      <div className="absolute inset-0 flex">
                        {timelineDays.map((day) => (
                          <div 
                            key={`grid-${day.dateStr}`} 
                            className={`flex-1 border-r border-slate-100 last:border-0 ${
                              day.isToday 
                                ? 'bg-indigo-50/20' 
                                : day.isWeekend 
                                  ? 'bg-amber-50/10' 
                                  : ''
                            }`}
                            style={{ minWidth: '35px' }}
                          />
                        ))}
                      </div>

                      {/* Positioned task bar overlay */}
                      {isVisible ? (
                        <div 
                          className="absolute h-10 top-3 rounded-xl shadow-xs border border-transparent text-white p-2.5 transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
                          onClick={() => setEditingTask(task)}
                          title={`${task.title} (${task.startDate} ~ ${task.endDate}, 進度 ${task.progress}%) - 點擊編輯`}
                          style={{ 
                            left: `${leftPct}%`, 
                            width: `${widthPct}%`,
                            minWidth: '24px',
                          }}
                        >
                          <div className={`absolute inset-0 -z-10 ${getStatusColorClass(task.statusId, task.progress)}`} />
                          
                          {/* Top part: Progress overlay inside task block */}
                          <div 
                            className="absolute top-0 bottom-0 left-0 bg-white/15 pointer-events-none transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />

                          <div className="flex justify-between items-center text-[10px] leading-none select-none font-bold">
                            <span className="truncate pr-1">
                              {task.progress}%
                            </span>
                            <span className="font-normal font-mono opacity-90 truncate">
                              {task.title}
                            </span>
                          </div>

                          {/* Mini Progress Bar Line */}
                          <div className="w-full bg-black/15 h-1 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-white rounded-full" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute top-4 left-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-50/90 border border-slate-200 px-2 py-1 rounded-lg">
                          <AlertCircle size={13} className="text-amber-500 shrink-0" />
                          <span>任務排程超出當前視野 ({task.startDate} ~ {task.endDate})</span>
                          <button
                            type="button"
                            onClick={() => handleJumpToTaskDate(task.startDate)}
                            className="ml-2 font-sans font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            👉 移至該工作日期
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Milestones Section */}
      <div className="p-5 border border-indigo-200 bg-indigo-50/20 rounded-2xl">
        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mb-2">
          <Milestone size={14} className="text-indigo-600" /> Milestone 里程碑指標說明
        </h4>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          在本系統中，優先級設定為高（<span className="font-semibold text-rose-500">🔴 高優先</span>）且進度達到 <span className="font-bold text-indigo-700">100%</span> 的任務，將自動在資料庫中標記為專案的重要里程碑。甘特圖的基準日會隨您所選的專案工作項目起訖自動定位，若新增或修改了工作項目的時程，甘特圖亦會自動校正對齊。
        </p>
      </div>

      {/* Task Edit Modal */}
      <AnimatePresence>
        {editingTask && (
          <TaskEditModal
            task={editingTask}
            projects={currentProject ? [currentProject] : []}
            members={members}
            statuses={statuses}
            onClose={() => setEditingTask(null)}
            onSave={(updatedTask) => {
              onUpdateTask(updatedTask);
            }}
            onDelete={onDeleteTask ? (taskId) => {
              onDeleteTask(taskId);
            } : undefined}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
