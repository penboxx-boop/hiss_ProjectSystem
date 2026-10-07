import React, { useState, useRef, useEffect } from 'react';
import { 
  Project, Member, WorkflowStatus, ChatMessage, Task 
} from '../types';
import { 
  Sparkles, Send, Bot, MessageSquare, RefreshCw, Layers, CheckCircle, 
  Settings, Zap, AlertCircle, ChevronDown, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIChatBotProps {
  currentProject: Project | null;
  members: Member[];
  statuses: WorkflowStatus[];
  chatHistory: ChatMessage[];
  onAddChatMessage: (msg: ChatMessage) => void;
  onTasksImport: (tasks: any[]) => void;
  onClearChat: () => void;
}

export default function AIChatBot({
  currentProject,
  members,
  statuses,
  chatHistory,
  onAddChatMessage,
  onTasksImport,
  onClearChat,
}: AIChatBotProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for AI Task Generator
  const [projectGoal, setProjectGoal] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat thread to bottom on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handle send message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    // 1. Add user message to history
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };
    onAddChatMessage(userMsg);
    if (!customText) setInputText('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Create body with compiled history to feed to full-stack /api/chat route
      const fullHistory = [...chatHistory, userMsg].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: fullHistory })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '呼叫 Gemini API 失敗');
      }

      // Add model response
      const botMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      onAddChatMessage(botMsg);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || '無法取得 AI 回應，請檢查網路連線或系統設定。');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auto task breakdown using server generative endpoint
  const handleGenerateTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectGoal.trim() || isGeneratingTasks) return;

    setIsGeneratingTasks(true);
    setGenerationSuccess(false);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectGoal,
          teamMembers: members,
          workflowStatuses: statuses
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI 拆解任務失敗');
      }

      const generatedTasks = data.tasks;
      if (generatedTasks && Array.isArray(generatedTasks) && generatedTasks.length > 0) {
        // Trigger parent callback to import tasks into current project state
        // Re-align IDs mapping if necessary
        onTasksImport(generatedTasks.map(gt => ({
          ...gt,
          projectId: currentProject?.id || 'p1',
          id: Math.random().toString(36).substr(2, 9),
          comments: [],
          subtasks: [
            { id: Math.random().toString(36).substr(2, 9), title: '資料收集與研討', completed: false },
            { id: Math.random().toString(36).substr(2, 9), title: '程式撰寫與環境部屬', completed: false }
          ]
        })));
        setProjectGoal('');
        setGenerationSuccess(true);
        setTimeout(() => setGenerationSuccess(false), 5000);
      } else {
        throw new Error('AI 返回了空的任務列表，請重新換個詞描述看看。');
      }
    } catch (err: any) {
      console.error('Task generator error:', err);
      setErrorMsg(err.message || 'AI 拆解任務失敗，請更換關鍵字再試一次。');
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // Chat shortcuts
  const chatShortcuts = [
    { label: '🧠 幫我建立 4 個大型行銷網頁任務', prompt: '我想為大型行銷網頁重構規劃 4 個工作分派，請寫出其名稱、優先級和工期。' },
    { label: '🚀 如何最佳化敏捷看板流程？', prompt: '建議我 5 個適合現代軟體開發團隊的自訂工作流程（看板列名稱），並說明每個階段的職責。' },
    { label: '📊 逾期任務卡關如何理清？', prompt: '如果專案出現多個任務逾期，身為 PM / 敏捷教練，我該如何與開發者進行每日站會(Daily Standup)排除障礙？' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left 2 Columns: AI Chat advisor */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-sm transition-all flex flex-col h-[75vh]">
        
        {/* Chat window Header controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">AI 專案顧問 (Gemini Copilot)</h2>
              <p className="text-[10px] text-slate-400">專為敏捷協作、工作拆解與流程瓶頸優化設計的 AI 助理</p>
            </div>
          </div>
          <button
            onClick={onClearChat}
            className="text-xs font-semibold hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-500 transition-colors"
          >
            🧹 清除歷史記錄
          </button>
        </div>

        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Welcome model introduction */}
          <div className="flex gap-3 text-xs items-start">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 font-bold shrink-0">
              AI
            </div>
            <div className="bg-slate-50 text-slate-700 p-4 rounded-2xl border border-slate-100 shadow-3xs max-w-[85%] leading-relaxed">
              <p className="font-bold mb-1">您好！我是您的專案管理 Copilot 👋</p>
              <p className="mb-2">
                我可以幫助你拆解複雜、龐大的開發工作、建議敏捷工作流程名稱、或者為你和團隊成員提出工作量分配的突破口。
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                💡 試試點擊下方的「快速提問 shortcuts」或直接在內文對話發問！
              </p>
            </div>
          </div>

          {/* Actual message history */}
          {chatHistory.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 text-xs items-start ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 font-bold shadow-2xs">
                  AI
                </div>
              )}
              
              <div 
                className={`p-4 rounded-2xl max-w-[85%] leading-relaxed border ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none shadow-sm shadow-indigo-100' 
                    : 'bg-slate-50/75 border-slate-100 text-slate-700 rounded-tl-none'
                }`}
              >
                {/* Clean inline markdown lists wrapper */}
                <div className="whitespace-pre-wrap style-markdown font-medium">
                  {msg.text}
                </div>
                <span className={`text-[9px] font-mono block mt-1.5 opacity-60 text-right ${
                  msg.role === 'user' ? 'text-white' : 'text-slate-400'
                }`}>
                  {msg.timestamp}
                </span>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white shrink-0 font-bold text-xs uppercase shadow-sm font-mono">
                  U
                </div>
              )}
            </div>
          ))}

          {/* Error alerts indicator */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Loading bubble animated indicator */}
          {isLoading && (
            <div className="flex gap-3 text-xs items-center pl-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold animate-pulse">
                AI
              </div>
              <div className="flex gap-1 items-center bg-slate-50 px-4 py-2.5 rounded-full border border-slate-100 text-slate-400">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] ml-1.5 font-medium">研擬敏捷對策中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Shortcuts list wrapper */}
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
          {chatShortcuts.map((sc, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={(e) => handleSendMessage(e, sc.prompt)}
              className="text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-150 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-left truncate max-w-full"
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Message Input line */}
        <form onSubmit={(e) => handleSendMessage(e)} className="p-4 border-t border-slate-150 flex gap-2">
          <input
            type="text"
            required
            placeholder="請在此鍵入您的提問（例如：幫我看一下任務 A 與任務 B 有無撞期？）..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="px-4.5 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-100 disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            <Send size={14} /> 傳送
          </button>
        </form>

      </div>

      {/* Right Column: One-Click AI Task Breakdown Engine */}
      <div className="space-y-6">
        
        {/* Task Generator Widget Panel */}
        <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-indigo-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-indigo-400" size={20} />
              <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase">
                AI Pipeline Engine
              </span>
            </div>
            
            <h3 className="font-extrabold text-base leading-snug">
              AI 一鍵自動任務拆解
            </h3>
            
            <p className="text-xs text-indigo-200 leading-relaxed">
              只要隨手書寫一項專案目標（例如：「在兩周內建立官方登入後台網站」），Gemini 將自動拆解成具體的 5 至 8 項任務，並直接帶入團隊成員和自訂的工作流模型，大幅節省規劃時間！
            </p>
          </div>

          <form onSubmit={handleGenerateTasks} className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">描述專案目標 / 開發規格 *</label>
              <textarea
                required
                rows={4}
                placeholder="例如：設計電子商城 APP 購物車模組、規劃中秋節線上行銷宣傳企劃..."
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                className="w-full text-xs px-3.5 py-3 bg-indigo-950/40 border border-indigo-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-50 placeholder-indigo-400"
              />
            </div>

            {/* Submit loader */}
            <button
              type="submit"
              disabled={isGeneratingTasks || !projectGoal.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/50 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isGeneratingTasks ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" />
                  拆解並分派中... (需時 3-5 秒)
                </>
              ) : (
                <>
                  <Zap size={14} className="text-amber-300" />
                  一鍵自動拆分任務 ⚡
                </>
              )}
            </button>
          </form>

          {/* Success Alerts */}
          <AnimatePresence>
            {generationSuccess && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold"
              >
                <CheckCircle size={14} className="shrink-0" />
                <span>恭喜！任務已精確派發到「待處理」與專案內文！您可以至看板或甘特圖查看時程。</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI System Design specifications */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition-shadow">
          <h4 className="font-bold text-xs text-slate-800">🚀 Gemini 敏捷助理核心策略</h4>
          
          <div className="space-y-3.5 text-[11px] text-slate-600 leading-relaxed">
            <div className="flex gap-2">
              <span className="text-indigo-600">▪</span>
              <p>
                <strong className="text-slate-800">隨機智慧派工：</strong>AI 在自動拆解工作項目時，會參考您團隊目前的現有成員及其角色（如「前端工程師」），模擬真實分配情境分派 assignee。
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-600">▪</span>
              <p>
                <strong className="text-slate-800">自訂進度與工期：</strong>自動分解的任務預估會落在 1 至 14 天內，並且隨機安排對應的進度百分比，以便快速在甘特圖繪製初期路徑。
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
