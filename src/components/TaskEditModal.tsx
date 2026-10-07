import React, { useState } from 'react';
import { Task, Project, Member, WorkflowStatus, Priority, SubTask } from '../types';
import { X, Edit3, Trash2, Check, Plus, Calendar, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskEditModalProps {
  task: Task | null;
  projects: Project[];
  members: Member[];
  statuses: WorkflowStatus[];
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskEditModal({
  task,
  projects,
  members,
  statuses,
  onClose,
  onSave,
  onDelete,
}: TaskEditModalProps) {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [projectId, setProjectId] = useState(task.projectId);
  const [statusId, setStatusId] = useState(task.statusId);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [startDate, setStartDate] = useState(task.startDate);
  const [endDate, setEndDate] = useState(task.endDate);
  const [progress, setProgress] = useState(task.progress);
  const [subtasks, setSubtasks] = useState<SubTask[]>(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isNew = !task.title;

  const handleToggleSubtask = (subId: string) => {
    setSubtasks(prev => {
      const next = prev.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
      const done = next.filter(s => s.completed).length;
      if (next.length > 0) {
        setProgress(Math.round((done / next.length) * 100));
      }
      return next;
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const next = [...subtasks, newSub];
    setSubtasks(next);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...task,
      title: title.trim(),
      description: description.trim(),
      projectId,
      statusId,
      priority,
      assigneeId,
      startDate,
      endDate,
      progress: Number(progress),
      subtasks,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/70 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {isNew ? <Plus size={16} /> : <Edit3 size={16} />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                {isNew ? '新增工作項目' : '修改工作項目'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isNew ? '為專案建立工作任務規格與負責成員' : '更新任務規格、階段狀態與負責成員'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="刪除此工作項目"
              >
                <Trash2 size={14} /> 刪除
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Overlay inside modal */}
        {showConfirmDelete ? (
          <div className="p-6 space-y-4 my-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-800">確定要刪除此工作項目？</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  您即將刪除 <strong className="text-slate-800">「{task.title}」</strong>。此工作項目的子步驟與評論將一併清除，此動作無法復原。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete?.(task.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> 確認刪除
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">工作名稱 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如: 整合購物車 API"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
              />
            </div>

            {/* Project & Status row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">所屬專案</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">工作流狀態</label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Assignee row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">優先級</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 cursor-pointer"
                >
                  <option value="low">🟡 低優先級</option>
                  <option value="medium">🟠 中優先級</option>
                  <option value="high">🔴 高優先級</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">指派成員</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="">👤 未指派成員</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">預計完成日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono text-slate-700"
                />
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">完成進度</label>
                <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {progress}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">工作詳細規格與說明</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="說明具體工作步驟、交付指標或驗收標準..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              />
            </div>

            {/* Subtasks Management */}
            <div className="space-y-2 pt-2 border-t border-slate-150">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">子任務檢核清單</label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {subtasks.filter(s => s.completed).length}/{subtasks.length} 完成
                </span>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {subtasks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">目前尚未建立子任務。</p>
                ) : (
                  subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtask(sub.id)}
                          className="accent-indigo-600 rounded cursor-pointer"
                        />
                        <span className={`text-xs truncate ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {sub.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(sub.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="輸入新子任務名稱..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                {isNew ? '確認建立工作項目' : '儲存修改'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
