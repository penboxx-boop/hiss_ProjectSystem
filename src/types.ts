export interface Member {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
  email: string;
}

export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  authorName: string;
  authorColor: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  statusId: string;
  assigneeId: string; // member id, empty means unassigned
  priority: Priority;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  subtasks: SubTask[];
  comments: TaskComment[];
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string; // tailwind color class prefix, e.g. 'bg-slate-500' or hex code
  textColor: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  memberName: string;
  memberColor: string;
  action: string; // e.g. "建立任務", "更新狀態", "新增評論"
  targetName: string; // target name like task title
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
