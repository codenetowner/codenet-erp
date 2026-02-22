using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RawMaterialPurchasesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RawMaterialPurchasesController(AppDbContext context)
    {
        _context = context;
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

    // GET: api/rawmaterialpurchases
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RawMaterialPurchaseDto>>> GetAll(
        [FromQuery] string? paymentStatus = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var companyId = GetCompanyId();
        var query = _context.RawMaterialPurchases
            .Include(p => p.Items)
            .Include(p => p.Supplier)
            .Where(p => p.CompanyId == companyId);

        if (!string.IsNullOrEmpty(paymentStatus))
            query = query.Where(p => p.PaymentStatus == paymentStatus);

        if (fromDate.HasValue)
            query = query.Where(p => p.PurchaseDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(p => p.PurchaseDate <= toDate.Value);

        var purchases = await query
            .OrderByDescending(p => p.PurchaseDate)
            .Select(p => new RawMaterialPurchaseDto
            {
                Id = p.Id,
                PurchaseNumber = p.PurchaseNumber,
                SupplierId = p.SupplierId,
                SupplierName = p.SupplierId.HasValue ? p.Supplier!.Name : p.SupplierName,
                SupplierContact = p.SupplierId.HasValue ? p.Supplier!.Phone : p.SupplierContact,
                PurchaseDate = p.PurchaseDate,
                DueDate = p.DueDate,
                Subtotal = p.Subtotal,
                TaxAmount = p.TaxAmount,
                DiscountAmount = p.DiscountAmount,
                ShippingCost = p.ShippingCost,
                TotalAmount = p.TotalAmount,
                PaidAmount = p.PaidAmount,
                PaymentStatus = p.PaymentStatus,
                Notes = p.Notes,
                Reference = p.Reference,
                ItemCount = p.Items.Count,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(purchases);
    }

    // GET: api/rawmaterialpurchases/5
    [HttpGet("{id}")]
    public async Task<ActionResult<RawMaterialPurchaseDetailDto>> GetById(int id)
    {
        var companyId = GetCompanyId();
        var purchase = await _context.RawMaterialPurchases
            .Include(p => p.Supplier)
            .Include(p => p.Items)
                .ThenInclude(i => i.RawMaterial)
            .Include(p => p.Items)
                .ThenInclude(i => i.Warehouse)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (purchase == null)
            return NotFound();

        return Ok(new RawMaterialPurchaseDetailDto
        {
            Id = purchase.Id,
            PurchaseNumber = purchase.PurchaseNumber,
            SupplierId = purchase.SupplierId,
            SupplierName = purchase.SupplierId.HasValue ? purchase.Supplier!.Name : purchase.SupplierName,
            SupplierContact = purchase.SupplierId.HasValue ? purchase.Supplier!.Phone : purchase.SupplierContact,
            PurchaseDate = purchase.PurchaseDate,
            DueDate = purchase.DueDate,
            Subtotal = purchase.Subtotal,
            TaxAmount = purchase.TaxAmount,
            DiscountAmount = purchase.DiscountAmount,
            ShippingCost = purchase.ShippingCost,
            TotalAmount = purchase.TotalAmount,
            PaidAmount = purchase.PaidAmount,
            PaymentStatus = purchase.PaymentStatus,
            Notes = purchase.Notes,
            Reference = purchase.Reference,
            CreatedAt = purchase.CreatedAt,
            Items = purchase.Items.Select(i => new RawMaterialPurchaseItemDto
            {
                Id = i.Id,
                RawMaterialId = i.RawMaterialId,
                RawMaterialName = i.RawMaterial.Name,
                RawMaterialCode = i.RawMaterial.Code,
                Unit = i.RawMaterial.Unit,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.Name,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TaxAmount = i.TaxAmount,
                DiscountAmount = i.DiscountAmount,
                LineTotal = i.LineTotal
            }).ToList()
        });
    }

    // POST: api/rawmaterialpurchases
    [HttpPost]
    public async Task<ActionResult<RawMaterialPurchaseDetailDto>> Create([FromBody] CreateRawMaterialPurchaseDto? dto)
    {
        // Log model state errors
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
            return BadRequest(new { message = "Validation failed", errors = errors });
        }

        var companyId = GetCompanyId();
        if (companyId == 0)
            return BadRequest(new { message = "Invalid company ID - authentication issue" });

        if (dto == null)
            return BadRequest(new { message = "Request body is null" });

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "At least one item is required" });

        var employeeId = GetEmployeeId();

        // Generate purchase number
        var today = DateTime.UtcNow;
        var count = await _context.RawMaterialPurchases
            .CountAsync(p => p.CompanyId == companyId && p.PurchaseDate.Year == today.Year);
        var purchaseNumber = $"RMP-{today:yyyyMM}-{(count + 1).ToString().PadLeft(4, '0')}";

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Get supplier info if SupplierId is provided
            string? supplierName = dto.SupplierName;
            string? supplierContact = dto.SupplierContact;
            if (dto.SupplierId.HasValue)
            {
                var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == dto.SupplierId.Value && s.CompanyId == companyId);
                if (supplier != null)
                {
                    supplierName = supplier.Name;
                    supplierContact = supplier.Phone;
                }
            }

            var purchase = new RawMaterialPurchase
            {
                CompanyId = companyId,
                PurchaseNumber = purchaseNumber,
                SupplierId = dto.SupplierId,
                SupplierName = supplierName,
                SupplierContact = supplierContact,
                PurchaseDate = dto.PurchaseDate ?? DateTime.UtcNow,
                DueDate = dto.DueDate,
                TaxAmount = dto.TaxAmount,
                DiscountAmount = dto.DiscountAmount,
                ShippingCost = dto.ShippingCost,
                PaidAmount = dto.PaidAmount,
                Notes = dto.Notes,
                Reference = dto.Reference,
                CreatedBy = employeeId
            };

            decimal subtotal = 0;
            var items = new List<RawMaterialPurchaseItem>();

            foreach (var itemDto in dto.Items)
            {
                var material = await _context.RawMaterials
                    .FirstOrDefaultAsync(rm => rm.Id == itemDto.RawMaterialId && rm.CompanyId == companyId);
                if (material == null)
                    return BadRequest($"Raw material {itemDto.RawMaterialId} not found");

                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == itemDto.WarehouseId && w.CompanyId == companyId);
                if (warehouse == null)
                    return BadRequest($"Warehouse {itemDto.WarehouseId} not found");

                var lineTotal = (itemDto.Quantity * itemDto.UnitPrice) + itemDto.TaxAmount - itemDto.DiscountAmount;
                subtotal += itemDto.Quantity * itemDto.UnitPrice;

                items.Add(new RawMaterialPurchaseItem
                {
                    RawMaterialId = itemDto.RawMaterialId,
                    WarehouseId = itemDto.WarehouseId,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemDto.UnitPrice,
                    TaxAmount = itemDto.TaxAmount,
                    DiscountAmount = itemDto.DiscountAmount,
                    LineTotal = lineTotal
                });

                // Update inventory
                var inventory = await _context.RawMaterialInventories
                    .FirstOrDefaultAsync(rmi => rmi.RawMaterialId == itemDto.RawMaterialId && rmi.WarehouseId == itemDto.WarehouseId);

                if (inventory == null)
                {
                    inventory = new RawMaterialInventory
                    {
                        CompanyId = companyId,
                        RawMaterialId = itemDto.RawMaterialId,
                        WarehouseId = itemDto.WarehouseId,
                        Quantity = itemDto.Quantity
                    };
                    _context.RawMaterialInventories.Add(inventory);
                }
                else
                {
                    inventory.Quantity += itemDto.Quantity;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }

                // Update raw material cost price (average cost)
                var totalInventory = await _context.RawMaterialInventories
                    .Where(rmi => rmi.RawMaterialId == itemDto.RawMaterialId)
                    .SumAsync(rmi => rmi.Quantity);
                var existingValue = totalInventory * material.CostPrice;
                var newValue = itemDto.Quantity * itemDto.UnitPrice;
                var newTotalQty = totalInventory + itemDto.Quantity;
                if (newTotalQty > 0)
                {
                    material.CostPrice = (existingValue + newValue) / newTotalQty;
                    material.UpdatedAt = DateTime.UtcNow;
                }
            }

            purchase.Subtotal = subtotal;
            purchase.TotalAmount = subtotal + purchase.TaxAmount + purchase.ShippingCost - purchase.DiscountAmount;
            purchase.PaymentStatus = purchase.PaidAmount >= purchase.TotalAmount ? "paid" :
                                     purchase.PaidAmount > 0 ? "partial" : "unpaid";
            purchase.Items = items;

            _context.RawMaterialPurchases.Add(purchase);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = purchase.Id }, await GetById(purchase.Id));
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            var innerMsg = ex.InnerException?.Message ?? "No inner exception";
            return BadRequest($"Error creating purchase: {ex.Message}. Inner: {innerMsg}");
        }
    }

    // PUT: api/rawmaterialpurchases/5/payment
    [HttpPut("{id}/payment")]
    public async Task<IActionResult> RecordPayment(int id, [FromBody] RecordRawMaterialPaymentDto dto)
    {
        var companyId = GetCompanyId();
        var purchase = await _context.RawMaterialPurchases
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (purchase == null)
            return NotFound();

        purchase.PaidAmount += dto.Amount;
        purchase.PaymentStatus = purchase.PaidAmount >= purchase.TotalAmount ? "paid" :
                                 purchase.PaidAmount > 0 ? "partial" : "unpaid";
        purchase.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { purchase.PaidAmount, purchase.PaymentStatus });
    }

    // DELETE: api/rawmaterialpurchases/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var companyId = GetCompanyId();
        var purchase = await _context.RawMaterialPurchases
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (purchase == null)
            return NotFound();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Reverse inventory additions
            foreach (var item in purchase.Items)
            {
                var inventory = await _context.RawMaterialInventories
                    .FirstOrDefaultAsync(rmi => rmi.RawMaterialId == item.RawMaterialId && rmi.WarehouseId == item.WarehouseId);

                if (inventory != null)
                {
                    inventory.Quantity -= item.Quantity;
                    if (inventory.Quantity < 0) inventory.Quantity = 0;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }

            _context.RawMaterialPurchases.Remove(purchase);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            return BadRequest("Error deleting purchase");
        }
    }
}

// DTOs
public class RawMaterialPurchaseDto
{
    public int Id { get; set; }
    public string PurchaseNumber { get; set; } = string.Empty;
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? SupplierContact { get; set; }
    public DateTime PurchaseDate { get; set; }
    public DateTime? DueDate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = "unpaid";
    public string? Notes { get; set; }
    public string? Reference { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RawMaterialPurchaseDetailDto : RawMaterialPurchaseDto
{
    public List<RawMaterialPurchaseItemDto> Items { get; set; } = new();
}

public class RawMaterialPurchaseItemDto
{
    public int Id { get; set; }
    public int RawMaterialId { get; set; }
    public string RawMaterialName { get; set; } = string.Empty;
    public string? RawMaterialCode { get; set; }
    public string Unit { get; set; } = "Unit";
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class CreateRawMaterialPurchaseDto
{
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? SupplierContact { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public DateTime? DueDate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
    public string? Reference { get; set; }
    public List<CreateRawMaterialPurchaseItemDto> Items { get; set; } = new();
}

public class CreateRawMaterialPurchaseItemDto
{
    public int RawMaterialId { get; set; }
    public int WarehouseId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
}

public class RecordRawMaterialPaymentDto
{
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
}
