using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Core.Models;
using ProjectManagement.Core.Services;

namespace ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectManagementService _service;

    public ProjectsController(IProjectManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _service.GetProjectsAsync();
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var project = await _service.GetProjectByIdAsync(id);
        if (project == null) return NotFound(new { error = "專案不存在" });
        return Ok(project);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "專案名稱為必填欄位" });

        var proj = await _service.CreateProjectAsync(request.Name, request.Description ?? string.Empty);
        return CreatedAtAction(nameof(GetById), new { id = proj.Id }, proj);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProjectRequest request)
    {
        var updated = await _service.UpdateProjectAsync(id, request.Name, request.Description ?? string.Empty);
        if (updated == null) return NotFound(new { error = "專案不存在" });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var success = await _service.DeleteProjectAsync(id);
        if (!success) return NotFound(new { error = "專案不存在" });
        return NoContent();
    }

    /// <summary>
    /// 取得該專案的甘特圖時程、網格欄位與工作項目定位資料 (自動基準日對齊)
    /// </summary>
    [HttpGet("{id}/gantt")]
    public async Task<IActionResult> GetGanttTimeline(
        string id, 
        [FromQuery] string? baseDate = null, 
        [FromQuery] int spanDays = 24)
    {
        DateOnly? parsedBaseDate = null;
        if (!string.IsNullOrEmpty(baseDate) && DateOnly.TryParse(baseDate, out var parsed))
        {
            parsedBaseDate = parsed;
        }

        var result = await _service.GetProjectGanttAsync(id, parsedBaseDate, spanDays);
        return Ok(new
        {
            schedule = result.Schedule,
            timelineDays = result.TimelineDays,
            tasks = result.TaskPositions.Select(tp => new
            {
                task = tp.Task,
                position = tp.Position
            })
        });
    }
}

public record CreateProjectRequest(string Name, string? Description);
public record UpdateProjectRequest(string Name, string? Description);
