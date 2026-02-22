using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductionOrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public ProductionOrdersController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }
    private int? GetEmployeeId()
    {
        var empId = User.FindFirst("employee_id")?.Value;
        return string.IsNullOrEmpty(empId) ? null : int.Parse(empId);
    }

    // GET: api/productionorders
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionOrderDto>>> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var companyId = GetCompanyId();
        var query = _context.ProductionOrders
            .Include(po => po.Product)
            .Include(po => po.OutputWarehouse)
            .Where(po => po.CompanyId == companyId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(po => po.Status == status);

        if (fromDate.HasValue)
            query = query.Where(po => po.ProductionDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(po => po.ProductionDate <= toDate.Value);

        var orders = await query
            .OrderByDescending(po => po.ProductionDate)
            .Select(po => new ProductionOrderDto
            {
                Id = po.Id,
                ProductionNumber = po.ProductionNumber,
                ProductionDate = po.ProductionDate,
                ProductId = po.ProductId,
                ProductName = po.Product.Name,
                ProductSku = po.Product.Sku,
                OutputQuantity = po.OutputQuantity,
                OutputWarehouseId = po.OutputWarehouseId,
                OutputWarehouseName = po.OutputWarehouse.Name,
                RawMaterialCost = po.RawMaterialCost,
                ExtraCost = po.ExtraCost,
                TotalCost = po.TotalCost,
                UnitCost = po.UnitCost,
                Status = po.Status,
                Notes = po.Notes,
                CompletedAt = po.CompletedAt,
                CreatedAt = po.CreatedAt
            })
            .ToListAsync();

        return Ok(orders);
    }

    // GET: api/productionorders/5
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductionOrderDetailDto>> GetById(int id)
    {
        var companyId = GetCompanyId();
        var order = await _context.ProductionOrders
            .Include(po => po.Product)
            .Include(po => po.OutputWarehouse)
            .Include(po => po.Materials)
                .ThenInclude(m => m.RawMaterial)
            .Include(po => po.Materials)
                .ThenInclude(m => m.Warehouse)
            .Include(po => po.Costs)
                .ThenInclude(c => c.Expense)
            .FirstOrDefaultAsync(po => po.Id == id && po.CompanyId == companyId);

        if (order == null)
            return NotFound();

        return Ok(new ProductionOrderDetailDto
        {
            Id = order.Id,
            ProductionNumber = order.ProductionNumber,
            ProductionDate = order.ProductionDate,
            ProductId = order.ProductId,
            ProductName = order.Product.Name,
            ProductSku = order.Product.Sku,
            OutputQuantity = order.OutputQuantity,
            OutputWarehouseId = order.OutputWarehouseId,
            OutputWarehouseName = order.OutputWarehouse.Name,
            RawMaterialCost = order.RawMaterialCost,
            ExtraCost = order.ExtraCost,
            TotalCost = order.TotalCost,
            UnitCost = order.UnitCost,
            Status = order.Status,
            Notes = order.Notes,
            CompletedAt = order.CompletedAt,
            CreatedAt = order.CreatedAt,
            Materials = order.Materials.Select(m => new ProductionOrderMaterialDto
            {
                Id = m.Id,
                RawMaterialId = m.RawMaterialId,
                RawMaterialName = m.RawMaterial.Name,
                RawMaterialCode = m.RawMaterial.Code,
                Unit = m.RawMaterial.Unit,
                WarehouseId = m.WarehouseId,
                WarehouseName = m.Warehouse.Name,
                Quantity = m.Quantity,
                UnitCost = m.UnitCost,
                TotalCost = m.TotalCost
            }).ToList(),
            Costs = order.Costs.Select(c => new ProductionOrderCostDto
            {
                Id = c.Id,
                Description = c.Description,
                Amount = c.Amount,
                ExpenseId = c.ExpenseId,
                ExpenseNumber = c.Expense?.ExpenseNumber
            }).ToList()
        });
    }

    // POST: api/productionorders
    [HttpPost]
    public async Task<ActionResult<ProductionOrderDetailDto>> Create([FromBody] CreateProductionOrderDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Validate product
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId && p.CompanyId == companyId);
        if (product == null)
            return BadRequest("Product not found");

        // Validate output warehouse
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.Id == dto.OutputWarehouseId && w.CompanyId == companyId);
        if (warehouse == null)
            return BadRequest("Output warehouse not found");

        // Generate production number
        var today = DateTime.UtcNow;
        var count = await _context.ProductionOrders
            .CountAsync(po => po.CompanyId == companyId && po.ProductionDate.Year == today.Year);
        var productionNumber = $"PRD-{today:yyyyMM}-{(count + 1).ToString().PadLeft(4, '0')}";

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = new ProductionOrder
            {
                CompanyId = companyId,
                ProductionNumber = productionNumber,
                ProductionDate = dto.ProductionDate ?? DateTime.UtcNow,
                ProductId = dto.ProductId,
                OutputQuantity = dto.OutputQuantity,
                OutputWarehouseId = dto.OutputWarehouseId,
                Status = "draft",
                Notes = dto.Notes,
                CreatedBy = employeeId
            };

            decimal rawMaterialCost = 0;
            var materials = new List<ProductionOrderMaterial>();

            // Add materials
            foreach (var matDto in dto.Materials)
            {
                var rawMaterial = await _context.RawMaterials
                    .FirstOrDefaultAsync(rm => rm.Id == matDto.RawMaterialId && rm.CompanyId == companyId);
                if (rawMaterial == null)
                    return BadRequest($"Raw material {matDto.RawMaterialId} not found");

                var matWarehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == matDto.WarehouseId && w.CompanyId == companyId);
                if (matWarehouse == null)
                    return BadRequest($"Warehouse {matDto.WarehouseId} not found");

                // Check inventory
                var inventory = await _context.RawMaterialInventories
                    .FirstOrDefaultAsync(rmi => rmi.RawMaterialId == matDto.RawMaterialId && rmi.WarehouseId == matDto.WarehouseId);
                if (inventory == null || inventory.Quantity < matDto.Quantity)
                    return BadRequest($"Insufficient inventory for {rawMaterial.Name}");

                var unitCost = matDto.UnitCost ?? rawMaterial.CostPrice;
                var totalCost = matDto.Quantity * unitCost;
                rawMaterialCost += totalCost;

                materials.Add(new ProductionOrderMaterial
                {
                    RawMaterialId = matDto.RawMaterialId,
                    WarehouseId = matDto.WarehouseId,
                    Quantity = matDto.Quantity,
                    UnitCost = unitCost,
                    TotalCost = totalCost
                });
            }

            order.Materials = materials;
            order.RawMaterialCost = rawMaterialCost;
            order.TotalCost = rawMaterialCost;
            order.UnitCost = dto.OutputQuantity > 0 ? rawMaterialCost / dto.OutputQuantity : 0;

            _context.ProductionOrders.Add(order);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = order.Id }, await GetById(order.Id));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Error creating production order: {ex.Message}");
        }
    }

    // POST: api/productionorders/5/costs
    [HttpPost("{id}/costs")]
    public async Task<ActionResult> AddCost(int id, [FromBody] AddProductionCostDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        var order = await _context.ProductionOrders
            .Include(po => po.Costs)
            .FirstOrDefaultAsync(po => po.Id == id && po.CompanyId == companyId);

        if (order == null)
            return NotFound();

        if (order.Status == "completed")
            return BadRequest("Cannot add costs to completed production order");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Create expense record
            var expenseCount = await _context.Expenses.CountAsync(e => e.CompanyId == companyId);
            var expense = new Expense
            {
                CompanyId = companyId,
                ExpenseNumber = $"EXP-{DateTime.UtcNow:yyyyMMdd}-{(expenseCount + 1).ToString().PadLeft(4, '0')}",
                ExpenseDate = DateTime.UtcNow,
                Amount = dto.Amount,
                Description = $"Production Cost: {dto.Description} (Order: {order.ProductionNumber})",
                Status = "approved",
                PaymentMethod = dto.PaymentMethod ?? "cash",
                EmployeeId = employeeId
            };
            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            // Add cost to production order
            var cost = new ProductionOrderCost
            {
                ProductionOrderId = id,
                Description = dto.Description,
                Amount = dto.Amount,
                ExpenseId = expense.Id
            };
            _context.ProductionOrderCosts.Add(cost);

            // Update order totals
            order.ExtraCost += dto.Amount;
            order.TotalCost = order.RawMaterialCost + order.ExtraCost;
            order.UnitCost = order.OutputQuantity > 0 ? order.TotalCost / order.OutputQuantity : 0;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { cost.Id, expense.ExpenseNumber, order.TotalCost, order.UnitCost });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Error adding cost: {ex.Message}");
        }
    }

    // DELETE: api/productionorders/5/costs/3
    [HttpDelete("{id}/costs/{costId}")]
    public async Task<IActionResult> RemoveCost(int id, int costId)
    {
        var companyId = GetCompanyId();

        var order = await _context.ProductionOrders
            .FirstOrDefaultAsync(po => po.Id == id && po.CompanyId == companyId);

        if (order == null)
            return NotFound();

        if (order.Status == "completed")
            return BadRequest("Cannot remove costs from completed production order");

        var cost = await _context.ProductionOrderCosts
            .Include(c => c.Expense)
            .FirstOrDefaultAsync(c => c.Id == costId && c.ProductionOrderId == id);

        if (cost == null)
            return NotFound("Cost not found");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Remove expense if linked
            if (cost.Expense != null)
                _context.Expenses.Remove(cost.Expense);

            // Update order totals
            order.ExtraCost -= cost.Amount;
            order.TotalCost = order.RawMaterialCost + order.ExtraCost;
            order.UnitCost = order.OutputQuantity > 0 ? order.TotalCost / order.OutputQuantity : 0;
            order.UpdatedAt = DateTime.UtcNow;

            _context.ProductionOrderCosts.Remove(cost);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            return BadRequest("Error removing cost");
        }
    }

    // POST: api/productionorders/5/complete
    [HttpPost("{id}/complete")]
    public async Task<ActionResult> Complete(int id)
    {
        var companyId = GetCompanyId();

        var order = await _context.ProductionOrders
            .Include(po => po.Materials)
            .Include(po => po.Product)
            .FirstOrDefaultAsync(po => po.Id == id && po.CompanyId == companyId);

        if (order == null)
            return NotFound();

        if (order.Status == "completed")
            return BadRequest("Production order already completed");

        if (!order.Materials.Any())
            return BadRequest("Production order has no materials");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Deduct raw materials from inventory
            foreach (var material in order.Materials)
            {
                var inventory = await _context.RawMaterialInventories
                    .FirstOrDefaultAsync(rmi => rmi.RawMaterialId == material.RawMaterialId && rmi.WarehouseId == material.WarehouseId);

                if (inventory == null || inventory.Quantity < material.Quantity)
                    return BadRequest($"Insufficient inventory for raw material ID {material.RawMaterialId}");

                inventory.Quantity -= material.Quantity;
                inventory.UpdatedAt = DateTime.UtcNow;
            }

            // Add finished product to inventory
            var productInventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == order.ProductId && i.WarehouseId == order.OutputWarehouseId);

            if (productInventory == null)
            {
                productInventory = new Inventory
                {
                    CompanyId = companyId,
                    ProductId = order.ProductId,
                    WarehouseId = order.OutputWarehouseId,
                    Quantity = order.OutputQuantity
                };
                _context.Inventories.Add(productInventory);
            }
            else
            {
                productInventory.Quantity += order.OutputQuantity;
                productInventory.UpdatedAt = DateTime.UtcNow;
            }

            // Update product cost price (weighted average)
            var existingInventory = await _context.Inventories
                .Where(i => i.ProductId == order.ProductId)
                .SumAsync(i => i.Quantity);
            var existingValue = existingInventory * order.Product.CostPrice;
            var newValue = order.OutputQuantity * order.UnitCost;
            var newTotalQty = existingInventory + order.OutputQuantity;
            if (newTotalQty > 0)
            {
                order.Product.CostPrice = (existingValue + newValue) / newTotalQty;
                order.Product.UpdatedAt = DateTime.UtcNow;
            }

            // Update order status
            order.Status = "completed";
            order.CompletedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Auto-post accounting entry (await to avoid DbContext concurrency issues)
            await _accountingService.PostProductionEntry(companyId, order.Id, order.TotalCost, order.CompletedAt ?? DateTime.UtcNow);

            return Ok(new { 
                message = "Production order completed", 
                productQuantityAdded = order.OutputQuantity,
                newProductCost = order.Product.CostPrice
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest($"Error completing production: {ex.Message}");
        }
    }

    // DELETE: api/productionorders/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var companyId = GetCompanyId();
        var order = await _context.ProductionOrders
            .Include(po => po.Costs)
                .ThenInclude(c => c.Expense)
            .FirstOrDefaultAsync(po => po.Id == id && po.CompanyId == companyId);

        if (order == null)
            return NotFound();

        if (order.Status == "completed")
            return BadRequest("Cannot delete completed production order");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Remove associated expenses
            foreach (var cost in order.Costs)
            {
                if (cost.Expense != null)
                    _context.Expenses.Remove(cost.Expense);
            }

            _context.ProductionOrders.Remove(order);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            return BadRequest("Error deleting production order");
        }
    }
}

// DTOs
public class ProductionOrderDto
{
    public int Id { get; set; }
    public string ProductionNumber { get; set; } = string.Empty;
    public DateTime ProductionDate { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal OutputQuantity { get; set; }
    public int OutputWarehouseId { get; set; }
    public string OutputWarehouseName { get; set; } = string.Empty;
    public decimal RawMaterialCost { get; set; }
    public decimal ExtraCost { get; set; }
    public decimal TotalCost { get; set; }
    public decimal UnitCost { get; set; }
    public string Status { get; set; } = "draft";
    public string? Notes { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductionOrderDetailDto : ProductionOrderDto
{
    public List<ProductionOrderMaterialDto> Materials { get; set; } = new();
    public List<ProductionOrderCostDto> Costs { get; set; } = new();
}

public class ProductionOrderMaterialDto
{
    public int Id { get; set; }
    public int RawMaterialId { get; set; }
    public string RawMaterialName { get; set; } = string.Empty;
    public string? RawMaterialCode { get; set; }
    public string Unit { get; set; } = "Unit";
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
}

public class ProductionOrderCostDto
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int? ExpenseId { get; set; }
    public string? ExpenseNumber { get; set; }
}

public class CreateProductionOrderDto
{
    public DateTime? ProductionDate { get; set; }
    public int ProductId { get; set; }
    public decimal OutputQuantity { get; set; }
    public int OutputWarehouseId { get; set; }
    public string? Notes { get; set; }
    public List<CreateProductionMaterialDto> Materials { get; set; } = new();
}

public class CreateProductionMaterialDto
{
    public int RawMaterialId { get; set; }
    public int WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
}

public class AddProductionCostDto
{
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
}
