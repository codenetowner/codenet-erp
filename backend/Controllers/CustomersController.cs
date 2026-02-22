using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using ClosedXML.Excel;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomersController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? customerType,
        [FromQuery] int? warehouseId,
        [FromQuery] int? driverId)
    {
        var companyId = GetCompanyId();
        var query = _context.Customers
            .Include(c => c.Warehouse)
            .Include(c => c.Supplier)
            .Where(c => c.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()) || 
                                     (c.ShopName != null && c.ShopName.ToLower().Contains(search.ToLower())) ||
                                     (c.Phone != null && c.Phone.Contains(search)));

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        if (!string.IsNullOrEmpty(customerType))
            query = query.Where(c => c.CustomerType == customerType);

        if (warehouseId.HasValue)
            query = query.Where(c => c.WarehouseId == warehouseId);

        if (driverId.HasValue)
            query = query.Where(c => c.AssignedDriverId == driverId);

        var customers = await query.OrderBy(c => c.Name)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                ShopName = c.ShopName,
                Phone = c.Phone,
                Email = c.Email,
                Address = c.Address,
                LocationLat = c.LocationLat,
                LocationLng = c.LocationLng,
                LocationUrl = c.LocationUrl,
                CustomerType = c.CustomerType,
                WarehouseId = c.WarehouseId,
                WarehouseName = c.Warehouse != null ? c.Warehouse.Name : null,
                CreditLimit = c.CreditLimit,
                CreditBalance = c.CreditBalance,
                DebtBalance = c.DebtBalance,
                Notes = c.Notes,
                Status = c.Status,
                SupplierId = c.SupplierId,
                SupplierName = c.Supplier != null ? c.Supplier.Name : null
            })
            .ToListAsync();

        return customers;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Customer>> GetCustomer(int id)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        return customer;
    }

    [HttpPost]
    public async Task<ActionResult<Customer>> CreateCustomer(CreateCustomerDto dto)
    {
        var companyId = GetCompanyId();
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        var customer = new Customer
        {
            CompanyId = companyId,
            Code = dto.Code,
            Name = dto.Name,
            ShopName = dto.ShopName,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            LocationLat = dto.LocationLat,
            LocationLng = dto.LocationLng,
            LocationUrl = dto.LocationUrl,
            CustomerType = dto.CustomerType ?? "Retail",
            WarehouseId = dto.WarehouseId,
            CreditLimit = dto.CreditLimit,
            CreditBalance = dto.CreditBalance,
            DebtBalance = dto.DebtBalance,
            AssignedDriverId = dto.AssignedDriverId,
            VisitFrequency = dto.VisitFrequency ?? "weekly",
            PreferredVisitDay = dto.PreferredVisitDay,
            Notes = dto.Notes,
            Status = dto.Status ?? "active",
            SupplierId = dto.SupplierId,
            CreatedBy = userId
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new CustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            ShopName = customer.ShopName,
            Phone = customer.Phone,
            CustomerType = customer.CustomerType,
            Status = customer.Status
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(int id, UpdateCustomerDto dto)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        customer.Code = dto.Code;
        customer.Name = dto.Name;
        customer.ShopName = dto.ShopName;
        customer.Phone = dto.Phone;
        customer.Email = dto.Email;
        customer.Address = dto.Address;
        customer.LocationLat = dto.LocationLat;
        customer.LocationLng = dto.LocationLng;
        customer.LocationUrl = dto.LocationUrl;
        customer.CustomerType = dto.CustomerType ?? customer.CustomerType;
        customer.WarehouseId = dto.WarehouseId;
        customer.CreditLimit = dto.CreditLimit;
        customer.CreditBalance = dto.CreditBalance;
        customer.DebtBalance = dto.DebtBalance;
        customer.AssignedDriverId = dto.AssignedDriverId;
        customer.VisitFrequency = dto.VisitFrequency ?? customer.VisitFrequency;
        customer.PreferredVisitDay = dto.PreferredVisitDay;
        customer.Notes = dto.Notes;
        customer.Status = dto.Status ?? customer.Status;
        customer.SupplierId = dto.SupplierId;
        customer.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/balance")]
    public async Task<ActionResult<object>> GetCustomerBalance(int id)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        return new
        {
            customer.Id,
            customer.Name,
            customer.DebtBalance,
            customer.CreditLimit,
            OverLimit = customer.DebtBalance > customer.CreditLimit
        };
    }

    [HttpGet("{id}/supplier-report")]
    public async Task<ActionResult<object>> GetSupplierReport(int id)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .Include(c => c.Supplier)
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        if (customer.SupplierId == null)
            return Ok(new { hasSupplier = false });

        var supplier = customer.Supplier!;
        
        var invoices = await _context.Set<PurchaseInvoice>()
            .Where(i => i.SupplierId == supplier.Id && i.CompanyId == companyId)
            .OrderByDescending(i => i.InvoiceDate)
            .Select(i => new {
                i.Id,
                i.InvoiceNumber,
                i.InvoiceDate,
                i.TotalAmount,
                i.PaidAmount,
                i.PaymentStatus
            })
            .ToListAsync();

        var payments = await _context.Set<SupplierPayment>()
            .Where(p => p.SupplierId == supplier.Id && p.CompanyId == companyId)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new {
                p.Id,
                p.PaymentNumber,
                p.PaymentDate,
                p.Amount,
                p.Method,
                p.Notes
            })
            .ToListAsync();

        return Ok(new {
            hasSupplier = true,
            supplier = new {
                supplier.Id,
                supplier.Name,
                supplier.CompanyName,
                supplier.Phone,
                supplier.Balance
            },
            invoices,
            payments,
            totalInvoices = invoices.Sum(i => i.TotalAmount),
            totalPaid = payments.Sum(p => p.Amount)
        });
    }

    // ============ SPECIAL PRICING ============

    [HttpGet("{id}/special-prices")]
    public async Task<ActionResult<IEnumerable<SpecialPriceDto>>> GetSpecialPrices(int id)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound();

        var prices = await _context.CustomerSpecialPrices
            .Include(sp => sp.Product)
            .Where(sp => sp.CustomerId == id && sp.CompanyId == companyId)
            .OrderBy(sp => sp.Product!.Name)
            .Select(sp => new SpecialPriceDto
            {
                Id = sp.Id,
                ProductId = sp.ProductId,
                ProductName = sp.Product!.Name,
                ProductSku = sp.Product.Sku,
                UnitType = sp.UnitType,
                RegularPrice = sp.UnitType == "box" ? sp.Product.BoxRetailPrice : sp.Product.RetailPrice,
                CostPrice = sp.UnitType == "box" ? sp.Product.BoxCostPrice : sp.Product.CostPrice,
                SpecialPrice = sp.SpecialPrice,
                StartDate = sp.StartDate,
                EndDate = sp.EndDate,
                IsActive = sp.IsActive
            })
            .ToListAsync();

        return prices;
    }

    [HttpPost("{id}/special-prices")]
    public async Task<ActionResult<SpecialPriceDto>> AddSpecialPrice(int id, CreateSpecialPriceDto dto)
    {
        var companyId = GetCompanyId();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null)
            return NotFound("Customer not found");

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId && p.CompanyId == companyId);

        if (product == null)
            return NotFound("Product not found");

        // Check if special price already exists for this customer-product-unit
        var unitType = dto.UnitType ?? "piece";
        var existing = await _context.CustomerSpecialPrices
            .FirstOrDefaultAsync(sp => sp.CustomerId == id && sp.ProductId == dto.ProductId && sp.UnitType == unitType);

        if (existing != null)
            return BadRequest($"Special price already exists for this product ({unitType}). Update or delete it first.");

        var specialPrice = new CustomerSpecialPrice
        {
            CompanyId = companyId,
            CustomerId = id,
            ProductId = dto.ProductId,
            UnitType = unitType,
            SpecialPrice = dto.SpecialPrice,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive ?? true
        };

        _context.CustomerSpecialPrices.Add(specialPrice);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSpecialPrices), new { id }, new SpecialPriceDto
        {
            Id = specialPrice.Id,
            ProductId = product.Id,
            ProductName = product.Name,
            ProductSku = product.Sku,
            UnitType = unitType,
            RegularPrice = unitType == "box" ? product.BoxRetailPrice : product.RetailPrice,
            CostPrice = unitType == "box" ? product.BoxCostPrice : product.CostPrice,
            SpecialPrice = specialPrice.SpecialPrice,
            StartDate = specialPrice.StartDate,
            EndDate = specialPrice.EndDate,
            IsActive = specialPrice.IsActive
        });
    }

    [HttpPut("{customerId}/special-prices/{priceId}")]
    public async Task<IActionResult> UpdateSpecialPrice(int customerId, int priceId, UpdateSpecialPriceDto dto)
    {
        var companyId = GetCompanyId();
        var specialPrice = await _context.CustomerSpecialPrices
            .FirstOrDefaultAsync(sp => sp.Id == priceId && sp.CustomerId == customerId && sp.CompanyId == companyId);

        if (specialPrice == null)
            return NotFound();

        specialPrice.SpecialPrice = dto.SpecialPrice;
        specialPrice.StartDate = dto.StartDate;
        specialPrice.EndDate = dto.EndDate;
        specialPrice.IsActive = dto.IsActive ?? specialPrice.IsActive;
        specialPrice.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{customerId}/special-prices/{priceId}")]
    public async Task<IActionResult> DeleteSpecialPrice(int customerId, int priceId)
    {
        var companyId = GetCompanyId();
        var specialPrice = await _context.CustomerSpecialPrices
            .FirstOrDefaultAsync(sp => sp.Id == priceId && sp.CustomerId == customerId && sp.CompanyId == companyId);

        if (specialPrice == null)
            return NotFound();

        _context.CustomerSpecialPrices.Remove(specialPrice);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ============ BULK UPLOAD ============

    [HttpGet("template")]
    [AllowAnonymous]
    public IActionResult DownloadTemplate()
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Customers");

        // Header row
        var headers = new[] { "Name*", "ShopName", "Phone", "Email", "Address", "CustomerType", "CreditLimit", "Notes" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
            worksheet.Cell(1, i + 1).Style.Font.Bold = true;
            worksheet.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.LightBlue;
        }

        // Example row
        worksheet.Cell(2, 1).Value = "Ahmad Store";
        worksheet.Cell(2, 2).Value = "Ahmad's Shop";
        worksheet.Cell(2, 3).Value = "+1234567890";
        worksheet.Cell(2, 4).Value = "ahmad@example.com";
        worksheet.Cell(2, 5).Value = "123 Main Street";
        worksheet.Cell(2, 6).Value = "Retail";
        worksheet.Cell(2, 7).Value = 5000;
        worksheet.Cell(2, 8).Value = "VIP Customer";

        // Instructions sheet
        var instructionsSheet = workbook.Worksheets.Add("Instructions");
        instructionsSheet.Cell(1, 1).Value = "Customer Bulk Upload Instructions";
        instructionsSheet.Cell(1, 1).Style.Font.Bold = true;
        instructionsSheet.Cell(1, 1).Style.Font.FontSize = 14;
        
        instructionsSheet.Cell(3, 1).Value = "Required Fields:";
        instructionsSheet.Cell(3, 1).Style.Font.Bold = true;
        instructionsSheet.Cell(4, 1).Value = "- Name: Customer name (required)";
        
        instructionsSheet.Cell(6, 1).Value = "Optional Fields:";
        instructionsSheet.Cell(6, 1).Style.Font.Bold = true;
        instructionsSheet.Cell(7, 1).Value = "- ShopName: Store/shop name";
        instructionsSheet.Cell(8, 1).Value = "- Phone: Contact phone number";
        instructionsSheet.Cell(9, 1).Value = "- Email: Email address";
        instructionsSheet.Cell(10, 1).Value = "- Address: Full address";
        instructionsSheet.Cell(11, 1).Value = "- CustomerType: Retail or Wholesale (default: Retail)";
        instructionsSheet.Cell(12, 1).Value = "- CreditLimit: Credit limit amount (default: 0)";
        instructionsSheet.Cell(13, 1).Value = "- Notes: Additional notes";

        instructionsSheet.Cell(15, 1).Value = "Tips:";
        instructionsSheet.Cell(15, 1).Style.Font.Bold = true;
        instructionsSheet.Cell(16, 1).Value = "- Fill data starting from row 2 in the Customers sheet";
        instructionsSheet.Cell(17, 1).Value = "- Do not modify the header row";
        instructionsSheet.Cell(18, 1).Value = "- Save the file as .xlsx before uploading";

        worksheet.Columns().AdjustToContents();
        instructionsSheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "customer_upload_template.xlsx");
    }

    [HttpPost("bulk-upload")]
    public async Task<ActionResult<BulkUploadResultDto>> BulkUpload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Please upload an Excel file (.xlsx)" });

        var companyId = GetCompanyId();
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

        var result = new BulkUploadResultDto();
        var errors = new List<string>();

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RangeUsed()?.RowsUsed().Skip(1); // Skip header

            if (rows == null)
            {
                return BadRequest(new { message = "No data found in the file" });
            }

            int rowNumber = 1;
            foreach (var row in rows)
            {
                rowNumber++;
                try
                {
                    var name = row.Cell(1).GetString()?.Trim();
                    if (string.IsNullOrEmpty(name))
                    {
                        errors.Add($"Row {rowNumber}: Name is required");
                        result.Failed++;
                        continue;
                    }

                    var customer = new Customer
                    {
                        CompanyId = companyId,
                        Name = name,
                        ShopName = row.Cell(2).GetString()?.Trim(),
                        Phone = row.Cell(3).GetString()?.Trim(),
                        Email = row.Cell(4).GetString()?.Trim(),
                        Address = row.Cell(5).GetString()?.Trim(),
                        CustomerType = row.Cell(6).GetString()?.Trim() ?? "Retail",
                        CreditLimit = ParseDecimal(row.Cell(7).GetString()),
                        Notes = row.Cell(8).GetString()?.Trim(),
                        Status = "active",
                        CreatedBy = userId,
                        CreatedAt = DateTime.UtcNow
                    };

                    // Validate CustomerType
                    if (customer.CustomerType != "Retail" && customer.CustomerType != "Wholesale")
                        customer.CustomerType = "Retail";

                    _context.Customers.Add(customer);
                    result.Successful++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Row {rowNumber}: {ex.Message}");
                    result.Failed++;
                }
            }

            await _context.SaveChangesAsync();
            result.Errors = errors;
            result.TotalProcessed = result.Successful + result.Failed;

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error processing file: {ex.Message}" });
        }
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrEmpty(value)) return 0;
        return decimal.TryParse(value, out var result) ? result : 0;
    }

    /// <summary>
    /// Resolve a shortened Google Maps URL and extract coordinates
    /// </summary>
    [HttpPost("resolve-maps-link")]
    public async Task<IActionResult> ResolveMapsLink([FromBody] ResolveMapsLinkDto dto)
    {
        if (string.IsNullOrEmpty(dto.Url))
            return BadRequest(new { message = "URL is required" });

        try
        {
            var url = dto.Url.Trim();
            var resolvedUrl = url;
            
            // If it's a shortened URL, follow redirects to get the full URL
            if (url.Contains("maps.app.goo.gl") || url.Contains("goo.gl/maps"))
            {
                using var handler = new HttpClientHandler { AllowAutoRedirect = true };
                using var client = new HttpClient(handler);
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                client.Timeout = TimeSpan.FromSeconds(10);
                
                // First, try to get the response and check the final URL
                var response = await client.GetAsync(url);
                resolvedUrl = response.RequestMessage?.RequestUri?.ToString() ?? url;
                
                // If we still don't have coordinates, check the HTML content for them
                if (ExtractCoordinates(resolvedUrl) == null)
                {
                    var html = await response.Content.ReadAsStringAsync();
                    
                    // Look for coordinates in the HTML content
                    // Pattern: center=lat%2Clng or @lat,lng in the page
                    var centerMatch = System.Text.RegularExpressions.Regex.Match(html, @"center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)");
                    if (centerMatch.Success)
                    {
                        return Ok(new { lat = centerMatch.Groups[1].Value, lng = centerMatch.Groups[2].Value });
                    }
                    
                    // Look for pb= parameter which contains coordinates
                    var pbMatch = System.Text.RegularExpressions.Regex.Match(html, @"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)");
                    if (pbMatch.Success)
                    {
                        return Ok(new { lat = pbMatch.Groups[1].Value, lng = pbMatch.Groups[2].Value });
                    }

                    // Look for "center":{"lat":...,"lng":...} in JSON
                    var jsonMatch = System.Text.RegularExpressions.Regex.Match(html, @"""lat""\s*:\s*(-?\d+\.?\d*)\s*,\s*""lng""\s*:\s*(-?\d+\.?\d*)");
                    if (jsonMatch.Success)
                    {
                        return Ok(new { lat = jsonMatch.Groups[1].Value, lng = jsonMatch.Groups[2].Value });
                    }

                    // Look for ll= in redirects within the HTML
                    var llMatch = System.Text.RegularExpressions.Regex.Match(html, @"ll=(-?\d+\.?\d*),(-?\d+\.?\d*)");
                    if (llMatch.Success)
                    {
                        return Ok(new { lat = llMatch.Groups[1].Value, lng = llMatch.Groups[2].Value });
                    }
                }
            }

            // Try to extract coordinates from the resolved URL
            var coords = ExtractCoordinates(resolvedUrl);
            if (coords != null)
            {
                return Ok(new { lat = coords.Value.lat, lng = coords.Value.lng });
            }

            return BadRequest(new { message = $"Could not extract coordinates. Resolved URL: {resolvedUrl}" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error resolving URL: {ex.Message}" });
        }
    }

    private (string lat, string lng)? ExtractCoordinates(string url)
    {
        // Pattern 1: /@lat,lng,zoom (most common)
        var atMatch = System.Text.RegularExpressions.Regex.Match(url, @"@(-?\d+\.?\d*),(-?\d+\.?\d*)");
        if (atMatch.Success)
            return (atMatch.Groups[1].Value, atMatch.Groups[2].Value);

        // Pattern 2: ?q=lat,lng
        var qMatch = System.Text.RegularExpressions.Regex.Match(url, @"[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)");
        if (qMatch.Success)
            return (qMatch.Groups[1].Value, qMatch.Groups[2].Value);

        // Pattern 3: /place/lat,lng
        var placeMatch = System.Text.RegularExpressions.Regex.Match(url, @"/place/(-?\d+\.?\d*),(-?\d+\.?\d*)");
        if (placeMatch.Success)
            return (placeMatch.Groups[1].Value, placeMatch.Groups[2].Value);

        // Pattern 4: ll=lat,lng
        var llMatch = System.Text.RegularExpressions.Regex.Match(url, @"ll=(-?\d+\.?\d*),(-?\d+\.?\d*)");
        if (llMatch.Success)
            return (llMatch.Groups[1].Value, llMatch.Groups[2].Value);

        // Pattern 5: !3d lat !4d lng (embedded)
        var embeddedMatch = System.Text.RegularExpressions.Regex.Match(url, @"!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)");
        if (embeddedMatch.Success)
            return (embeddedMatch.Groups[1].Value, embeddedMatch.Groups[2].Value);

        // Pattern 6: data=...!8m2!3dLAT!4dLNG
        var dataMatch = System.Text.RegularExpressions.Regex.Match(url, @"!3d(-?\d+\.?\d+).*?!4d(-?\d+\.?\d+)");
        if (dataMatch.Success)
            return (dataMatch.Groups[1].Value, dataMatch.Groups[2].Value);

        return null;
    }
}

public class ResolveMapsLinkDto
{
    public string Url { get; set; } = string.Empty;
}

public class BulkUploadResultDto
{
    public int TotalProcessed { get; set; }
    public int Successful { get; set; }
    public int Failed { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class CustomerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string? LocationUrl { get; set; }
    public string CustomerType { get; set; } = "Retail";
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CreditBalance { get; set; }
    public decimal DebtBalance { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "active";
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
}

public class CreateCustomerDto
{
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string? LocationUrl { get; set; }
    public string? CustomerType { get; set; }
    public int? WarehouseId { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CreditBalance { get; set; }
    public decimal DebtBalance { get; set; }
    public int? AssignedDriverId { get; set; }
    public string? VisitFrequency { get; set; }
    public string? PreferredVisitDay { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
    public int? SupplierId { get; set; }
}

public class UpdateCustomerDto : CreateCustomerDto { }

public class SpecialPriceDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string UnitType { get; set; } = "piece";
    public decimal RegularPrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SpecialPrice { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
}

public class CreateSpecialPriceDto
{
    public int ProductId { get; set; }
    public string? UnitType { get; set; }
    public decimal SpecialPrice { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateSpecialPriceDto
{
    public decimal SpecialPrice { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}
