using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RawMaterialsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RawMaterialsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    // GET: api/rawmaterials
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RawMaterialDto>>> GetAll([FromQuery] bool? isActive = null)
    {
        var companyId = GetCompanyId();
        var query = _context.RawMaterials
            .Where(rm => rm.CompanyId == companyId);

        if (isActive.HasValue)
            query = query.Where(rm => rm.IsActive == isActive.Value);

        var materials = await query
            .OrderBy(rm => rm.Name)
            .Select(rm => new RawMaterialDto
            {
                Id = rm.Id,
                Code = rm.Code,
                Name = rm.Name,
                Description = rm.Description,
                Unit = rm.Unit,
                CostPrice = rm.CostPrice,
                LowStockAlert = rm.LowStockAlert,
                IsActive = rm.IsActive,
                TotalStock = rm.Inventories.Sum(i => i.Quantity),
                CreatedAt = rm.CreatedAt
            })
            .ToListAsync();

        return Ok(materials);
    }

    // GET: api/rawmaterials/5
    [HttpGet("{id}")]
    public async Task<ActionResult<RawMaterialDto>> GetById(int id)
    {
        var companyId = GetCompanyId();
        var material = await _context.RawMaterials
            .Where(rm => rm.Id == id && rm.CompanyId == companyId)
            .Select(rm => new RawMaterialDto
            {
                Id = rm.Id,
                Code = rm.Code,
                Name = rm.Name,
                Description = rm.Description,
                Unit = rm.Unit,
                CostPrice = rm.CostPrice,
                LowStockAlert = rm.LowStockAlert,
                IsActive = rm.IsActive,
                TotalStock = rm.Inventories.Sum(i => i.Quantity),
                CreatedAt = rm.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (material == null)
            return NotFound();

        return Ok(material);
    }

    // POST: api/rawmaterials
    [HttpPost]
    public async Task<ActionResult<RawMaterialDto>> Create([FromBody] CreateRawMaterialDto dto)
    {
        try
        {
            var companyId = GetCompanyId();

            // Generate code if not provided
            var code = dto.Code;
            if (string.IsNullOrEmpty(code))
            {
                var count = await _context.RawMaterials.CountAsync(rm => rm.CompanyId == companyId);
                code = $"RM{(count + 1).ToString().PadLeft(4, '0')}";
            }

            var material = new RawMaterial
            {
                CompanyId = companyId,
                Code = code,
                Name = dto.Name,
                Description = dto.Description,
                Unit = dto.Unit ?? "Unit",
                CostPrice = dto.CostPrice,
                LowStockAlert = dto.LowStockAlert,
                IsActive = true
            };

            _context.RawMaterials.Add(material);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = material.Id }, new RawMaterialDto
            {
                Id = material.Id,
                Code = material.Code,
                Name = material.Name,
                Description = material.Description,
                Unit = material.Unit,
                CostPrice = material.CostPrice,
                LowStockAlert = material.LowStockAlert,
                IsActive = material.IsActive,
                TotalStock = 0,
                CreatedAt = material.CreatedAt
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error creating raw material: {ex.Message}. Inner: {ex.InnerException?.Message}");
        }
    }

    // PUT: api/rawmaterials/5
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRawMaterialDto dto)
    {
        var companyId = GetCompanyId();
        var material = await _context.RawMaterials
            .FirstOrDefaultAsync(rm => rm.Id == id && rm.CompanyId == companyId);

        if (material == null)
            return NotFound();

        material.Code = dto.Code ?? material.Code;
        material.Name = dto.Name ?? material.Name;
        material.Description = dto.Description;
        material.Unit = dto.Unit ?? material.Unit;
        material.CostPrice = dto.CostPrice ?? material.CostPrice;
        material.LowStockAlert = dto.LowStockAlert ?? material.LowStockAlert;
        material.IsActive = dto.IsActive ?? material.IsActive;
        material.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/rawmaterials/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var companyId = GetCompanyId();
        var material = await _context.RawMaterials
            .Include(rm => rm.Inventories)
            .FirstOrDefaultAsync(rm => rm.Id == id && rm.CompanyId == companyId);

        if (material == null)
            return NotFound();

        // Check if there's inventory
        if (material.Inventories.Any(i => i.Quantity > 0))
            return BadRequest("Cannot delete raw material with existing inventory");

        // Check if used in production orders
        var usedInProduction = await _context.ProductionOrderMaterials
            .AnyAsync(pom => pom.RawMaterialId == id);
        if (usedInProduction)
            return BadRequest("Cannot delete raw material used in production orders");

        _context.RawMaterials.Remove(material);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/rawmaterials/5/inventory
    [HttpGet("{id}/inventory")]
    public async Task<ActionResult<IEnumerable<RawMaterialInventoryDto>>> GetInventory(int id)
    {
        var companyId = GetCompanyId();
        var inventory = await _context.RawMaterialInventories
            .Include(rmi => rmi.Warehouse)
            .Where(rmi => rmi.RawMaterialId == id && rmi.CompanyId == companyId)
            .Select(rmi => new RawMaterialInventoryDto
            {
                Id = rmi.Id,
                RawMaterialId = rmi.RawMaterialId,
                WarehouseId = rmi.WarehouseId,
                WarehouseName = rmi.Warehouse.Name,
                Quantity = rmi.Quantity,
                UpdatedAt = rmi.UpdatedAt
            })
            .ToListAsync();

        return Ok(inventory);
    }

    // GET: api/rawmaterials/inventory/all
    [HttpGet("inventory/all")]
    public async Task<ActionResult<IEnumerable<RawMaterialInventorySummaryDto>>> GetAllInventory([FromQuery] int? warehouseId = null)
    {
        var companyId = GetCompanyId();
        var query = _context.RawMaterialInventories
            .Include(rmi => rmi.RawMaterial)
            .Include(rmi => rmi.Warehouse)
            .Where(rmi => rmi.CompanyId == companyId);

        if (warehouseId.HasValue)
            query = query.Where(rmi => rmi.WarehouseId == warehouseId.Value);

        var inventory = await query
            .Select(rmi => new RawMaterialInventorySummaryDto
            {
                Id = rmi.Id,
                RawMaterialId = rmi.RawMaterialId,
                RawMaterialCode = rmi.RawMaterial.Code,
                RawMaterialName = rmi.RawMaterial.Name,
                Unit = rmi.RawMaterial.Unit,
                CostPrice = rmi.RawMaterial.CostPrice,
                WarehouseId = rmi.WarehouseId,
                WarehouseName = rmi.Warehouse.Name,
                Quantity = rmi.Quantity,
                TotalValue = rmi.Quantity * rmi.RawMaterial.CostPrice,
                LowStockAlert = rmi.RawMaterial.LowStockAlert,
                IsLowStock = rmi.Quantity <= rmi.RawMaterial.LowStockAlert
            })
            .OrderBy(rmi => rmi.RawMaterialName)
            .ToListAsync();

        return Ok(inventory);
    }

    // POST: api/rawmaterials/5/inventory/adjust
    [HttpPost("{id}/inventory/adjust")]
    public async Task<IActionResult> AdjustInventory(int id, [FromBody] AdjustRawMaterialInventoryDto dto)
    {
        var companyId = GetCompanyId();
        
        var material = await _context.RawMaterials
            .FirstOrDefaultAsync(rm => rm.Id == id && rm.CompanyId == companyId);
        if (material == null)
            return NotFound("Raw material not found");

        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.Id == dto.WarehouseId && w.CompanyId == companyId);
        if (warehouse == null)
            return NotFound("Warehouse not found");

        var inventory = await _context.RawMaterialInventories
            .FirstOrDefaultAsync(rmi => rmi.RawMaterialId == id && rmi.WarehouseId == dto.WarehouseId);

        if (inventory == null)
        {
            inventory = new RawMaterialInventory
            {
                CompanyId = companyId,
                RawMaterialId = id,
                WarehouseId = dto.WarehouseId,
                Quantity = dto.Quantity
            };
            _context.RawMaterialInventories.Add(inventory);
        }
        else
        {
            if (dto.AdjustmentType == "set")
                inventory.Quantity = dto.Quantity;
            else if (dto.AdjustmentType == "add")
                inventory.Quantity += dto.Quantity;
            else if (dto.AdjustmentType == "subtract")
            {
                if (inventory.Quantity < dto.Quantity)
                    return BadRequest("Insufficient inventory");
                inventory.Quantity -= dto.Quantity;
            }
            inventory.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inventory.Quantity });
    }
}

// DTOs
public class RawMaterialDto
{
    public int Id { get; set; }
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Unit { get; set; } = "Unit";
    public decimal CostPrice { get; set; }
    public decimal LowStockAlert { get; set; }
    public bool IsActive { get; set; }
    public decimal TotalStock { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRawMaterialDto
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public decimal CostPrice { get; set; }
    public decimal LowStockAlert { get; set; } = 10;
}

public class UpdateRawMaterialDto
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? LowStockAlert { get; set; }
    public bool? IsActive { get; set; }
}

public class RawMaterialInventoryDto
{
    public int Id { get; set; }
    public int RawMaterialId { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class RawMaterialInventorySummaryDto
{
    public int Id { get; set; }
    public int RawMaterialId { get; set; }
    public string? RawMaterialCode { get; set; }
    public string RawMaterialName { get; set; } = string.Empty;
    public string Unit { get; set; } = "Unit";
    public decimal CostPrice { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal TotalValue { get; set; }
    public decimal LowStockAlert { get; set; }
    public bool IsLowStock { get; set; }
}

public class AdjustRawMaterialInventoryDto
{
    public int WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public string AdjustmentType { get; set; } = "set"; // set, add, subtract
}
