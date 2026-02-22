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
public class ReturnsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public ReturnsController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value;
        return string.IsNullOrEmpty(userIdClaim) ? 0 : int.Parse(userIdClaim);
    }

    /// <summary>
    /// Get all returns with filters
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReturnDto>>> GetReturns(
        [FromQuery] int? customerId,
        [FromQuery] int? driverId,
        [FromQuery] string? status,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var query = _context.Returns
            .Include(r => r.Customer)
            .Include(r => r.Driver)
            .Include(r => r.Order)
            .Include(r => r.ReturnItems)
                .ThenInclude(ri => ri.Product)
            .Where(r => r.CompanyId == companyId);

        if (customerId.HasValue)
            query = query.Where(r => r.CustomerId == customerId);

        if (driverId.HasValue)
            query = query.Where(r => r.DriverId == driverId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        if (startDate.HasValue)
            query = query.Where(r => r.ReturnDate >= DateOnly.FromDateTime(startDate.Value));

        if (endDate.HasValue)
            query = query.Where(r => r.ReturnDate <= DateOnly.FromDateTime(endDate.Value));

        var returns = await query.OrderByDescending(r => r.ReturnDate).ToListAsync();

        return returns.Select(r => new ReturnDto
        {
            Id = r.Id,
            ReturnNumber = r.ReturnNumber,
            OrderId = r.OrderId,
            OrderNumber = r.Order?.OrderNumber,
            CustomerId = r.CustomerId,
            CustomerName = r.Customer.Name,
            DriverId = r.DriverId,
            DriverName = r.Driver?.Name,
            ReturnDate = r.ReturnDate.ToDateTime(TimeOnly.MinValue),
            TotalAmount = r.TotalAmount,
            Reason = r.Reason,
            Status = r.Status,
            Notes = r.Notes,
            ItemCount = r.ReturnItems.Count,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    /// <summary>
    /// Get return by ID with items
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ReturnDetailDto>> GetReturn(int id)
    {
        var companyId = GetCompanyId();
        var r = await _context.Returns
            .Include(r => r.Customer)
            .Include(r => r.Driver)
            .Include(r => r.Order)
            .Include(r => r.Approver)
            .Include(r => r.ReturnItems)
                .ThenInclude(ri => ri.Product)
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (r == null) return NotFound();

        return new ReturnDetailDto
        {
            Id = r.Id,
            ReturnNumber = r.ReturnNumber,
            OrderId = r.OrderId,
            OrderNumber = r.Order?.OrderNumber,
            CustomerId = r.CustomerId,
            CustomerName = r.Customer.Name,
            DriverId = r.DriverId,
            DriverName = r.Driver?.Name,
            ReturnDate = r.ReturnDate.ToDateTime(TimeOnly.MinValue),
            TotalAmount = r.TotalAmount,
            Reason = r.Reason,
            Status = r.Status,
            ApprovedBy = r.Approver?.Name,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            Items = r.ReturnItems.Select(ri => new ReturnItemDto
            {
                Id = ri.Id,
                ProductId = ri.ProductId,
                ProductName = ri.Product.Name,
                ProductSku = ri.Product.Sku,
                Quantity = ri.Quantity,
                UnitPrice = ri.UnitPrice,
                LineTotal = ri.LineTotal,
                Reason = ri.Reason
            }).ToList()
        };
    }

    /// <summary>
    /// Create a new return
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReturnDto>> CreateReturn(CreateReturnDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        // Verify customer exists
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.CompanyId == companyId);

        if (customer == null)
            return BadRequest(new { error = "Customer not found" });

        // Generate return number
        var today = TimeZoneHelper.Now;
        var prefix = $"RET-{today:yyyyMMdd}";
        var lastReturn = await _context.Returns
            .Where(r => r.CompanyId == companyId && r.ReturnNumber.StartsWith(prefix))
            .OrderByDescending(r => r.ReturnNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastReturn != null)
        {
            var lastSeq = lastReturn.ReturnNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSeq, out int lastSeqNum))
                sequence = lastSeqNum + 1;
        }
        var returnNumber = $"{prefix}-{sequence:D3}";

        var ret = new Return
        {
            CompanyId = companyId,
            ReturnNumber = returnNumber,
            OrderId = dto.OrderId,
            CustomerId = dto.CustomerId,
            DriverId = dto.DriverId ?? userId,
            ReturnDate = DateOnly.FromDateTime(dto.ReturnDate ?? TimeZoneHelper.Now),
            Reason = dto.Reason,
            Status = "pending",
            Notes = dto.Notes,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Returns.Add(ret);
        await _context.SaveChangesAsync();

        // Add items
        decimal totalAmount = 0;
        foreach (var item in dto.Items)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.CompanyId == companyId);

            if (product == null) continue;

            var lineTotal = item.Quantity * item.UnitPrice;
            totalAmount += lineTotal;

            var returnItem = new ReturnItem
            {
                ReturnId = ret.Id,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = lineTotal,
                Reason = item.Reason,
                CreatedAt = TimeZoneHelper.Now
            };

            _context.ReturnItems.Add(returnItem);
        }

        ret.TotalAmount = totalAmount;
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetReturn), new { id = ret.Id }, new ReturnDto
        {
            Id = ret.Id,
            ReturnNumber = ret.ReturnNumber,
            CustomerId = ret.CustomerId,
            CustomerName = customer.Name,
            ReturnDate = ret.ReturnDate.ToDateTime(TimeOnly.MinValue),
            TotalAmount = ret.TotalAmount,
            Status = ret.Status,
            ItemCount = dto.Items.Count,
            CreatedAt = ret.CreatedAt
        });
    }

    /// <summary>
    /// Approve a return
    /// </summary>
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveReturn(int id)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var ret = await _context.Returns
            .Include(r => r.ReturnItems)
                .ThenInclude(ri => ri.Product)
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (ret == null) return NotFound();

        if (ret.Status != "pending")
            return BadRequest(new { error = "Return is not pending" });

        ret.Status = "approved";
        ret.ApprovedBy = userId > 0 ? userId : null;
        ret.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Return approved" });
    }

    /// <summary>
    /// Reject a return
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectReturn(int id, [FromBody] RejectReturnDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var ret = await _context.Returns
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (ret == null) return NotFound();

        if (ret.Status != "pending")
            return BadRequest(new { error = "Return is not pending" });

        ret.Status = "rejected";
        ret.ApprovedBy = userId > 0 ? userId : null;
        ret.Notes = string.IsNullOrEmpty(ret.Notes) ? dto.Reason : $"{ret.Notes}\nRejected: {dto.Reason}";
        ret.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Return rejected" });
    }

    /// <summary>
    /// Process an approved return (add stock back to inventory)
    /// </summary>
    [HttpPost("{id}/process")]
    public async Task<IActionResult> ProcessReturn(int id, [FromBody] ProcessReturnDto dto)
    {
        var companyId = GetCompanyId();

        var ret = await _context.Returns
            .Include(r => r.ReturnItems)
                .ThenInclude(ri => ri.Product)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (ret == null) return NotFound();

        if (ret.Status != "approved")
            return BadRequest(new { error = "Return must be approved first" });

        // Add items back to inventory
        foreach (var item in ret.ReturnItems)
        {
            if (dto.ReturnToVan && dto.VanId.HasValue)
            {
                // Return to van inventory
                var vanInventory = await _context.VanInventories
                    .FirstOrDefaultAsync(vi => vi.VanId == dto.VanId && vi.ProductId == item.ProductId);

                if (vanInventory != null)
                {
                    vanInventory.Quantity += item.Quantity;
                    vanInventory.UpdatedAt = TimeZoneHelper.Now;
                }
                else
                {
                    _context.VanInventories.Add(new VanInventory
                    {
                        CompanyId = companyId,
                        VanId = dto.VanId.Value,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        LoadedAt = TimeZoneHelper.Now,
                        UpdatedAt = TimeZoneHelper.Now
                    });
                }
            }
            else if (dto.WarehouseId.HasValue)
            {
                // Return to warehouse inventory
                var inventory = await _context.Inventories
                    .FirstOrDefaultAsync(i => i.WarehouseId == dto.WarehouseId && i.ProductId == item.ProductId);

                if (inventory != null)
                {
                    inventory.Quantity += item.Quantity;
                    inventory.UpdatedAt = TimeZoneHelper.Now;
                }
                else
                {
                    _context.Inventories.Add(new Inventory
                    {
                        CompanyId = companyId,
                        WarehouseId = dto.WarehouseId.Value,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UpdatedAt = TimeZoneHelper.Now
                    });
                }
            }
        }

        // Handle refund/credit
        if (dto.IssueCredit)
        {
            // Credit the customer's balance
            ret.Customer.DebtBalance -= ret.TotalAmount;
        }

        ret.Status = "processed";
        ret.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostReturnEntry(companyId, ret.Id, ret.TotalAmount, ret.ReturnDate.ToDateTime(TimeOnly.MinValue));

        return Ok(new { message = "Return processed successfully" });
    }

    /// <summary>
    /// Delete a return (only pending returns)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReturn(int id)
    {
        var companyId = GetCompanyId();
        var ret = await _context.Returns
            .Include(r => r.ReturnItems)
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

        if (ret == null) return NotFound();

        if (ret.Status != "pending")
            return BadRequest(new { error = "Can only delete pending returns" });

        _context.ReturnItems.RemoveRange(ret.ReturnItems);
        _context.Returns.Remove(ret);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

#region DTOs

public class ReturnDto
{
    public int Id { get; set; }
    public string ReturnNumber { get; set; } = string.Empty;
    public int? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public DateTime ReturnDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Reason { get; set; }
    public string Status { get; set; } = "pending";
    public string? Notes { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReturnDetailDto : ReturnDto
{
    public string? ApprovedBy { get; set; }
    public List<ReturnItemDto> Items { get; set; } = new();
}

public class ReturnItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? Reason { get; set; }
}

public class CreateReturnDto
{
    public int? OrderId { get; set; }
    public int CustomerId { get; set; }
    public int? DriverId { get; set; }
    public DateTime? ReturnDate { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public List<CreateReturnItemDto> Items { get; set; } = new();
}

public class CreateReturnItemDto
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Reason { get; set; }
}

public class RejectReturnDto
{
    public string? Reason { get; set; }
}

public class ProcessReturnDto
{
    public bool ReturnToVan { get; set; } = false;
    public int? VanId { get; set; }
    public int? WarehouseId { get; set; }
    public bool IssueCredit { get; set; } = true;
}

#endregion
