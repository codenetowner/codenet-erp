using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/online-orders")]
[Authorize(Roles = "SuperAdmin")]
public class OnlineOrdersAdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public OnlineOrdersAdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? companyId,
        [FromQuery] string? search)
    {
        var query = _context.OnlineOrders
            .Include(o => o.Company)
            .Include(o => o.AppCustomer)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        if (companyId.HasValue)
            query = query.Where(o => o.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(o =>
                (o.OrderNumber != null && o.OrderNumber.Contains(search)) ||
                (o.GuestName != null && o.GuestName.Contains(search)) ||
                (o.GuestPhone != null && o.GuestPhone.Contains(search)) ||
                (o.AppCustomer != null && o.AppCustomer.Name != null && o.AppCustomer.Name.Contains(search)));
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(200)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.CompanyId,
                CompanyName = o.Company.Name,
                o.AppCustomerId,
                CustomerName = o.AppCustomer != null ? o.AppCustomer.Name : o.GuestName,
                CustomerPhone = o.AppCustomer != null ? o.AppCustomer.Phone : o.GuestPhone,
                o.Status,
                o.Subtotal,
                o.DeliveryFee,
                o.Discount,
                o.Total,
                o.PaymentMethod,
                o.PaymentStatus,
                o.DeliveryType,
                o.CreatedAt,
                ItemCount = o.Items.Count
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var today = DateTime.UtcNow.Date;
        var totalOrders = await _context.OnlineOrders.CountAsync();
        var todayOrders = await _context.OnlineOrders.CountAsync(o => o.CreatedAt >= today);
        var pendingOrders = await _context.OnlineOrders.CountAsync(o => o.Status == "pending");
        var totalRevenue = await _context.OnlineOrders
            .Where(o => o.Status == "delivered")
            .SumAsync(o => o.Total);
        var todayRevenue = await _context.OnlineOrders
            .Where(o => o.Status == "delivered" && o.CreatedAt >= today)
            .SumAsync(o => o.Total);

        return Ok(new
        {
            totalOrders,
            todayOrders,
            pendingOrders,
            totalRevenue,
            todayRevenue,
            statusBreakdown = new
            {
                pending = await _context.OnlineOrders.CountAsync(o => o.Status == "pending"),
                confirmed = await _context.OnlineOrders.CountAsync(o => o.Status == "confirmed"),
                preparing = await _context.OnlineOrders.CountAsync(o => o.Status == "preparing"),
                delivering = await _context.OnlineOrders.CountAsync(o => o.Status == "delivering"),
                delivered = await _context.OnlineOrders.CountAsync(o => o.Status == "delivered"),
                cancelled = await _context.OnlineOrders.CountAsync(o => o.Status == "cancelled")
            }
        });
    }
}
