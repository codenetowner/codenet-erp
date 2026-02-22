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
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public SuppliersController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    #region Suppliers

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetSuppliers(
        [FromQuery] string? search,
        [FromQuery] bool? isActive)
    {
        var companyId = GetCompanyId();
        var query = _context.Suppliers.Where(s => s.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s => s.Name.ToLower().Contains(search.ToLower()) || (s.CompanyName != null && s.CompanyName.ToLower().Contains(search.ToLower())));

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive);

        var suppliers = await query.OrderBy(s => s.Name)
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                CompanyName = s.CompanyName,
                Phone = s.Phone,
                Email = s.Email,
                City = s.City,
                Country = s.Country,
                PaymentTerms = s.PaymentTerms,
                CreditLimit = s.CreditLimit,
                Balance = s.Balance,
                Notes = s.Notes,
                IsActive = s.IsActive,
                IsManufacturer = s.IsManufacturer
            })
            .ToListAsync();

        return suppliers;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SupplierDto>> GetSupplier(int id)
    {
        var companyId = GetCompanyId();
        var s = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);
        if (s == null) return NotFound();

        return new SupplierDto
        {
            Id = s.Id,
            Name = s.Name,
            CompanyName = s.CompanyName,
            Phone = s.Phone,
            Email = s.Email,
            City = s.City,
            Country = s.Country,
            PaymentTerms = s.PaymentTerms,
            CreditLimit = s.CreditLimit,
            Balance = s.Balance,
            Notes = s.Notes,
            IsActive = s.IsActive,
            IsManufacturer = s.IsManufacturer
        };
    }

    [HttpPost]
    public async Task<ActionResult<SupplierDto>> CreateSupplier(CreateSupplierDto dto)
    {
        var companyId = GetCompanyId();

        var supplier = new Supplier
        {
            CompanyId = companyId,
            Name = dto.Name,
            CompanyName = dto.CompanyName,
            Phone = dto.Phone,
            Email = dto.Email,
            City = dto.City,
            Country = dto.Country,
            PaymentTerms = dto.PaymentTerms,
            CreditLimit = dto.CreditLimit,
            Balance = dto.Balance,
            CreditBalance = dto.CreditBalance,
            Notes = dto.Notes,
            IsActive = dto.IsActive,
            IsManufacturer = dto.IsManufacturer
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSupplier), new { id = supplier.Id }, new SupplierDto { Id = supplier.Id, Name = supplier.Name });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSupplier(int id, UpdateSupplierDto dto)
    {
        var companyId = GetCompanyId();
        var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);
        if (supplier == null) return NotFound();

        supplier.Name = dto.Name;
        supplier.CompanyName = dto.CompanyName;
        supplier.Phone = dto.Phone;
        supplier.Email = dto.Email;
        supplier.City = dto.City;
        supplier.Country = dto.Country;
        supplier.PaymentTerms = dto.PaymentTerms;
        supplier.CreditLimit = dto.CreditLimit;
        supplier.Balance = dto.Balance;
        supplier.CreditBalance = dto.CreditBalance;
        supplier.Notes = dto.Notes;
        supplier.IsActive = dto.IsActive;
        supplier.IsManufacturer = dto.IsManufacturer;
        supplier.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupplier(int id)
    {
        var companyId = GetCompanyId();
        var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);
        if (supplier == null) return NotFound();

        var hasInvoices = await _context.PurchaseInvoices.AnyAsync(i => i.SupplierId == id);
        if (hasInvoices)
            return BadRequest(new { message = "Cannot delete supplier with invoices" });

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Purchase Invoices

    [HttpGet("invoices")]
    public async Task<ActionResult<IEnumerable<PurchaseInvoiceDto>>> GetInvoices(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? supplierId,
        [FromQuery] string? paymentStatus)
    {
        var companyId = GetCompanyId();
        var query = _context.PurchaseInvoices
            .Include(i => i.Supplier)
            .Where(i => i.CompanyId == companyId);

        if (startDate.HasValue) query = query.Where(i => i.InvoiceDate.Date >= startDate.Value.Date);
        if (endDate.HasValue) query = query.Where(i => i.InvoiceDate.Date <= endDate.Value.Date);
        if (supplierId.HasValue) query = query.Where(i => i.SupplierId == supplierId);
        if (!string.IsNullOrEmpty(paymentStatus)) query = query.Where(i => i.PaymentStatus == paymentStatus);

        var invoices = await query.OrderByDescending(i => i.InvoiceDate)
            .Select(i => new PurchaseInvoiceDto
            {
                Id = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                InvoiceDate = i.InvoiceDate,
                DueDate = i.DueDate,
                SupplierId = i.SupplierId,
                SupplierName = i.Supplier != null ? i.Supplier.Name : "Unknown",
                Total = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                PaymentStatus = i.PaymentStatus,
                Reference = i.Reference
            })
            .ToListAsync();

        return Ok(invoices);
    }

    [HttpGet("invoices/{id}")]
    public async Task<ActionResult<PurchaseInvoiceDetailDto>> GetInvoice(int id)
    {
        var companyId = GetCompanyId();
        var invoice = await _context.PurchaseInvoices
            .Include(i => i.Supplier)
            .Include(i => i.Items)
                .ThenInclude(item => item.Product)
            .Include(i => i.Items)
                .ThenInclude(item => item.Warehouse)
            .FirstOrDefaultAsync(i => i.Id == id && i.CompanyId == companyId);

        if (invoice == null) return NotFound();

        return new PurchaseInvoiceDetailDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            SupplierId = invoice.SupplierId,
            SupplierName = invoice.Supplier.Name,
            Subtotal = invoice.Subtotal,
            DiscountAmount = invoice.DiscountAmount,
            TaxAmount = invoice.TaxAmount,
            ShippingAmount = invoice.ShippingAmount,
            TotalAmount = invoice.TotalAmount,
            PaidAmount = invoice.PaidAmount,
            PaymentStatus = invoice.PaymentStatus,
            Reference = invoice.Reference,
            Notes = invoice.Notes,
            CreatedAt = invoice.CreatedAt,
            Items = invoice.Items.Select(item => new PurchaseInvoiceItemDto
            {
                Id = item.Id,
                ProductId = item.ProductId,
                ProductName = item.Product.Name,
                ProductSku = item.Product.Sku,
                WarehouseId = item.WarehouseId,
                WarehouseName = item.Warehouse?.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                TaxAmount = item.TaxAmount,
                LineTotal = item.LineTotal
            }).ToList()
        };
    }

    [HttpPost("invoices")]
    public async Task<ActionResult<PurchaseInvoiceDto>> CreateInvoice(CreatePurchaseInvoiceDto dto)
    {
        var companyId = GetCompanyId();

        // Generate invoice number
        var count = await _context.PurchaseInvoices.CountAsync(i => i.CompanyId == companyId);
        var invoiceNumber = $"PI-{TimeZoneHelper.Now:yyyy}-{(count + 1).ToString().PadLeft(4, '0')}";

        var invoice = new PurchaseInvoice
        {
            CompanyId = companyId,
            SupplierId = dto.SupplierId,
            InvoiceNumber = invoiceNumber,
            InvoiceDate = dto.InvoiceDate,
            DueDate = dto.DueDate,
            ShippingAmount = dto.ShippingCost,
            Reference = dto.Reference,
            Notes = dto.Notes,
            PaymentStatus = "unpaid"
        };

        decimal subtotal = 0;
        decimal totalDiscount = 0;
        decimal totalTax = 0;

        foreach (var item in dto.Items)
        {
            var discountAmt = item.Quantity * item.UnitPrice * (item.DiscountPercent / 100);
            var afterDiscount = item.Quantity * item.UnitPrice - discountAmt;
            var taxAmt = afterDiscount * (item.TaxPercent / 100);
            var itemTotal = afterDiscount + taxAmt;
            
            subtotal += item.Quantity * item.UnitPrice;
            totalDiscount += discountAmt;
            totalTax += taxAmt;

            invoice.Items.Add(new PurchaseInvoiceItem
            {
                ProductId = item.ProductId,
                WarehouseId = item.WarehouseId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = discountAmt,
                TaxAmount = taxAmt,
                LineTotal = itemTotal
            });
        }

        invoice.Subtotal = subtotal;
        invoice.DiscountAmount = totalDiscount;
        invoice.TaxAmount = totalTax;
        invoice.TotalAmount = subtotal - totalDiscount + totalTax + dto.ShippingCost + dto.OtherCharges;

        // Update supplier balance and apply credit if requested
        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId);
        if (supplier != null)
        {
            if (dto.UseCredit && supplier.CreditBalance > 0)
            {
                // Use supplier's credit balance to pay the invoice
                var creditToUse = Math.Min(supplier.CreditBalance, invoice.TotalAmount);
                invoice.PaidAmount = creditToUse;
                supplier.CreditBalance -= creditToUse;
                
                if (creditToUse >= invoice.TotalAmount)
                {
                    invoice.PaymentStatus = "paid";
                }
                else
                {
                    invoice.PaymentStatus = "partial";
                    supplier.Balance += (invoice.TotalAmount - creditToUse); // Only add remaining to balance
                }
            }
            else
            {
                supplier.Balance += invoice.TotalAmount;
            }
        }

        _context.PurchaseInvoices.Add(invoice);

        // Update inventory for each item
        foreach (var item in dto.Items)
        {
            if (item.WarehouseId.HasValue)
            {
                var inventory = await _context.Inventories
                    .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.WarehouseId == item.WarehouseId);

                if (inventory != null)
                {
                    // Add to existing inventory
                    inventory.Quantity += item.Quantity;
                    inventory.UpdatedAt = TimeZoneHelper.Now;
                }
                else
                {
                    // Create new inventory record
                    _context.Inventories.Add(new Inventory
                    {
                        CompanyId = companyId,
                        ProductId = item.ProductId,
                        WarehouseId = item.WarehouseId.Value,
                        Quantity = item.Quantity,
                        ReservedQuantity = 0
                    });
                }

                // Log the inventory movement
                _context.InventoryMovements.Add(new InventoryMovement
                {
                    CompanyId = companyId,
                    ProductId = item.ProductId,
                    WarehouseId = item.WarehouseId,
                    MovementType = "purchase",
                    Quantity = item.Quantity,
                    UnitCost = item.UnitPrice,
                    ReferenceType = "purchase_invoice",
                    ReferenceId = invoice.Id,
                    Notes = $"Purchase Invoice: {invoice.InvoiceNumber}"
                });
            }
        }

        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostSupplierInvoiceEntry(companyId, invoice.Id, invoice.TotalAmount, invoice.InvoiceDate);

        return CreatedAtAction(nameof(GetInvoices), new { }, new PurchaseInvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Total = invoice.TotalAmount
        });
    }

    #endregion

    #region Purchase Orders

    [HttpGet("purchase-orders")]
    public async Task<ActionResult<IEnumerable<PurchaseOrderDto>>> GetPurchaseOrders(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? supplierId,
        [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.PurchaseOrders
            .Include(po => po.Supplier)
            .Where(po => po.CompanyId == companyId);

        if (startDate.HasValue) query = query.Where(po => po.PoDate.Date >= startDate.Value.Date);
        if (endDate.HasValue) query = query.Where(po => po.PoDate.Date <= endDate.Value.Date);
        if (supplierId.HasValue) query = query.Where(po => po.SupplierId == supplierId);
        if (!string.IsNullOrEmpty(status)) query = query.Where(po => po.Status == status);

        var orders = await query.OrderByDescending(po => po.PoDate)
            .Select(po => new PurchaseOrderDto
            {
                Id = po.Id,
                PoNumber = po.PoNumber,
                PoDate = po.PoDate,
                ExpectedDate = po.ExpectedDate,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier != null ? po.Supplier.Name : "Unknown",
                Total = po.TotalAmount,
                Status = po.Status,
                SentAt = po.SentAt
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("purchase-orders/{id}")]
    public async Task<ActionResult<PurchaseOrderDetailDto>> GetPurchaseOrder(int id)
    {
        var companyId = GetCompanyId();
        var po = await _context.PurchaseOrders
            .Include(p => p.Supplier)
            .Include(p => p.Items)
                .ThenInclude(item => item.Product)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (po == null) return NotFound();

        return new PurchaseOrderDetailDto
        {
            Id = po.Id,
            PoNumber = po.PoNumber,
            PoDate = po.PoDate,
            ExpectedDate = po.ExpectedDate,
            SupplierId = po.SupplierId,
            SupplierName = po.Supplier.Name,
            SupplierEmail = po.Supplier.Email,
            Subtotal = po.Subtotal,
            DiscountAmount = po.DiscountAmount,
            TaxAmount = po.TaxAmount,
            ShippingAmount = po.ShippingAmount,
            TotalAmount = po.TotalAmount,
            Status = po.Status,
            Reference = po.Reference,
            Notes = po.Notes,
            SentAt = po.SentAt,
            ConfirmedAt = po.ConfirmedAt,
            ReceivedAt = po.ReceivedAt,
            CreatedAt = po.CreatedAt,
            Items = po.Items.Select(item => new PurchaseOrderItemDto
            {
                Id = item.Id,
                ProductId = item.ProductId,
                ProductName = item.Product.Name,
                ProductSku = item.Product.Sku,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                TaxAmount = item.TaxAmount,
                LineTotal = item.LineTotal
            }).ToList()
        };
    }

    [HttpPost("purchase-orders")]
    public async Task<ActionResult<PurchaseOrderDto>> CreatePurchaseOrder(CreatePurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();

        // Generate PO number
        var count = await _context.PurchaseOrders.CountAsync(po => po.CompanyId == companyId);
        var poNumber = $"PO-{TimeZoneHelper.Now:yyyy}-{(count + 1).ToString().PadLeft(4, '0')}";

        var po = new PurchaseOrder
        {
            CompanyId = companyId,
            SupplierId = dto.SupplierId,
            PoNumber = poNumber,
            PoDate = dto.PoDate,
            ExpectedDate = dto.ExpectedDate,
            ShippingAmount = dto.ShippingCost,
            Reference = dto.Reference,
            Notes = dto.Notes,
            Status = "draft"
        };

        decimal subtotal = 0;
        decimal totalDiscount = 0;
        decimal totalTax = 0;

        foreach (var item in dto.Items)
        {
            var discountAmt = item.Quantity * item.UnitPrice * (item.DiscountPercent / 100);
            var afterDiscount = item.Quantity * item.UnitPrice - discountAmt;
            var taxAmt = afterDiscount * (item.TaxPercent / 100);
            var itemTotal = afterDiscount + taxAmt;
            
            subtotal += item.Quantity * item.UnitPrice;
            totalDiscount += discountAmt;
            totalTax += taxAmt;

            po.Items.Add(new PurchaseOrderItem
            {
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = discountAmt,
                TaxAmount = taxAmt,
                LineTotal = itemTotal
            });
        }

        po.Subtotal = subtotal;
        po.DiscountAmount = totalDiscount;
        po.TaxAmount = totalTax;
        po.TotalAmount = subtotal - totalDiscount + totalTax + dto.ShippingCost + dto.OtherCharges;

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPurchaseOrders), new { }, new PurchaseOrderDto
        {
            Id = po.Id,
            PoNumber = po.PoNumber,
            Total = po.TotalAmount,
            Status = po.Status
        });
    }

    [HttpPut("purchase-orders/{id}/status")]
    public async Task<IActionResult> UpdatePurchaseOrderStatus(int id, [FromBody] UpdatePoStatusDto dto)
    {
        var companyId = GetCompanyId();
        var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);
        if (po == null) return NotFound();

        po.Status = dto.Status;
        po.UpdatedAt = TimeZoneHelper.Now;

        if (dto.Status == "sent") po.SentAt = TimeZoneHelper.Now;
        else if (dto.Status == "confirmed") po.ConfirmedAt = TimeZoneHelper.Now;
        else if (dto.Status == "received") po.ReceivedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("purchase-orders/{id}")]
    public async Task<IActionResult> DeletePurchaseOrder(int id)
    {
        var companyId = GetCompanyId();
        var po = await _context.PurchaseOrders
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);
        
        if (po == null) return NotFound();

        if (po.Status != "draft")
            return BadRequest(new { message = "Only draft purchase orders can be deleted" });

        _context.PurchaseOrderItems.RemoveRange(po.Items);
        _context.PurchaseOrders.Remove(po);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Payments

    [HttpGet("payments")]
    public async Task<ActionResult<IEnumerable<SupplierPaymentDto>>> GetPayments(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? supplierId,
        [FromQuery] string? method)
    {
        var companyId = GetCompanyId();
        
        // Get suppliers for name lookup
        var suppliers = await _context.Suppliers
            .Where(s => s.CompanyId == companyId)
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        var query = _context.SupplierPayments
            .Where(p => p.CompanyId == companyId);

        if (startDate.HasValue) query = query.Where(p => p.PaymentDate.Date >= startDate.Value.Date);
        if (endDate.HasValue) query = query.Where(p => p.PaymentDate.Date <= endDate.Value.Date);
        if (supplierId.HasValue) query = query.Where(p => p.SupplierId == supplierId);
        if (!string.IsNullOrEmpty(method)) query = query.Where(p => p.Method == method);

        var rawPayments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();

        var payments = rawPayments.Select(p => new SupplierPaymentDto
        {
            Id = p.Id,
            PaymentNumber = p.PaymentNumber,
            PaymentDate = p.PaymentDate,
            SupplierId = p.SupplierId,
            SupplierName = suppliers.TryGetValue(p.SupplierId, out var name) ? name : "Unknown",
            Method = p.Method,
            Amount = p.Amount,
            Reference = p.Reference,
            Notes = p.Notes
        }).ToList();

        return payments;
    }

    [HttpPost("payments")]
    public async Task<ActionResult<SupplierPaymentDto>> CreatePayment(CreateSupplierPaymentDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0)
            return BadRequest(new { message = "Invalid company ID" });

        // Validate supplier
        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId);
        if (supplier == null || supplier.CompanyId != companyId)
            return BadRequest(new { message = "Supplier not found" });

        // Generate payment number
        var count = await _context.SupplierPayments.CountAsync(p => p.CompanyId == companyId);
        var paymentNumber = $"PAY-{TimeZoneHelper.Now:yyyy}-{(count + 1).ToString().PadLeft(3, '0')}";

        var payment = new SupplierPayment
        {
            CompanyId = companyId,
            SupplierId = dto.SupplierId,
            PaymentNumber = paymentNumber,
            PaymentDate = dto.PaymentDate,
            Method = dto.Method ?? "Cash",
            Amount = dto.Amount,
            Reference = dto.Reference,
            Notes = dto.Notes
        };

        // Update invoice if linked
        if (dto.InvoiceId.HasValue)
        {
            var invoice = await _context.PurchaseInvoices.FindAsync(dto.InvoiceId.Value);
            if (invoice != null && invoice.CompanyId == companyId)
            {
                payment.InvoiceId = dto.InvoiceId.Value;
                
                // Calculate remaining on invoice
                var invoiceRemaining = invoice.TotalAmount - invoice.PaidAmount;
                
                if (dto.Amount > invoiceRemaining && invoiceRemaining > 0)
                {
                    // Overpayment: pay what's remaining, put excess in supplier credit
                    var excessAmount = dto.Amount - invoiceRemaining;
                    invoice.PaidAmount = invoice.TotalAmount; // Cap at total
                    invoice.PaymentStatus = "paid";
                    supplier.Balance -= invoiceRemaining; // Only reduce balance by invoice remaining
                    supplier.CreditBalance += excessAmount; // Add excess to supplier credit
                }
                else if (invoiceRemaining <= 0)
                {
                    // Invoice already fully paid, entire amount goes to credit
                    supplier.CreditBalance += dto.Amount;
                }
                else
                {
                    // Normal payment (not exceeding remaining)
                    invoice.PaidAmount += dto.Amount;
                    supplier.Balance -= dto.Amount; // Reduce balance by payment amount
                    if (invoice.PaidAmount >= invoice.TotalAmount)
                        invoice.PaymentStatus = "paid";
                    else if (invoice.PaidAmount > 0)
                        invoice.PaymentStatus = "partial";
                }
            }
        }
        else
        {
            // Payment without invoice - reduce supplier balance or add to credit
            if (supplier.Balance >= dto.Amount)
            {
                supplier.Balance -= dto.Amount;
            }
            else
            {
                // Payment exceeds what we owe - excess goes to credit
                var excessAmount = dto.Amount - supplier.Balance;
                supplier.CreditBalance += excessAmount;
                supplier.Balance = 0;
            }
        }

        // Ensure balance never goes negative - move to creditBalance
        if (supplier.Balance < 0)
        {
            supplier.CreditBalance += Math.Abs(supplier.Balance);
            supplier.Balance = 0;
        }

        _context.SupplierPayments.Add(payment);
        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostSupplierPaymentEntry(companyId, payment.Id, payment.Amount, payment.PaymentDate);

        return Ok(new SupplierPaymentDto
        {
            Id = payment.Id,
            PaymentNumber = payment.PaymentNumber,
            Amount = payment.Amount
        });
    }

    [HttpPut("payments/{id}")]
    public async Task<ActionResult> UpdatePayment(int id, UpdateSupplierPaymentDto dto)
    {
        var companyId = GetCompanyId();
        var payment = await _context.SupplierPayments
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (payment == null)
            return NotFound();

        var oldAmount = payment.Amount;
        var amountDifference = dto.Amount - oldAmount;

        // Update supplier balance
        var supplier = await _context.Suppliers.FindAsync(payment.SupplierId);
        if (supplier != null)
            supplier.Balance -= amountDifference;

        // Update invoice paid amount if linked
        if (payment.InvoiceId.HasValue)
        {
            var invoice = await _context.PurchaseInvoices.FindAsync(payment.InvoiceId.Value);
            if (invoice != null && invoice.CompanyId == companyId)
            {
                invoice.PaidAmount += amountDifference;
                // Update payment status
                if (invoice.PaidAmount >= invoice.TotalAmount)
                    invoice.PaymentStatus = "paid";
                else if (invoice.PaidAmount > 0)
                    invoice.PaymentStatus = "partial";
                else
                    invoice.PaymentStatus = "unpaid";
            }
        }
        
        payment.PaymentDate = dto.PaymentDate;
        payment.Method = dto.Method;
        payment.Amount = dto.Amount;
        payment.Reference = dto.Reference;
        payment.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("payments/{id}")]
    public async Task<ActionResult> DeletePayment(int id)
    {
        var companyId = GetCompanyId();
        var payment = await _context.SupplierPayments
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (payment == null)
            return NotFound();

        // Restore supplier balance
        var supplier = await _context.Suppliers.FindAsync(payment.SupplierId);
        if (supplier != null)
            supplier.Balance += payment.Amount;

        // Update invoice paid amount if linked
        if (payment.InvoiceId.HasValue)
        {
            var invoice = await _context.PurchaseInvoices.FindAsync(payment.InvoiceId.Value);
            if (invoice != null && invoice.CompanyId == companyId)
            {
                invoice.PaidAmount -= payment.Amount;
                // Update payment status
                if (invoice.PaidAmount <= 0)
                {
                    invoice.PaidAmount = 0;
                    invoice.PaymentStatus = "unpaid";
                }
                else if (invoice.PaidAmount >= invoice.TotalAmount)
                    invoice.PaymentStatus = "paid";
                else
                    invoice.PaymentStatus = "partial";
            }
        }

        _context.SupplierPayments.Remove(payment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Recalculate payment status for all invoices based on paid amounts
    /// </summary>
    [HttpPost("invoices/recalculate-status")]
    public async Task<ActionResult> RecalculateInvoiceStatuses()
    {
        var companyId = GetCompanyId();
        var invoices = await _context.PurchaseInvoices
            .Where(i => i.CompanyId == companyId)
            .ToListAsync();

        int updated = 0;
        foreach (var invoice in invoices)
        {
            string newStatus;
            if (invoice.PaidAmount >= invoice.TotalAmount)
                newStatus = "paid";
            else if (invoice.PaidAmount > 0)
                newStatus = "partial";
            else
                newStatus = "unpaid";

            if (invoice.PaymentStatus != newStatus)
            {
                invoice.PaymentStatus = newStatus;
                updated++;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Updated {updated} invoice(s)" });
    }

    #endregion
}

#region DTOs

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? PaymentTerms { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal Balance { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public bool IsManufacturer { get; set; }
}

public class CreateSupplierDto
{
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? PaymentTerms { get; set; }
    public decimal CreditLimit { get; set; } = 0;
    public decimal Balance { get; set; } = 0;
    public decimal CreditBalance { get; set; } = 0;
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsManufacturer { get; set; } = false;
}

public class UpdateSupplierDto : CreateSupplierDto { }

public class PurchaseInvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal Total { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string? Reference { get; set; }
}

public class CreatePurchaseInvoiceDto
{
    public int SupplierId { get; set; }
    public DateTime InvoiceDate { get; set; } = TimeZoneHelper.Now;
    public DateTime? DueDate { get; set; }
    public decimal ShippingCost { get; set; } = 0;
    public decimal OtherCharges { get; set; } = 0;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool UseCredit { get; set; } = false;
    public List<CreatePurchaseInvoiceItemDto> Items { get; set; } = new();
}

public class CreatePurchaseInvoiceItemDto
{
    public int ProductId { get; set; }
    public int? WarehouseId { get; set; }
    public string UnitType { get; set; } = "Piece";
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
    public decimal TaxPercent { get; set; } = 0;
}

public class SupplierPaymentDto
{
    public int Id { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public DateTime PaymentDate { get; set; }
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}

public class CreateSupplierPaymentDto
{
    public int SupplierId { get; set; }
    public int? InvoiceId { get; set; }
    public DateTime PaymentDate { get; set; } = TimeZoneHelper.Now;
    public string Method { get; set; } = "Cash";
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}

public class UpdateSupplierPaymentDto
{
    public DateTime PaymentDate { get; set; }
    public string Method { get; set; } = "Cash";
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}

public class PurchaseInvoiceDetailDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ShippingAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PurchaseInvoiceItemDto> Items { get; set; } = new();
}

public class PurchaseInvoiceItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string PoNumber { get; set; } = string.Empty;
    public DateTime PoDate { get; set; }
    public DateTime? ExpectedDate { get; set; }
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? SentAt { get; set; }
}

public class CreatePurchaseOrderDto
{
    public int SupplierId { get; set; }
    public DateTime PoDate { get; set; } = TimeZoneHelper.Now;
    public DateTime? ExpectedDate { get; set; }
    public decimal ShippingCost { get; set; } = 0;
    public decimal OtherCharges { get; set; } = 0;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public List<CreatePurchaseOrderItemDto> Items { get; set; } = new();
}

public class CreatePurchaseOrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
    public decimal TaxPercent { get; set; } = 0;
}

public class PurchaseOrderDetailDto
{
    public int Id { get; set; }
    public string PoNumber { get; set; } = string.Empty;
    public DateTime PoDate { get; set; }
    public DateTime? ExpectedDate { get; set; }
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? SupplierEmail { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ShippingAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PurchaseOrderItemDto> Items { get; set; } = new();
}

public class PurchaseOrderItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
}

public class UpdatePoStatusDto
{
    public string Status { get; set; } = string.Empty;
}

#endregion
