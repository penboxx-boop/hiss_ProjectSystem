import React, { useState, useEffect, useTransition } from 'react';
import { 
  Project, Task, Member, WorkflowStatus, ActivityLog, ChatMessage, Priority, SubTask 
} from './types';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import GanttChart from './components/GanttChart';
import AIChatBot from './components/AIChatBot';
import CSharpViewer from './components/CSharpViewer';
import { 
  LayoutDashboard, Kanban, CalendarRange, Bot, Settings, Users, 
  Sparkles, Layers, Layers2, FolderGit, CheckSquare, Code2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Default mock seed elements
const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: '專案一：智慧商務系統研發', description: '整合電子商務後台、AI 金流防詐對接與購物車視覺最佳化。', createdAt: '2026-06-15' },
  { id: 'p2', name: '專案二：中秋行銷推廣企劃', description: '針對下期節慶規劃之大型自媒體社群行銷宣傳與中秋視覺海報製作。', createdAt: '2026-06-16' }
];

const DEFAULT_STATUSES: WorkflowStatus[] = [
  { id: 'st1', name: '待處理 (To Do)', color: 'bg-slate-500', textColor: 'text-white' },
  { id: 'st2', name: '進行中 (In Progress)', color: 'bg-indigo-500', textColor: 'text-white' },
  { id: 'st3', name: '待審查 (Review)', color: 'bg-amber-500', textColor: 'text-white' },
  { id: 'st4', name: '已完成 (Done)', color: 'bg-emerald-500', textColor: 'text-white' }
];

const DEFAULT_MEMBERS: Member[] = [
  { id: 'm1', name: '李誠敏', role: 'Frontend Developer', email: 'chengmin@example.com', avatarColor: 'bg-sky-500' },
  { id: 'm2', name: '張雨萱', role: 'Backend Developer', email: 'yuhsuan@example.com', avatarColor: 'bg-violet-500' },
  { id: 'm3', name: '林明傑', role: 'UI/UX Designer', email: 'mingchieh@example.com', avatarColor: 'bg-rose-500' },
  { id: 'm4', name: '王大同', role: 'Product Manager', email: 'tatung@example.com', avatarColor: 'bg-amber-500' }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: '首頁及商品清單 UI 視覺設計',
    description: '完成電商首頁、響應式斷點佈局與商品快閃卡片細部樣式設計。驗收標準：需具備高對比黑白極簡風。',
    statusId: 'st4', // Done
    assigneeId: 'm3', // 林明傑
    priority: 'high',
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    progress: 100,
    subtasks: [
      { id: 'sub1_1', title: '設計 Figma 線框圖與元件庫', completed: true },
      { id: 'sub1_2', title: '匯出 SVG 向量圖及圖標', completed: true }
    ],
    comments: [
      { id: 'c1_1', authorName: '王大同', authorColor: 'bg-amber-500', text: '首頁視覺非常吸睛，符合品牌定位！', createdAt: '2026-06-16 11:30' },
      { id: 'c1_2', authorName: '李誠敏', authorColor: 'bg-sky-500', text: '收到，前端將於 17 號開始依此套版。', createdAt: '2026-06-16 14:15' }
    ]
  },
  {
    id: 't2',
    projectId: 'p1',
    title: '購物車模組與訂單 API 整合',
    description: '整合購物車商品加減、小計計算及後端 Session API，確保重新整理不遺失品項。',
    statusId: 'st2', // In Progress
    assigneeId: 'm1', // 李誠敏
    priority: 'high',
    startDate: '2026-06-16',
    endDate: '2026-06-20',
    progress: 60,
    subtasks: [
      { id: 'sub2_1', title: '建立前端 Pinia/Redux 購物車狀態', completed: true },
      { id: 'sub2_2', title: '串接訂單建立與異步更新 API', completed: false }
    ],
    comments: []
  },
  {
    id: 't3',
    projectId: 'p1',
    title: '安全支付與第三方金流對接',
    description: '整合金流 API 行為，對代碼加密傳遞阻絕中間人攔截，並實作退款與請款之 Webhook 回呼機制。',
    statusId: 'st1', // To Do
    assigneeId: 'm2', // 張雨萱
    priority: 'high',
    startDate: '2026-06-21',
    endDate: '2026-06-25',
    progress: 0,
    subtasks: [
      { id: 'sub3_1', title: '研讀金流 Webhook 文件', completed: false },
      { id: 'sub3_2', title: '撰寫後端加密雜湊函式', completed: false }
    ],
    comments: []
  },
  {
    id: 't4',
    projectId: 'p1',
    title: '管理者後台商品上架及庫存維護',
    description: '開發管理者管理面板，包含多圖上傳、庫存警告閥值設定及標籤分類篩選功能。',
    statusId: 'st3', // Review
    assigneeId: 'm2', // 張雨萱
    priority: 'medium',
    startDate: '2026-06-17',
    endDate: '2026-06-21',
    progress: 90,
    subtasks: [
      { id: 'sub4_1', title: '基本資料新增與刪除 API', completed: true },
      { id: 'sub4_2', title: '多圖拖曳上傳前端元件開發', completed: true }
    ],
    comments: [
      { id: 'c4_1', authorName: '張雨萱', authorColor: 'bg-violet-500', text: '後端商品庫存功能已部署至沙盒環境，請 PM 抽空驗收。', createdAt: '2026-06-20 18:00' }
    ]
  },
  {
    id: 't5',
    projectId: 'p2',
    title: '中秋宣傳海報設計與主視覺標案',
    description: '針對圓月與科技品牌之結合進行視覺構圖，完成高畫質促銷圖檔輸出。',
    statusId: 'st2',
    assigneeId: 'm3',
    priority: 'medium',
    startDate: '2026-06-15',
    endDate: '2026-06-19',
    progress: 50,
    subtasks: [
      { id: 'sub5_1', title: '草圖初稿視覺確認', completed: true },
      { id: 'sub5_2', title: '科技感圓月融合與亮感修正', completed: false }
    ],
    comments: []
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  { id: 'l1', projectId: 'p1', memberName: '李誠敏', memberColor: 'bg-sky-500', action: '建立了任務', targetName: '購物車與訂單 API 整合', timestamp: '2026-06-16 10:20' },
  { id: 'l2', projectId: 'p1', memberName: '林明傑', memberColor: 'bg-rose-500', action: '將狀態更新為已完成', targetName: '首頁及商品清單 UI 視覺設計', timestamp: '2026-06-17 16:45' },
  { id: 'l3', projectId: 'p1', memberName: '張雨萱', memberColor: 'bg-violet-500', action: '提交審查任務', targetName: '管理者後台商品上架及庫存維護', timestamp: '2026-06-20 18:02' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kanban' | 'gantt' | 'chatbot' | 'csharp'>('dashboard');
  const [, startTransition] = useTransition();

  // Unified persistent State engine with local storage backup sync
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pm_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });

  const [statuses, setStatuses] = useState<WorkflowStatus[]>(() => {
    const saved = localStorage.getItem('pm_statuses');
    return saved ? JSON.parse(saved) : DEFAULT_STATUSES;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('pm_members');
    return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('pm_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('pm_logs');
    return saved ? JSON.parse(saved) : DEFAULT_LOGS;
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('pm_chathistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentProjectID, setCurrentProjectID] = useState<string>(() => {
    const saved = localStorage.getItem('pm_current_pid');
    if (saved) return saved;
    return DEFAULT_PROJECTS[0]?.id || '';
  });

  // Keep state matching synchronized in localStorage
  useEffect(() => {
    localStorage.setItem('pm_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('pm_statuses', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('pm_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('pm_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('pm_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('pm_chathistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('pm_current_pid', currentProjectID);
  }, [currentProjectID]);

  // Derive active project
  const currentProject = projects.find(p => p.id === currentProjectID) || projects[0] || null;

  // Add Log utility
  const pushActivityLog = (memberName: string, memberColor: string, action: string, targetName: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: currentProjectID,
      memberName,
      memberColor,
      action,
      targetName,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('zh-TW')
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // State handlers to bubble up
  const handleSelectProject = (id: string) => {
    setCurrentProjectID(id);
  };

  const handleAddProject = (name: string, description: string) => {
    const newProj: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProjects(prev => [...prev, newProj]);
    setCurrentProjectID(newProj.id);
    
    // Log project action
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: newProj.id,
      memberName: '專案管理員',
      memberColor: 'bg-indigo-600',
      action: '建立了全新專案',
      targetName: name,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('zh-TW')
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleUpdateProject = (id: string, name: string, description: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name, description } : p));
    pushActivityLog('專案管理員', 'bg-indigo-600', '更新了專案設定資訊', name);
  };

  const handleDeleteProject = (id: string) => {
    const projToDelete = projects.find(p => p.id === id);
    if (!projToDelete) return;

    const remaining = projects.filter(p => p.id !== id);
    if (remaining.length === 0) {
      // Keep at least one project so system remains functional
      const fallbackProj: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: '預設新專案',
        description: '這是系統自動建立的預設專案。您可以隨時編輯此專案名稱與簡介。',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setProjects([fallbackProj]);
      setCurrentProjectID(fallbackProj.id);
    } else {
      setProjects(remaining);
      if (currentProjectID === id) {
        setCurrentProjectID(remaining[0].id);
      }
    }

    // Clean up tasks and logs for the deleted project
    setTasks(prev => prev.filter(t => t.projectId !== id));
    setActivityLogs(prev => prev.filter(l => l.projectId !== id));

    pushActivityLog('專案管理員', 'bg-rose-600', '刪除了專案與所有關聯任務', projToDelete.name);
  };

  const handleAddMember = (name: string, role: string, email: string, avatarColor?: string) => {
    // Generate a random nice Tailwind color for avatars if not provided
    const colors = [
      'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'
    ];
    const randColor = avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const newM: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      role,
      email,
      avatarColor: randColor
    };
    setMembers(prev => [...prev, newM]);
    pushActivityLog('專案管理員', 'bg-indigo-600', '新增了受指派團隊成員', `${name} (${role})`);
  };

  const handleUpdateMember = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    pushActivityLog('專案管理員', 'bg-indigo-600', '更新了團隊成員資料', `${updated.name} (${updated.role})`);
  };

  const handleDeleteMember = (id: string) => {
    const memberToDelete = members.find(m => m.id === id);
    setMembers(prev => prev.filter(m => m.id !== id));
    // Unassign tasks assigned to this deleted member so tasks are not orphaned
    setTasks(prev => prev.map(t => t.assigneeId === id ? { ...t, assigneeId: '' } : t));
    if (memberToDelete) {
      pushActivityLog('專案管理員', 'bg-rose-600', '移除了團隊成員並解除指派', `${memberToDelete.name} (${memberToDelete.role})`);
    }
  };

  const handleAddTask = (title: string, priority: Priority, assigneeId: string, durationDays: number, targetProjectId?: string) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + durationDays);

    const firstStatusId = statuses[0]?.id || 'st1';
    const projId = targetProjectId || currentProjectID;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: projId,
      title,
      description: '在此輸入此工作項目的詳細交付指標或開發步驟。',
      statusId: firstStatusId,
      assigneeId,
      priority,
      startDate: today.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      progress: 0,
      subtasks: [],
      comments: []
    };

    setTasks(prev => [...prev, newTask]);
    const proj = projects.find(p => p.id === projId);
    pushActivityLog('專案管理員', 'bg-indigo-600', `在「${proj?.name || '專案'}」建立了工作項目`, title);
  };

  // Detailed task update with activity checking (supports upserting new tasks)
  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === updatedTask.id);
      if (exists) {
        return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
      } else {
        return [updatedTask, ...prev];
      }
    });
    
    // Find previous state for audit log triggering
    const prevTask = tasks.find(t => t.id === updatedTask.id);
    if (prevTask) {
      if (prevTask.statusId !== updatedTask.statusId) {
        // Change column log
        const newColName = statuses.find(s => s.id === updatedTask.statusId)?.name || '下一階段';
        pushActivityLog('協作團隊', 'bg-slate-700', `將任務狀態遞移至 「${newColName}」`, updatedTask.title);
      } else if (prevTask.progress !== updatedTask.progress) {
        // Change progress log
        pushActivityLog('協作團隊', 'bg-slate-700', `回報進度至 ${updatedTask.progress}%`, updatedTask.title);
      } else if (prevTask.comments.length < updatedTask.comments.length) {
        // New comment log
        const latestComment = updatedTask.comments[updatedTask.comments.length - 1];
        pushActivityLog(latestComment.authorName, latestComment.authorColor, '在討論板留下意見描述', updatedTask.title);
      }
    } else {
      const proj = projects.find(p => p.id === updatedTask.projectId);
      pushActivityLog('專案管理員', 'bg-indigo-600', `在「${proj?.name || '專案'}」建立了工作項目`, updatedTask.title);
    }
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (taskToDelete) {
      pushActivityLog('專案管理員', 'bg-indigo-600', '移除了專案任務項目', taskToDelete.title);
    }
  };

  // Add task to specific column
  const handleAddTaskToColumn = (statusId: string, title: string) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 5);

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: currentProjectID,
      title,
      description: '在此輸入此流程步驟的關鍵交付指標。',
      statusId,
      assigneeId: '',
      priority: 'medium',
      startDate: today.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      progress: 0,
      subtasks: [],
      comments: []
    };

    setTasks(prev => [...prev, newTask]);
    pushActivityLog('團隊管理員', 'bg-indigo-600', '在此階段建立了任務', title);
  };

  // Workflow statuses actions
  const handleUpdateStatus = (updated: WorkflowStatus) => {
    setStatuses(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleAddStatus = (name: string, color: string, textColor: string) => {
    const newStatus: WorkflowStatus = {
      id: 'st_custom_' + Math.random().toString(36).substr(2, 9),
      name,
      color,
      textColor
    };
    setStatuses(prev => [...prev, newStatus]);
    pushActivityLog('專案管理員', 'bg-indigo-600', '自訂並新增了看板工作流狀態', name);
  };

  const handleDeleteStatus = (id: string) => {
    setStatuses(prev => prev.filter(s => s.id !== id));
    pushActivityLog('專案管理員', 'bg-indigo-600', '刪除了看板工作流狀態', '工作流欄位');
    
    // Auto-reallocate tasks associated with this status back to To Do or first status
    const firstStatusId = statuses.find(s => s.id !== id)?.id || 'st1';
    setTasks(prev => prev.map(t => t.statusId === id ? { ...t, statusId: firstStatusId } : t));
  };

  // AI import callback
  const handleTasksImport = (newTasks: Task[]) => {
    setTasks(prev => [...prev, ...newTasks]);
    pushActivityLog('AI 助理', 'bg-indigo-600', '一鍵自動生成了專案任務列表', `${newTasks.length} 項工作細部指派`);
  };

  // Chat message management
  const handleAddChatMessage = (msg: ChatMessage) => {
    setChatHistory(prev => [...prev, msg]);
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 transition-all">
      
      {/* Dynamic Upper Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo and Brand Title Header */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Agile Copilot v1.5
                </span>
              </div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">
                專案管理及團隊協作追蹤系統
              </h1>
            </div>
          </div>

          {/* Active Project Quick Switcher */}
          <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-center">
            <span className="text-[10px] uppercase font-extrabold text-slate-400">專案:</span>
            <select
              value={currentProjectID}
              onChange={(e) => setCurrentProjectID(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer max-w-[180px] truncate"
              title="切換目前專案"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Persistent multi-tabs navigation buttons */}
          <nav className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => startTransition(() => setActiveTab('dashboard'))}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard size={14} /> 儀表板總覽
            </button>
            
            <button
              onClick={() => startTransition(() => setActiveTab('kanban'))}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeTab === 'kanban' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban size={14} /> 可自訂看板
            </button>

            <button
              onClick={() => startTransition(() => setActiveTab('gantt'))}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeTab === 'gantt' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarRange size={14} /> 專案甘特圖
            </button>

            <button
              onClick={() => startTransition(() => setActiveTab('chatbot'))}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeTab === 'chatbot' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bot size={14} /> AI 顧問
            </button>

            <button
              onClick={() => startTransition(() => setActiveTab('csharp'))}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
                activeTab === 'csharp' 
                  ? 'bg-violet-600 text-white shadow-xs' 
                  : 'text-violet-700 bg-violet-50 hover:bg-violet-100'
              }`}
              title="檢視轉換完成之 C# / .NET 8 原始碼"
            >
              <Code2 size={14} /> C# 原始碼
            </button>
          </nav>

        </div>
      </header>

      {/* Main Body container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                currentProject={currentProject}
                projects={projects}
                tasks={tasks}
                members={members}
                statuses={statuses}
                activityLogs={activityLogs}
                onSelectProject={handleSelectProject}
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onNavigateTab={(tab) => startTransition(() => setActiveTab(tab))}
              />
            )}

            {activeTab === 'kanban' && (
              <KanbanBoard
                currentProject={currentProject}
                tasks={tasks}
                members={members}
                statuses={statuses}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddTaskToColumn={handleAddTaskToColumn}
                onUpdateStatus={handleUpdateStatus}
                onAddStatus={handleAddStatus}
                onDeleteStatus={handleDeleteStatus}
              />
            )}

            {activeTab === 'gantt' && (
              <GanttChart
                currentProject={currentProject}
                tasks={tasks}
                members={members}
                statuses={statuses}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === 'chatbot' && (
              <AIChatBot
                currentProject={currentProject}
                members={members}
                statuses={statuses}
                chatHistory={chatHistory}
                onAddChatMessage={handleAddChatMessage}
                onTasksImport={handleTasksImport}
                onClearChat={handleClearChat}
              />
            )}

            {activeTab === 'csharp' && (
              <CSharpViewer />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Page simple footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-12">
        <p>© 2026 專案管理及團隊即時協作平台 - 以敏捷教練與 AI 自動最佳化為核心製</p>
      </footer>

    </div>
  );
}
