using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/direct-sales")]
[Authorize]
public class DirectSalesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public DirectSalesController(AppDbContext context, AccountingService accountingService)
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
        return int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
    }

    private async Task<decimal> GetProductCost(int productId, int companyId, string unitType, Product product)
    {
        // Get inventory settings for valuation method
        var settings = await _context.InventorySettings
            .FirstOrDefaultAsync(s => s.CompanyId == companyId);
        
        var valuationMethod = settings?.ValuationMethod ?? "fifo";
        decimal baseCost = unitType == "box" ? product.BoxCostPrice : product.CostPrice;

        switch (valuationMethod.ToLower())
        {
            case "fifo":
                // FIFO: Use oldest cost first
                var oldestCost = await _context.ProductCostHistories
                    .Where(h => h.ProductId == productId && h.CompanyId == companyId)
                    .OrderBy(h => h.RecordedDate)
                    .ThenBy(h => h.Id)
                    .Select(h => h.Cost)
                    .FirstOrDefaultAsync();
                return oldestCost > 0 ? (unitType == "box" ? oldestCost * (product.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1) : oldestCost) : baseCost;

            case "lifo":
                // LIFO: Use newest cost first
                var newestCost = await _context.ProductCostHistories
                    .Where(h => h.ProductId == productId && h.CompanyId == companyId)
                    .OrderByDescending(h => h.RecordedDate)
                    .ThenByDescending(h => h.Id)
                    .Select(h => h.Cost)
                    .FirstOrDefaultAsync();
                return newestCost > 0 ? (unitType == "box" ? newestCost * (product.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1) : newestCost) : baseCost;

            case "weighted_average":
                // Weighted Average: Calculate average from cost history
                var avgCost = await _context.ProductCostHistories
                    .Where(h => h.ProductId == productId && h.CompanyId == companyId)
                    .AverageAsync(h => (decimal?)h.Cost) ?? 0;
                return avgCost > 0 ? (unitType == "box" ? avgCost * (product.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1) : avgCost) : baseCost;

            default:
                return baseCost;
        }
    }

    // Get warehouse inventory for direct sales
    [HttpGet("inventory")]
    public async Task<ActionResult<IEnumerable<DirectSaleProductDto>>> GetInventory([FromQuery] int? warehouseId)
    {
        var companyId = GetCompanyId();

        var query = _context.Inventories
            .Include(wi => wi.Product)
            .Include(wi => wi.Warehouse)
            .Where(wi => wi.CompanyId == companyId && wi.Quantity > 0);

        if (warehouseId.HasValue)
            query = query.Where(wi => wi.WarehouseId == warehouseId);

        var rawInventory = await query
            .Select(wi => new DirectSaleProductDto
            {
                ProductId = wi.ProductId,
                ProductName = wi.Product!.Name,
                Sku = wi.Product.Sku,
                Barcode = wi.Product.Barcode,
                BoxBarcode = wi.Product.BoxBarcode,
                WarehouseId = wi.WarehouseId,
                WarehouseName = wi.Warehouse!.Name,
                Quantity = wi.Quantity,
                VariantId = wi.VariantId,
                VariantName = wi.Variant != null ? wi.Variant.Name : null,
                BaseUnit = wi.Product.BaseUnit ?? "Piece",
                SecondUnit = wi.Product.SecondUnit,
                UnitsPerSecond = wi.Product.UnitsPerSecond,
                RetailPrice = wi.Variant != null && wi.Variant.RetailPrice.HasValue ? wi.Variant.RetailPrice.Value : wi.Product.RetailPrice,
                WholesalePrice = wi.Variant != null && wi.Variant.WholesalePrice.HasValue ? wi.Variant.WholesalePrice.Value : wi.Product.WholesalePrice,
                BoxRetailPrice = wi.Variant != null && wi.Variant.BoxRetailPrice.HasValue ? wi.Variant.BoxRetailPrice.Value : wi.Product.BoxRetailPrice,
                BoxWholesalePrice = wi.Variant != null && wi.Variant.BoxWholesalePrice.HasValue ? wi.Variant.BoxWholesalePrice.Value : wi.Product.BoxWholesalePrice,
                CostPrice = wi.Variant != null && wi.Variant.CostPrice.HasValue ? wi.Variant.CostPrice.Value : wi.Product.CostPrice,
                BoxCostPrice = wi.Variant != null && wi.Variant.BoxCostPrice.HasValue ? wi.Variant.BoxCostPrice.Value : wi.Product.BoxCostPrice,
                ImageUrl = wi.Variant != null && wi.Variant.ImageUrl != null ? wi.Variant.ImageUrl : wi.Product.ImageUrl,
                LowStockAlert = wi.Product.LowStockAlert,
                Currency = wi.Product.Currency ?? "USD",
                Color = wi.Product.Color,
                Size = wi.Product.Size,
                Weight = wi.Product.Weight,
                Length = wi.Product.Length,
                Height = wi.Product.Height
            })
            .ToListAsync();

        // Deduplicate: group by ProductId + VariantId, sum quantities
        var inventory = rawInventory
            .GroupBy(i => new { i.ProductId, i.VariantId })
            .Select(g => {
                var first = g.First();
                first.Quantity = g.Sum(x => x.Quantity);
                return first;
            })
            .OrderBy(p => p.ProductName)
            .ThenBy(p => p.VariantName)
            .ToList();

        // Also include products that have variants but no variant-specific inventory yet
        // by loading variant info from the product variants table
        var productIds = inventory.Select(i => i.ProductId).Distinct().ToList();
        var productsWithVariants = await _context.Products
            .Include(p => p.Variants)
            .Where(p => p.CompanyId == companyId && productIds.Contains(p.Id))
            .Where(p => p.Variants.Any(v => v.IsActive))
            .ToListAsync();

        // Load variant inventory quantities in one query
        var variantIds = productsWithVariants.SelectMany(p => p.Variants.Select(v => v.Id)).ToList();
        var variantInventoryQuery = _context.Inventories
            .Where(i => i.CompanyId == companyId && i.VariantId != null && variantIds.Contains(i.VariantId.Value));
        if (warehouseId.HasValue)
            variantInventoryQuery = variantInventoryQuery.Where(i => i.WarehouseId == warehouseId.Value);
        var variantInventory = await variantInventoryQuery
            .GroupBy(i => i.VariantId!.Value)
            .Select(g => new { VariantId = g.Key, Quantity = g.Sum(i => i.Quantity) })
            .ToDictionaryAsync(x => x.VariantId, x => x.Quantity);

        // Attach variant list to each inventory item for frontend reference
        foreach (var item in inventory)
        {
            var prod = productsWithVariants.FirstOrDefault(p => p.Id == item.ProductId);
            if (prod != null)
            {
                item.Variants = prod.Variants.Where(v => v.IsActive).Select(v => new DirectSaleVariantDto
                {
                    Id = v.Id,
                    Name = v.Name,
                    Sku = v.Sku,
                    Barcode = v.Barcode,
                    RetailPrice = v.RetailPrice,
                    WholesalePrice = v.WholesalePrice,
                    CostPrice = v.CostPrice,
                    BoxRetailPrice = v.BoxRetailPrice,
                    BoxWholesalePrice = v.BoxWholesalePrice,
                    BoxCostPrice = v.BoxCostPrice,
                    ImageUrl = v.ImageUrl,
                    Color = v.Color,
                    Size = v.Size,
                    Weight = v.Weight,
                    Length = v.Length,
                    Height = v.Height,
                    Quantity = variantInventory.TryGetValue(v.Id, out var qty) ? qty : 0
                }).ToList();
            }
        }

        return inventory;
    }

    // Get customer special prices for direct sales
    [HttpGet("customer-prices/{customerId}")]
    public async Task<ActionResult<IEnumerable<CustomerPriceDto>>> GetCustomerPrices(int customerId)
    {
        var companyId = GetCompanyId();

        var prices = await _context.CustomerSpecialPrices
            .Where(sp => sp.CustomerId == customerId && sp.CompanyId == companyId && sp.IsActive)
            .Select(sp => new CustomerPriceDto
            {
                ProductId = sp.ProductId,
                SpecialPrice = sp.UnitType == "piece" ? sp.SpecialPrice : (decimal?)null,
                BoxSpecialPrice = sp.UnitType == "box" ? sp.SpecialPrice : (decimal?)null,
                HasSpecialPrice = sp.UnitType == "piece",
                HasBoxSpecialPrice = sp.UnitType == "box"
            })
            .ToListAsync();

        // Group by product to combine piece and box prices
        var grouped = prices.GroupBy(p => p.ProductId)
            .Select(g => new CustomerPriceDto
            {
                ProductId = g.Key,
                SpecialPrice = g.FirstOrDefault(x => x.HasSpecialPrice)?.SpecialPrice,
                BoxSpecialPrice = g.FirstOrDefault(x => x.HasBoxSpecialPrice)?.BoxSpecialPrice,
                HasSpecialPrice = g.Any(x => x.HasSpecialPrice),
                HasBoxSpecialPrice = g.Any(x => x.HasBoxSpecialPrice)
            })
            .ToList();

        return grouped;
    }

    // Create direct sale order
    [HttpPost]
    public async Task<ActionResult<DirectSaleResultDto>> CreateDirectSale(CreateDirectSaleDto dto)
    {
        try
        {
        var companyId = GetCompanyId();
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int? employeeId = null;
        if (int.TryParse(userIdClaim, out var parsedUserId))
        {
            var isEmployee = await _context.Employees.AnyAsync(e => e.Id == parsedUserId && e.CompanyId == companyId);
            if (isEmployee) employeeId = parsedUserId;
        }

        // Validate or create walk-in customer
        Models.Customer? customer = null;
        if (dto.CustomerId.HasValue && dto.CustomerId.Value > 0)
        {
            customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == dto.CustomerId.Value && c.CompanyId == companyId);
            if (customer == null)
                return NotFound("Customer not found");
        }
        else
        {
            // Find or create a walk-in customer "----"
            customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Name == "----" && c.CompanyId == companyId);
            if (customer == null)
            {
                customer = new Models.Customer
                {
                    CompanyId = companyId,
                    Name = "----",
                    Phone = "----",
                    Email = "",
                    Address = "",
                    CustomerType = "walk-in",
                    CreditLimit = 0,
                    DebtBalance = 0,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();
            }
        }

        // Generate order number
        var today = TimeZoneHelper.Now.Date;
        var count = await _context.Orders.CountAsync(o => o.CompanyId == companyId && o.OrderDate == today);
        var orderNumber = $"DS-{today:yyyyMMdd}-{(count + 1):D4}";

        // Create order
        var order = new Order
        {
            CompanyId = companyId,
            OrderNumber = orderNumber,
            CustomerId = customer.Id,
            DriverId = null, // No driver for direct sales
            VanId = null, // No van for direct sales
            OrderDate = TimeZoneHelper.Now.Date,
            OrderTime = TimeSpan.FromTicks(TimeZoneHelper.Now.TimeOfDay.Ticks),
            DeliveryAddress = dto.DeliveryAddress,
            Notes = dto.Notes ?? "Direct Sale",
            OrderStatus = "delivered", // Direct sales are immediately delivered
            PaymentStatus = dto.PaymentType == "cash" ? "paid" : (dto.PaymentType == "credit" ? "unpaid" : "partial"),
            CreatedBy = employeeId
        };

        // Process items and calculate totals
        decimal subtotal = 0;
        decimal totalCost = 0; // Track total cost for COGS
        foreach (var item in dto.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product == null) continue;

            // Get variant info if applicable
            ProductVariant? variant = null;
            string? variantDetails = null;
            if (item.VariantId.HasValue)
            {
                variant = await _context.ProductVariants.FindAsync(item.VariantId.Value);
                if (variant != null)
                {
                    variantDetails = string.Join(" / ", new[] {
                        variant.Color, variant.Size,
                        variant.Weight.HasValue ? variant.Weight + "kg" : null,
                        variant.Length.HasValue ? variant.Length + "cm" : null,
                        variant.Height.HasValue ? variant.Height + "cm" : null
                    }.Where(s => !string.IsNullOrWhiteSpace(s)));
                }
            }

            // Calculate quantity in base units for inventory deduction
            var baseQuantity = item.UnitType == "box" 
                ? item.Quantity * (product.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1)
                : item.Quantity;

            // Deduct from warehouse inventory (variant-aware)
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(wi => wi.ProductId == item.ProductId && wi.WarehouseId == dto.WarehouseId && wi.VariantId == item.VariantId);

            if (inventory == null || inventory.Quantity < baseQuantity)
            {
                var variantLabel = item.VariantId.HasValue ? $" (variant)" : "";
                return BadRequest($"Insufficient stock for {product.Name}{variantLabel}. Available: {inventory?.Quantity ?? 0}");
            }

            inventory.Quantity -= baseQuantity;

            // Calculate line total with 5 decimal precision
            var lineTotal = PrecisionHelper.CalculateLineTotal(item.Quantity, item.UnitPrice, item.DiscountAmount);
            subtotal += lineTotal;

            // Calculate cost based on valuation method (FIFO, LIFO, or Weighted Average)
            var costPrice = await GetProductCost(item.ProductId, companyId, item.UnitType, product);
            totalCost += costPrice * item.Quantity; // Accumulate total cost for COGS

            order.OrderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                ProductName = product.Name,
                ProductSku = product.Sku,
                ProductBarcode = product.Barcode,
                VariantId = item.VariantId,
                VariantName = variant?.Sku,
                VariantSku = variant?.Sku,
                VariantDetails = variantDetails,
                UnitId = null, // Use unit_type instead
                UnitType = item.UnitType,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                Total = lineTotal,
                CostPrice = costPrice,
                Currency = item.Currency ?? product.Currency ?? "USD"
            });

            // Record inventory movement
            _context.InventoryMovements.Add(new InventoryMovement
            {
                CompanyId = companyId,
                ProductId = item.ProductId,
                WarehouseId = dto.WarehouseId,
                MovementType = "sale",
                Quantity = -baseQuantity,
                ReferenceType = "order",
                Notes = $"Direct Sale {orderNumber}",
                CreatedBy = employeeId,
                CreatedAt = TimeZoneHelper.Now
            });
        }

        // Calculate totals with 5 decimal precision
        // Note: subtotal already has item-level discounts applied (lineTotal = price - discount)
        // So TotalAmount should NOT subtract dto.DiscountAmount again
        order.Subtotal = PrecisionHelper.RoundForStorage(subtotal + dto.DiscountAmount); // Store gross subtotal before discounts
        order.DiscountAmount = PrecisionHelper.RoundForStorage(dto.DiscountAmount);
        order.TaxAmount = PrecisionHelper.RoundForStorage(dto.TaxAmount);
        order.TotalAmount = PrecisionHelper.RoundForStorage(subtotal + dto.TaxAmount); // subtotal already has discounts applied
        order.PaidAmount = PrecisionHelper.RoundForStorage(dto.PaidAmount);

        // Update customer balance based on payment type
        if (dto.PaymentType == "credit")
        {
            customer.DebtBalance += order.TotalAmount;
        }
        else if (dto.PaymentType == "split")
        {
            var creditAmount = order.TotalAmount - dto.PaidAmount;
            if (creditAmount > 0)
            {
                customer.DebtBalance += creditAmount;
            }
        }

        // Store multi-currency payment data
        if (!string.IsNullOrEmpty(dto.PaymentCurrenciesJson))
            order.PaymentCurrencies = dto.PaymentCurrenciesJson;
        if (!string.IsNullOrEmpty(dto.ExchangeRateSnapshotJson))
            order.ExchangeRateSnapshot = dto.ExchangeRateSnapshotJson;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostDirectSaleEntry(companyId, order.Id, order.TotalAmount, order.PaidAmount, totalCost, order.OrderDate, employeeId);

        return new DirectSaleResultDto
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
            TotalAmount = order.TotalAmount,
            PaidAmount = order.PaidAmount,
            ChangeAmount = dto.PaymentType == "cash" ? dto.PaidAmount - order.TotalAmount : 0,
            PaymentStatus = order.PaymentStatus,
            CustomerName = customer.Name,
            PaymentCurrencies = order.PaymentCurrencies,
            ExchangeRateSnapshot = order.ExchangeRateSnapshot,
            Message = "Direct sale completed successfully"
        };
        }
        catch (Exception ex)
        {
            return BadRequest($"Error: {ex.Message} - {ex.InnerException?.Message}");
        }
    }

    // Load order/invoice by order number for return/exchange
    [HttpGet("order/{orderNumber}")]
    public async Task<ActionResult<OrderDetailDto>> GetOrderByNumber(string orderNumber)
    {
        var companyId = GetCompanyId();
        
        // Decode URL-encoded order number and trim whitespace
        var decodedOrderNumber = Uri.UnescapeDataString(orderNumber).Trim();

        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.CompanyId == companyId && o.OrderNumber == decodedOrderNumber);

        if (order == null)
            return NotFound(new { error = $"Order not found. CompanyId: {companyId}, OrderNumber: '{decodedOrderNumber}'" });

        // Get already returned quantities for this order
        var returnedQuantities = await _context.ReturnExchangeItems
            .Where(rei => rei.ReturnExchange.OriginalOrderId == order.Id && 
                         rei.ReturnExchange.CompanyId == companyId &&
                         rei.ItemType == "return")
            .GroupBy(rei => rei.OriginalOrderItemId)
            .Select(g => new { OrderItemId = g.Key, ReturnedQty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.OrderItemId ?? 0, x => x.ReturnedQty);

        var cashierName = "";
        if (order.CreatedBy.HasValue)
        {
            var cashier = await _context.Employees.FindAsync(order.CreatedBy.Value);
            cashierName = cashier?.Name ?? "";
        }

        return new OrderDetailDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerId = order.CustomerId,
            CustomerName = order.Customer.Name,
            CustomerPhone = order.Customer.Phone,
            OrderDate = order.OrderDate,
            OrderTime = order.OrderTime,
            Subtotal = order.Subtotal,
            DiscountAmount = order.DiscountAmount,
            TaxAmount = order.TaxAmount,
            TotalAmount = order.TotalAmount,
            PaidAmount = order.PaidAmount,
            PaymentStatus = order.PaymentStatus,
            CashierName = cashierName,
            Notes = order.Notes,
            Items = order.OrderItems.Select(oi => new OrderItemDetailDto
            {
                Id = oi.Id,
                ProductId = oi.ProductId ?? 0,
                ProductName = oi.ProductName ?? oi.Product?.Name ?? "(Deleted)",
                ProductSku = oi.ProductSku ?? oi.Product?.Sku,
                UnitType = oi.UnitType,
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                DiscountAmount = oi.DiscountAmount,
                TaxAmount = oi.TaxAmount,
                LineTotal = oi.Total,
                AlreadyReturnedQty = returnedQuantities.GetValueOrDefault(oi.Id, 0),
                ReturnableQty = oi.Quantity - returnedQuantities.GetValueOrDefault(oi.Id, 0)
            }).ToList()
        };
    }

    // Process return/exchange transaction
    [HttpPost("return-exchange")]
    public async Task<ActionResult<ReturnExchangeResultDto>> ProcessReturnExchange(CreateReturnExchangeDto dto)
    {
        try
        {
            var companyId = GetCompanyId();
            var userIdClaim2 = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int? employeeId = null;
            if (int.TryParse(userIdClaim2, out var parsedUserId2))
            {
                var isEmployee = await _context.Employees.AnyAsync(e => e.Id == parsedUserId2 && e.CompanyId == companyId);
                if (isEmployee) employeeId = parsedUserId2;
            }

            // Validate original order
            var originalOrder = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == dto.OriginalOrderId && o.CompanyId == companyId);

            if (originalOrder == null)
                return NotFound(new { error = "Original order not found" });

            // Validate warehouse
            var warehouse = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.Id == dto.WarehouseId && w.CompanyId == companyId);

            if (warehouse == null)
                return BadRequest(new { error = "Warehouse not found" });

            // Validate return quantities
            var returnedQuantities = await _context.ReturnExchangeItems
                .Where(rei => rei.ReturnExchange.OriginalOrderId == dto.OriginalOrderId && 
                             rei.ReturnExchange.CompanyId == companyId &&
                             rei.ItemType == "return")
                .GroupBy(rei => rei.OriginalOrderItemId)
                .Select(g => new { OrderItemId = g.Key, ReturnedQty = g.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.OrderItemId ?? 0, x => x.ReturnedQty);

            foreach (var item in dto.ReturnItems)
            {
                var orderItem = originalOrder.OrderItems.FirstOrDefault(oi => oi.Id == item.OriginalOrderItemId);
                if (orderItem == null)
                    return BadRequest(new { error = $"Order item {item.OriginalOrderItemId} not found" });

                var alreadyReturned = returnedQuantities.GetValueOrDefault(item.OriginalOrderItemId, 0);
                var returnableQty = orderItem.Quantity - alreadyReturned;

                if (item.Quantity > returnableQty)
                    return BadRequest(new { error = $"Cannot return more than {returnableQty} for product {orderItem.Product?.Name ?? item.ProductId.ToString()}" });
            }

            // Generate transaction number
            var today = TimeZoneHelper.Now;
            var prefix = $"RX-{today:yyyyMMdd}";
            var lastTx = await _context.ReturnExchanges
                .Where(re => re.CompanyId == companyId && re.TransactionNumber.StartsWith(prefix))
                .OrderByDescending(re => re.TransactionNumber)
                .FirstOrDefaultAsync();

            int sequence = 1;
            if (lastTx != null)
            {
                var lastSeq = lastTx.TransactionNumber.Split('-').LastOrDefault();
                if (int.TryParse(lastSeq, out int lastSeqNum))
                    sequence = lastSeqNum + 1;
            }
            var transactionNumber = $"{prefix}-{sequence:D4}";

            // Calculate totals
            decimal returnTotal = dto.ReturnItems.Sum(i => i.LineTotal);
            decimal exchangeTotal = dto.ExchangeItems.Sum(i => i.LineTotal);
            decimal netAmount = exchangeTotal - returnTotal;

            // Determine if manager approval is required (e.g., refund > threshold)
            bool managerApprovalRequired = netAmount < -100; // Example: refunds over $100 need approval

            // Create return/exchange transaction
            var transaction = new ReturnExchange
            {
                CompanyId = companyId,
                TransactionNumber = transactionNumber,
                OriginalOrderId = dto.OriginalOrderId,
                CustomerId = originalOrder.CustomerId,
                WarehouseId = dto.WarehouseId,
                CashierId = employeeId,
                TransactionDate = TimeZoneHelper.Now,
                ReturnTotal = returnTotal,
                ExchangeTotal = exchangeTotal,
                NetAmount = netAmount,
                RefundMethod = dto.RefundMethod,
                RefundAmount = netAmount < 0 ? Math.Abs(netAmount) : 0,
                PaymentMethod = dto.PaymentMethod,
                PaymentAmount = netAmount > 0 ? netAmount : 0,
                Notes = dto.Notes,
                ManagerApprovalRequired = managerApprovalRequired,
                Status = managerApprovalRequired ? "pending_approval" : "completed",
                CreatedAt = TimeZoneHelper.Now,
                UpdatedAt = TimeZoneHelper.Now
            };

            _context.ReturnExchanges.Add(transaction);
            await _context.SaveChangesAsync();

            // Add return items and update inventory
            foreach (var item in dto.ReturnItems)
            {
                var returnItem = new ReturnExchangeItem
                {
                    ReturnExchangeId = transaction.Id,
                    ItemType = "return",
                    ProductId = item.ProductId,
                    OriginalOrderItemId = item.OriginalOrderItemId,
                    UnitType = item.UnitType,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountAmount = item.DiscountAmount,
                    LineTotal = item.LineTotal,
                    Reason = item.Reason,
                    Condition = item.Condition,
                    InventoryAction = item.InventoryAction ?? "back_to_stock",
                    CreatedAt = TimeZoneHelper.Now
                };
                _context.ReturnExchangeItems.Add(returnItem);

                // Handle inventory based on action
                if (item.InventoryAction == "back_to_stock" || item.InventoryAction == null)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    var baseQuantity = item.UnitType == "box" 
                        ? item.Quantity * (product?.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1)
                        : item.Quantity;

                    var inventory = await _context.Inventories
                        .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.WarehouseId == dto.WarehouseId);

                    if (inventory != null)
                    {
                        inventory.Quantity += baseQuantity;
                        inventory.UpdatedAt = TimeZoneHelper.Now;
                    }
                    else
                    {
                        _context.Inventories.Add(new Inventory
                        {
                            CompanyId = companyId,
                            WarehouseId = dto.WarehouseId,
                            ProductId = item.ProductId,
                            Quantity = baseQuantity,
                            UpdatedAt = TimeZoneHelper.Now
                        });
                    }

                    // Record inventory movement
                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = item.ProductId,
                        WarehouseId = dto.WarehouseId,
                        MovementType = "return",
                        Quantity = baseQuantity,
                        ReferenceType = "return_exchange",
                        ReferenceId = transaction.Id,
                        Notes = $"Return from {transactionNumber}",
                        CreatedBy = employeeId,
                        CreatedAt = TimeZoneHelper.Now
                    });
                }
            }

            // Add exchange items and deduct from inventory
            foreach (var item in dto.ExchangeItems)
            {
                var exchangeItem = new ReturnExchangeItem
                {
                    ReturnExchangeId = transaction.Id,
                    ItemType = "exchange",
                    ProductId = item.ProductId,
                    UnitType = item.UnitType,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountAmount = item.DiscountAmount,
                    LineTotal = item.LineTotal,
                    CreatedAt = TimeZoneHelper.Now
                };
                _context.ReturnExchangeItems.Add(exchangeItem);

                // Deduct from inventory
                var product = await _context.Products.FindAsync(item.ProductId);
                var baseQuantity = item.UnitType == "box" 
                    ? item.Quantity * (product?.UnitsPerSecond > 0 ? product.UnitsPerSecond : 1)
                    : item.Quantity;

                var inventory = await _context.Inventories
                    .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.WarehouseId == dto.WarehouseId);

                if (inventory == null || inventory.Quantity < baseQuantity)
                    return BadRequest(new { error = $"Insufficient stock for {product?.Name ?? item.ProductId.ToString()}" });

                inventory.Quantity -= baseQuantity;
                inventory.UpdatedAt = TimeZoneHelper.Now;

                // Record inventory movement
                _context.InventoryMovements.Add(new InventoryMovement
                {
                    CompanyId = companyId,
                    ProductId = item.ProductId,
                    WarehouseId = dto.WarehouseId,
                    MovementType = "exchange_out",
                    Quantity = -baseQuantity,
                    ReferenceType = "return_exchange",
                    ReferenceId = transaction.Id,
                    Notes = $"Exchange from {transactionNumber}",
                    CreatedBy = employeeId,
                    CreatedAt = TimeZoneHelper.Now
                });
            }

            // Update customer balance if needed
            var customer = originalOrder.Customer;
            if (netAmount < 0 && dto.RefundMethod == "store_credit")
            {
                // Issue store credit by reducing debt balance
                customer.DebtBalance -= Math.Abs(netAmount);
            }
            else if (netAmount > 0 && dto.PaymentMethod == "credit")
            {
                // Add to customer debt
                customer.DebtBalance += netAmount;
            }

            await _context.SaveChangesAsync();

            return new ReturnExchangeResultDto
            {
                TransactionId = transaction.Id,
                TransactionNumber = transactionNumber,
                ReturnTotal = returnTotal,
                ExchangeTotal = exchangeTotal,
                NetAmount = netAmount,
                RefundDue = netAmount < 0 ? Math.Abs(netAmount) : 0,
                PaymentDue = netAmount > 0 ? netAmount : 0,
                Status = transaction.Status,
                CustomerName = customer.Name,
                Message = netAmount == 0 ? "Even exchange completed" : 
                         netAmount < 0 ? $"Refund of ${Math.Abs(netAmount):F2} processed" :
                         $"Additional payment of ${netAmount:F2} collected"
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = $"Error: {ex.Message}" });
        }
    }

    // Get return/exchange history
    [HttpGet("return-exchanges")]
    public async Task<ActionResult<IEnumerable<ReturnExchangeListDto>>> GetReturnExchanges(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId)
    {
        var companyId = GetCompanyId();

        var query = _context.ReturnExchanges
            .Include(re => re.Customer)
            .Include(re => re.OriginalOrder)
            .Where(re => re.CompanyId == companyId);

        if (startDate.HasValue)
            query = query.Where(re => re.TransactionDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(re => re.TransactionDate <= endDate.Value);

        if (customerId.HasValue)
            query = query.Where(re => re.CustomerId == customerId);

        var transactions = await query
            .OrderByDescending(re => re.TransactionDate)
            .Select(re => new ReturnExchangeListDto
            {
                Id = re.Id,
                TransactionNumber = re.TransactionNumber,
                OriginalOrderNumber = re.OriginalOrder.OrderNumber,
                CustomerName = re.Customer.Name,
                TransactionDate = re.TransactionDate,
                ReturnTotal = re.ReturnTotal,
                ExchangeTotal = re.ExchangeTotal,
                NetAmount = re.NetAmount,
                Status = re.Status
            })
            .Take(100)
            .ToListAsync();

        return transactions;
    }

    // Get direct sales history
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DirectSaleListDto>>> GetDirectSales(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId)
    {
        var companyId = GetCompanyId();

        var query = _context.Orders
            .Include(o => o.Customer)
            .Where(o => o.CompanyId == companyId && o.DriverId == null && o.VanId == null);

        if (startDate.HasValue)
            query = query.Where(o => o.OrderDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(o => o.OrderDate <= endDate.Value);

        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId);

        var sales = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new DirectSaleListDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                CustomerName = o.Customer.Name,
                OrderDate = o.OrderDate,
                TotalAmount = o.TotalAmount,
                PaidAmount = o.PaidAmount,
                PaymentStatus = o.PaymentStatus,
                ItemCount = o.OrderItems.Count
            })
            .Take(100)
            .ToListAsync();

        return sales;
    }
}

// DTOs
public class DirectSaleProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public int? VariantId { get; set; }
    public string? VariantName { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal BoxCostPrice { get; set; }
    public string? ImageUrl { get; set; }
    public int LowStockAlert { get; set; }
    public string Currency { get; set; } = "USD";
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Length { get; set; }
    public decimal? Height { get; set; }
    public List<DirectSaleVariantDto>? Variants { get; set; }
}

public class DirectSaleVariantDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public decimal? RetailPrice { get; set; }
    public decimal? WholesalePrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? BoxRetailPrice { get; set; }
    public decimal? BoxWholesalePrice { get; set; }
    public decimal? BoxCostPrice { get; set; }
    public string? ImageUrl { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Length { get; set; }
    public decimal? Height { get; set; }
    public decimal Quantity { get; set; } = 0;
}

public class CustomerPriceDto
{
    public int ProductId { get; set; }
    public decimal? SpecialPrice { get; set; }
    public decimal? BoxSpecialPrice { get; set; }
    public bool HasSpecialPrice { get; set; }
    public bool HasBoxSpecialPrice { get; set; }
}

public class CreateDirectSaleDto
{
    public int? CustomerId { get; set; }
    public int WarehouseId { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public string PaymentType { get; set; } = "cash"; // cash, credit, split
    public decimal PaidAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public string? PaymentCurrenciesJson { get; set; }
    public string? ExchangeRateSnapshotJson { get; set; }
    public List<DirectSaleItemDto> Items { get; set; } = new();
}

public class DirectSaleItemDto
{
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public string UnitType { get; set; } = "piece"; // piece or box
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Currency { get; set; }
}

public class DirectSaleResultDto
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? PaymentCurrencies { get; set; }
    public string? ExchangeRateSnapshot { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class DirectSaleListDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public int ItemCount { get; set; }
}

public class OrderDetailDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public DateTime OrderDate { get; set; }
    public TimeSpan? OrderTime { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<OrderItemDetailDto> Items { get; set; } = new();
}

public class OrderItemDetailDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string UnitType { get; set; } = "piece";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public decimal AlreadyReturnedQty { get; set; }
    public decimal ReturnableQty { get; set; }
}

public class CreateReturnExchangeDto
{
    public int OriginalOrderId { get; set; }
    public int WarehouseId { get; set; }
    public string? RefundMethod { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }
    public List<ReturnExchangeItemDto> ReturnItems { get; set; } = new();
    public List<ReturnExchangeItemDto> ExchangeItems { get; set; } = new();
}

public class ReturnExchangeItemDto
{
    public int ProductId { get; set; }
    public int OriginalOrderItemId { get; set; }
    public string UnitType { get; set; } = "piece";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public string? Reason { get; set; }
    public string? Condition { get; set; }
    public string? InventoryAction { get; set; }
}

public class ReturnExchangeResultDto
{
    public int TransactionId { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public decimal ReturnTotal { get; set; }
    public decimal ExchangeTotal { get; set; }
    public decimal NetAmount { get; set; }
    public decimal RefundDue { get; set; }
    public decimal PaymentDue { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ReturnExchangeListDto
{
    public int Id { get; set; }
    public string TransactionNumber { get; set; } = string.Empty;
    public string OriginalOrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    public decimal ReturnTotal { get; set; }
    public decimal ExchangeTotal { get; set; }
    public decimal NetAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}
