using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public OrdersController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetOrders(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId,
        [FromQuery] int? driverId,
        [FromQuery] int? vanId,
        [FromQuery] DateTime? date,
        [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Driver)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Where(o => o.CompanyId == companyId);

        if (date.HasValue)
            query = query.Where(o => o.OrderDate == date.Value.Date);

        if (startDate.HasValue)
            query = query.Where(o => o.OrderDate >= startDate.Value.Date);

        if (endDate.HasValue)
            query = query.Where(o => o.OrderDate <= endDate.Value.Date);

        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId);

        if (driverId.HasValue)
            query = query.Where(o => o.DriverId == driverId);

        if (vanId.HasValue)
            query = query.Where(o => o.VanId == vanId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.OrderStatus == status);

        var orders = await query.OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.Id)
            .Select(o => new {
                o.Id,
                o.OrderNumber,
                o.CustomerId,
                CustomerName = o.Customer != null ? o.Customer.Name : null,
                o.DriverId,
                DriverName = o.Driver != null ? o.Driver.Name : null,
                o.VanId,
                o.OrderDate,
                o.TotalAmount,
                o.PaidAmount,
                o.PaymentStatus,
                o.OrderStatus,
                o.DeliveryAddress,
                o.Notes,
                o.PaymentCurrencies,
                o.ExchangeRateSnapshot,
                Items = o.OrderItems.Select(i => new {
                    i.ProductId,
                    ProductName = i.ProductName ?? (i.Product != null ? i.Product.Name : "Unknown"),
                    ProductSku = i.ProductSku ?? (i.Product != null ? i.Product.Sku : null),
                    i.VariantId,
                    VariantName = i.VariantName,
                    i.Quantity,
                    i.UnitType,
                    i.UnitPrice,
                    i.Total,
                    i.Currency,
                    CostPrice = i.CostPrice > 0 ? i.CostPrice : (i.Product != null ? i.Product.CostPrice : 0)
                })
            }).ToListAsync();
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetOrder(int id)
    {
        var companyId = GetCompanyId();
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Driver)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound();

        return order;
    }

    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(CreateOrderDto dto)
    {
        var companyId = GetCompanyId();
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        // Generate order number
        var today = TimeZoneHelper.Now.Date;
        var count = await _context.Orders.CountAsync(o => o.CompanyId == companyId && o.OrderDate == today);
        var orderNumber = $"ORD-{today:yyyyMMdd}-{(count + 1):D4}";

        var order = new Order
        {
            CompanyId = companyId,
            OrderNumber = orderNumber,
            CustomerId = dto.CustomerId,
            DriverId = dto.DriverId,
            VanId = dto.VanId,
            OrderDate = dto.OrderDate ?? TimeZoneHelper.Now.Date,
            OrderTime = TimeSpan.FromTicks(TimeZoneHelper.Now.TimeOfDay.Ticks),
            DeliveryAddress = dto.DeliveryAddress,
            Notes = dto.Notes,
            OrderStatus = "confirmed",
            PaymentStatus = "unpaid",
            CreatedBy = userId
        };

        // Add items and calculate totals
        decimal subtotal = 0;
        decimal totalCost = 0; // Track total cost for COGS
        foreach (var item in dto.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product == null) continue;

            var lineTotal = item.Quantity * item.UnitPrice - item.DiscountAmount;
            subtotal += lineTotal;
            totalCost += product.CostPrice * item.Quantity; // Accumulate COGS

            order.OrderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                ProductName = product.Name,
                ProductSku = product.Sku,
                ProductBarcode = product.Barcode,
                UnitId = item.UnitId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                Total = lineTotal,
                CostPrice = product.CostPrice
            });
        }

        order.Subtotal = subtotal;
        order.DiscountAmount = dto.DiscountAmount;
        order.TaxAmount = dto.TaxAmount;
        order.TotalAmount = subtotal - dto.DiscountAmount + dto.TaxAmount;

        // Update customer balance
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer != null)
        {
            customer.DebtBalance += order.TotalAmount;
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostOrderEntry(companyId, order.Id, order.TotalAmount, order.PaidAmount, totalCost, order.OrderDate, userId);

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var companyId = GetCompanyId();
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound();

        order.OrderStatus = dto.Status;
        order.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(int id)
    {
        var companyId = GetCompanyId();
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == id && o.CompanyId == companyId);

        if (order == null)
            return NotFound();

        // Check if order has returns/exchanges
        var hasReturns = await _context.ReturnExchanges
            .AnyAsync(re => re.OriginalOrderId == id);
        
        if (hasReturns)
            return BadRequest(new { error = "Cannot delete order with returns/exchanges" });

        // Reverse customer balance if it was a credit sale
        if (order.PaymentStatus != "paid")
        {
            var customer = await _context.Customers.FindAsync(order.CustomerId);
            if (customer != null)
            {
                customer.DebtBalance -= (order.TotalAmount - order.PaidAmount);
            }
        }

        // Delete order items first
        _context.OrderItems.RemoveRange(order.OrderItems);
        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Order deleted successfully" });
    }
}

public class CreateOrderDto
{
    public int CustomerId { get; set; }
    public int? DriverId { get; set; }
    public int? VanId { get; set; }
    public DateTime? OrderDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    public int ProductId { get; set; }
    public int? UnitId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
}

public class UpdateOrderStatusDto
{
    public string Status { get; set; } = string.Empty;
}
