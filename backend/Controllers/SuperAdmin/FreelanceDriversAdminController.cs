using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/freelance-drivers")]
[Authorize(Roles = "SuperAdmin")]
public class FreelanceDriversAdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public FreelanceDriversAdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = _context.FreelanceDrivers.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(d => d.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(d => d.Name.Contains(search) || d.Phone.Contains(search));

        var drivers = await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id, d.Name, d.Phone, d.Email, d.PhotoUrl,
                d.VehicleType, d.VehiclePlate,
                d.Status, d.IsOnline, d.Rating,
                d.TotalDeliveries, d.TotalEarnings,
                d.CreatedAt, d.ApprovedAt
            })
            .ToListAsync();

        return Ok(drivers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(int id)
    {
        var driver = await _context.FreelanceDrivers.FindAsync(id);
        if (driver == null) return NotFound(new { message = "Driver not found" });

        var recentOrders = await _context.OnlineOrders
            .Include(o => o.Company)
            .Where(o => o.AssignedFreelanceDriverId == id)
            .OrderByDescending(o => o.UpdatedAt)
            .Take(10)
            .Select(o => new
            {
                o.Id, o.OrderNumber,
                StoreName = o.Company.Name,
                o.Status, o.Total, o.DeliveryFee,
                o.CreatedAt, o.DeliveredAt
            })
            .ToListAsync();

        return Ok(new
        {
            driver.Id, driver.Name, driver.Phone, driver.Email,
            driver.PhotoUrl, driver.IdDocumentUrl, driver.LicenseUrl,
            driver.VehicleType, driver.VehiclePlate, driver.VehicleColor,
            driver.Status, driver.IsOnline, driver.Rating,
            driver.TotalDeliveries, driver.TotalEarnings,
            driver.RejectionReason, driver.ApprovedAt,
            driver.CreatedAt, driver.UpdatedAt,
            RecentOrders = recentOrders
        });
    }

    [HttpPut("{id}/approve")]
    public async Task<ActionResult> Approve(int id)
    {
        var driver = await _context.FreelanceDrivers.FindAsync(id);
        if (driver == null) return NotFound();

        driver.Status = "approved";
        driver.ApprovedAt = DateTime.UtcNow;
        driver.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Driver approved" });
    }

    [HttpPut("{id}/reject")]
    public async Task<ActionResult> Reject(int id, [FromBody] RejectDriverDto dto)
    {
        var driver = await _context.FreelanceDrivers.FindAsync(id);
        if (driver == null) return NotFound();

        driver.Status = "rejected";
        driver.RejectionReason = dto.Reason;
        driver.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Driver rejected" });
    }

    [HttpPut("{id}/suspend")]
    public async Task<ActionResult> Suspend(int id)
    {
        var driver = await _context.FreelanceDrivers.FindAsync(id);
        if (driver == null) return NotFound();

        driver.Status = "suspended";
        driver.IsOnline = false;
        driver.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Driver suspended" });
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        return Ok(new
        {
            total = await _context.FreelanceDrivers.CountAsync(),
            pending = await _context.FreelanceDrivers.CountAsync(d => d.Status == "pending"),
            approved = await _context.FreelanceDrivers.CountAsync(d => d.Status == "approved"),
            rejected = await _context.FreelanceDrivers.CountAsync(d => d.Status == "rejected"),
            suspended = await _context.FreelanceDrivers.CountAsync(d => d.Status == "suspended"),
            online = await _context.FreelanceDrivers.CountAsync(d => d.IsOnline),
            totalDeliveries = await _context.FreelanceDrivers.SumAsync(d => d.TotalDeliveries),
            totalEarnings = await _context.FreelanceDrivers.SumAsync(d => d.TotalEarnings)
        });
    }
}

public class RejectDriverDto
{
    public string? Reason { get; set; }
}
