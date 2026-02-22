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
public class InventorySettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public InventorySettingsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<InventorySettingsDto>> GetSettings()
    {
        var companyId = GetCompanyId();
        if (companyId <= 0) return NotFound();

        var settings = await _context.InventorySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        if (settings == null)
        {
            // Return default settings if none exist
            return new InventorySettingsDto
            {
                ValuationMethod = "fifo",
                CostSpikeThreshold = 20,
                LowMarginThreshold = 10,
                EnableCostAlerts = true
            };
        }

        return new InventorySettingsDto
        {
            ValuationMethod = settings.ValuationMethod,
            CostSpikeThreshold = settings.CostSpikeThreshold,
            LowMarginThreshold = settings.LowMarginThreshold,
            EnableCostAlerts = settings.EnableCostAlerts
        };
    }

    [HttpPut]
    public async Task<ActionResult<InventorySettingsDto>> SaveSettings(InventorySettingsDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId <= 0) return NotFound();

        var settings = await _context.InventorySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        if (settings == null)
        {
            settings = new InventorySettings
            {
                CompanyId = companyId,
                ValuationMethod = dto.ValuationMethod,
                CostSpikeThreshold = dto.CostSpikeThreshold,
                LowMarginThreshold = dto.LowMarginThreshold,
                EnableCostAlerts = dto.EnableCostAlerts,
                CreatedAt = TimeZoneHelper.Now,
                UpdatedAt = TimeZoneHelper.Now
            };
            _context.InventorySettings.Add(settings);
        }
        else
        {
            settings.ValuationMethod = dto.ValuationMethod;
            settings.CostSpikeThreshold = dto.CostSpikeThreshold;
            settings.LowMarginThreshold = dto.LowMarginThreshold;
            settings.EnableCostAlerts = dto.EnableCostAlerts;
            settings.UpdatedAt = TimeZoneHelper.Now;
        }

        await _context.SaveChangesAsync();

        return new InventorySettingsDto
        {
            ValuationMethod = settings.ValuationMethod,
            CostSpikeThreshold = settings.CostSpikeThreshold,
            LowMarginThreshold = settings.LowMarginThreshold,
            EnableCostAlerts = settings.EnableCostAlerts
        };
    }

    /// <summary>
    /// Calculate cost for a product based on valuation method
    /// </summary>
    [HttpGet("calculate-cost/{productId}")]
    public async Task<ActionResult<CostCalculationDto>> CalculateCost(int productId, [FromQuery] decimal quantity, [FromQuery] int? warehouseId)
    {
        var companyId = GetCompanyId();
        if (companyId <= 0) return NotFound();

        var settings = await _context.InventorySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);

        var valuationMethod = settings?.ValuationMethod ?? "fifo";

        var product = await _context.Products.FindAsync(productId);
        if (product == null || product.CompanyId != companyId)
            return NotFound("Product not found");

        decimal calculatedCost;

        switch (valuationMethod.ToLower())
        {
            case "fifo":
                calculatedCost = await CalculateFifoCost(productId, companyId, quantity, warehouseId);
                break;
            case "lifo":
                calculatedCost = await CalculateLifoCost(productId, companyId, quantity, warehouseId);
                break;
            case "weighted_average":
                calculatedCost = await CalculateWeightedAverageCost(productId, companyId, warehouseId);
                break;
            default:
                calculatedCost = product.CostPrice;
                break;
        }

        return new CostCalculationDto
        {
            ProductId = productId,
            ProductName = product.Name,
            ValuationMethod = valuationMethod,
            CalculatedCost = calculatedCost,
            StandardCost = product.CostPrice,
            Quantity = quantity
        };
    }

    private async Task<decimal> CalculateFifoCost(int productId, int companyId, decimal quantity, int? warehouseId)
    {
        // Get purchase history ordered by date (oldest first for FIFO)
        var costHistory = await _context.ProductCostHistories
            .Where(h => h.ProductId == productId && h.CompanyId == companyId)
            .OrderBy(h => h.RecordedDate)
            .ThenBy(h => h.Id)
            .ToListAsync();

        if (!costHistory.Any())
        {
            var product = await _context.Products.FindAsync(productId);
            return product?.CostPrice ?? 0;
        }

        // For simplicity, use the oldest cost entry
        // In a full implementation, you'd track batch quantities
        return costHistory.First().Cost;
    }

    private async Task<decimal> CalculateLifoCost(int productId, int companyId, decimal quantity, int? warehouseId)
    {
        // Get purchase history ordered by date (newest first for LIFO)
        var costHistory = await _context.ProductCostHistories
            .Where(h => h.ProductId == productId && h.CompanyId == companyId)
            .OrderByDescending(h => h.RecordedDate)
            .ThenByDescending(h => h.Id)
            .ToListAsync();

        if (!costHistory.Any())
        {
            var product = await _context.Products.FindAsync(productId);
            return product?.CostPrice ?? 0;
        }

        // For LIFO, use the most recent cost entry
        return costHistory.First().Cost;
    }

    private async Task<decimal> CalculateWeightedAverageCost(int productId, int companyId, int? warehouseId)
    {
        // Calculate weighted average from all inventory
        var inventoryQuery = _context.Inventories
            .Where(i => i.Product.CompanyId == companyId && i.ProductId == productId);

        if (warehouseId.HasValue)
            inventoryQuery = inventoryQuery.Where(i => i.WarehouseId == warehouseId);

        var totalQuantity = await inventoryQuery.SumAsync(i => i.Quantity);
        
        if (totalQuantity <= 0)
        {
            var product = await _context.Products.FindAsync(productId);
            return product?.CostPrice ?? 0;
        }

        // Get cost history for weighted average calculation
        var costHistory = await _context.ProductCostHistories
            .Where(h => h.ProductId == productId && h.CompanyId == companyId)
            .ToListAsync();

        if (!costHistory.Any())
        {
            var product = await _context.Products.FindAsync(productId);
            return product?.CostPrice ?? 0;
        }

        // Simple weighted average - in full implementation, track quantities per batch
        var avgCost = costHistory.Average(h => h.Cost);
        return avgCost;
    }
}

public class InventorySettingsDto
{
    public string ValuationMethod { get; set; } = "fifo";
    public decimal CostSpikeThreshold { get; set; } = 20;
    public decimal LowMarginThreshold { get; set; } = 10;
    public bool EnableCostAlerts { get; set; } = true;
}

public class CostCalculationDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string ValuationMethod { get; set; } = "";
    public decimal CalculatedCost { get; set; }
    public decimal StandardCost { get; set; }
    public decimal Quantity { get; set; }
}
