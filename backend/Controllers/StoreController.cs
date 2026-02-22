using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoreController : ControllerBase
{
    private readonly AppDbContext _context;

    public StoreController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all active products for a company (public, no auth)
    /// </summary>
    [HttpGet("{companyId}/products")]
    public async Task<ActionResult<IEnumerable<StoreProductDto>>> GetProducts(
        int companyId,
        [FromQuery] string? search,
        [FromQuery] int? categoryId)
    {
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null) return NotFound(new { message = "Store not found" });

        // If no products are marked for online shop, show all active products as fallback
        var hasOnlineProducts = await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.IsActive && p.ShowInOnlineShop);
        var query = _context.Products
            .Include(p => p.Category)
            .Where(p => p.CompanyId == companyId && p.IsActive && (!hasOnlineProducts || p.ShowInOnlineShop));

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.ToLower().Contains(search.ToLower()) || (p.Description != null && p.Description.ToLower().Contains(search.ToLower())));

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        var products = await query.OrderBy(p => p.Name).ToListAsync();

        return products.Select(p => new StoreProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name,
            ImageUrl = p.ImageUrl,
            BaseUnit = p.BaseUnit,
            SecondUnit = p.SecondUnit,
            UnitsPerSecond = p.UnitsPerSecond,
            Currency = p.Currency,
            RetailPrice = p.RetailPrice,
            BoxRetailPrice = p.BoxRetailPrice
        }).ToList();
    }

    /// <summary>
    /// Get all categories for a company (public, no auth)
    /// </summary>
    [HttpGet("{companyId}/categories")]
    public async Task<ActionResult<IEnumerable<StoreCategoryDto>>> GetCategories(int companyId)
    {
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null) return NotFound(new { message = "Store not found" });

        var hasOnlineProducts = await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.IsActive && p.ShowInOnlineShop);

        var categories = await _context.ProductCategories
            .Where(c => c.CompanyId == companyId)
            .OrderBy(c => c.Name)
            .Select(c => new StoreCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                ProductCount = _context.Products.Count(p => p.CategoryId == c.Id && p.CompanyId == companyId && p.IsActive && (!hasOnlineProducts || p.ShowInOnlineShop))
            })
            .ToListAsync();

        return categories;
    }

    /// <summary>
    /// Get company info for the store header (public, no auth)
    /// </summary>
    [HttpGet("{companyId}/info")]
    public async Task<ActionResult<StoreInfoDto>> GetStoreInfo(int companyId)
    {
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null) return NotFound(new { message = "Store not found" });

        return new StoreInfoDto
        {
            Id = company.Id,
            Name = company.Name,
            Phone = company.Phone,
            Address = company.Address,
            LogoUrl = company.LogoUrl,
            CurrencySymbol = company.CurrencySymbol,
            ExchangeRate = company.ExchangeRate,
            ShowSecondaryPrice = company.ShowSecondaryPrice,
            StoreDescription = company.StoreDescription,
            StoreBannerUrl = company.StoreBannerUrl,
            StoreThemeColor = company.StoreThemeColor,
            DeliveryEnabled = company.DeliveryEnabled,
            DeliveryFee = company.DeliveryFee,
            MinOrderAmount = company.MinOrderAmount,
            WhatsappNumber = company.WhatsappNumber
        };
    }
    /// <summary>
    /// Place an order from the online store - creates OnlineOrder + reduces inventory
    /// </summary>
    [HttpPost("{companyId}/orders")]
    public async Task<ActionResult<StoreOrderResultDto>> PlaceOrder(int companyId, [FromBody] StoreOrderDto dto)
    {
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null) return NotFound(new { message = "Store not found" });

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest(new { message = "Order must contain at least one item" });

        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            return BadRequest(new { message = "Customer name is required" });

        if (string.IsNullOrWhiteSpace(dto.CustomerPhone))
            return BadRequest(new { message = "Customer phone is required" });

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var orderItems = new List<StoreOrderItemResult>();
            var onlineOrderItems = new List<OnlineOrderItem>();
            decimal subtotal = 0;

            foreach (var item in dto.Items)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.CompanyId == companyId && p.IsActive);

                if (product == null)
                    return BadRequest(new { message = $"Product {item.ProductId} not found or inactive" });

                // Find inventory across all warehouses for this product
                var inventories = await _context.Inventories
                    .Where(i => i.ProductId == item.ProductId && i.CompanyId == companyId && i.Quantity > 0)
                    .OrderByDescending(i => i.Quantity)
                    .ToListAsync();

                decimal remaining = item.Quantity;
                foreach (var inv in inventories)
                {
                    if (remaining <= 0) break;
                    var deduct = Math.Min(inv.Quantity, remaining);
                    inv.Quantity -= deduct;
                    inv.UpdatedAt = DateTime.UtcNow;
                    remaining -= deduct;
                }

                var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : product.RetailPrice;
                var lineTotal = unitPrice * item.Quantity;
                subtotal += lineTotal;

                orderItems.Add(new StoreOrderItemResult
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    Total = lineTotal
                });

                onlineOrderItems.Add(new OnlineOrderItem
                {
                    ProductId = product.Id,
                    ProductName = item.ProductName ?? product.Name,
                    UnitType = item.UnitType ?? "piece",
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    Total = lineTotal,
                    Currency = item.Currency ?? product.Currency ?? "USD",
                    Notes = item.Notes
                });
            }

            var deliveryFee = dto.DeliveryType == "delivery" ? (company.DeliveryFee) : 0;
            var total = subtotal + deliveryFee;

            // Generate order number
            var orderNumber = $"ON-{companyId}-{DateTime.UtcNow:yyyyMMddHHmmss}-{new Random().Next(100, 999)}";

            // Create the OnlineOrder record
            var onlineOrder = new OnlineOrder
            {
                OrderNumber = orderNumber,
                CompanyId = companyId,
                GuestName = dto.CustomerName,
                GuestPhone = dto.CustomerPhone,
                GuestAddress = dto.CustomerAddress,
                Status = "pending",
                Subtotal = subtotal,
                DeliveryFee = deliveryFee,
                Total = total,
                PaymentMethod = "cod",
                PaymentStatus = "unpaid",
                Notes = dto.Notes,
                DeliveryType = dto.DeliveryType ?? "pickup",
                DeliveryAddress = dto.DeliveryAddress,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = onlineOrderItems
            };

            _context.OnlineOrders.Add(onlineOrder);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new StoreOrderResultDto
            {
                Id = onlineOrder.Id,
                OrderNumber = onlineOrder.OrderNumber,
                Success = true,
                Message = "Order placed successfully",
                OrderTotal = total,
                Subtotal = subtotal,
                DeliveryFee = deliveryFee,
                Status = onlineOrder.Status,
                Items = orderItems,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                CustomerAddress = dto.CustomerAddress
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Failed to place order", error = ex.Message });
        }
    }

    /// <summary>
    /// Get orders by guest phone number (public, no auth required)
    /// </summary>
    [HttpGet("orders/by-phone")]
    public async Task<ActionResult> GetOrdersByPhone([FromQuery] string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new { message = "Phone number is required" });

        var orders = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .Where(o => o.GuestPhone == phone)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.CompanyId,
                StoreName = o.Company.Name,
                StoreLogoUrl = o.Company.LogoUrl,
                o.Status,
                o.Subtotal,
                o.DeliveryFee,
                o.Total,
                o.DeliveryType,
                o.DeliveryAddress,
                o.Notes,
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
                    i.Currency
                }).ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>
    /// Get a single order detail by ID (public, no auth required)
    /// </summary>
    [HttpGet("orders/{id}")]
    public async Task<ActionResult> GetPublicOrderDetail(int id)
    {
        var order = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.CompanyId,
            StoreName = order.Company?.Name,
            StoreLogoUrl = order.Company?.LogoUrl,
            StorePhone = order.Company?.Phone,
            CustomerName = order.GuestName,
            CustomerPhone = order.GuestPhone,
            order.Status,
            order.Subtotal,
            order.DeliveryFee,
            order.Discount,
            order.Total,
            order.PaymentMethod,
            order.PaymentStatus,
            order.DeliveryType,
            order.DeliveryAddress,
            order.Notes,
            order.EstimatedDelivery,
            order.DeliveredAt,
            order.CancelledAt,
            order.CancelReason,
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
                i.Currency
            }).ToList()
        });
    }
}

public class StoreProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? ImageUrl { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal RetailPrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
}

public class StoreCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ProductCount { get; set; }
}

public class StoreInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string CurrencySymbol { get; set; } = "$";
    public decimal ExchangeRate { get; set; } = 1;
    public bool ShowSecondaryPrice { get; set; } = false;
    public string? StoreDescription { get; set; }
    public string? StoreBannerUrl { get; set; }
    public string? StoreThemeColor { get; set; }
    public bool DeliveryEnabled { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal MinOrderAmount { get; set; }
    public string? WhatsappNumber { get; set; }
}

public class StoreOrderDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerAddress { get; set; }
    public string? DeliveryType { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public List<StoreOrderItemDto> Items { get; set; } = new();
}

public class StoreOrderItemDto
{
    public int ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? UnitType { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Currency { get; set; }
    public string? Notes { get; set; }
}

public class StoreOrderResultDto
{
    public int Id { get; set; }
    public string? OrderNumber { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public decimal OrderTotal { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public string Status { get; set; } = "pending";
    public List<StoreOrderItemResult> Items { get; set; } = new();
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerAddress { get; set; }
}

public class StoreOrderItemResult
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}
