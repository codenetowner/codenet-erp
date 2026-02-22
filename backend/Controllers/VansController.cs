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
public class VansController : ControllerBase
{
    private readonly AppDbContext _context;

    public VansController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VanDto>>> GetVans([FromQuery] string? search, [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.Vans
            .Include(v => v.Warehouse)
            .Include(v => v.AssignedDriver)
            .Where(v => v.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.Name.Contains(search) || (v.PlateNumber != null && v.PlateNumber.Contains(search)));

        if (!string.IsNullOrEmpty(status))
            query = query.Where(v => v.Status == status);

        var vans = await query.OrderBy(v => v.Name).ToListAsync();

        // Calculate actual cash for each van from transactions
        var result = new List<VanDto>();
        foreach (var v in vans)
        {
            decimal calculatedCash = 0;
            if (v.AssignedDriverId.HasValue)
            {
                var driverId = v.AssignedDriverId.Value;
                
                // Task cash (paid amounts from completed tasks)
                var taskCash = await _context.Tasks
                    .Where(t => t.CompanyId == companyId && 
                               t.DriverId == driverId &&
                               (t.Status == "Completed" || t.Status == "Delivered"))
                    .SumAsync(t => t.PaidAmount);

                // POS sales
                var posSales = await _context.Orders
                    .Where(o => o.CompanyId == companyId && o.DriverId == driverId)
                    .SumAsync(o => o.PaidAmount);

                // Collections (cash only)
                var collections = await _context.Collections
                    .Where(c => c.CompanyId == companyId && 
                               c.DriverId == driverId &&
                               c.PaymentType == "cash")
                    .SumAsync(c => c.Amount);

                // Deposits
                var deposits = await _context.Deposits
                    .Where(d => d.CompanyId == companyId && 
                               d.DriverId == driverId &&
                               d.Status != "rejected")
                    .SumAsync(d => d.Amount);

                calculatedCash = taskCash + posSales + collections - deposits;
            }

            result.Add(new VanDto
            {
                Id = v.Id,
                Name = v.Name,
                PlateNumber = v.PlateNumber,
                WarehouseId = v.WarehouseId,
                WarehouseName = v.Warehouse?.Name,
                AssignedDriverId = v.AssignedDriverId,
                AssignedDriverName = v.AssignedDriver?.Name,
                Status = v.Status,
                Notes = v.Notes,
                MaxCash = v.MaxCash,
                CurrentCash = calculatedCash,
                CreatedAt = v.CreatedAt
            });
        }

        return result;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VanDto>> GetVan(int id)
    {
        var companyId = GetCompanyId();
        var v = await _context.Vans
            .Include(v => v.Warehouse)
            .Include(v => v.AssignedDriver)
            .FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);

        if (v == null) return NotFound();

        // Calculate cash from transactions
        decimal calculatedCash = 0;
        if (v.AssignedDriverId.HasValue)
        {
            var driverId = v.AssignedDriverId.Value;
            
            var taskCash = await _context.Tasks
                .Where(t => t.CompanyId == companyId && t.DriverId == driverId &&
                           (t.Status == "Completed" || t.Status == "Delivered"))
                .SumAsync(t => t.PaidAmount);

            var posSales = await _context.Orders
                .Where(o => o.CompanyId == companyId && o.DriverId == driverId)
                .SumAsync(o => o.PaidAmount);

            var collections = await _context.Collections
                .Where(c => c.CompanyId == companyId && c.DriverId == driverId && c.PaymentType == "cash")
                .SumAsync(c => c.Amount);

            var deposits = await _context.Deposits
                .Where(d => d.CompanyId == companyId && d.DriverId == driverId && d.Status != "rejected")
                .SumAsync(d => d.Amount);

            calculatedCash = taskCash + posSales + collections - deposits;
        }

        return new VanDto
        {
            Id = v.Id,
            Name = v.Name,
            PlateNumber = v.PlateNumber,
            WarehouseId = v.WarehouseId,
            WarehouseName = v.Warehouse?.Name,
            AssignedDriverId = v.AssignedDriverId,
            AssignedDriverName = v.AssignedDriver?.Name,
            Status = v.Status,
            Notes = v.Notes,
            MaxCash = v.MaxCash,
            CurrentCash = calculatedCash,
            CreatedAt = v.CreatedAt
        };
    }

    [HttpPost]
    public async Task<ActionResult<VanDto>> CreateVan(CreateVanDto dto)
    {
        var companyId = GetCompanyId();

        var van = new Van
        {
            CompanyId = companyId,
            Name = dto.Name,
            PlateNumber = dto.PlateNumber,
            WarehouseId = dto.WarehouseId,
            AssignedDriverId = dto.AssignedDriverId,
            Status = dto.Status ?? "active",
            Notes = dto.Notes,
            MaxCash = dto.MaxCash
        };

        _context.Vans.Add(van);
        await _context.SaveChangesAsync();

        // Create VanCash record and sync driver's warehouse if driver is assigned
        if (van.AssignedDriverId.HasValue)
        {
            // Sync driver's warehouse to match van's warehouse
            var driver = await _context.Employees.FirstOrDefaultAsync(e => e.Id == van.AssignedDriverId && e.CompanyId == companyId);
            if (driver != null)
            {
                driver.WarehouseId = van.WarehouseId;
                driver.VanId = van.Id;
            }

            var vanCash = new VanCash
            {
                CompanyId = companyId,
                VanId = van.Id,
                DriverId = van.AssignedDriverId,
                CurrentBalance = 0,
                LastUpdated = TimeZoneHelper.Now
            };
            _context.VanCash.Add(vanCash);
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetVan), new { id = van.Id }, new VanDto
        {
            Id = van.Id,
            Name = van.Name,
            PlateNumber = van.PlateNumber,
            Status = van.Status,
            CreatedAt = van.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVan(int id, UpdateVanDto dto)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);

        if (van == null) return NotFound();

        var previousDriverId = van.AssignedDriverId;
        var previousWarehouseId = van.WarehouseId;
        
        van.Name = dto.Name;
        van.PlateNumber = dto.PlateNumber;
        van.WarehouseId = dto.WarehouseId;
        van.AssignedDriverId = dto.AssignedDriverId;
        van.Status = dto.Status ?? "active";
        van.Notes = dto.Notes;
        van.MaxCash = dto.MaxCash;
        van.UpdatedAt = TimeZoneHelper.Now;

        // Handle VanCash record when driver assignment changes
        if (dto.AssignedDriverId != previousDriverId)
        {
            // Clear previous driver's van and warehouse assignment
            if (previousDriverId.HasValue)
            {
                var previousDriver = await _context.Employees.FirstOrDefaultAsync(e => e.Id == previousDriverId && e.CompanyId == companyId);
                if (previousDriver != null && previousDriver.VanId == id)
                {
                    previousDriver.VanId = null;
                    previousDriver.WarehouseId = null;
                }
            }

            var existingVanCash = await _context.VanCash.FirstOrDefaultAsync(vc => vc.VanId == id);
            
            if (dto.AssignedDriverId.HasValue)
            {
                // Sync new driver's warehouse and van assignment
                var newDriver = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.AssignedDriverId && e.CompanyId == companyId);
                if (newDriver != null)
                {
                    newDriver.WarehouseId = van.WarehouseId;
                    newDriver.VanId = id;
                }

                // Driver assigned - create or update VanCash
                if (existingVanCash == null)
                {
                    var vanCash = new VanCash
                    {
                        CompanyId = companyId,
                        VanId = id,
                        DriverId = dto.AssignedDriverId,
                        CurrentBalance = 0,
                        LastUpdated = TimeZoneHelper.Now
                    };
                    _context.VanCash.Add(vanCash);
                }
                else
                {
                    existingVanCash.DriverId = dto.AssignedDriverId;
                    existingVanCash.LastUpdated = TimeZoneHelper.Now;
                }
            }
            else if (existingVanCash != null)
            {
                // Driver removed - clear driver from VanCash but keep the record
                existingVanCash.DriverId = null;
                existingVanCash.LastUpdated = TimeZoneHelper.Now;
            }
        }
        // Also sync warehouse if it changed but driver stayed the same
        else if (dto.AssignedDriverId.HasValue && dto.WarehouseId != previousWarehouseId)
        {
            var driver = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.AssignedDriverId && e.CompanyId == companyId);
            if (driver != null)
            {
                driver.WarehouseId = dto.WarehouseId;
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVan(int id)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);

        if (van == null) return NotFound();

        // Check if van has inventory
        var hasInventory = await _context.VanInventories.AnyAsync(vi => vi.VanId == id && vi.Quantity > 0);
        if (hasInventory)
            return BadRequest(new { message = "Cannot delete van with inventory. Please transfer inventory first." });

        // Check if van has cash balance
        var vanCash = await _context.VanCash.FirstOrDefaultAsync(vc => vc.VanId == id);
        if (vanCash != null && vanCash.CurrentBalance > 0)
            return BadRequest(new { message = "Cannot delete van with cash balance. Please deposit cash first." });

        // Remove VanCash record if exists
        if (vanCash != null)
            _context.VanCash.Remove(vanCash);

        _context.Vans.Remove(van);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/stock")]
    public async Task<ActionResult<IEnumerable<object>>> GetVanStock(int id)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);
        if (van == null) return NotFound();

        var stock = await _context.VanInventories
            .Include(vi => vi.Product)
            .Where(vi => vi.VanId == id)
            .Select(vi => new {
                ProductId = vi.ProductId,
                ProductName = vi.Product.Name,
                ProductSku = vi.Product.Sku,
                Quantity = vi.Quantity
            })
            .ToListAsync();

        return Ok(stock);
    }

    [HttpGet("drivers")]
    public async Task<ActionResult<IEnumerable<object>>> GetDrivers()
    {
        var companyId = GetCompanyId();
        var drivers = await _context.Employees
            .Where(e => e.CompanyId == companyId && e.IsDriver && e.Status == "active")
            .Select(e => new { e.Id, e.Name, e.WarehouseId })
            .ToListAsync();
        return Ok(drivers);
    }

    /// <summary>
    /// Get inventory movement history for a van
    /// </summary>
    [HttpGet("{id}/movements")]
    public async Task<ActionResult<IEnumerable<object>>> GetVanMovements(int id, [FromQuery] int limit = 50)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);
        if (van == null) return NotFound();

        var movements = await _context.Set<InventoryMovement>()
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Where(m => m.VanId == id && m.CompanyId == companyId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Select(m => new {
                Id = m.Id,
                ProductId = m.ProductId,
                ProductName = m.Product.Name,
                ProductSku = m.Product.Sku,
                MovementType = m.MovementType,
                Quantity = m.Quantity,
                WarehouseId = m.WarehouseId,
                WarehouseName = m.Warehouse != null ? m.Warehouse.Name : null,
                Notes = m.Notes,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(movements);
    }

    /// <summary>
    /// Load stock from warehouse to van
    /// </summary>
    [HttpPost("{id}/load-stock")]
    public async Task<IActionResult> LoadStock(int id, LoadStockDto dto)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);
        if (van == null) return NotFound("Van not found");

        if (!van.WarehouseId.HasValue)
            return BadRequest(new { message = "Van must be assigned to a warehouse to load stock" });

        // Check warehouse inventory
        var warehouseInventory = await _context.Inventories
            .FirstOrDefaultAsync(i => i.WarehouseId == van.WarehouseId && i.ProductId == dto.ProductId);

        if (warehouseInventory == null || warehouseInventory.Quantity < dto.Quantity)
            return BadRequest(new { message = "Insufficient stock in warehouse" });

        // Reduce warehouse inventory
        warehouseInventory.Quantity -= dto.Quantity;
        warehouseInventory.UpdatedAt = TimeZoneHelper.Now;

        // Add or update van inventory
        var vanInventory = await _context.VanInventories
            .FirstOrDefaultAsync(vi => vi.VanId == id && vi.ProductId == dto.ProductId);

        if (vanInventory == null)
        {
            vanInventory = new VanInventory
            {
                CompanyId = companyId,
                VanId = id,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity,
                LoadedAt = TimeZoneHelper.Now
            };
            _context.VanInventories.Add(vanInventory);
        }
        else
        {
            vanInventory.Quantity += dto.Quantity;
            vanInventory.UpdatedAt = TimeZoneHelper.Now;
        }

        // Log the movement
        var movement = new InventoryMovement
        {
            CompanyId = companyId,
            ProductId = dto.ProductId,
            WarehouseId = van.WarehouseId,
            VanId = id,
            MovementType = "load_van",
            Quantity = dto.Quantity,
            Notes = dto.Notes
        };
        _context.Set<InventoryMovement>().Add(movement);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Stock loaded successfully" });
    }

    /// <summary>
    /// Unload stock from van back to warehouse
    /// </summary>
    [HttpPost("{id}/unload-stock")]
    public async Task<IActionResult> UnloadStock(int id, LoadStockDto dto)
    {
        var companyId = GetCompanyId();
        var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == id && v.CompanyId == companyId);
        if (van == null) return NotFound("Van not found");

        if (!van.WarehouseId.HasValue)
            return BadRequest(new { message = "Van must be assigned to a warehouse to unload stock" });

        // Check van inventory
        var vanInventory = await _context.VanInventories
            .FirstOrDefaultAsync(vi => vi.VanId == id && vi.ProductId == dto.ProductId);

        if (vanInventory == null || vanInventory.Quantity < dto.Quantity)
            return BadRequest(new { message = "Insufficient stock in van" });

        // Reduce van inventory
        vanInventory.Quantity -= dto.Quantity;
        vanInventory.UpdatedAt = TimeZoneHelper.Now;

        // Add or update warehouse inventory
        var warehouseInventory = await _context.Inventories
            .FirstOrDefaultAsync(i => i.WarehouseId == van.WarehouseId && i.ProductId == dto.ProductId);

        if (warehouseInventory == null)
        {
            warehouseInventory = new Inventory
            {
                CompanyId = companyId,
                WarehouseId = van.WarehouseId.Value,
                ProductId = dto.ProductId,
                Quantity = dto.Quantity
            };
            _context.Inventories.Add(warehouseInventory);
        }
        else
        {
            warehouseInventory.Quantity += dto.Quantity;
            warehouseInventory.UpdatedAt = TimeZoneHelper.Now;
        }

        // Log the movement
        var movement = new InventoryMovement
        {
            CompanyId = companyId,
            ProductId = dto.ProductId,
            WarehouseId = van.WarehouseId,
            VanId = id,
            MovementType = "unload_van",
            Quantity = dto.Quantity,
            Notes = dto.Notes
        };
        _context.Set<InventoryMovement>().Add(movement);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Stock unloaded successfully" });
    }
}

public class VanDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public int? AssignedDriverId { get; set; }
    public string? AssignedDriverName { get; set; }
    public string Status { get; set; } = "active";
    public string? Notes { get; set; }
    public decimal MaxCash { get; set; }
    public decimal CurrentCash { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateVanDto
{
    public string Name { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public int? WarehouseId { get; set; }
    public int? AssignedDriverId { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public decimal MaxCash { get; set; } = 10000;
}

public class UpdateVanDto : CreateVanDto { }

public class LoadStockDto
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public string? Notes { get; set; }
}
