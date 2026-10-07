import React, { useState, useMemo } from 'react';
import { 
  Project, Task, Member, WorkflowStatus, ActivityLog, Priority 
} from '../types';
import { 
  Briefcase, Users, CheckCircle2, Clock, AlertCircle, TrendingUp, Plus, UserPlus, 
  Edit3, Trash2, FolderKanban, Settings, X, AlertTriangle, Check, Layers, ArrowRight,
  ShieldAlert, Mail, UserCheck, Eye, Search, Filter, Calendar, MessageSquare, ListTodo,
  ExternalLink, ChevronRight, BarChart3, LayoutGrid, CheckSquare, Sparkles, Milestone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskEditModal from './TaskEditModal';

const AVATAR_COLORS = [
  { name: '天空藍', value: 'bg-sky-500' },
  { name: '靛青藍', value: 'bg-indigo-600' },
  { name: '羅蘭紫', value: 'bg-violet-500' },
  { name: '玫瑰紅', value: 'bg-rose-500' },
  { name: '暖琥珀', value: 'bg-amber-500' },
  { name: '翡翠綠', value: 'bg-emerald-500' },
  { name: '湖水青', value: 'bg-teal-500' },
  { name: '洋桃紅', value: 'bg-fuchsia-500' },
  { name: '石板灰', value: 'bg-slate-600' },
];

const STANDARD_ROLES = [
  '前端工程師 (Frontend Developer)',
  '後端工程師 (Backend Developer)',
  '全端工程師 (Fullstack Developer)',
  'UI/UX 設計師 (UI/UX Designer)',
  '產品經理 (Product Manager PM)',
  '專案領導 (Project Lead)',
  '測試工程師 (QA Engineer)',
  '維運工程師 (DevOps)',
  '行銷企劃 (Marketing Specialist)'
];

interface DashboardProps {
  currentProject: Project | null;
  projects: Project[];
  tasks: Task[];
  members: Member[];
  statuses: WorkflowStatus[];
  activityLogs: ActivityLog[];
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, description: string) => void;
  onUpdateProject: (id: string, name: string, description: string) => void;
  onDeleteProject: (id: string) => void;
  onAddMember: (name: string, role: string, email: string, avatarColor?: string) => void;
  onUpdateMember: (updatedMember: Member) => void;
  onDeleteMember: (id: string) => void;
  onAddTask: (title: string, priority: Priority, assigneeId: string, durationDays: number, targetProjectId?: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigateTab?: (tab: 'dashboard' | 'kanban' | 'gantt' | 'chatbot') => void;
}

export default function Dashboard({
  currentProject,
  projects,
  tasks,
  members,
  statuses,
  activityLogs,
  onSelectProject,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateTab,
}: DashboardProps) {
  // Task Edit & Delete modal states
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // New Project states
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Edit Project states
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');

  // Delete Project states
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Manage Projects overview modal
  const [showProjectsManager, setShowProjectsManager] = useState(false);

  // Project Details Inspection modal
  const [viewingProjectDetails, setViewingProjectDetails] = useState<Project | null>(null);
  const [detailTaskSearch, setDetailTaskSearch] = useState('');
  const [detailTaskStatusFilter, setDetailTaskStatusFilter] = useState('all');
  const [detailTaskPriorityFilter, setDetailTaskPriorityFilter] = useState('all');

  // Member states
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState(STANDARD_ROLES[0]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberAvatarColor, setNewMemberAvatarColor] = useState('bg-sky-500');

  // Edit Member states
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberColor, setEditMemberColor] = useState('');

  // Delete Member states
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Quick Task states
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Priority>('medium');
  const [quickTaskAssignee, setQuickTaskAssignee] = useState('');

  // Date anchor
  const todayStr = new Date().toISOString().split('T')[0];
  const doneStatus = statuses.find(s => s.name.toLowerCase().includes('done') || s.name.toLowerCase().includes('已完成') || s.name.toLowerCase().includes('完成'));

  // Filter tasks belonging to current project
  const currentProjectTasks = tasks.filter(t => t.projectId === currentProject?.id);

  // Current Project Statistics calculations
  const totalTasksCount = currentProjectTasks.length;
  const completedTasksCount = currentProjectTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
  
  const inProgressStatus = statuses.filter(s => s.name.toLowerCase().includes('progress') || s.name.toLowerCase().includes('進行中') || s.name.toLowerCase().includes('開發中'));
  const inProgressCount = currentProjectTasks.filter(t => inProgressStatus.some(s => s.id === t.statusId) && t.progress < 100).length;

  const averageProgress = totalTasksCount > 0 
    ? Math.round(currentProjectTasks.reduce((acc, t) => acc + t.progress, 0) / totalTasksCount) 
    : 0;

  const overdueCount = currentProjectTasks.filter(t => {
    const isCompleted = doneStatus ? t.statusId === doneStatus.id : t.progress === 100;
    return t.endDate < todayStr && !isCompleted;
  }).length;

  // Cross-Project Portfolio Progress calculations
  const portfolioStats = useMemo(() => {
    const totalProj = projects.length;
    const totalTasks = tasks.length;
    const totalCompleted = tasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
    const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks) : 0;
    const totalOverdue = tasks.filter(t => {
      const isCompleted = doneStatus ? t.statusId === doneStatus.id : t.progress === 100;
      return t.endDate < todayStr && !isCompleted;
    }).length;

    // Per-project calculated statistics
    const projectBreakdowns = projects.map(proj => {
      const pTasks = tasks.filter(t => t.projectId === proj.id);
      const pTotal = pTasks.length;
      const pCompleted = pTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
      const inProg = pTasks.filter(t => inProgressStatus.some(s => s.id === t.statusId) && t.progress < 100).length;
      const pTodo = pTasks.filter(t => !inProgressStatus.some(s => s.id === t.statusId) && (doneStatus ? t.statusId !== doneStatus.id : t.progress < 100)).length;
      const pAvgProgress = pTotal > 0 ? Math.round(pTasks.reduce((sum, t) => sum + t.progress, 0) / pTotal) : 0;
      const pOverdue = pTasks.filter(t => {
        const isCompleted = doneStatus ? t.statusId === doneStatus.id : t.progress === 100;
        return t.endDate < todayStr && !isCompleted;
      }).length;
      
      // Distinct assigned members
      const assignedMemberIds = Array.from(new Set(pTasks.map(t => t.assigneeId).filter(Boolean)));
      const assignedMembers = members.filter(m => assignedMemberIds.includes(m.id));

      // Health rating
      let healthText = '良好';
      let healthColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (pOverdue > 0) {
        healthText = `⚠️ 逾期警示 (${pOverdue})`;
        healthColor = 'text-rose-700 bg-rose-50 border-rose-200';
      } else if (pAvgProgress >= 70) {
        healthText = '穩健推進中';
        healthColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
      } else if (pTotal === 0) {
        healthText = '尚無任務';
        healthColor = 'text-slate-600 bg-slate-100 border-slate-200';
      } else {
        healthText = '進行中';
        healthColor = 'text-sky-700 bg-sky-50 border-sky-200';
      }

      // Calculate Gantt Schedule & Timeline Progress Info
      let ganttStart = '';
      let ganttEnd = '';
      let ganttSpanDays = 0;
      let ganttTimelineProgress = 0;
      let ganttDaysElapsed = 0;
      let ganttDaysRemaining = 0;
      let ganttStatusText = '尚無排程';
      let ganttStatusBadgeClass = 'text-slate-500 bg-slate-100 border-slate-200';
      let nextMilestoneTask: Task | null = null;

      if (pTasks.length > 0) {
        let minStart = pTasks[0].startDate;
        let maxEnd = pTasks[0].endDate;

        for (const t of pTasks) {
          if (t.startDate) {
            if (!minStart || t.startDate < minStart) minStart = t.startDate;
          }
          if (t.endDate) {
            if (!maxEnd || t.endDate > maxEnd) maxEnd = t.endDate;
          }
          if (t.startDate && t.endDate && t.startDate > maxEnd) {
            maxEnd = t.startDate;
          }
        }

        if (minStart && maxEnd) {
          ganttStart = minStart;
          ganttEnd = maxEnd;

          const parseYMD = (s: string) => {
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, (m || 1) - 1, d || 1);
          };

          const startD = parseYMD(minStart);
          const endD = parseYMD(maxEnd);
          const todayD = parseYMD(todayStr);

          ganttSpanDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          const totalDuration = endD.getTime() - startD.getTime();
          const elapsed = todayD.getTime() - startD.getTime();

          if (pCompleted === pTotal && pTotal > 0) {
            ganttStatusText = '🎉 排程已全數交付';
            ganttStatusBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            ganttTimelineProgress = 100;
          } else if (todayStr < minStart) {
            const daysToStart = Math.ceil((startD.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
            ganttStatusText = `⏳ 距啟動 ${daysToStart} 天`;
            ganttStatusBadgeClass = 'text-sky-700 bg-sky-50 border-sky-200';
            ganttTimelineProgress = 0;
            ganttDaysRemaining = ganttSpanDays;
          } else if (todayStr > maxEnd) {
            const daysOverdue = Math.floor((todayD.getTime() - endD.getTime()) / (1000 * 60 * 60 * 24));
            ganttStatusText = `⚠️ 逾期 ${daysOverdue} 天`;
            ganttStatusBadgeClass = 'text-rose-700 bg-rose-50 border-rose-200';
            ganttTimelineProgress = 100;
            ganttDaysRemaining = 0;
          } else {
            const daysFromStart = Math.max(1, Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1);
            ganttDaysElapsed = daysFromStart;
            ganttDaysRemaining = Math.max(0, Math.ceil((endD.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24)));
            ganttTimelineProgress = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 50;
            ganttStatusText = `⚡ 進行中 (第 ${daysFromStart}/${ganttSpanDays} 天)`;
            ganttStatusBadgeClass = 'text-indigo-700 bg-indigo-50 border-indigo-200';
          }

          // Next pending task by earliest endDate
          const pending = pTasks
            .filter(t => doneStatus ? t.statusId !== doneStatus.id : t.progress < 100)
            .sort((a, b) => a.endDate.localeCompare(b.endDate));
          if (pending.length > 0) {
            nextMilestoneTask = pending[0];
          }
        }
      }

      return {
        project: proj,
        totalTasks: pTotal,
        completedTasks: pCompleted,
        inProgressTasks: inProg,
        todoTasks: pTodo,
        averageProgress: pAvgProgress,
        overdueCount: pOverdue,
        assignedMembers,
        healthText,
        healthColor,
        ganttStart,
        ganttEnd,
        ganttSpanDays,
        ganttTimelineProgress,
        ganttDaysElapsed,
        ganttDaysRemaining,
        ganttStatusText,
        ganttStatusBadgeClass,
        nextMilestoneTask
      };
    });

    return {
      totalProj,
      totalTasks,
      totalCompleted,
      avgProgress,
      totalOverdue,
      projectBreakdowns
    };
  }, [projects, tasks, members, statuses, todayStr, doneStatus, inProgressStatus]);

  // Map activities of current project
  const filteredLogs = activityLogs
    .filter(log => log.projectId === currentProject?.id)
    .slice(0, 10);

  // Project Handlers
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddProject(newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
    setShowAddProject(false);
  };

  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setEditProjName(proj.name);
    setEditProjDesc(proj.description);
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjName.trim()) return;
    onUpdateProject(editingProject.id, editProjName.trim(), editProjDesc.trim());
    
    // If the one being inspected is this project, update view state too
    if (viewingProjectDetails?.id === editingProject.id) {
      setViewingProjectDetails({
        ...viewingProjectDetails,
        name: editProjName.trim(),
        description: editProjDesc.trim()
      });
    }
    setEditingProject(null);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    if (viewingProjectDetails?.id === projectToDelete.id) {
      setViewingProjectDetails(null);
    }
    onDeleteProject(projectToDelete.id);
    setProjectToDelete(null);
  };

  // Member Handlers
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const email = newMemberEmail.trim() || `${newMemberName.trim().toLowerCase().replace(/\s+/g, '')}@example.com`;
    onAddMember(newMemberName.trim(), newMemberRole, email, newMemberAvatarColor);
    setNewMemberName('');
    setNewMemberEmail('');
    setShowAddMember(false);
  };

  const openEditMember = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    setEditMemberRole(m.role);
    setEditMemberEmail(m.email);
    setEditMemberColor(m.avatarColor);
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editMemberName.trim()) return;
    onUpdateMember({
      ...editingMember,
      name: editMemberName.trim(),
      role: editMemberRole.trim() || 'Team Member',
      email: editMemberEmail.trim(),
      avatarColor: editMemberColor || editingMember.avatarColor,
    });
    setEditingMember(null);
  };

  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    onDeleteMember(memberToDelete.id);
    setMemberToDelete(null);
  };

  // Quick Task Handler
  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onAddTask(quickTaskTitle.trim(), quickTaskPriority, quickTaskAssignee, 5);
    setQuickTaskTitle('');
    setQuickTaskAssignee('');
  };

  // Detail view filtered tasks
  const viewingProjectTasks = useMemo(() => {
    if (!viewingProjectDetails) return [];
    return tasks.filter(t => t.projectId === viewingProjectDetails.id);
  }, [tasks, viewingProjectDetails]);

  const filteredViewingTasks = useMemo(() => {
    return viewingProjectTasks.filter(t => {
      const matchSearch = !detailTaskSearch || 
        t.title.toLowerCase().includes(detailTaskSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(detailTaskSearch.toLowerCase());
      const matchStatus = detailTaskStatusFilter === 'all' || t.statusId === detailTaskStatusFilter;
      const matchPriority = detailTaskPriorityFilter === 'all' || t.priority === detailTaskPriorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [viewingProjectTasks, detailTaskSearch, detailTaskStatusFilter, detailTaskPriorityFilter]);

  return (
    <div className="space-y-6">

      {/* ========================================================================= */}
      {/* 1. TOP BENTO BANNER: Current Project Workspace Banner with Quick Switcher */}
      {/* ========================================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-shadow"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
              專案工作區 Workspace
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              目前聚焦: {currentProject?.name}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              共計 {projects.length} 個專案進行中
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              {currentProject ? currentProject.name : '選擇一個專案開始'}
            </h1>
            {currentProject && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewingProjectDetails(currentProject)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  title="直接檢視目前專案內容明細"
                >
                  <Eye size={13} /> 檢視明細
                </button>
                <button
                  onClick={() => openEditProject(currentProject)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="修改目前專案名稱與簡介"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => setProjectToDelete(currentProject)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="刪除目前專案"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-relaxed line-clamp-2">
            {currentProject?.description || '您可以新增專案、自訂工作流程並指派任務。'}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
          <select
            value={currentProject?.id || ''}
            onChange={(e) => onSelectProject(e.target.value)}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            title="切換不同專案"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📂 {p.name}
              </option>
            ))}
          </select>

          {/* Manage all projects button */}
          <button
            onClick={() => setShowProjectsManager(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer border border-slate-200"
            title="檢視並管理所有專案清單"
          >
            <FolderKanban size={14} /> 專案清單
          </button>

          {/* Quick add project trigger */}
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer shadow-indigo-100"
          >
            <Plus size={14} /> 建立專案
          </button>
        </div>
      </motion.div>

      {/* Project Creation Form Overlay */}
      {showAddProject && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-indigo-50/40 border border-indigo-150 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-indigo-600" /> 建立全新專案
            </h3>
            <button 
              onClick={() => setShowAddProject(false)} 
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">專案名稱 *</label>
              <input
                type="text"
                required
                placeholder="例如: 智慧官方網站重構"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">專案簡介</label>
              <input
                type="text"
                placeholder="說明專案的主要目標或背景資訊"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddProject(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                確認建立專案
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 2. CROSS-PROJECT PROGRESS PRESENTATION (跨專案進度呈現大盤) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BarChart3 size={16} />
              </div>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                跨專案進度推進大盤 (Portfolio Overview)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              宏觀掌握所有專案的健康狀態、推進進度與交付成果，可直接點選任一專案檢視其內容明細
            </p>
          </div>

          {/* Portfolio Metric Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">專案總數</span>
              <span className="text-sm font-black text-slate-800">{portfolioStats.totalProj}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">全域任務</span>
              <span className="text-sm font-black text-indigo-600">{portfolioStats.totalTasks}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">總體推進率</span>
              <span className="text-sm font-black text-emerald-600">{portfolioStats.avgProgress}%</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">逾期警示</span>
              <span className={`text-sm font-black ${portfolioStats.totalOverdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {portfolioStats.totalOverdue}
              </span>
            </div>
          </div>
        </div>

        {/* Cross-Project Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioStats.projectBreakdowns.map((b) => {
            const isCurrent = currentProject?.id === b.project.id;
            return (
              <div 
                key={b.project.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isCurrent 
                    ? 'border-indigo-400 bg-indigo-50/15 shadow-xs ring-1 ring-indigo-200' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-800 truncate" title={b.project.name}>
                          {b.project.name}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            當前焦點
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {b.project.description || '無詳細說明'}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${b.healthColor}`}>
                      {b.healthText}
                    </span>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[11px] font-bold text-slate-500">專案達成率</span>
                      <span className="font-mono font-extrabold text-sm text-slate-800">{b.averageProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          b.averageProgress >= 80 
                            ? 'bg-emerald-500' 
                            : b.averageProgress >= 40 
                              ? 'bg-indigo-600' 
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${b.averageProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Task Status Breakdown chips */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-150">
                      <span className="text-[9px] text-slate-400 font-extrabold block uppercase">總任務</span>
                      <strong className="text-xs text-slate-700">{b.totalTasks}</strong>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-150">
                      <span className="text-[9px] text-emerald-600 font-extrabold block uppercase">已完成</span>
                      <strong className="text-xs text-emerald-700">{b.completedTasks}</strong>
                    </div>
                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-150">
                      <span className="text-[9px] text-indigo-600 font-extrabold block uppercase">進行中</span>
                      <strong className="text-xs text-indigo-700">{b.inProgressTasks}</strong>
                    </div>
                    <div className={`p-2 rounded-xl border ${b.overdueCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50/80 border-slate-150 text-slate-700'}`}>
                      <span className="text-[9px] text-slate-400 font-extrabold block uppercase">逾期</span>
                      <strong className="text-xs">{b.overdueCount}</strong>
                    </div>
                  </div>

                  {/* Project Gantt Schedule Progress Module */}
                  <div className="mt-3.5 p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Milestone size={14} className="text-indigo-600" />
                        <span>專案甘特圖時程進度</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.ganttStatusBadgeClass}`}>
                        {b.ganttStatusText}
                      </span>
                    </div>

                    {b.ganttSpanDays > 0 ? (
                      <div className="space-y-2">
                        {/* Date range & span */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-slate-600 font-semibold flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {b.ganttStart} ~ {b.ganttEnd}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-white border border-indigo-150 px-2 py-0.5 rounded-md shadow-3xs">
                            共 {b.ganttSpanDays} 天工期
                          </span>
                        </div>

                        {/* Dual Progress Visualization (Timeline vs Deliverables) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={10} className="text-indigo-500" />
                              甘特時程時間軸：{b.ganttTimelineProgress}%
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              工作項目交付率：{b.averageProgress}%
                            </span>
                          </div>

                          <div className="relative w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            {/* Time elapsed underlay */}
                            <div 
                              className="h-full bg-indigo-200/90 transition-all duration-500" 
                              style={{ width: `${b.ganttTimelineProgress}%` }}
                              title={`時間推進: ${b.ganttTimelineProgress}%`}
                            />
                            {/* Deliverables completion overlay line */}
                            <div 
                              className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ${
                                b.averageProgress >= 100 
                                  ? 'bg-emerald-500' 
                                  : b.averageProgress >= b.ganttTimelineProgress 
                                    ? 'bg-indigo-600' 
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${b.averageProgress}%`, opacity: 0.85 }}
                              title={`工作完成度: ${b.averageProgress}%`}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono pt-0.5">
                            <span>{b.ganttStart.substring(5)} 起跑</span>
                            <span className={`font-semibold ${
                              b.averageProgress >= b.ganttTimelineProgress ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {b.averageProgress >= b.ganttTimelineProgress ? '✓ 進度穩健超前' : '⚠️ 時間走得比交付快'}
                            </span>
                            <span>{b.ganttEnd.substring(5)} 結案</span>
                          </div>
                        </div>

                        {/* Next Milestone preview */}
                        {b.nextMilestoneTask && (
                          <div className="flex items-center justify-between text-[10px] bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg">
                            <div className="flex items-center gap-1.5 truncate pr-2 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                              <span className="text-slate-400 shrink-0">近期節點:</span>
                              <span className="font-medium text-slate-700 truncate">{b.nextMilestoneTask.title}</span>
                            </div>
                            <span className="font-mono text-indigo-600 font-bold shrink-0">
                              {b.nextMilestoneTask.endDate.substring(5)} 止
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-1 font-medium text-center">
                        目前尚無排程任務，至看板或甘特圖排程後即時連動
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Member avatars and direct actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  {/* Involved Members Avatars */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {b.assignedMembers.slice(0, 4).map((m) => (
                        <div 
                          key={m.id}
                          className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white ${m.avatarColor}`}
                          title={`${m.name} (${m.role})`}
                        >
                          {m.name.substring(0, 1)}
                        </div>
                      ))}
                      {b.assignedMembers.length > 4 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                          +{b.assignedMembers.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {b.assignedMembers.length} 位成員
                    </span>
                  </div>

                  {/* Actions: View Details, Gantt, Switch, Edit */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewingProjectDetails(b.project)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors cursor-pointer border border-indigo-150"
                      title="直接檢視專案內容明細"
                    >
                      <Eye size={13} /> 內容明細
                    </button>

                    {onNavigateTab && (
                      <button
                        onClick={() => {
                          onSelectProject(b.project.id);
                          onNavigateTab('gantt');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-3xs"
                        title="切換至此專案並開啟專案甘特圖"
                      >
                        <Milestone size={13} className="text-indigo-600" /> 甘特圖
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => onSelectProject(b.project.id)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        title="切換至此專案"
                      >
                        切換
                      </button>
                    )}

                    <button
                      onClick={() => openEditProject(b.project)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="修改專案設定"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOCUSED PROJECT ANALYTICS & MEMBERS SECTION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Single Project Deep Dive Analytics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 4 Cards Stats Grid for Active Project */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0">
                <Briefcase size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">專案任務數</p>
                <h4 className="text-xl font-black text-slate-800 mt-0.5">{totalTasksCount}</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">已完成驗收</p>
                <h4 className="text-xl font-black text-slate-800 mt-0.5">{completedTasksCount}</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">進行開發中</p>
                <h4 className="text-xl font-black text-slate-800 mt-0.5">{inProgressCount}</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all flex items-center gap-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">逾期未交付</p>
                <h4 className="text-xl font-black text-slate-800 mt-0.5">{overdueCount}</h4>
              </div>
            </div>
          </div>

          {/* Project Completion Progress Meter and Quick Task Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Radial Progress Meter Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition-shadow flex flex-col items-center justify-between">
              <div className="w-full flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">🎯 當前專案推進指標</h3>
                <span className="text-[10px] font-mono font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                  平均完成率 {averageProgress}%
                </span>
              </div>

              <div className="relative flex items-center justify-center py-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="text-slate-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="text-indigo-600 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - averageProgress / 100)}`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-800">{averageProgress}%</span>
                  <p className="text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">總體進度</p>
                </div>
              </div>

              <div className="w-full grid grid-cols-3 text-center border-t border-slate-100 pt-4 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">專案狀態</p>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block mt-1">執行中</span>
                </div>
                <div className="border-x border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">里程碑進駐</p>
                  <span className="text-xs font-black text-slate-700 block mt-1.5">
                    {completedTasksCount}/{totalTasksCount}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">指派成員</p>
                  <span className="text-xs font-black text-slate-700 block mt-1.5">{members.length} 人</span>
                </div>
              </div>
            </div>

            {/* Quick Add Task Form */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">⚡ 快速指派新任務</h3>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  為「{currentProject?.name}」快速建立並指派工作任務
                </p>
              </div>

              <form onSubmit={handleCreateQuickTask} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="輸入任務名稱..."
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={quickTaskPriority}
                      onChange={(e) => setQuickTaskPriority(e.target.value as Priority)}
                      className="w-full text-[11px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-600 cursor-pointer"
                    >
                      <option value="low">🟡 低優先級</option>
                      <option value="medium">🟠 中優先級</option>
                      <option value="high">🔴 高優先級</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={quickTaskAssignee}
                      onChange={(e) => setQuickTaskAssignee(e.target.value)}
                      className="w-full text-[11px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-600 cursor-pointer"
                    >
                      <option value="">👤 未指派成員</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus size={14} /> 建立並隨機排程
                </button>
              </form>
            </div>
          </div>

          {/* Activity Logs Section */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">📢 當前專案即時動態</h3>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                即時更新 Live Feed
              </span>
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  此專案尚未有協作動態。您可以在看板搬移任務、新增評論或調整進度，動態一律會即時顯示於此！
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-xs items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${log.memberColor} shrink-0 text-[10px] font-bold`}>
                      {log.memberName.substring(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 leading-relaxed font-medium">
                        <span className="font-extrabold text-slate-800">{log.memberName}</span>{' '}
                        {log.action} <span className="font-bold text-indigo-600">「{log.targetName}」</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Member list, Team Workload Capacity, Workflow Customizer */}
        <div className="space-y-6">
          
          {/* Team Members Card with Workloads, Edit and Delete Actions */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">👥 團隊成員名冊 ({members.length}人)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">團隊編制與任務分派管理</p>
              </div>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-150 rounded-xl transition-colors font-bold cursor-pointer"
                title="新增團隊成員"
              >
                <UserPlus size={15} /> 新增成員
              </button>
            </div>

            {/* Member Creation Overlay */}
            {showAddMember && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserPlus size={14} className="text-indigo-600" /> 新增團隊成員
                  </h4>
                  <button 
                    onClick={() => setShowAddMember(false)} 
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleCreateMember} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">姓名 *</label>
                    <input
                      type="text"
                      required
                      placeholder="例如: 陳立誠"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">職稱角色</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        {STANDARD_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">電子信箱</label>
                      <input
                        type="email"
                        placeholder="信箱 (選填)"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Avatar Color selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">代表色標</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewMemberAvatarColor(c.value)}
                          className={`w-6 h-6 rounded-full ${c.value} flex items-center justify-center text-white transition-transform cursor-pointer ${
                            newMemberAvatarColor === c.value ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                          }`}
                          title={c.name}
                        >
                          {newMemberAvatarColor === c.value && <Check size={12} strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                    >
                      確定新增
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Members Load List with Edit & Delete */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {members.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  目前團隊尚無成員，請點擊上方按鈕新增成員。
                </div>
              ) : (
                members.map((m) => {
                  const mTasks = currentProjectTasks.filter(t => t.assigneeId === m.id);
                  const mTasksCompleted = mTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
                  const pendingCount = mTasks.length - mTasksCompleted;

                  return (
                    <div 
                      key={m.id} 
                      className="group p-3.5 border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-xs transition-all bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${m.avatarColor} font-black text-xs uppercase shadow-xs shrink-0`}>
                          {m.name.substring(0, 1)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-slate-800 text-xs truncate" title={m.name}>
                              {m.name}
                            </span>
                            
                            {/* Member Action Buttons: Edit and Delete */}
                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditMember(m)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                title="修改成員資訊"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => setMemberToDelete(m)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="移除此成員"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                              {m.role}
                            </span>
                            {m.email && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[130px]" title={m.email}>
                                {m.email}
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-medium">
                            <span>當前專案待辦: <strong className="text-slate-700">{pendingCount}</strong> / 總計: {mTasks.length}</span>
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[9px]">
                              {mTasks.length > 0 ? Math.round((mTasksCompleted / mTasks.length) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Micro Progress Bar of their workload */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            pendingCount > 3 ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{ 
                            width: `${mTasks.length > 0 ? (mTasksCompleted / mTasks.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Workflow Customization Guide */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-400" />
              <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
                多專案敏捷協同 Guide
              </span>
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-snug">
                跨專案即時追蹤小撇步
              </h3>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                在上方「跨專案進度推進大盤」中，點擊任一專案的 <span className="text-white font-bold">「檢視內容明細」</span>，即可即時查看該專案的完整任務清單、負責成員工項分派與進度達成率，並能一鍵切換前往該專案的看板或甘特圖！
              </p>
            </div>
            <div className="bg-indigo-800/25 border border-indigo-700/40 rounded-xl p-3.5 text-[11px] text-indigo-100 space-y-1">
              <span className="font-bold text-cyan-300">💡 敏捷小提示：</span>
              <p>
                若有任務逾期，系統會在跨專案大盤上即時紅字警示，協助 PM 第一時間排除瓶頸阻礙。
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. PROJECT CONTENT DETAILS MODAL (專案內容明細直接檢視彈窗) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {viewingProjectDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-150 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full uppercase">
                      專案明細檢視 Project Details
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      建立於 {viewingProjectDetails.createdAt}
                    </span>
                    {currentProject?.id === viewingProjectDetails.id ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ● 目前操作中專案
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectProject(viewingProjectDetails.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-0.5 rounded-full hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        切換為目前專案
                      </button>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5">
                    {viewingProjectDetails.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {viewingProjectDetails.description || '暫無專案簡介說明。'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {onNavigateTab && (
                    <>
                      <button
                        onClick={() => {
                          onSelectProject(viewingProjectDetails.id);
                          onNavigateTab('kanban');
                          setViewingProjectDetails(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-3xs"
                        title="切換至此專案並開啟看板"
                      >
                        <LayoutGrid size={13} /> 前往看板
                      </button>

                      <button
                        onClick={() => {
                          onSelectProject(viewingProjectDetails.id);
                          onNavigateTab('gantt');
                          setViewingProjectDetails(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-3xs"
                        title="切換至此專案並開啟甘特圖"
                      >
                        <Calendar size={13} /> 前往甘特圖
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => openEditProject(viewingProjectDetails)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors cursor-pointer border border-slate-200"
                    title="修改專案"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={() => setViewingProjectDetails(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors cursor-pointer border border-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* 4 Bento Overview Stat Cards */}
                {(() => {
                  const pTasks = viewingProjectTasks;
                  const pDone = pTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
                  const inProg = pTasks.filter(t => inProgressStatus.some(s => s.id === t.statusId) && t.progress < 100).length;
                  const pAvg = pTasks.length > 0 ? Math.round(pTasks.reduce((s, t) => s + t.progress, 0) / pTasks.length) : 0;
                  const pOverdue = pTasks.filter(t => {
                    const isCompleted = doneStatus ? t.statusId === doneStatus.id : t.progress === 100;
                    return t.endDate < todayStr && !isCompleted;
                  }).length;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">專案總任務數</span>
                        <div className="text-xl font-black text-slate-800 mt-1">{pTasks.length} 項</div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">涵蓋所有工作流程步驟</span>
                      </div>

                      <div className="p-4 bg-emerald-50/60 border border-emerald-150 rounded-2xl">
                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">總體完成進度</span>
                        <div className="text-xl font-black text-emerald-700 mt-1">{pAvg}%</div>
                        <span className="text-[10px] text-emerald-600 mt-0.5 block">已驗收交付 {pDone} 項</span>
                      </div>

                      <div className="p-4 bg-indigo-50/60 border border-indigo-150 rounded-2xl">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">進行中工項</span>
                        <div className="text-xl font-black text-indigo-700 mt-1">{inProg} 項</div>
                        <span className="text-[10px] text-indigo-600 mt-0.5 block">團隊活躍執行中</span>
                      </div>

                      <div className={`p-4 rounded-2xl border ${pOverdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${pOverdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          逾期風險項目
                        </span>
                        <div className={`text-xl font-black mt-1 ${pOverdue > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                          {pOverdue} 項
                        </div>
                        <span className={`text-[10px] mt-0.5 block ${pOverdue > 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                          {pOverdue > 0 ? '需要即時關注排除' : '目前時程無逾期風險'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Team Workload in this Project */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" /> 專案參與團隊陣容與分工情況
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {members.map(m => {
                      const mProjTasks = viewingProjectTasks.filter(t => t.assigneeId === m.id);
                      const mProjCompleted = mProjTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
                      if (mProjTasks.length === 0) return null;

                      return (
                        <div key={m.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${m.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                            {m.name.substring(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-xs text-slate-800 truncate">{m.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{m.role}</div>
                            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                              已完成 {mProjCompleted}/{mProjTasks.length} 項
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {viewingProjectTasks.filter(t => !t.assigneeId).length > 0 && (
                      <div className="p-3 bg-white border border-dashed border-slate-300 rounded-xl flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                          ?
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-xs text-slate-700">未指派成員</div>
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            共 {viewingProjectTasks.filter(t => !t.assigneeId).length} 項待分派
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks List with Filter and Search */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo size={14} className="text-indigo-600" /> 專案所屬任務明細 ({filteredViewingTasks.length} / {viewingProjectTasks.length} 項)
                    </h4>

                    {/* Filter Rail */}
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="搜尋任務關鍵字..."
                          value={detailTaskSearch}
                          onChange={(e) => setDetailTaskSearch(e.target.value)}
                          className="w-full sm:w-44 pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <select
                        value={detailTaskStatusFilter}
                        onChange={(e) => setDetailTaskStatusFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-pointer focus:outline-none"
                      >
                        <option value="all">所有工作狀態</option>
                        {statuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      <select
                        value={detailTaskPriorityFilter}
                        onChange={(e) => setDetailTaskPriorityFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-pointer focus:outline-none"
                      >
                        <option value="all">所有優先級</option>
                        <option value="high">🔴 高優先級</option>
                        <option value="medium">🟠 中優先級</option>
                        <option value="low">🟡 低優先級</option>
                      </select>

                      {/* Add work item directly to this project */}
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          const end = new Date(today);
                          end.setDate(today.getDate() + 5);
                          const newTask: Task = {
                            id: Math.random().toString(36).substr(2, 9),
                            projectId: viewingProjectDetails.id,
                            title: '',
                            description: '',
                            statusId: statuses[0]?.id || 'st1',
                            assigneeId: '',
                            priority: 'medium',
                            startDate: today.toISOString().split('T')[0],
                            endDate: end.toISOString().split('T')[0],
                            progress: 0,
                            subtasks: [],
                            comments: []
                          };
                          setTaskToEdit(newTask);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={13} /> 新增工作項目
                      </button>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {filteredViewingTasks.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                        {viewingProjectTasks.length === 0 ? '此專案目前尚無任務，請從上方快速建立或於看板新增。' : '查無符合條件的任務。'}
                      </div>
                    ) : (
                      filteredViewingTasks.map((t) => {
                        const statusObj = statuses.find(s => s.id === t.statusId);
                        const assignee = members.find(m => m.id === t.assigneeId);
                        const isTaskOverdue = t.endDate < todayStr && (doneStatus ? t.statusId !== doneStatus.id : t.progress < 100);
                        const completedSubtasks = t.subtasks.filter(st => st.completed).length;

                        return (
                          <div
                            key={t.id}
                            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-3xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Priority badge */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  t.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  t.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {t.priority === 'high' ? '高優先級' : t.priority === 'medium' ? '中優先級' : '低優先級'}
                                </span>

                                {/* Status badge */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${statusObj?.color || 'bg-slate-500'}`}>
                                  {statusObj?.name || '未分類'}
                                </span>

                                {isTaskOverdue && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <AlertCircle size={10} /> 已逾期
                                  </span>
                                )}

                                <h5 className="font-extrabold text-xs text-slate-800">
                                  {t.title}
                                </h5>
                              </div>

                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {t.description || '無詳細描述'}
                              </p>

                              {/* Task metadata row */}
                              <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-2 font-mono flex-wrap">
                                <span>排程: {t.startDate} ~ {t.endDate}</span>
                                {t.subtasks.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <CheckSquare size={11} className="text-slate-500" /> 子任務: {completedSubtasks}/{t.subtasks.length} 完成
                                  </span>
                                )}
                                {t.comments.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare size={11} className="text-slate-500" /> 討論: {t.comments.length} 則
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right side: Assignee & Progress */}
                            <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                              {/* Assignee */}
                              <div className="flex items-center gap-1.5">
                                {assignee ? (
                                  <>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${assignee.avatarColor}`}>
                                      {assignee.name.substring(0, 1)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{assignee.name}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">未指派</span>
                                )}
                              </div>

                              {/* Progress bar */}
                              <div className="w-24">
                                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-1">
                                  <span>進度</span>
                                  <span className="font-bold">{t.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      t.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                    }`}
                                    style={{ width: `${t.progress}%` }}
                                  />
                                </div>
                              </div>

                              {/* Work item Edit and Delete actions */}
                              <div className="flex items-center gap-1 border-l border-slate-150 pl-3">
                                <button
                                  type="button"
                                  onClick={() => setTaskToEdit(t)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="修改此工作項目"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTaskToDelete(t)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="刪除此工作項目"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingProjectDetails(null)}
                  className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  關閉明細
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. EDIT PROJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full relative"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">修改專案資訊</h3>
                </div>
                <button
                  onClick={() => setEditingProject(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProjectEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">專案名稱 *</label>
                  <input
                    type="text"
                    required
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">專案詳細說明與簡介</label>
                  <textarea
                    rows={4}
                    value={editProjDesc}
                    onChange={(e) => setEditProjDesc(e.target.value)}
                    placeholder="說明專案目標、里程碑或團隊要求..."
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                  <span>建立日期: <strong className="text-slate-700">{editingProject.createdAt}</strong></span>
                  <span>包含任務: <strong className="text-indigo-600">{tasks.filter(t => t.projectId === editingProject.id).length} 項</strong></span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    儲存修改
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. DELETE PROJECT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">確定要刪除專案？</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    您即將刪除 <strong className="text-slate-800">「{projectToDelete.name}」</strong>。此專案底下所有的任務 (
                    <strong className="text-rose-600">{tasks.filter(t => t.projectId === projectToDelete.id).length} 項</strong>
                    ) 與相關協作動態也將會被一併清除，此動作無法復原。
                  </p>
                  {projects.length === 1 && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                      💡 提示：這是目前唯一的專案。刪除後系統將自動為您生成一個全新的預設專案。
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProject}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> 確認刪除專案
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. MANAGE ALL PROJECTS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showProjectsManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FolderKanban size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">專案總覽與管理中心</h3>
                    <p className="text-[11px] text-slate-400">檢視、切換、修改或刪除所有專案</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowProjectsManager(false);
                      setShowAddProject(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus size={14} /> 新增專案
                  </button>
                  <button
                    onClick={() => setShowProjectsManager(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Projects List in Bento cards */}
              <div className="py-4 space-y-3 overflow-y-auto flex-1">
                {projects.map((proj) => {
                  const pTasks = tasks.filter(t => t.projectId === proj.id);
                  const pDone = pTasks.filter(t => doneStatus ? t.statusId === doneStatus.id : t.progress === 100).length;
                  const isCurrent = currentProject?.id === proj.id;
                  const progressPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

                  // Gantt schedule calculation for this project
                  let pGanttStart = '';
                  let pGanttEnd = '';
                  let pGanttSpan = 0;
                  if (pTasks.length > 0) {
                    let minS = pTasks[0].startDate;
                    let maxE = pTasks[0].endDate;
                    for (const t of pTasks) {
                      if (t.startDate && (!minS || t.startDate < minS)) minS = t.startDate;
                      if (t.endDate && (!maxE || t.endDate > maxE)) maxE = t.endDate;
                      if (t.startDate && t.endDate && t.startDate > maxE) maxE = t.startDate;
                    }
                    if (minS && maxE) {
                      pGanttStart = minS;
                      pGanttEnd = maxE;
                      const sParts = minS.split('-').map(Number);
                      const eParts = maxE.split('-').map(Number);
                      const sD = new Date(sParts[0], sParts[1] - 1, sParts[2]);
                      const eD = new Date(eParts[0], eParts[1] - 1, eParts[2]);
                      pGanttSpan = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                    }
                  }

                  return (
                    <div
                      key={proj.id}
                      className={`p-4 border rounded-2xl transition-all ${
                        isCurrent 
                          ? 'border-indigo-400 bg-indigo-50/20 shadow-xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 text-sm">{proj.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">
                                目前使用中
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {proj.description || '無詳細說明'}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-mono flex-wrap">
                            <span>建立於: {proj.createdAt}</span>
                            <span>•</span>
                            <span>任務數: <strong className="text-slate-700">{pTasks.length}</strong></span>
                            <span>•</span>
                            <span>完成度: <strong className="text-indigo-600">{progressPct}%</strong></span>
                            {pGanttStart && pGanttEnd && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 font-bold flex items-center gap-1">
                                  <Milestone size={11} /> 甘特排程: {pGanttStart} ~ {pGanttEnd} ({pGanttSpan}天)
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => {
                              setShowProjectsManager(false);
                              setViewingProjectDetails(proj);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye size={13} /> 內容明細
                          </button>
                          {onNavigateTab && (
                            <button
                              onClick={() => {
                                onSelectProject(proj.id);
                                onNavigateTab('gantt');
                                setShowProjectsManager(false);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                              title="開啟此專案甘特圖"
                            >
                              <Milestone size={13} /> 甘特圖
                            </button>
                          )}
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                onSelectProject(proj.id);
                                setShowProjectsManager(false);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                              切換專案
                            </button>
                          )}
                          <button
                            onClick={() => {
                              openEditProject(proj);
                            }}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="修改專案"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setProjectToDelete(proj);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                            title="刪除專案"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProjectsManager(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. EDIT MEMBER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${editMemberColor} text-white flex items-center justify-center font-bold text-xs`}>
                    {editMemberName.substring(0, 1) || 'M'}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">修改團隊成員資料</h3>
                    <p className="text-[10px] text-slate-400">更新個人角色、信箱與代表色</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingMember(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveMemberEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">成員姓名 *</label>
                  <input
                    type="text"
                    required
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">職稱角色</label>
                  <input
                    type="text"
                    list="standard-roles-list"
                    value={editMemberRole}
                    onChange={(e) => setEditMemberRole(e.target.value)}
                    placeholder="選擇或直接輸入職稱"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                  <datalist id="standard-roles-list">
                    {STANDARD_ROLES.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">電子信箱</label>
                  <input
                    type="email"
                    value={editMemberEmail}
                    onChange={(e) => setEditMemberEmail(e.target.value)}
                    placeholder="信箱地址"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                {/* Avatar color picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">頭像與標誌顏色</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditMemberColor(c.value)}
                        className={`w-7 h-7 rounded-full ${c.value} flex items-center justify-center text-white transition-all cursor-pointer ${
                          editMemberColor === c.value ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      >
                        {editMemberColor === c.value && <Check size={14} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    儲存更新
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 9. DELETE MEMBER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-2xl ${memberToDelete.avatarColor} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                  {memberToDelete.name.substring(0, 1)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">確定要移除此成員？</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    您即將從團隊中移除 <strong className="text-slate-800">「{memberToDelete.name}」</strong>（{memberToDelete.role}）。
                  </p>
                  
                  {/* Task impact note */}
                  {(() => {
                    const assignedTasks = tasks.filter(t => t.assigneeId === memberToDelete.id);
                    return (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-indigo-600" />
                          指派受影響任務：{assignedTasks.length} 項
                        </div>
                        <p className="text-[11px] text-slate-500">
                          刪除後，所有指派給該成員的任務將會自動更新為「<strong>未指派</strong>」，任務所有工作步驟與留言紀錄皆會完整保留。
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMember}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> 確認移除成員
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. EDIT WORK ITEM MODAL */}
      <AnimatePresence>
        {taskToEdit && (
          <TaskEditModal
            task={taskToEdit}
            projects={projects}
            members={members}
            statuses={statuses}
            onClose={() => setTaskToEdit(null)}
            onSave={(updatedTask) => {
              onUpdateTask(updatedTask);
            }}
            onDelete={(taskId) => {
              onDeleteTask(taskId);
            }}
          />
        )}
      </AnimatePresence>

      {/* 11. DELETE TASK CONFIRMATION MODAL */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">確定要刪除此工作項目？</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    您即將刪除 <strong className="text-slate-800">「{taskToDelete.title}」</strong>。該項目的所有子任務檢核與評論紀錄皆會被清除，此操作無法復原。
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTask(taskToDelete.id);
                    setTaskToDelete(null);
                  }}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> 確認刪除工作項目
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
