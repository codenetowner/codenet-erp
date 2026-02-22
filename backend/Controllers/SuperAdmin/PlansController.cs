using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.DTOs;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/superadmin/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class PlansController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlansController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<PlanListDto>>> GetPlans([FromQuery] bool? isActive)
    {
        var query = _context.Plans.AsQueryable();

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive.Value);

        var plans = await query
            .OrderBy(p => p.Price)
            .Select(p => new PlanListDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                DurationDays = p.DurationDays,
                MaxCustomers = p.MaxCustomers,
                MaxEmployees = p.MaxEmployees,
                MaxDrivers = p.MaxDrivers,
                MaxVans = p.MaxVans,
                MaxWarehouses = p.MaxWarehouses,
                IsActive = p.IsActive,
                CompanyCount = p.Companies.Count
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlanDetailDto>> GetPlan(int id)
    {
        var plan = await _context.Plans.FindAsync(id);
        if (plan == null)
            return NotFound(new { message = "Plan not found" });

        return Ok(new PlanDetailDto
        {
            Id = plan.Id,
            Name = plan.Name,
            Price = plan.Price,
            DurationDays = plan.DurationDays,
            MaxCustomers = plan.MaxCustomers,
            MaxEmployees = plan.MaxEmployees,
            MaxDrivers = plan.MaxDrivers,
            MaxVans = plan.MaxVans,
            MaxWarehouses = plan.MaxWarehouses,
            Features = plan.Features,
            IsActive = plan.IsActive,
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<PlanDetailDto>> CreatePlan([FromBody] CreatePlanRequest request)
    {
        var plan = new Plan
        {
            Name = request.Name,
            Price = request.Price,
            DurationDays = request.DurationDays,
            MaxCustomers = request.MaxCustomers,
            MaxEmployees = request.MaxEmployees,
            MaxDrivers = request.MaxDrivers,
            MaxVans = request.MaxVans,
            MaxWarehouses = request.MaxWarehouses,
            Features = request.Features,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Plans.Add(plan);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, new PlanDetailDto
        {
            Id = plan.Id,
            Name = plan.Name,
            Price = plan.Price,
            DurationDays = plan.DurationDays,
            IsActive = plan.IsActive,
            CreatedAt = plan.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdatePlan(int id, [FromBody] UpdatePlanRequest request)
    {
        var plan = await _context.Plans.FindAsync(id);
        if (plan == null)
            return NotFound(new { message = "Plan not found" });

        plan.Name = request.Name;
        plan.Price = request.Price;
        plan.DurationDays = request.DurationDays;
        plan.MaxCustomers = request.MaxCustomers;
        plan.MaxEmployees = request.MaxEmployees;
        plan.MaxDrivers = request.MaxDrivers;
        plan.MaxVans = request.MaxVans;
        plan.MaxWarehouses = request.MaxWarehouses;
        plan.Features = request.Features;
        plan.IsActive = request.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Plan updated successfully" });
    }

    [HttpPatch("{id}/toggle")]
    public async Task<ActionResult> TogglePlanStatus(int id)
    {
        var plan = await _context.Plans.FindAsync(id);
        if (plan == null)
            return NotFound(new { message = "Plan not found" });

        plan.IsActive = !plan.IsActive;
        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Plan {(plan.IsActive ? "activated" : "deactivated")} successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeletePlan(int id)
    {
        var plan = await _context.Plans
            .Include(p => p.Companies)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (plan == null)
            return NotFound(new { message = "Plan not found" });

        if (plan.Companies.Any())
            return BadRequest(new { message = "Cannot delete plan with assigned companies. Deactivate it instead." });

        _context.Plans.Remove(plan);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Plan deleted successfully" });
    }
}
