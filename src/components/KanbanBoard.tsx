import React, { useState } from 'react';
import { 
  Project, Task, Member, WorkflowStatus, Priority, TaskComment, SubTask 
} from '../types';
import { 
  Search, Plus, User, Calendar, Tag, CheckSquare, MessageSquare, 
  Trash2, Edit, ChevronLeft, ChevronRight, X, ArrowRight, UserPlus, Sliders 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KanbanBoardProps {
  currentProject: Project | null;
  tasks: Task[];
  members: Member[];
  statuses: WorkflowStatus[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskToColumn: (statusId: string, title: string) => void;
  // Workflow customization
  onUpdateStatus: (status: WorkflowStatus) => void;
  onAddStatus: (name: string, color: string, textColor: string) => void;
  onDeleteStatus: (id: string) => void;
}

export default function KanbanBoard({
  currentProject,
  tasks,
  members,
  statuses,
  onUpdateTask,
  onDeleteTask,
  onAddTaskToColumn,
  onUpdateStatus,
  onAddStatus,
  onDeleteStatus,
}: KanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // States for inline task creation
  const [activeColumnAdd, setActiveColumnAdd] = useState<string | null>(null);
  const [columnNewTaskTitle, setColumnNewTaskTitle] = useState('');

  // States for Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTaskField, setEditingTaskField] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // States for workflow status customization dialog
  const [showStatusCustomizer, setShowStatusCustomizer] = useState(false);
  const [statusNameInput, setStatusNameInput] = useState('');
  const [statusColorInput, setStatusColorInput] = useState('bg-slate-500');

  // Filter tasks to match the selected project & query conditions
  const projectTasks = tasks.filter(t => t.projectId === currentProject?.id);
  const filteredTasks = projectTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = !assigneeFilter || t.assigneeId === assigneeFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  // Color picker presets
  const colorPresets = [
    { bg: 'bg-slate-500', text: 'text-white', label: '灰黑色' },
    { bg: 'bg-indigo-500', text: 'text-white', label: '靛藍' },
    { bg: 'bg-sky-500', text: 'text-white', label: '天空藍' },
    { bg: 'bg-emerald-500', text: 'text-white', label: '翡翠綠' },
    { bg: 'bg-amber-500', text: 'text-white', label: '琥珀橘' },
    { bg: 'bg-rose-500', text: 'text-white', label: '玫瑰紅' },
    { bg: 'bg-fuchsia-500', text: 'text-white', label: '紫洋紅' },
  ];

  // Quick Column Add Task Submit
  const handleQuickAddTaskSubmit = (columnId: string) => {
    if (!columnNewTaskTitle.trim()) return;
    onAddTaskToColumn(columnId, columnNewTaskTitle);
    setColumnNewTaskTitle('');
    setActiveColumnAdd(null);
  };

  // Move task to next/prev column (simple drag-drop alternative)
  const shiftTaskStatus = (task: Task, direction: 'left' | 'right') => {
    const currentIndex = statuses.findIndex(s => s.id === task.statusId);
    if (currentIndex === -1) return;
    let newIndex = currentIndex;
    if (direction === 'left' && currentIndex > 0) {
      newIndex--;
    } else if (direction === 'right' && currentIndex < statuses.length - 1) {
      newIndex++;
    }
    if (newIndex !== currentIndex) {
      const updated = { ...task, statusId: statuses[newIndex].id };
      onUpdateTask(updated);
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask(updated);
      }
    }
  };

  // Task Details Modal Handlers
  const handleAddComment = () => {
    if (!selectedTask || !commentText.trim()) return;
    const newComment: TaskComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorName: '你 (專案管理員)',
      authorColor: 'bg-indigo-600',
      text: commentText,
      createdAt: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('zh-TW')
    };
    const updated = {
      ...selectedTask,
      comments: [...(selectedTask.comments || []), newComment]
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
    setCommentText('');
  };

  const handleAddSubtask = () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle,
      completed: false
    };
    const updated = {
      ...selectedTask,
      subtasks: [...(selectedTask.subtasks || []), newSub]
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    if (!selectedTask) return;
    const updatedSubs = selectedTask.subtasks.map(sub => {
      if (sub.id === subId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });

    // Auto-recalculate simple progress progress rate
    const totalSubs = updatedSubs.length;
    const completedSubs = updatedSubs.filter(s => s.completed).length;
    const progress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : selectedTask.progress;

    const updated = {
      ...selectedTask,
      subtasks: updatedSubs,
      progress: progress
    };
    onUpdateTask(updated);
    setSelectedTask(updated);
  };

  const handleAddWorkflowStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusNameInput.trim()) return;
    const preset = colorPresets.find(c => c.bg === statusColorInput);
    const textColor = preset ? preset.text : 'text-white';
    onAddStatus(statusNameInput, statusColorInput, textColor);
    setStatusNameInput('');
    setShowStatusCustomizer(false);
  };

  // Convert priority strings to localized representations
  const priorityMap: Record<Priority, { label: string; color: string; badge: string }> = {
    low: { label: '低優先', color: 'bg-blue-50 border-blue-200 text-blue-700', badge: '🔵' },
    medium: { label: '中優先', color: 'bg-amber-50 border-amber-200 text-amber-700', badge: '🟠' },
    high: { label: '高優先', color: 'bg-rose-50 border-rose-200 text-rose-700', badge: '🔴' },
  };

  return (
    <div className="space-y-6">

      {/* Top Filter and Actions Rail */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-1 max-w-2xl">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="搜尋任務名稱、細節描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          {/* Member Filter */}
          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full sm:w-44 text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-600"
            >
              <option value="">👤 所有指派成員</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-36 text-xs px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-600"
            >
              <option value="">🔖 優先級</option>
              <option value="low">低優先級</option>
              <option value="medium">中優先級</option>
              <option value="high">高優先級</option>
            </select>
          </div>
        </div>

        {/* Workflow control */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={() => setShowStatusCustomizer(true)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors cursor-pointer"
          >
            <Sliders size={14} /> 自訂敏捷流程
          </button>
        </div>
      </div>

      {/* Workflow Customizer Modal Dialog */}
      <AnimatePresence>
        {showStatusCustomizer && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">🛠️ 敏捷工作流程自訂</h3>
                <button 
                  onClick={() => setShowStatusCustomizer(false)} 
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status addition form */}
              <form onSubmit={handleAddWorkflowStatus} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700">🎨 新增流程狀態</h4>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="狀態名稱 (例如: 部屬中、已審過...)"
                    value={statusNameInput}
                    onChange={(e) => setStatusNameInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">主題色彩代表</label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map(preset => (
                      <button
                        type="button"
                        key={preset.bg}
                        onClick={() => setStatusColorInput(preset.bg)}
                        className={`w-7 h-7 rounded-lg ${preset.bg} border-2 ${
                          statusColorInput === preset.bg ? 'border-amber-400 shadow-md scale-110' : 'border-transparent'
                        } transition-all`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  確認加入工作流狀態
                </button>
              </form>

              {/* Current Statuses management */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500">目前的工作流程狀態 (按左到右順序)：</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {statuses.map((status, idx) => (
                    <div key={status.id} className="flex justify-between items-center p-2 border border-slate-100 bg-white rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${status.color} text-white`}>
                          {status.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (statuses.length <= 2) {
                            alert('工作流至少需要保留 2 個狀態！');
                            return;
                          }
                          onDeleteStatus(status.id);
                        }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors"
                        title="刪除狀態"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kanban Board Columns Horizontal List */}
      <div className="flex gap-4 overflow-x-auto pb-4 pr-1 snap-x scroll-smooth">
        {statuses.map((column) => {
          const colTasks = filteredTasks.filter(t => t.statusId === column.id);
          const isAddActive = activeColumnAdd === column.id;

          return (
            <div 
              key={column.id} 
              className="w-72 bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0 flex flex-col max-h-[70vh] shadow-xs snap-start animate-fade-in"
            >
              
              {/* Column Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-bold text-slate-700 text-sm">{column.name}</h3>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveColumnAdd(isAddActive ? null : column.id);
                  }}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100"
                  title="在此階段快速新增任務"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Quick inline task addition input */}
              {isAddActive && (
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 mb-3 shadow-sm space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="這項任務該做什麼？..."
                    value={columnNewTaskTitle}
                    onChange={(e) => setColumnNewTaskTitle(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-100 rounded-lg focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAddTaskSubmit(column.id);
                    }}
                  />
                  <div className="flex justify-end gap-1.5 text-[10px]">
                    <button
                      onClick={() => setActiveColumnAdd(null)}
                      className="px-2 py-1 text-slate-400 hover:bg-slate-50 rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleQuickAddTaskSubmit(column.id)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                    >
                      加到此階段
                    </button>
                  </div>
                </div>
              )}

              {/* Task Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 scroll-smooth">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400">
                    目前沒有任務。
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assigneeObj = members.find(m => m.id === task.assigneeId);
                    const pri = priorityMap[task.priority] || priorityMap.medium;

                    return (
                      <motion.div
                        key={task.id}
                        layoutId={`task-card-${task.id}`}
                        onClick={() => setSelectedTask(task)}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_2px_4px_rgba(0,0,0,0.02)] hover:border-indigo-300 hover:shadow-sm hover:translate-y-[-1.5px] transition-all cursor-pointer group space-y-3 relative bg-clip-border"
                      >
                        
                        {/* Task metadata (Priority label, progress pill) */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${pri.color}`}>
                            {pri.badge} {pri.label}
                          </span>
                          
                          {/* Quick movement shift icons */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shiftTaskStatus(task, 'left');
                              }}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                              title="前移一關"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shiftTaskStatus(task, 'right');
                              }}
                              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                              title="後移一關"
                            >
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description excerpts */}
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs tracking-tight line-clamp-1 leading-snug group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mt-1 leading-normal">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Checklist & comment badges and assignee */}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400">
                          <div className="flex items-center gap-2.5">
                            {task.subtasks.length > 0 && (
                              <div className="flex items-center gap-0.5 font-semibold text-slate-500" title="子任務完成進度">
                                <CheckSquare size={11} /> 
                                <span>{task.subtasks.filter(s=>s.completed).length}/{task.subtasks.length}</span>
                              </div>
                            )}
                            {task.comments.length > 0 && (
                              <div className="flex items-center gap-0.5 font-semibold text-slate-500" title="討論評論數">
                                <MessageSquare size={11} /> 
                                <span>{task.comments.length}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-0.5 font-mono">
                              <Calendar size={11} />
                              <span>{task.endDate.substring(5)}</span>
                            </div>
                          </div>

                          {/* Assignee Avatar */}
                          {assigneeObj ? (
                            <div 
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase ${assigneeObj.avatarColor} shadow-inner`}
                              title={`${assigneeObj.name} (${assigneeObj.role})`}
                            >
                              {assigneeObj.name.substring(0, 1)}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-300 border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center" title="尚未指派">
                              Un
                            </span>
                          )}
                        </div>

                        {/* Micro Progress Line if positive */}
                        {task.progress > 0 && (
                          <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden absolute bottom-0 left-0">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-300" 
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail & Editing Overlay/Drawer Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 15 }}
              className="bg-white border border-slate-100 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            >
              
              {/* Header Info */}
              <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
                    任務詳情及討論 ID: {selectedTask.id}
                  </span>
                  <select
                    value={selectedTask.statusId}
                    onChange={(e) => {
                      const updated = { ...selectedTask, statusId: e.target.value };
                      onUpdateTask(updated);
                      setSelectedTask(updated);
                    }}
                    className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                  >
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>📊 {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (confirm('確定要永久刪除此項專案任務嗎？')) {
                        onDeleteTask(selectedTask.id);
                        setSelectedTask(null);
                      }
                    }}
                    className="p-1 px-2 hover:bg-rose-50 text-rose-500 rounded-lg text-xs gap-1 flex items-center transition-colors"
                  >
                    <Trash2 size={14} /> 刪除任務
                  </button>
                  <button 
                    onClick={() => setSelectedTask(null)} 
                    className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Main Contents Grid */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left 2 segments: Title, Descriptions, and Subtasks Checklist */}
                <div className="md:col-span-2 space-y-5">
                  
                  {/* Task Header Title Section */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">任務名稱與概要：</label>
                    <input
                      type="text"
                      className="w-full text-base font-bold text-slate-800 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none pb-1"
                      value={selectedTask.title}
                      onChange={(e) => {
                        const updated = { ...selectedTask, title: e.target.value };
                        onUpdateTask(updated);
                        setSelectedTask(updated);
                      }}
                    />
                  </div>

                  {/* Task Instructions/Description Details */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-medium">詳細內文描述（點擊可修改）：</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs text-slate-600 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="請說明任務具體步驟、驗收規格、或相關鏈接..."
                      value={selectedTask.description}
                      onChange={(e) => {
                        const updated = { ...selectedTask, description: e.target.value };
                        onUpdateTask(updated);
                        setSelectedTask(updated);
                      }}
                    />
                  </div>

                  {/* Checklist Subtasks */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">里程碑進駐 / 子任務:</label>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {selectedTask.subtasks.filter(s=>s.completed).length}/{selectedTask.subtasks.length} 已完成
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedTask.subtasks.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">尚未設定子任務。加一些子任務來自動追蹤更精準的進度！</p>
                      ) : (
                        selectedTask.subtasks.map(sub => (
                          <div key={sub.id} className="flex gap-2.5 items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hover:bg-slate-100/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={sub.completed}
                              onChange={() => handleToggleSubtask(sub.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                            />
                            <span className={`text-xs ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {sub.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add checklist input */}
                    <div className="flex gap-1.5 pt-1.5">
                      <input
                        type="text"
                        placeholder="新增子任務名稱..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubtask();
                        }}
                      />
                      <button
                        onClick={handleAddSubtask}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                      >
                        加入
                      </button>
                    </div>
                  </div>

                  {/* Communication & Comments Thread */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">💬 同步討論板 ({selectedTask.comments?.length || 0}條意見)</label>
                    
                    <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                      {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic">目前無人探討。在此輸入進度匯報或留言...</p>
                      ) : (
                        selectedTask.comments.map(c => (
                          <div key={c.id} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${c.authorColor}`}>
                                {c.authorName.substring(0,1)}
                              </span>
                              <span className="font-bold text-slate-700">{c.authorName}</span>
                              <span className="text-[9px] text-slate-400 font-mono ml-auto">{c.createdAt}</span>
                            </div>
                            <p className="text-slate-600 pl-5 leading-normal">{c.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comment form input */}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="請鍵入留言或專案提醒..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment();
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                      >
                        送出
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right Segment: Assignee, Priority indicators, Progress, Timeline range */}
                <div className="space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-150 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">📋 任務設定</h3>
                    
                    {/* Assignee setting */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">指派人員：</label>
                      <select
                        value={selectedTask.assigneeId}
                        onChange={(e) => {
                          const updated = { ...selectedTask, assigneeId: e.target.value };
                          onUpdateTask(updated);
                          setSelectedTask(updated);
                        }}
                        className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-600 cursor-pointer font-medium"
                      >
                        <option value="">👤 暫不分派工作</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* Priority setting */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">優先程度：</label>
                      <select
                        value={selectedTask.priority}
                        onChange={(e) => {
                          const updated = { ...selectedTask, priority: e.target.value as Priority };
                          onUpdateTask(updated);
                          setSelectedTask(updated);
                        }}
                        className="w-full text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-600 cursor-pointer font-medium"
                      >
                        <option value="low">🔵 低優先</option>
                        <option value="medium">🟠 中優先</option>
                        <option value="high">🔴 高優先</option>
                      </select>
                    </div>

                    {/* Timeline dates RANGE */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">排程時間範圍：</label>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block">開始日期：</span>
                        <input
                          type="date"
                          value={selectedTask.startDate}
                          onChange={(e) => {
                            const updated = { ...selectedTask, startDate: e.target.value };
                            onUpdateTask(updated);
                            setSelectedTask(updated);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block">預估截止日期：</span>
                        <input
                          type="date"
                          value={selectedTask.endDate}
                          onChange={(e) => {
                            const updated = { ...selectedTask, endDate: e.target.value };
                            onUpdateTask(updated);
                            setSelectedTask(updated);
                          }}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-600"
                        />
                      </div>
                    </div>

                    {/* Manual progress slider override */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-widest">手動進度複寫:</span>
                        <span className="font-mono font-bold text-indigo-600">{selectedTask.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={selectedTask.progress}
                        onChange={(e) => {
                          const updated = { ...selectedTask, progress: parseInt(e.target.value) };
                          onUpdateTask(updated);
                          setSelectedTask(updated);
                        }}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Summary of shift status */}
                  <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex gap-1 justify-between">
                    <button
                      onClick={() => shiftTaskStatus(selectedTask, 'left')}
                      className="px-2 py-1 hover:bg-white border hover:border-slate-300 rounded font-bold text-slate-500"
                    >
                      ◀ 搬回前一階段
                    </button>
                    <button
                      onClick={() => shiftTaskStatus(selectedTask, 'right')}
                      className="px-2 py-1 hover:bg-white border hover:border-slate-300 rounded font-bold text-slate-500"
                    >
                      往下一階段 ▶
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
