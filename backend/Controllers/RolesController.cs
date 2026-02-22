using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
    {
        var companyId = GetCompanyId();
        var roles = await _context.Roles
            .Where(r => r.CompanyId == companyId)
            .OrderBy(r => r.Name)
            .ToListAsync();

        var result = new List<RoleDto>();
        foreach (var r in roles)
        {
            var employeeCount = await _context.Employees.CountAsync(e => e.RoleId == r.Id);
            result.Add(new RoleDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = GetDescriptionFromPermissions(r.Permissions),
                Permissions = r.Permissions,
                EmployeeCount = employeeCount,
                IsSystem = r.IsSystem,
                CreatedAt = r.CreatedAt
            });
        }

        return result;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RoleDto>> GetRole(int id)
    {
        var companyId = GetCompanyId();
        var r = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (r == null) return NotFound();

        var employeeCount = await _context.Employees.CountAsync(e => e.RoleId == r.Id);

        return new RoleDto
        {
            Id = r.Id,
            Name = r.Name,
            Description = GetDescriptionFromPermissions(r.Permissions),
            Permissions = r.Permissions,
            EmployeeCount = employeeCount,
            IsSystem = r.IsSystem,
            CreatedAt = r.CreatedAt
        };
    }

    [HttpPost]
    public async Task<ActionResult<RoleDto>> CreateRole(CreateRoleDto dto)
    {
        var companyId = GetCompanyId();

        if (await _context.Roles.AnyAsync(r => r.CompanyId == companyId && r.Name == dto.Name))
            return BadRequest(new { message = "Role name already exists" });

        var role = new Role
        {
            CompanyId = companyId,
            Name = dto.Name,
            Permissions = dto.Permissions,
            IsSystem = false
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRole), new { id = role.Id }, new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = GetDescriptionFromPermissions(role.Permissions),
            Permissions = role.Permissions,
            EmployeeCount = 0,
            IsSystem = role.IsSystem,
            CreatedAt = role.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRole(int id, UpdateRoleDto dto)
    {
        var companyId = GetCompanyId();
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (role == null) return NotFound();

        if (dto.Name != role.Name && await _context.Roles.AnyAsync(r => r.CompanyId == companyId && r.Name == dto.Name))
            return BadRequest(new { message = "Role name already exists" });

        role.Name = dto.Name;
        role.Permissions = dto.Permissions;
        role.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var companyId = GetCompanyId();
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (role == null) return NotFound();

        if (role.IsSystem)
            return BadRequest(new { message = "Cannot delete system roles" });

        // Check if any employees use this role
        var hasEmployees = await _context.Employees.AnyAsync(e => e.RoleId == id);
        if (hasEmployees)
            return BadRequest(new { message = "Cannot delete role with assigned employees. Reassign employees first." });

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private string GetDescriptionFromPermissions(string? permissions)
    {
        if (string.IsNullOrEmpty(permissions)) return "No permissions set";
        // Could parse JSON and generate description, for now return generic
        return "Custom permissions";
    }
}

public class RoleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Permissions { get; set; }
    public int EmployeeCount { get; set; }
    public bool IsSystem { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string? Permissions { get; set; }
}

public class UpdateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string? Permissions { get; set; }
}
