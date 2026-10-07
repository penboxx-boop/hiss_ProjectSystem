using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Core.Services;

namespace ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IProjectManagementService _service;

    public DashboardController(IProjectManagementService service)
    {
        _service = service;
    }

    /// <summary>
    /// 取得跨專案大盤總覽數據 (包含各專案甘特圖時程進度、健康評估、任務數量)
    /// </summary>
    [HttpGet("portfolio")]
    public async Task<IActionResult> GetPortfolioOverview()
    {
        var stats = await _service.GetPortfolioStatsAsync();
        return Ok(stats);
    }
}
