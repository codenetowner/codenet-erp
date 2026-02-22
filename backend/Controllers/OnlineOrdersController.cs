using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using System.Security.Claims;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OnlineOrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OnlineOrdersController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var claim = User.FindFirst("company_id")?.Value
                 ?? User.FindFirst("CompanyId")?.Value
                 ?? User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }

    /// <summary>
    /// List online orders for the authenticated company
    /// </summary>
    [HttpGet]
    public async Task<ActionResult> GetOrders([FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var query = _context.OnlineOrders
            .Include(o => o.AppCustomer)
            .Include(o => o.Items)
            .Where(o => o.CompanyId == companyId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
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
                o.DeliveryAddress,
                o.Notes,
                o.AssignedDriverType,
                o.AssignedCompanyDriverId,
                o.AssignedFreelanceDriverId,
                o.CreatedAt,
                ItemCount = o.Items.Count,
                Items = o.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.ProductName,
                    i.UnitType,
                    i.Quantity,
                    i.UnitPrice,
                    i.Total,
                    i.Currency,
                    i.Notes
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>
    /// Get order detail
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult> GetOrder(int id)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var order = await _context.OnlineOrders
            .Include(o => o.AppCustomer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.AppCustomerId,
            CustomerName = order.AppCustomer != null ? order.AppCustomer.Name : order.GuestName,
            CustomerPhone = order.AppCustomer != null ? order.AppCustomer.Phone : order.GuestPhone,
            CustomerAddress = order.AppCustomer != null ? order.DeliveryAddress : order.GuestAddress,
            order.Status,
            order.Subtotal,
            order.DeliveryFee,
            order.Discount,
            order.Total,
            order.PaymentMethod,
            order.PaymentStatus,
            order.DeliveryType,
            order.DeliveryAddress,
            order.DeliveryLat,
            order.DeliveryLng,
            order.Notes,
            order.EstimatedDelivery,
            order.DeliveredAt,
            order.CancelledAt,
            order.CancelReason,
            order.AssignedDriverType,
            order.AssignedCompanyDriverId,
            order.CreatedAt,
            Items = order.Items.Select(i => new
            {
                i.Id,
                i.ProductId,
                i.ProductName,
                i.UnitType,
                i.Quantity,
                i.UnitPrice,
                i.Total,
                i.Currency,
                i.Notes
            }).ToList()
        });
    }

    /// <summary>
    /// Update order status
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateOnlineOrderStatusDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var order = await _context.OnlineOrders
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;

        if (dto.Status == "delivered")
            order.DeliveredAt = DateTime.UtcNow;
        else if (dto.Status == "cancelled")
        {
            order.CancelledAt = DateTime.UtcNow;
            order.CancelReason = dto.CancelReason;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Order status updated", status = order.Status });
    }

    /// <summary>
    /// Assign a company driver to an order
    /// </summary>
    [HttpPut("{id}/assign-driver")]
    public async Task<ActionResult> AssignDriver(int id, [FromBody] AssignDriverDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var order = await _context.OnlineOrders
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        order.AssignedDriverType = "company";
        order.AssignedCompanyDriverId = dto.DriverId;
        order.DeliveryType = "company_driver";
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Driver assigned" });
    }

    /// <summary>
    /// Request a platform (freelance) driver for an order
    /// </summary>
    [HttpPut("{id}/request-driver")]
    public async Task<ActionResult> RequestPlatformDriver(int id)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var order = await _context.OnlineOrders
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        if (order.AssignedFreelanceDriverId != null || order.AssignedCompanyDriverId != null)
            return BadRequest(new { message = "Order already has a driver assigned" });

        order.DeliveryType = "platform_driver";
        order.AssignedDriverType = "freelance";
        if (order.Status == "pending") order.Status = "confirmed";
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Platform driver requested. A nearby driver will accept the order.", status = order.Status });
    }

    /// <summary>
    /// Get order stats for the company
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var today = DateTime.UtcNow.Date;

        return Ok(new
        {
            pending = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "pending"),
            confirmed = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "confirmed"),
            preparing = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "preparing"),
            delivering = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "delivering"),
            delivered = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "delivered"),
            cancelled = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.Status == "cancelled"),
            todayOrders = await _context.OnlineOrders.CountAsync(o => o.CompanyId == companyId && o.CreatedAt >= today),
            todayRevenue = await _context.OnlineOrders
                .Where(o => o.CompanyId == companyId && o.Status == "delivered" && o.CreatedAt >= today)
                .SumAsync(o => o.Total)
        });
    }
}

public class UpdateOnlineOrderStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? CancelReason { get; set; }
}

public class AssignDriverDto
{
    public int DriverId { get; set; }
}
