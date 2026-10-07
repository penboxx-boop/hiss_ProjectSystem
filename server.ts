import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '無效的訊息列表' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: '未設定 GEMINI_API_KEY。請在 AI Studio 的 Settings > Secrets 中設定。' 
      });
    }

    // Adapt format for @google/genai SDK chats config or raw generateContent.
    // Since the chats.create expects clean format, let's format history or do a single generateContent 
    // with compiled history for simplicity, which is extremely robust.
    const systemInstruction = 
      "你是一位資深的專案管理專家與敏捷教練(Agile Coach)。你將提供團隊在任務拆解、工作流程優化、時間排程、里程碑設定等方面的專業建議。請務必親切、專業、條理分明，並一律以繁體中文回答。你可以提供結構化的清單或策略。";

    // Format previous messages for Gemini
    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "抱歉，我現在無法生成回應。";
    res.json({ text: replyText });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || '伺服器發生錯誤' });
  }
});

// AI Project Task Generation endpoint
app.post('/api/generate-tasks', async (req, res) => {
  try {
    const { projectGoal, teamMembers, workflowStatuses } = req.body;
    if (!projectGoal) {
      return res.status(400).json({ error: '請提供專案目標或描述' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: '未設定 GEMINI_API_KEY。請在 AI Studio 的 Settings > Secrets 中設定。' 
      });
    }

    const membersInfo = teamMembers ? teamMembers.map((m: any) => `${m.name} (${m.role})`).join(', ') : '無特定成員';
    const statusesInfo = workflowStatuses ? workflowStatuses.map((s: any) => s.name).join(', ') : '未設定';

    const prompt = `
請為以下專案目標拆解成 5 至 8 個具體的專案任務，並輸出成 JSON 陣列。
專案目標："${projectGoal}"
目前團隊成員：[${membersInfo}] (請隨機或合適地分派任務 assigneeName)
可用的工作流程狀態：[${statusesInfo}]

每個任務必須包含以下 JSON 欄位：
1. "title": 任務名稱
2. "description": 任務細節、驗收標準或步驟
3. "statusId": 請對應下面此清單中符合的一種 statusName，轉換成它的狀態 ID。
4. "assigneeId": 請指派給其中一位團隊成員的 ID。
5. "priority": 優先級，必須是 "low"、"medium"、"high" 其中之一
6. "durationDays": 預計執行天數 (整數，1-14天)
7. "progress": 任務進度百分比 (0-100，如果是第一個狀態通常為 0，其餘狀態給予合適的進度)

可用的工作流程狀態列表與其 ID：
${JSON.stringify(workflowStatuses || [])}

團隊成員列表與其 ID：
${JSON.stringify(teamMembers || [])}

請注意：
- 只返回一個純 JSON 陣列，不包含 Markdown 標記，也不包含 \`\`\`json 語法。
- 確保所有屬性名稱都有雙引號。
- 專記任務內容請以繁體中文撰寫。
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      }
    });

    const jsonText = (response.text || '[]').trim();
    // Parse to ensure valid JSON
    const parsedTasks = JSON.parse(jsonText);
    res.json({ tasks: parsedTasks });
  } catch (error: any) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: error.message || '自動產生任務失敗，請手動新增任務。' });
  }
});

// Setup Vite development server or serve build directory
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
