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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public ProductsController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    /// <summary>
    /// Get or create a "Walk-in Supplier" for the company (used for Products page stock entries)
    /// </summary>
    private async Task<Supplier> GetOrCreateWalkInSupplier(int companyId)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.Name == "Walk-in Supplier");

        if (supplier == null)
        {
            supplier = new Supplier
            {
                CompanyId = companyId,
                Name = "Walk-in Supplier",
                CompanyName = "Direct Purchase",
                Notes = "Auto-created for products added directly from Products page",
                IsActive = true,
                CreatedAt = TimeZoneHelper.Now,
                UpdatedAt = TimeZoneHelper.Now
            };
            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();
        }

        return supplier;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    /// <summary>
    /// Get all products for the company
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] int? warehouseId,
        [FromQuery] bool? isActive)
    {
        var companyId = GetCompanyId();
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.DefaultWarehouse)
            .Include(p => p.Variants)
            .Where(p => p.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.ToLower().Contains(search.ToLower()) || p.Sku.ToLower().Contains(search.ToLower()) || (p.Barcode != null && p.Barcode.ToLower().Contains(search.ToLower())));

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        if (warehouseId.HasValue)
            query = query.Where(p => p.DefaultWarehouseId == warehouseId);

        if (isActive.HasValue)
            query = query.Where(p => p.IsActive == isActive);

        var products = await query.OrderBy(p => p.Name).ToListAsync();

        // Get all variant inventories for this company
        var variantInventories = await _context.Inventories
            .Where(i => i.CompanyId == companyId && i.VariantId != null)
            .GroupBy(i => i.VariantId)
            .Select(g => new { VariantId = g.Key, Quantity = g.Sum(i => i.Quantity) })
            .ToDictionaryAsync(x => x.VariantId!.Value, x => x.Quantity);

        return products.Select(p => new ProductDto
        {
            Id = p.Id,
            Sku = p.Sku,
            Barcode = p.Barcode,
            BoxBarcode = p.BoxBarcode,
            Name = p.Name,
            Description = p.Description,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name,
            ImageUrl = p.ImageUrl,
            BaseUnit = p.BaseUnit,
            SecondUnit = p.SecondUnit,
            UnitsPerSecond = p.UnitsPerSecond,
            Currency = p.Currency,
            DefaultWarehouseId = p.DefaultWarehouseId,
            DefaultWarehouseName = p.DefaultWarehouse?.Name,
            RetailPrice = p.RetailPrice,
            WholesalePrice = p.WholesalePrice,
            SuperWholesalePrice = p.SuperWholesalePrice,
            CostPrice = p.CostPrice,
            BoxRetailPrice = p.BoxRetailPrice,
            BoxWholesalePrice = p.BoxWholesalePrice,
            BoxSuperWholesalePrice = p.BoxSuperWholesalePrice,
            BoxCostPrice = p.BoxCostPrice,
            LowStockAlert = p.LowStockAlert,
            LowStockAlertBox = p.LowStockAlertBox,
            IsActive = p.IsActive,
            ShowInOnlineShop = p.ShowInOnlineShop,
            Color = p.Color,
            Size = p.Size,
            Weight = p.Weight,
            Length = p.Length,
            Height = p.Height,
            CreatedAt = p.CreatedAt,
            Variants = p.Variants.Where(v => v.IsActive).Select(v => new ProductVariantDto
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
                IsActive = v.IsActive,
                Quantity = variantInventories.ContainsKey(v.Id) ? variantInventories[v.Id] : 0
            }).ToList()
        }).ToList();
    }

    /// <summary>
    /// Get single product
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetProduct(int id)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (product == null)
            return NotFound();

        return product;
    }

    /// <summary>
    /// Create new product
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Product>> CreateProduct(CreateProductDto dto)
    {
        var companyId = GetCompanyId();

        // Normalize empty SKU to null (PostgreSQL unique index treats empty strings as duplicates)
        if (string.IsNullOrWhiteSpace(dto.Sku)) dto.Sku = null;

        // Check if SKU exists (only if provided)
        if (!string.IsNullOrEmpty(dto.Sku) && await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.Sku == dto.Sku))
            return BadRequest(new { message = "SKU already exists" });

        var product = new Product
        {
            CompanyId = companyId,
            Sku = dto.Sku,
            Barcode = dto.Barcode,
            BoxBarcode = dto.BoxBarcode,
            Name = dto.Name,
            NameAr = dto.NameAr,
            Description = dto.Description,
            CategoryId = dto.CategoryId,
            ImageUrl = dto.ImageUrl,
            BaseUnit = dto.BaseUnit,
            SecondUnit = dto.SecondUnit,
            UnitsPerSecond = dto.UnitsPerSecond,
            Currency = dto.Currency,
            DefaultWarehouseId = dto.DefaultWarehouseId,
            RetailPrice = dto.RetailPrice,
            WholesalePrice = dto.WholesalePrice,
            SuperWholesalePrice = dto.SuperWholesalePrice,
            CostPrice = dto.CostPrice,
            BoxRetailPrice = dto.BoxRetailPrice,
            BoxWholesalePrice = dto.BoxWholesalePrice,
            BoxSuperWholesalePrice = dto.BoxSuperWholesalePrice,
            BoxCostPrice = dto.BoxCostPrice,
            LowStockAlert = dto.LowStockAlert,
            LowStockAlertBox = dto.LowStockAlertBox,
            IsActive = dto.IsActive,
            ShowInOnlineShop = dto.ShowInOnlineShop,
            Color = dto.Color,
            Size = dto.Size,
            Weight = dto.Weight,
            Length = dto.Length,
            Height = dto.Height
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Create initial inventory via Walk-in Supplier purchase invoice
        var warehouseId = dto.InitialWarehouseId ?? dto.DefaultWarehouseId;
        if (dto.InitialQuantity > 0 && warehouseId.HasValue)
        {
            var walkInSupplier = await GetOrCreateWalkInSupplier(companyId);

            // Generate invoice number
            var invoiceCount = await _context.PurchaseInvoices.CountAsync(i => i.CompanyId == companyId);
            var invoiceNumber = $"PI-{TimeZoneHelper.Now:yyyy}-{(invoiceCount + 1).ToString().PadLeft(4, '0')}";

            var unitPrice = dto.CostPrice > 0 ? dto.CostPrice : 0;
            var lineTotal = dto.InitialQuantity * unitPrice;

            var invoice = new PurchaseInvoice
            {
                CompanyId = companyId,
                SupplierId = walkInSupplier.Id,
                InvoiceNumber = invoiceNumber,
                InvoiceDate = TimeZoneHelper.Now,
                Subtotal = lineTotal,
                TotalAmount = lineTotal,
                PaidAmount = lineTotal,
                PaymentStatus = "paid",
                Reference = $"Product creation: {product.Name}",
                Notes = "Auto-generated from Products page"
            };

            invoice.Items.Add(new PurchaseInvoiceItem
            {
                ProductId = product.Id,
                WarehouseId = warehouseId.Value,
                Quantity = (int)dto.InitialQuantity,
                UnitPrice = unitPrice,
                LineTotal = lineTotal
            });

            _context.PurchaseInvoices.Add(invoice);

            // Create inventory record
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == product.Id && i.WarehouseId == warehouseId.Value && i.CompanyId == companyId);

            if (inventory != null)
            {
                inventory.Quantity += dto.InitialQuantity;
                inventory.UpdatedAt = TimeZoneHelper.Now;
            }
            else
            {
                _context.Inventories.Add(new Inventory
                {
                    CompanyId = companyId,
                    ProductId = product.Id,
                    WarehouseId = warehouseId.Value,
                    Quantity = dto.InitialQuantity,
                    ReservedQuantity = 0,
                    UpdatedAt = TimeZoneHelper.Now
                });
            }

            // Record inventory movement
            _context.InventoryMovements.Add(new InventoryMovement
            {
                CompanyId = companyId,
                ProductId = product.Id,
                WarehouseId = warehouseId,
                MovementType = "purchase",
                Quantity = dto.InitialQuantity,
                UnitCost = unitPrice,
                ReferenceType = "purchase_invoice",
                Notes = $"Initial stock via Walk-in Supplier: {invoiceNumber}"
            });

            // Record cost history
            if (dto.CostPrice > 0)
            {
                _context.ProductCostHistories.Add(new ProductCostHistory
                {
                    ProductId = product.Id,
                    CompanyId = companyId,
                    Cost = dto.CostPrice,
                    SupplierName = "Walk-in Supplier",
                    Notes = $"Initial stock entry (Qty: {dto.InitialQuantity})",
                    RecordedDate = TimeZoneHelper.Now
                });
            }

            await _context.SaveChangesAsync();

            // Post accounting entry
            try
            {
                await _accountingService.PostSupplierInvoiceEntry(companyId, invoice.Id, invoice.TotalAmount, invoice.InvoiceDate);
            }
            catch { /* Accounting is optional - don't fail product creation */ }
        }

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    /// <summary>
    /// Update product
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(int id, UpdateProductDto dto)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (product == null)
            return NotFound();

        // Normalize empty SKU to null
        if (string.IsNullOrWhiteSpace(dto.Sku)) dto.Sku = null;

        // Check SKU uniqueness if changed (only if provided)
        if (!string.IsNullOrEmpty(dto.Sku) && dto.Sku != product.Sku && await _context.Products.AnyAsync(p => p.CompanyId == companyId && p.Sku == dto.Sku))
            return BadRequest(new { message = "SKU already exists" });

        product.Sku = dto.Sku;
        product.Barcode = dto.Barcode;
        product.BoxBarcode = dto.BoxBarcode;
        product.Name = dto.Name;
        product.NameAr = dto.NameAr;
        product.Description = dto.Description;
        product.CategoryId = dto.CategoryId;
        product.ImageUrl = dto.ImageUrl;
        product.BaseUnit = dto.BaseUnit;
        product.SecondUnit = dto.SecondUnit;
        product.UnitsPerSecond = dto.UnitsPerSecond;
        product.Currency = dto.Currency;
        product.DefaultWarehouseId = dto.DefaultWarehouseId;
        product.RetailPrice = dto.RetailPrice;
        product.WholesalePrice = dto.WholesalePrice;
        product.SuperWholesalePrice = dto.SuperWholesalePrice;
        product.CostPrice = dto.CostPrice;
        product.BoxRetailPrice = dto.BoxRetailPrice;
        product.BoxWholesalePrice = dto.BoxWholesalePrice;
        product.BoxSuperWholesalePrice = dto.BoxSuperWholesalePrice;
        product.BoxCostPrice = dto.BoxCostPrice;
        product.LowStockAlert = dto.LowStockAlert;
        product.LowStockAlertBox = dto.LowStockAlertBox;
        product.IsActive = dto.IsActive;
        product.ShowInOnlineShop = dto.ShowInOnlineShop;
        product.Color = dto.Color;
        product.Size = dto.Size;
        product.Weight = dto.Weight;
        product.Length = dto.Length;
        product.Height = dto.Height;
        product.UpdatedAt = TimeZoneHelper.Now;

        // Update inventory quantity if warehouse and quantity provided
        if (dto.InitialWarehouseId.HasValue)
        {
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == id && i.WarehouseId == dto.InitialWarehouseId.Value && i.CompanyId == companyId);

            // Get employee ID if logged in as employee, otherwise null
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int? employeeId = null;
            if (int.TryParse(userIdClaim, out var parsedId))
            {
                var isEmployee = await _context.Employees.AnyAsync(e => e.Id == parsedId && e.CompanyId == companyId);
                if (isEmployee) employeeId = parsedId;
            }

            if (inventory != null)
            {
                var diff = dto.InitialQuantity - inventory.Quantity;
                if (diff != 0)
                {
                    inventory.Quantity = dto.InitialQuantity;
                    inventory.UpdatedAt = TimeZoneHelper.Now;

                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = id,
                        WarehouseId = dto.InitialWarehouseId.Value,
                        MovementType = "adjustment",
                        Quantity = diff,
                        ReferenceType = "product_edit",
                        ReferenceId = id,
                        Notes = $"Quantity adjusted from {inventory.Quantity - diff} to {dto.InitialQuantity}",
                        CreatedBy = employeeId,
                        CreatedAt = TimeZoneHelper.Now
                    });
                }
            }
            else
            {
                // Create new inventory record
                _context.Inventories.Add(new Inventory
                {
                    CompanyId = companyId,
                    ProductId = id,
                    WarehouseId = dto.InitialWarehouseId.Value,
                    Quantity = dto.InitialQuantity,
                    ReservedQuantity = 0,
                    CreatedAt = TimeZoneHelper.Now,
                    UpdatedAt = TimeZoneHelper.Now
                });

                if (dto.InitialQuantity > 0)
                {
                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = id,
                        WarehouseId = dto.InitialWarehouseId.Value,
                        MovementType = "adjustment",
                        Quantity = dto.InitialQuantity,
                        ReferenceType = "product_edit",
                        ReferenceId = id,
                        Notes = $"Initial stock set to {dto.InitialQuantity} via product edit",
                        CreatedBy = employeeId,
                        CreatedAt = TimeZoneHelper.Now
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Create stock adjustment for a product
    /// </summary>
    [HttpPost("stock-adjustment")]
    public async Task<IActionResult> CreateStockAdjustment([FromBody] StockAdjustmentDto dto)
    {
        var companyId = GetCompanyId();
        
        // Get employee ID if logged in as employee, otherwise null
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int? employeeId = null;
        if (int.TryParse(userIdClaim, out var parsedId))
        {
            var isEmployee = await _context.Employees.AnyAsync(e => e.Id == parsedId && e.CompanyId == companyId);
            if (isEmployee) employeeId = parsedId;
        }

        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId && p.CompanyId == companyId);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId && w.CompanyId == companyId);
        if (warehouse == null)
            return NotFound(new { message = "Warehouse not found" });

        // Validate variant if provided
        if (dto.VariantId.HasValue)
        {
            var variantExists = await _context.ProductVariants.AnyAsync(v => v.Id == dto.VariantId.Value && v.ProductId == dto.ProductId && v.CompanyId == companyId);
            if (!variantExists)
                return NotFound(new { message = "Variant not found" });
        }

        // Get or create inventory record
        var inventory = await _context.Inventories
            .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.WarehouseId == dto.WarehouseId && i.CompanyId == companyId && i.VariantId == dto.VariantId);

        decimal oldQuantity = inventory?.Quantity ?? 0;
        decimal newQuantity;

        // Calculate new quantity based on adjustment type
        if (dto.AdjustmentType == "set")
        {
            // Convert second unit to base if needed
            newQuantity = dto.BaseUnitQuantity;
            if (dto.SecondUnitQuantity.HasValue && product.UnitsPerSecond > 0)
                newQuantity += dto.SecondUnitQuantity.Value / product.UnitsPerSecond;
        }
        else if (dto.AdjustmentType == "add")
        {
            decimal addQty = dto.BaseUnitQuantity;
            if (dto.SecondUnitQuantity.HasValue && product.UnitsPerSecond > 0)
                addQty += dto.SecondUnitQuantity.Value / product.UnitsPerSecond;
            newQuantity = oldQuantity + addQty;
        }
        else if (dto.AdjustmentType == "subtract")
        {
            decimal subQty = dto.BaseUnitQuantity;
            if (dto.SecondUnitQuantity.HasValue && product.UnitsPerSecond > 0)
                subQty += dto.SecondUnitQuantity.Value / product.UnitsPerSecond;
            newQuantity = oldQuantity - subQty;
        }
        else
        {
            return BadRequest(new { message = "Invalid adjustment type. Use 'set', 'add', or 'subtract'" });
        }

        decimal diff = newQuantity - oldQuantity;

        if (inventory == null)
        {
            inventory = new Inventory
            {
                CompanyId = companyId,
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                VariantId = dto.VariantId,
                Quantity = newQuantity,
                CreatedAt = TimeZoneHelper.Now,
                UpdatedAt = TimeZoneHelper.Now
            };
            _context.Inventories.Add(inventory);
        }
        else
        {
            inventory.Quantity = newQuantity;
            inventory.UpdatedAt = TimeZoneHelper.Now;
            inventory.LastCountedAt = TimeZoneHelper.Now;
        }

        // Create Walk-in Supplier purchase invoice if requested (Products page stock additions)
        if (dto.CreatePurchaseInvoice && dto.AdjustmentType == "add" && diff > 0)
        {
            var walkInSupplier = await GetOrCreateWalkInSupplier(companyId);

            var invoiceCount = await _context.PurchaseInvoices.CountAsync(i => i.CompanyId == companyId);
            var invoiceNumber = $"PI-{TimeZoneHelper.Now:yyyy}-{(invoiceCount + 1).ToString().PadLeft(4, '0')}";

            var unitPrice = product.CostPrice;
            var lineTotal = diff * unitPrice;

            var invoice = new PurchaseInvoice
            {
                CompanyId = companyId,
                SupplierId = walkInSupplier.Id,
                InvoiceNumber = invoiceNumber,
                InvoiceDate = TimeZoneHelper.Now,
                Subtotal = lineTotal,
                TotalAmount = lineTotal,
                PaidAmount = lineTotal,
                PaymentStatus = "paid",
                Reference = $"Stock addition: {product.Name}",
                Notes = "Auto-generated from Products page"
            };

            invoice.Items.Add(new PurchaseInvoiceItem
            {
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                Quantity = (int)diff,
                UnitPrice = unitPrice,
                LineTotal = lineTotal
            });

            _context.PurchaseInvoices.Add(invoice);

            // Record as purchase movement
            _context.InventoryMovements.Add(new InventoryMovement
            {
                CompanyId = companyId,
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                MovementType = "purchase",
                Quantity = diff,
                UnitCost = unitPrice,
                ReferenceType = "purchase_invoice",
                Notes = $"Stock added via Walk-in Supplier: {invoiceNumber}",
                CreatedBy = employeeId,
                CreatedAt = TimeZoneHelper.Now
            });

            // Record cost history
            if (unitPrice > 0)
            {
                _context.ProductCostHistories.Add(new ProductCostHistory
                {
                    ProductId = dto.ProductId,
                    CompanyId = companyId,
                    Cost = unitPrice,
                    SupplierName = "Walk-in Supplier",
                    Notes = $"Stock addition (Qty: {diff})",
                    RecordedDate = TimeZoneHelper.Now
                });
            }

            await _context.SaveChangesAsync();

            // Post accounting entry
            try
            {
                await _accountingService.PostSupplierInvoiceEntry(companyId, invoice.Id, invoice.TotalAmount, invoice.InvoiceDate);
            }
            catch { /* Accounting is optional */ }
        }
        else
        {
            // Regular stock adjustment movement
            _context.InventoryMovements.Add(new InventoryMovement
            {
                CompanyId = companyId,
                ProductId = dto.ProductId,
                WarehouseId = dto.WarehouseId,
                MovementType = "stock_adjustment",
                Quantity = diff,
                ReferenceType = "stock_adjustment",
                ReferenceId = dto.ProductId,
                Notes = $"[{dto.Reason ?? "No reason"}] {dto.AdjustmentType}: {oldQuantity} → {newQuantity} ({(diff >= 0 ? "+" : "")}{diff} {product.BaseUnit}){(dto.VariantId.HasValue ? $" [VariantId:{dto.VariantId}]" : "")}",
                CreatedBy = employeeId,
                CreatedAt = TimeZoneHelper.Now
            });

            await _context.SaveChangesAsync();
        }

        return Ok(new { 
            message = "Stock adjusted successfully", 
            oldQuantity, 
            newQuantity, 
            difference = diff,
            productName = product.Name,
            warehouseName = warehouse.Name
        });
    }

    /// <summary>
    /// Get stock adjustment history
    /// </summary>
    [HttpGet("stock-adjustments")]
    public async Task<IActionResult> GetStockAdjustments([FromQuery] int? productId, [FromQuery] int? warehouseId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var companyId = GetCompanyId();

        var query = _context.InventoryMovements
            .Include(m => m.Product)
            .Include(m => m.Warehouse)
            .Where(m => m.CompanyId == companyId && m.MovementType == "stock_adjustment");

        if (productId.HasValue)
            query = query.Where(m => m.ProductId == productId.Value);
        if (warehouseId.HasValue)
            query = query.Where(m => m.WarehouseId == warehouseId.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new StockAdjustmentHistoryDto
            {
                Id = m.Id,
                ProductId = m.ProductId,
                ProductName = m.Product.Name,
                ProductSku = m.Product.Sku,
                BaseUnit = m.Product.BaseUnit,
                SecondUnit = m.Product.SecondUnit,
                UnitsPerSecond = m.Product.UnitsPerSecond,
                WarehouseId = m.WarehouseId ?? 0,
                WarehouseName = m.Warehouse != null ? m.Warehouse.Name : "",
                Quantity = m.Quantity,
                Notes = m.Notes,
                CreatedBy = m.CreatedBy,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>
    /// Delete product
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (product == null)
            return NotFound();

        // Note: Order/task history is preserved - ProductId will be set to NULL in order_items/task_items
        // Remove related records that have foreign keys to this product
        var variants = await _context.ProductVariants.Where(v => v.ProductId == id).ToListAsync();
        _context.ProductVariants.RemoveRange(variants);

        var inventories = await _context.Inventories.Where(i => i.ProductId == id).ToListAsync();
        _context.Inventories.RemoveRange(inventories);

        var movements = await _context.InventoryMovements.Where(m => m.ProductId == id).ToListAsync();
        _context.InventoryMovements.RemoveRange(movements);

        var vanInventory = await _context.VanInventories.Where(vi => vi.ProductId == id).ToListAsync();
        _context.VanInventories.RemoveRange(vanInventory);

        var costHistory = await _context.ProductCostHistories.Where(h => h.ProductId == id).ToListAsync();
        _context.ProductCostHistories.RemoveRange(costHistory);

        var specialPrices = await _context.CustomerSpecialPrices.Where(sp => sp.ProductId == id).ToListAsync();
        _context.CustomerSpecialPrices.RemoveRange(specialPrices);

        var empProducts = await _context.EmployeeProducts.Where(ep => ep.ProductId == id).ToListAsync();
        _context.EmployeeProducts.RemoveRange(empProducts);

        var favorites = await _context.AppFavorites.Where(f => f.ProductId == id).ToListAsync();
        _context.AppFavorites.RemoveRange(favorites);

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ===== VARIANT ENDPOINTS =====

    /// <summary>
    /// Get all variants for a product
    /// </summary>
    [HttpGet("{productId}/variants")]
    public async Task<IActionResult> GetVariants(int productId)
    {
        var companyId = GetCompanyId();
        var variants = await _context.ProductVariants
            .Where(v => v.ProductId == productId && v.CompanyId == companyId)
            .OrderBy(v => v.Name)
            .Select(v => new ProductVariantDto
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
                IsActive = v.IsActive,
                Quantity = _context.Inventories
                    .Where(i => i.VariantId == v.Id && i.CompanyId == companyId)
                    .Sum(i => (decimal?)i.Quantity) ?? 0
            })
            .ToListAsync();

        return Ok(variants);
    }

    /// <summary>
    /// Create a variant for a product
    /// </summary>
    [HttpPost("{productId}/variants")]
    public async Task<IActionResult> CreateVariant(int productId, [FromBody] CreateVariantDto dto)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId && p.CompanyId == companyId);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        var variant = new ProductVariant
        {
            CompanyId = companyId,
            ProductId = productId,
            Name = dto.Name,
            Sku = dto.Sku,
            Barcode = dto.Barcode,
            RetailPrice = dto.RetailPrice,
            WholesalePrice = dto.WholesalePrice,
            CostPrice = dto.CostPrice,
            BoxRetailPrice = dto.BoxRetailPrice,
            BoxWholesalePrice = dto.BoxWholesalePrice,
            BoxCostPrice = dto.BoxCostPrice,
            ImageUrl = dto.ImageUrl,
            Color = dto.Color,
            Size = dto.Size,
            Weight = dto.Weight,
            Length = dto.Length,
            Height = dto.Height,
            IsActive = true,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();

        // Create inventory record for the variant if quantity > 0
        if (dto.Quantity > 0 && product.DefaultWarehouseId.HasValue)
        {
            var inventory = new Inventory
            {
                CompanyId = companyId,
                ProductId = productId,
                VariantId = variant.Id,
                WarehouseId = product.DefaultWarehouseId.Value,
                Quantity = dto.Quantity,
                CreatedAt = TimeZoneHelper.Now,
                UpdatedAt = TimeZoneHelper.Now
            };
            _context.Inventories.Add(inventory);
            await _context.SaveChangesAsync();
        }

        return Ok(new ProductVariantDto
        {
            Id = variant.Id,
            Name = variant.Name,
            Sku = variant.Sku,
            Barcode = variant.Barcode,
            RetailPrice = variant.RetailPrice,
            WholesalePrice = variant.WholesalePrice,
            CostPrice = variant.CostPrice,
            BoxRetailPrice = variant.BoxRetailPrice,
            BoxWholesalePrice = variant.BoxWholesalePrice,
            BoxCostPrice = variant.BoxCostPrice,
            ImageUrl = variant.ImageUrl,
            Color = variant.Color,
            Size = variant.Size,
            Weight = variant.Weight,
            Length = variant.Length,
            Height = variant.Height,
            IsActive = variant.IsActive,
            Quantity = dto.Quantity
        });
    }

    /// <summary>
    /// Update a variant
    /// </summary>
    [HttpPut("{productId}/variants/{variantId}")]
    public async Task<IActionResult> UpdateVariant(int productId, int variantId, [FromBody] CreateVariantDto dto)
    {
        var companyId = GetCompanyId();
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId && v.CompanyId == companyId);

        if (variant == null)
            return NotFound(new { message = "Variant not found" });

        variant.Name = dto.Name;
        variant.Sku = dto.Sku;
        variant.Barcode = dto.Barcode;
        variant.RetailPrice = dto.RetailPrice;
        variant.WholesalePrice = dto.WholesalePrice;
        variant.CostPrice = dto.CostPrice;
        variant.BoxRetailPrice = dto.BoxRetailPrice;
        variant.BoxWholesalePrice = dto.BoxWholesalePrice;
        variant.BoxCostPrice = dto.BoxCostPrice;
        variant.ImageUrl = dto.ImageUrl;
        variant.Color = dto.Color;
        variant.Size = dto.Size;
        variant.Weight = dto.Weight;
        variant.Length = dto.Length;
        variant.Height = dto.Height;
        variant.IsActive = dto.IsActive;
        variant.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Variant updated" });
    }

    /// <summary>
    /// Delete a variant
    /// </summary>
    [HttpDelete("{productId}/variants/{variantId}")]
    public async Task<IActionResult> DeleteVariant(int productId, int variantId)
    {
        var companyId = GetCompanyId();
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId && v.CompanyId == companyId);

        if (variant == null)
            return NotFound(new { message = "Variant not found" });

        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Bulk import products from Excel data
    /// </summary>
    [HttpPost("bulk-import")]
    public async Task<ActionResult> BulkImport([FromBody] System.Text.Json.JsonElement body)
    {
        var companyId = GetCompanyId();

        BulkImportDto? dto;
        try
        {
            dto = System.Text.Json.JsonSerializer.Deserialize<BulkImportDto>(body.GetRawText(), new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Invalid JSON format: {ex.Message}" });
        }

        if (dto?.Products == null || dto.Products.Count == 0)
            return BadRequest(new { message = "No products to import" });

        var existingSkus = await _context.Products
            .Where(p => p.CompanyId == companyId)
            .Select(p => p.Sku)
            .ToListAsync();

        var created = 0;
        var skipped = 0;
        var errors = new List<string>();

        foreach (var item in dto.Products)
        {
            var name = item.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                skipped++;
                errors.Add($"Row skipped: missing product name");
                continue;
            }

            // Auto-generate SKU if empty
            var sku = item.Sku?.Trim();
            if (string.IsNullOrWhiteSpace(sku))
                sku = $"SKU-{DateTime.UtcNow:yyyyMMdd}-{created + 1:D4}";

            if (existingSkus.Contains(sku))
            {
                skipped++;
                errors.Add($"SKU '{sku}' already exists, skipped '{name}'");
                continue;
            }

            // Resolve or create category by name
            int? categoryId = null;
            if (!string.IsNullOrWhiteSpace(item.CategoryName))
            {
                var catName = item.CategoryName.Trim();
                var cat = await _context.ProductCategories
                    .FirstOrDefaultAsync(c => c.CompanyId == companyId && c.Name == catName);
                if (cat == null)
                {
                    var maxSort = await _context.ProductCategories
                        .Where(c => c.CompanyId == companyId)
                        .MaxAsync(c => (int?)c.SortOrder) ?? 0;
                    cat = new ProductCategory
                    {
                        CompanyId = companyId,
                        Name = catName,
                        IsActive = true,
                        SortOrder = maxSort + 1,
                        CreatedAt = TimeZoneHelper.Now,
                        UpdatedAt = TimeZoneHelper.Now
                    };
                    _context.ProductCategories.Add(cat);
                    await _context.SaveChangesAsync();
                }
                categoryId = cat.Id;
            }

            var product = new Product
            {
                CompanyId = companyId,
                Sku = sku,
                Barcode = item.Barcode?.Trim(),
                BoxBarcode = item.BoxBarcode?.Trim(),
                Name = name,
                Description = item.Description?.Trim(),
                CategoryId = categoryId,
                BaseUnit = string.IsNullOrWhiteSpace(item.BaseUnit) ? "Piece" : item.BaseUnit.Trim(),
                SecondUnit = item.SecondUnit?.Trim(),
                UnitsPerSecond = item.UnitsPerSecond ?? 1,
                Currency = string.IsNullOrWhiteSpace(item.Currency) ? "USD" : item.Currency.Trim(),
                RetailPrice = item.RetailPrice ?? 0,
                WholesalePrice = item.WholesalePrice ?? 0,
                SuperWholesalePrice = item.SuperWholesalePrice ?? 0,
                CostPrice = item.CostPrice ?? 0,
                BoxRetailPrice = item.BoxRetailPrice ?? 0,
                BoxWholesalePrice = item.BoxWholesalePrice ?? 0,
                BoxSuperWholesalePrice = item.BoxSuperWholesalePrice ?? 0,
                BoxCostPrice = item.BoxCostPrice ?? 0,
                LowStockAlert = item.LowStockAlert > 0 ? item.LowStockAlert.Value : 10,
                LowStockAlertBox = item.LowStockAlertBox > 0 ? item.LowStockAlertBox.Value : 2,
                IsActive = true
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync(); // Save to get product.Id

            // Create initial inventory if stock provided
            if (item.InitialStock.HasValue && item.InitialStock.Value > 0)
            {
                int? warehouseId = null;
                if (!string.IsNullOrWhiteSpace(item.WarehouseName))
                {
                    var whName = item.WarehouseName.Trim();
                    var wh = await _context.Warehouses
                        .FirstOrDefaultAsync(w => w.CompanyId == companyId && w.Name == whName);
                    if (wh == null)
                    {
                        wh = new Warehouse
                        {
                            CompanyId = companyId,
                            Name = whName,
                            IsActive = true,
                            CreatedAt = TimeZoneHelper.Now,
                            UpdatedAt = TimeZoneHelper.Now
                        };
                        _context.Warehouses.Add(wh);
                        await _context.SaveChangesAsync();
                    }
                    warehouseId = wh.Id;
                }

                // Fallback to first warehouse if no name provided
                if (!warehouseId.HasValue)
                {
                    var defaultWh = await _context.Warehouses
                        .Where(w => w.CompanyId == companyId && w.IsActive)
                        .OrderBy(w => w.Id)
                        .FirstOrDefaultAsync();
                    if (defaultWh != null) warehouseId = defaultWh.Id;
                }

                if (warehouseId.HasValue)
                {
                    // Get employee ID if logged in as employee, otherwise null
                    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    int? employeeId = null;
                    if (int.TryParse(userIdClaim, out var parsedId))
                    {
                        var isEmployee = await _context.Employees.AnyAsync(e => e.Id == parsedId && e.CompanyId == companyId);
                        if (isEmployee) employeeId = parsedId;
                    }
                    
                    _context.Inventories.Add(new Inventory
                    {
                        CompanyId = companyId,
                        ProductId = product.Id,
                        WarehouseId = warehouseId.Value,
                        Quantity = item.InitialStock.Value,
                        ReservedQuantity = 0,
                        CreatedAt = TimeZoneHelper.Now,
                        UpdatedAt = TimeZoneHelper.Now
                    });

                    _context.InventoryMovements.Add(new InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = product.Id,
                        WarehouseId = warehouseId.Value,
                        MovementType = "initial_stock",
                        Quantity = item.InitialStock.Value,
                        ReferenceType = "bulk_import",
                        ReferenceId = product.Id,
                        Notes = $"Initial stock from bulk import for {product.Name}",
                        CreatedBy = employeeId,
                        CreatedAt = TimeZoneHelper.Now
                    });

                    product.DefaultWarehouseId = warehouseId.Value;
                }
            }

            existingSkus.Add(sku);
            created++;
        }

        await _context.SaveChangesAsync();

        return Ok(new { created, skipped, errors, message = $"{created} products imported, {skipped} skipped" });
    }

    /// <summary>
    /// Assign category and warehouse to all products that are missing them
    /// </summary>
    [HttpPost("bulk-assign")]
    public async Task<ActionResult> BulkAssign([FromBody] BulkAssignDto dto)
    {
        var companyId = GetCompanyId();
        var assignedCategory = 0;
        var assignedWarehouse = 0;

        var hasSelection = dto.ProductIds != null && dto.ProductIds.Count > 0;

        // Assign category to selected products (or all without category if no selection)
        if (dto.CategoryId.HasValue)
        {
            var cat = await _context.ProductCategories
                .FirstOrDefaultAsync(c => c.Id == dto.CategoryId.Value && c.CompanyId == companyId);
            if (cat != null)
            {
                var query = _context.Products.Where(p => p.CompanyId == companyId);
                if (hasSelection)
                    query = query.Where(p => dto.ProductIds!.Contains(p.Id));
                else
                    query = query.Where(p => p.CategoryId == null);

                var products = await query.ToListAsync();
                foreach (var p in products)
                {
                    p.CategoryId = cat.Id;
                    assignedCategory++;
                }
            }
        }

        // Create inventory records for products not in the specified warehouse
        if (dto.WarehouseId.HasValue)
        {
            var wh = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.Id == dto.WarehouseId.Value && w.CompanyId == companyId);
            if (wh != null)
            {
                var productQuery = _context.Products.Where(p => p.CompanyId == companyId && p.IsActive);
                if (hasSelection)
                    productQuery = productQuery.Where(p => dto.ProductIds!.Contains(p.Id));

                var allProductIds = await productQuery.Select(p => p.Id).ToListAsync();

                var existingProductIds = await _context.Inventories
                    .Where(i => i.WarehouseId == wh.Id && i.CompanyId == companyId)
                    .Select(i => i.ProductId)
                    .ToListAsync();

                var missing = allProductIds.Except(existingProductIds).ToList();
                foreach (var pid in missing)
                {
                    _context.Inventories.Add(new Inventory
                    {
                        CompanyId = companyId,
                        ProductId = pid,
                        WarehouseId = wh.Id,
                        Quantity = 0,
                        ReservedQuantity = 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    assignedWarehouse++;
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { assignedCategory, assignedWarehouse, message = $"{assignedCategory} products assigned to category, {assignedWarehouse} products added to warehouse inventory" });
    }

    /// <summary>
    /// Bulk toggle ShowInOnlineShop for products
    /// </summary>
    [HttpPost("bulk-online-shop")]
    public async Task<ActionResult> BulkOnlineShop([FromBody] BulkOnlineShopDto dto)
    {
        var companyId = GetCompanyId();
        var query = _context.Products.Where(p => p.CompanyId == companyId && p.IsActive);

        if (dto.ProductIds != null && dto.ProductIds.Count > 0)
            query = query.Where(p => dto.ProductIds.Contains(p.Id));

        var count = await query.ExecuteUpdateAsync(s =>
            s.SetProperty(p => p.ShowInOnlineShop, dto.ShowInOnlineShop));

        return Ok(new { updated = count, message = $"{count} products updated" });
    }

    /// <summary>
    /// Get inventory details for a product across all warehouses
    /// </summary>
    [HttpGet("{id}/inventory")]
    public async Task<ActionResult<ProductInventoryDto>> GetProductInventory(int id)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);
        
        if (product == null) return NotFound();

        // Get inventory across all warehouses
        var warehouseInventory = await _context.Inventories
            .Include(i => i.Warehouse)
            .Where(i => i.ProductId == id && i.CompanyId == companyId)
            .Select(i => new WarehouseInventoryDto
            {
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.Name,
                Quantity = i.Quantity,
                ReservedQuantity = i.ReservedQuantity,
                AvailableQuantity = i.Quantity - i.ReservedQuantity,
                LastCountedAt = i.LastCountedAt,
                UpdatedAt = i.UpdatedAt
            })
            .ToListAsync();

        // Get van inventory
        var vanInventory = await _context.VanInventories
            .Include(v => v.Van)
            .Where(v => v.ProductId == id && v.CompanyId == companyId)
            .Select(v => new VanInventoryDto
            {
                VanId = v.VanId,
                VanName = v.Van.Name,
                PlateNumber = v.Van.PlateNumber,
                Quantity = v.Quantity,
                LoadedAt = v.LoadedAt,
                UpdatedAt = v.UpdatedAt
            })
            .ToListAsync();

        var totalWarehouseQty = warehouseInventory.Sum(w => w.Quantity);
        var totalVanQty = vanInventory.Sum(v => v.Quantity);
        var totalReserved = warehouseInventory.Sum(w => w.ReservedQuantity);

        return new ProductInventoryDto
        {
            ProductId = product.Id,
            ProductName = product.Name,
            ProductSku = product.Sku,
            BaseUnit = product.BaseUnit,
            SecondUnit = product.SecondUnit,
            UnitsPerSecond = product.UnitsPerSecond,
            LowStockAlert = product.LowStockAlert,
            TotalQuantity = totalWarehouseQty + totalVanQty,
            TotalWarehouseQuantity = totalWarehouseQty,
            TotalVanQuantity = totalVanQty,
            TotalReservedQuantity = totalReserved,
            TotalAvailableQuantity = totalWarehouseQty - totalReserved,
            WarehouseInventory = warehouseInventory,
            VanInventory = vanInventory,
            IsLowStock = (totalWarehouseQty + totalVanQty) <= product.LowStockAlert
        };
    }

    /// <summary>
    /// Get cost history for a product (from actual purchase invoices)
    /// </summary>
    [HttpGet("{id}/cost-history")]
    public async Task<ActionResult<IEnumerable<CostHistoryDto>>> GetCostHistory(int id)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);
        if (product == null) return NotFound();

        // Get cost history from actual purchase invoice items
        var purchaseHistory = await _context.PurchaseInvoiceItems
            .Include(pii => pii.Invoice)
                .ThenInclude(pi => pi.Supplier)
            .Where(pii => pii.ProductId == id && pii.Invoice.CompanyId == companyId)
            .OrderBy(pii => pii.Invoice.InvoiceDate)
            .Select(pii => new CostHistoryDto
            {
                Id = pii.Id,
                SupplierName = pii.Invoice.Supplier != null ? pii.Invoice.Supplier.Name : "Unknown",
                Cost = pii.UnitPrice,
                RecordedDate = pii.Invoice.InvoiceDate,
                Notes = $"Invoice #{pii.Invoice.InvoiceNumber} - Qty: {pii.Quantity}"
            })
            .ToListAsync();

        // Also get manual cost history entries
        var manualHistory = await _context.ProductCostHistories
            .Where(h => h.ProductId == id && h.CompanyId == companyId)
            .OrderBy(h => h.RecordedDate)
            .Select(h => new CostHistoryDto
            {
                Id = h.Id + 100000, // Offset to avoid ID conflicts
                SupplierName = h.SupplierName ?? "Manual Entry",
                Cost = h.Cost,
                RecordedDate = h.RecordedDate,
                Notes = h.Notes
            })
            .ToListAsync();

        // Combine and sort by date
        var allHistory = purchaseHistory.Concat(manualHistory)
            .OrderBy(h => h.RecordedDate)
            .ToList();

        return allHistory;
    }

    /// <summary>
    /// Add cost history entry for a product
    /// </summary>
    [HttpPost("{id}/cost-history")]
    public async Task<ActionResult<CostHistoryDto>> AddCostHistory(int id, AddCostHistoryDto dto)
    {
        var companyId = GetCompanyId();
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);
        if (product == null) return NotFound();

        var entry = new ProductCostHistory
        {
            CompanyId = companyId,
            ProductId = id,
            SupplierId = dto.SupplierId,
            SupplierName = dto.SupplierName,
            Cost = dto.Cost,
            RecordedDate = dto.RecordedDate ?? TimeZoneHelper.Now,
            Notes = dto.Notes
        };

        _context.ProductCostHistories.Add(entry);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCostHistory), new { id }, new CostHistoryDto
        {
            Id = entry.Id,
            SupplierName = entry.SupplierName ?? "Unknown",
            Cost = entry.Cost,
            RecordedDate = entry.RecordedDate
        });
    }

    /// <summary>
    /// Get inventory valuation across all warehouses
    /// </summary>
    [HttpGet("valuation")]
    public async Task<ActionResult<InventoryValuationDto>> GetInventoryValuation(
        [FromQuery] int? warehouseId,
        [FromQuery] int? categoryId)
    {
        var companyId = GetCompanyId();

        // Get all inventory with product details
        var query = _context.Inventories
            .Include(i => i.Product)
            .ThenInclude(p => p.Category)
            .Include(i => i.Warehouse)
            .Where(i => i.CompanyId == companyId && i.Quantity > 0);

        if (warehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == warehouseId);

        if (categoryId.HasValue)
            query = query.Where(i => i.Product.CategoryId == categoryId);

        var inventoryItems = await query.ToListAsync();

        // Get sales activity (count of task items per product in last 30 days)
        var thirtyDaysAgo = TimeZoneHelper.Now.AddDays(-30);
        var salesActivity = await _context.TaskItems
            .Include(ti => ti.Task)
            .Where(ti => ti.Task.CompanyId == companyId && 
                         ti.Task.CreatedAt >= thirtyDaysAgo &&
                         ti.Task.Status != "Cancelled")
            .GroupBy(ti => ti.ProductId)
            .Select(g => new { ProductId = g.Key, SalesCount = g.Sum(ti => ti.Quantity) })
            .ToDictionaryAsync(x => x.ProductId, x => x.SalesCount);

        var items = inventoryItems.Select(i => new ValuationItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.Product.Name,
            ProductSku = i.Product.Sku,
            CategoryName = i.Product.Category?.Name,
            WarehouseId = i.WarehouseId,
            WarehouseName = i.Warehouse.Name,
            Quantity = i.Quantity,
            UnitCost = i.Product.CostPrice,
            TotalValue = i.Quantity * i.Product.CostPrice,
            RetailPrice = i.Product.RetailPrice,
            TotalRetailValue = i.Quantity * i.Product.RetailPrice,
            SalesActivity = salesActivity.GetValueOrDefault(i.ProductId, 0),
            LastUpdated = i.UpdatedAt
        }).OrderByDescending(i => i.TotalValue).ToList();

        var totalValue = items.Sum(i => i.TotalValue);
        var totalRetailValue = items.Sum(i => i.TotalRetailValue);
        var highestValueItem = items.FirstOrDefault();
        var lowestValueItem = items.LastOrDefault();
        var slowMovingItems = items.Where(i => i.SalesActivity == 0).ToList();

        return new InventoryValuationDto
        {
            TotalInventoryValue = totalValue,
            TotalRetailValue = totalRetailValue,
            PotentialProfit = totalRetailValue - totalValue,
            TotalProducts = items.Count,
            TotalQuantity = items.Sum(i => i.Quantity),
            HighestValueProduct = highestValueItem?.ProductName,
            HighestValueAmount = highestValueItem?.TotalValue ?? 0,
            LowestValueProduct = lowestValueItem?.ProductName,
            LowestValueAmount = lowestValueItem?.TotalValue ?? 0,
            SlowMovingCount = slowMovingItems.Count,
            Items = items
        };
    }
}

public class CostHistoryDto
{
    public int Id { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public DateTime RecordedDate { get; set; }
    public string? Notes { get; set; }
}

public class AddCostHistoryDto
{
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal Cost { get; set; }
    public DateTime? RecordedDate { get; set; }
    public string? Notes { get; set; }
}

public class ProductDto
{
    public int Id { get; set; }
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? ImageUrl { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public string Currency { get; set; } = "USD";
    public int? DefaultWarehouseId { get; set; }
    public string? DefaultWarehouseName { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal SuperWholesalePrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public decimal BoxSuperWholesalePrice { get; set; }
    public decimal BoxCostPrice { get; set; }
    public int LowStockAlert { get; set; }
    public int LowStockAlertBox { get; set; }
    public bool IsActive { get; set; }
    public bool ShowInOnlineShop { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Length { get; set; }
    public decimal? Height { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ProductVariantDto> Variants { get; set; } = new();
}

public class CreateProductDto
{
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public string? ImageUrl { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; } = "Box";
    public int UnitsPerSecond { get; set; } = 1;
    public string Currency { get; set; } = "USD";
    public int? DefaultWarehouseId { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal SuperWholesalePrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public decimal BoxSuperWholesalePrice { get; set; }
    public decimal BoxCostPrice { get; set; }
    public int LowStockAlert { get; set; } = 10;
    public int LowStockAlertBox { get; set; } = 2;
    public bool IsActive { get; set; } = true;
    public bool ShowInOnlineShop { get; set; } = false;
    public string? Color { get; set; }
    public string? Size { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Length { get; set; }
    public decimal? Height { get; set; }
    public decimal InitialQuantity { get; set; } = 0;
    public int? InitialWarehouseId { get; set; }
}

public class UpdateProductDto : CreateProductDto { }

public class ProductInventoryDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public int LowStockAlert { get; set; }
    public decimal TotalQuantity { get; set; }
    public decimal TotalWarehouseQuantity { get; set; }
    public decimal TotalVanQuantity { get; set; }
    public decimal TotalReservedQuantity { get; set; }
    public decimal TotalAvailableQuantity { get; set; }
    public List<WarehouseInventoryDto> WarehouseInventory { get; set; } = new();
    public List<VanInventoryDto> VanInventory { get; set; } = new();
    public bool IsLowStock { get; set; }
}

public class WarehouseInventoryDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal ReservedQuantity { get; set; }
    public decimal AvailableQuantity { get; set; }
    public DateTime? LastCountedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VanInventoryDto
{
    public int VanId { get; set; }
    public string VanName { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public decimal Quantity { get; set; }
    public DateTime LoadedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class InventoryValuationDto
{
    public decimal TotalInventoryValue { get; set; }
    public decimal TotalRetailValue { get; set; }
    public decimal PotentialProfit { get; set; }
    public int TotalProducts { get; set; }
    public decimal TotalQuantity { get; set; }
    public string? HighestValueProduct { get; set; }
    public decimal HighestValueAmount { get; set; }
    public string? LowestValueProduct { get; set; }
    public decimal LowestValueAmount { get; set; }
    public int SlowMovingCount { get; set; }
    public List<ValuationItemDto> Items { get; set; } = new();
}

public class ValuationItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalValue { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal TotalRetailValue { get; set; }
    public int SalesActivity { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class BulkImportDto
{
    public List<BulkImportProductItem> Products { get; set; } = new();
}

public class BulkImportProductItem
{
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? CategoryName { get; set; }
    public string? BaseUnit { get; set; }
    public string? SecondUnit { get; set; }
    public int? UnitsPerSecond { get; set; }
    public string? Currency { get; set; }
    public decimal? RetailPrice { get; set; }
    public decimal? WholesalePrice { get; set; }
    public decimal? SuperWholesalePrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? BoxRetailPrice { get; set; }
    public decimal? BoxWholesalePrice { get; set; }
    public decimal? BoxSuperWholesalePrice { get; set; }
    public decimal? BoxCostPrice { get; set; }
    public int? LowStockAlert { get; set; }
    public int? LowStockAlertBox { get; set; }
    public decimal? InitialStock { get; set; }
    public string? WarehouseName { get; set; }
}

public class BulkAssignDto
{
    public int? CategoryId { get; set; }
    public int? WarehouseId { get; set; }
    public List<int>? ProductIds { get; set; }
}

public class BulkOnlineShopDto
{
    public bool ShowInOnlineShop { get; set; }
    public List<int>? ProductIds { get; set; }
}

public class StockAdjustmentDto
{
    public int ProductId { get; set; }
    public int WarehouseId { get; set; }
    public int? VariantId { get; set; }
    public string AdjustmentType { get; set; } = "set"; // set, add, subtract
    public decimal BaseUnitQuantity { get; set; }
    public decimal? SecondUnitQuantity { get; set; }
    public string? Reason { get; set; }
    public bool CreatePurchaseInvoice { get; set; } = false;
}

public class ProductVariantDto
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
    public bool IsActive { get; set; }
    public decimal Quantity { get; set; } = 0;
}

public class CreateVariantDto
{
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
    public bool IsActive { get; set; } = true;
}

public class StockAdjustmentHistoryDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? Notes { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
