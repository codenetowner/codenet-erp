using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WarehousesController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetWarehouses([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        var companyId = GetCompanyId();
        var query = _context.Warehouses
            .Include(w => w.Manager)
            .Where(w => w.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(w => w.Name.Contains(search) || (w.Code != null && w.Code.Contains(search)));

        if (isActive.HasValue)
            query = query.Where(w => w.IsActive == isActive);

        var warehouses = await query.OrderBy(w => w.Name).ToListAsync();

        return warehouses.Select(w => new WarehouseDto
        {
            Id = w.Id,
            Name = w.Name,
            Code = w.Code,
            Address = w.Address,
            Phone = w.Phone,
            ManagerId = w.ManagerId,
            ManagerName = w.Manager?.Name,
            IsActive = w.IsActive,
            CreatedAt = w.CreatedAt
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WarehouseDto>> GetWarehouse(int id)
    {
        var companyId = GetCompanyId();
        var w = await _context.Warehouses
            .Include(w => w.Manager)
            .FirstOrDefaultAsync(w => w.Id == id && w.CompanyId == companyId);

        if (w == null) return NotFound();

        return new WarehouseDto
        {
            Id = w.Id,
            Name = w.Name,
            Code = w.Code,
            Address = w.Address,
            Phone = w.Phone,
            ManagerId = w.ManagerId,
            ManagerName = w.Manager?.Name,
            IsActive = w.IsActive,
            CreatedAt = w.CreatedAt
        };
    }

    [HttpPost]
    public async Task<ActionResult<WarehouseDto>> CreateWarehouse(CreateWarehouseDto dto)
    {
        var companyId = GetCompanyId();
        var code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code;

        if (!string.IsNullOrEmpty(code) && await _context.Warehouses.AnyAsync(w => w.CompanyId == companyId && w.Code == code))
            return BadRequest(new { message = "Warehouse code already exists" });

        var warehouse = new Warehouse
        {
            CompanyId = companyId,
            Name = dto.Name,
            Code = code,
            Address = dto.Address,
            Phone = dto.Phone,
            ManagerId = dto.ManagerId,
            IsActive = dto.IsActive
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Update manager's warehouse assignment
        if (warehouse.ManagerId.HasValue)
        {
            var manager = await _context.Employees.FindAsync(warehouse.ManagerId.Value);
            if (manager != null && manager.CompanyId == companyId)
            {
                manager.WarehouseId = warehouse.Id;
                await _context.SaveChangesAsync();
            }
        }

        return CreatedAtAction(nameof(GetWarehouse), new { id = warehouse.Id }, new WarehouseDto
        {
            Id = warehouse.Id,
            Name = warehouse.Name,
            Code = warehouse.Code,
            IsActive = warehouse.IsActive,
            CreatedAt = warehouse.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWarehouse(int id, UpdateWarehouseDto dto)
    {
        var companyId = GetCompanyId();
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id && w.CompanyId == companyId);

        if (warehouse == null) return NotFound();

        var code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code;

        if (!string.IsNullOrEmpty(code) && code != warehouse.Code && 
            await _context.Warehouses.AnyAsync(w => w.CompanyId == companyId && w.Code == code))
            return BadRequest(new { message = "Warehouse code already exists" });

        var oldManagerId = warehouse.ManagerId;

        warehouse.Name = dto.Name;
        warehouse.Code = code;
        warehouse.Address = dto.Address;
        warehouse.Phone = dto.Phone;
        warehouse.ManagerId = dto.ManagerId;
        warehouse.IsActive = dto.IsActive;
        warehouse.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Update manager's warehouse assignment if changed
        if (dto.ManagerId != oldManagerId)
        {
            // Remove old manager's warehouse assignment
            if (oldManagerId.HasValue)
            {
                var oldManager = await _context.Employees.FindAsync(oldManagerId.Value);
                if (oldManager != null && oldManager.WarehouseId == warehouse.Id)
                {
                    oldManager.WarehouseId = null;
                }
            }
            // Set new manager's warehouse assignment
            if (dto.ManagerId.HasValue)
            {
                var newManager = await _context.Employees.FindAsync(dto.ManagerId.Value);
                if (newManager != null && newManager.CompanyId == companyId)
                {
                    newManager.WarehouseId = warehouse.Id;
                }
            }
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        var companyId = GetCompanyId();
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id && w.CompanyId == companyId);

        if (warehouse == null) return NotFound();

        // Check if warehouse has inventory
        var hasInventory = await _context.Inventories.AnyAsync(i => i.WarehouseId == id);
        if (hasInventory)
            return BadRequest(new { message = "Cannot delete warehouse with inventory. Please transfer inventory first." });

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/stock")]
    public async Task<ActionResult<IEnumerable<object>>> GetWarehouseStock(int id)
    {
        var companyId = GetCompanyId();
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id && w.CompanyId == companyId);
        if (warehouse == null) return NotFound();

        var stock = await _context.Inventories
            .Include(i => i.Product)
            .Where(i => i.WarehouseId == id)
            .Select(i => new {
                ProductId = i.ProductId,
                ProductName = i.Product.Name,
                ProductSku = i.Product.Sku,
                Quantity = i.Quantity,
                ReservedQuantity = i.ReservedQuantity,
                AvailableQuantity = i.Quantity - i.ReservedQuantity,
                LowStockAlert = i.Product.LowStockAlert
            })
            .ToListAsync();

        return Ok(stock);
    }
}

public class WarehouseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public int? ManagerId { get; set; }
    public string? ManagerName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateWarehouseDto
{
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public int? ManagerId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateWarehouseDto : CreateWarehouseDto { }
