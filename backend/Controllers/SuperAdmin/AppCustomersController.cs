using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/app-customers")]
[Authorize(Roles = "SuperAdmin")]
public class AppCustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public AppCustomersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? search)
    {
        var query = _context.AppCustomers.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(c =>
                (c.Name != null && c.Name.Contains(search)) ||
                c.Phone.Contains(search) ||
                (c.Email != null && c.Email.Contains(search)));
        }

        var customers = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Phone,
                c.Email,
                c.PhotoUrl,
                c.AuthProvider,
                c.IsVerified,
                c.IsActive,
                c.CreatedAt,
                OrderCount = _context.OnlineOrders.Count(o => o.AppCustomerId == c.Id),
                TotalSpent = _context.OnlineOrders
                    .Where(o => o.AppCustomerId == c.Id && o.Status == "delivered")
                    .Sum(o => o.Total)
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(int id)
    {
        var customer = await _context.AppCustomers
            .Include(c => c.Addresses)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            return NotFound(new { message = "Customer not found" });

        var orders = await _context.OnlineOrders
            .Where(o => o.AppCustomerId == id)
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.CompanyId,
                CompanyName = o.Company.Name,
                o.Status,
                o.Total,
                o.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Phone,
            customer.Email,
            customer.PhotoUrl,
            customer.AuthProvider,
            customer.IsVerified,
            customer.IsActive,
            customer.CreatedAt,
            Addresses = customer.Addresses,
            RecentOrders = orders
        });
    }
}
