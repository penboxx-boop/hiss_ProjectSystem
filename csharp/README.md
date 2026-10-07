# 跨專案管理系統 (C# / .NET 8 完整移植版本)

本專案已將 React + TypeScript 專案之完整架構、領域模型、甘特圖時程引擎、跨專案大盤分析及 RESTful Web API 完整轉換為 C# (.NET 8/9)。

---

## 專案架構目錄說明

```
csharp/
├── ProjectManagement.Core/          # 領域核心類別庫
│   ├── Enums/
│   │   └── Enums.cs                 # Priority, HealthStatus, GanttStatusType
│   ├── Models/
│   │   └── Models.cs                # Project, TaskItem, Member, SubTask, GanttScheduleInfo, PortfolioStats
│   └── Services/
│       ├── GanttService.cs          # 甘特圖時程計算、自動基準日對齊、網格欄位與工作條定位
│       ├── PortfolioAnalyticsService.cs # 跨專案大盤統計、健康度評估、雙軸時程與交付率比對
│       └── ProjectManagementService.cs  # 全域專案管理引擎、CRUD、成員級聯安全與審計日誌
│
├── ProjectManagement.Api/           # ASP.NET Core Web API (RESTful 後端服務)
│   ├── Controllers/
│   │   ├── ProjectsController.cs    # 專案 CRUD 與甘特圖資料路由 (/api/projects/{id}/gantt)
│   │   ├── TasksController.cs       # 任務 CRUD、子項目 Toggle、評論留言路由
│   │   └── DashboardController.cs   # 跨專案大盤統計路由 (/api/dashboard/portfolio)
│   ├── Program.cs                   # 依賴注入 (DI)、CORS、Swagger、Minimal APIs 配置
│   └── ProjectManagement.Api.csproj
│
└── ProjectManagement.Blazor/        # Blazor 前端元件庫
    └── Pages/
        ├── Dashboard.razor          # 跨專案大盤與甘特時程卡片 (Bento Grid)
        └── GanttChart.razor         # 互動式甘特圖元件 (自動基準日、24/30天視野切換)
```

---

## 核心演算法移植亮點

### 1. 甘特圖動態基準日自動對齊 (Gantt Dynamic Baseline Alignment)
- `GanttService.CalculateProjectSchedule` 會自動檢索專案底下所有工作項目的最早開始日 (`EarliestStart`) 與最晚結束日 (`LatestEnd`)。
- 基準日自動保留 1 天緩衝邊界 (`EarliestStart.AddDays(-1)`)，確保首項任務條清晰對齊第 1 欄。
- 支援任意視野天數（24 天、30 天）以及前移/後移 7 天之時間軸計算。

### 2. 跨專案推進大盤與甘特時程進度 (Portfolio Analytics & Dual-Track Progress)
- `PortfolioAnalyticsService.ComputePortfolioStats` 即時運算全域專案數、全域任務數、推進率與逾期警示。
- 每個專案卡片同時計算「甘特時程推進率 (%)」與「工作項目交付率 (%)」，若交付率落後於時間軸即時發出警示。

---

## 如何在本地建置與執行

### 需求環境
- .NET 8.0 SDK 或更高版本
- Visual Studio 2022 / VS Code / JetBrains Rider

### 命令列指令
```bash
# 進入 Web API 專案目錄
cd csharp/ProjectManagement.Api

# 還原套件並編譯
dotnet build

# 啟動 API 伺服器 (包含 Swagger 測試介面)
dotnet run
```
啟動後開啟瀏覽器訪問 `https://localhost:5001/swagger` 即可檢視並測試完整的專案管理 API。
