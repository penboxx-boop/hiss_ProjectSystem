using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ProjectManagement.Core.Enums;
using ProjectManagement.Core.Models;
using ProjectManagement.Core.Services;

namespace ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly IProjectManagementService _service;

    public TasksController(IProjectManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? projectId = null)
    {
        var tasks = await _service.GetTasksAsync(projectId);
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var task = await _service.GetTaskByIdAsync(id);
        if (task == null) return NotFound(new { error = "任務不存在" });
        return Ok(task);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "工作名稱為必填" });

        var created = await _service.CreateTaskAsync(
            request.Title,
            request.Priority,
            request.AssigneeId ?? string.Empty,
            request.DurationDays > 0 ? request.DurationDays : 7,
            request.ProjectId
        );
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] TaskItem task)
    {
        if (id != task.Id) return BadRequest(new { error = "Id 不相符" });
        var updated = await _service.UpdateTaskAsync(task);
        if (updated == null) return NotFound(new { error = "任務不存在" });
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var success = await _service.DeleteTaskAsync(id);
        if (!success) return NotFound(new { error = "任務不存在" });
        return NoContent();
    }

    [HttpPatch("{id}/subtasks/{subTaskId}/toggle")]
    public async Task<IActionResult> ToggleSubTask(string id, string subTaskId)
    {
        var task = await _service.ToggleSubTaskAsync(id, subTaskId);
        if (task == null) return NotFound(new { error = "任務或子步驟不存在" });
        return Ok(task);
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] AddCommentRequest request)
    {
        var task = await _service.AddCommentAsync(id, request.AuthorName, request.AuthorColor ?? "bg-indigo-600", request.Text);
        if (task == null) return NotFound(new { error = "任務不存在" });
        return Ok(task);
    }
}

public record CreateTaskRequest(string Title, Priority Priority, string? AssigneeId, int DurationDays, string? ProjectId);
public record AddCommentRequest(string AuthorName, string? AuthorColor, string Text);
