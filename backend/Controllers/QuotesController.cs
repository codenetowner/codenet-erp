using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using System.Security.Claims;

namespace Catalyst.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QuotesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public QuotesController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCompanyId()
        {
            var companyIdClaim = User.FindFirst("CompanyId")?.Value;
            return int.TryParse(companyIdClaim, out var id) ? id : 0;
        }

        /// <summary>
        /// Get all quotes for the company
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuoteListDto>>> GetQuotes(
            [FromQuery] string? status,
            [FromQuery] int? customerId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0)
                return Ok(new List<QuoteListDto>()); // Return empty if no valid company
            
            var query = _context.Quotes
                .Include(q => q.Customer)
                .Include(q => q.Employee)
                .Include(q => q.Items)
                .Where(q => q.CompanyId == companyId); // ALWAYS filter by company

            if (!string.IsNullOrEmpty(status))
                query = query.Where(q => q.Status == status);

            if (customerId.HasValue)
                query = query.Where(q => q.CustomerId == customerId);

            if (fromDate.HasValue)
                query = query.Where(q => q.QuoteDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(q => q.QuoteDate <= toDate.Value);

            var quotes = await query
                .OrderByDescending(q => q.CreatedAt)
                .Select(q => new QuoteListDto
                {
                    Id = q.Id,
                    QuoteNumber = q.QuoteNumber,
                    CustomerId = q.CustomerId,
                    CustomerName = q.Customer != null ? q.Customer.Name : "",
                    EmployeeName = q.Employee != null ? q.Employee.Name : null,
                    QuoteDate = q.QuoteDate,
                    ValidUntil = q.ValidUntil,
                    TotalAmount = q.TotalAmount,
                    Status = q.Status,
                    ItemCount = q.Items.Count,
                    ConvertedOrderId = q.ConvertedOrderId
                })
                .ToListAsync();

            return quotes;
        }

        /// <summary>
        /// Get quote by ID with full details
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<QuoteDetailDto>> GetQuote(int id)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0)
                return NotFound();
            
            var query = _context.Quotes
                .Include(q => q.Customer)
                .Include(q => q.Employee)
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .Where(q => q.Id == id && q.CompanyId == companyId);
            
            var quote = await query.FirstOrDefaultAsync();

            if (quote == null)
                return NotFound();

            return new QuoteDetailDto
            {
                Id = quote.Id,
                QuoteNumber = quote.QuoteNumber,
                CustomerId = quote.CustomerId,
                CustomerName = quote.Customer?.Name ?? "",
                CustomerPhone = quote.Customer?.Phone,
                CustomerAddress = quote.Customer?.Address,
                EmployeeId = quote.EmployeeId,
                EmployeeName = quote.Employee?.Name,
                QuoteDate = quote.QuoteDate,
                ValidUntil = quote.ValidUntil,
                Subtotal = quote.Subtotal,
                DiscountAmount = quote.DiscountAmount,
                TaxAmount = quote.TaxAmount,
                TotalAmount = quote.TotalAmount,
                Status = quote.Status,
                Notes = quote.Notes,
                Terms = quote.Terms,
                ConvertedOrderId = quote.ConvertedOrderId,
                ConvertedAt = quote.ConvertedAt,
                CreatedAt = quote.CreatedAt,
                Items = quote.Items.Select(i => new QuoteItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name ?? "",
                    ProductSku = i.Product?.Sku ?? "",
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    LineTotal = i.LineTotal,
                    Notes = i.Notes
                }).ToList()
            };
        }

        /// <summary>
        /// Get quote by quote number (for loading in Direct Sales/Tasks)
        /// </summary>
        [HttpGet("by-number/{quoteNumber}")]
        public async Task<ActionResult<QuoteDetailDto>> GetQuoteByNumber(string quoteNumber)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0)
                return NotFound(new { error = "Quote not found" });
            
            var query = _context.Quotes
                .Include(q => q.Customer)
                .Include(q => q.Employee)
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .Where(q => q.QuoteNumber == quoteNumber && q.CompanyId == companyId);
            
            var quote = await query.FirstOrDefaultAsync();

            if (quote == null)
                return NotFound(new { error = "Quote not found" });

            if (quote.Status == "converted")
                return BadRequest(new { error = "Quote has already been converted to an order" });

            if (quote.Status == "rejected")
                return BadRequest(new { error = "Quote was rejected" });

            if (quote.Status == "expired" || quote.ValidUntil < TimeZoneHelper.Now)
                return BadRequest(new { error = "Quote has expired" });

            return new QuoteDetailDto
            {
                Id = quote.Id,
                QuoteNumber = quote.QuoteNumber,
                CustomerId = quote.CustomerId,
                CustomerName = quote.Customer?.Name ?? "",
                CustomerPhone = quote.Customer?.Phone,
                CustomerAddress = quote.Customer?.Address,
                EmployeeId = quote.EmployeeId,
                EmployeeName = quote.Employee?.Name,
                QuoteDate = quote.QuoteDate,
                ValidUntil = quote.ValidUntil,
                Subtotal = quote.Subtotal,
                DiscountAmount = quote.DiscountAmount,
                TaxAmount = quote.TaxAmount,
                TotalAmount = quote.TotalAmount,
                Status = quote.Status,
                Notes = quote.Notes,
                Terms = quote.Terms,
                ConvertedOrderId = quote.ConvertedOrderId,
                ConvertedAt = quote.ConvertedAt,
                CreatedAt = quote.CreatedAt,
                Items = quote.Items.Select(i => new QuoteItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name ?? "",
                    ProductSku = i.Product?.Sku ?? "",
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    LineTotal = i.LineTotal,
                    Notes = i.Notes
                }).ToList()
            };
        }

        /// <summary>
        /// Create a new quote
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<QuoteDetailDto>> CreateQuote([FromBody] CreateQuoteDto dto)
        {
            if (dto == null)
                return BadRequest(new { error = "Invalid request body" });
            
            if (dto.Items == null || !dto.Items.Any())
                return BadRequest(new { error = "At least one item is required" });
                
            var companyId = GetCompanyId();
            
            // Debug logging
            Console.WriteLine($"Creating quote - CompanyId: {companyId}, CustomerId: {dto.CustomerId}, Items: {dto.Items.Count}");

            // Validate customer - allow any active customer
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == dto.CustomerId);
            if (customer == null)
                return BadRequest(new { error = $"Customer not found with ID {dto.CustomerId}" });

            // Use customer's company if companyId is 0
            var effectiveCompanyId = companyId > 0 ? companyId : customer.CompanyId;

            // Generate quote number using effectiveCompanyId
            var lastQuote = await _context.Quotes
                .Where(q => q.CompanyId == effectiveCompanyId)
                .OrderByDescending(q => q.Id)
                .FirstOrDefaultAsync();
            var quoteNumber = $"QT-{TimeZoneHelper.Now:yyyyMMdd}-{(lastQuote?.Id ?? 0) + 1:D4}";
            
            var quote = new Quote
            {
                CompanyId = effectiveCompanyId,
                QuoteNumber = quoteNumber,
                CustomerId = dto.CustomerId,
                EmployeeId = dto.EmployeeId,
                QuoteDate = TimeZoneHelper.Now,
                ValidUntil = !string.IsNullOrEmpty(dto.ValidUntil) && DateTime.TryParse(dto.ValidUntil, out var parsedDate) ? parsedDate : TimeZoneHelper.Now.AddDays(30),
                Status = "draft",
                Notes = dto.Notes,
                Terms = dto.Terms
            };

            decimal subtotal = 0;
            foreach (var item in dto.Items ?? new List<CreateQuoteItemDto>())
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product == null) continue;

                var lineTotal = item.Quantity * item.UnitPrice;
                var discountAmount = lineTotal * (item.DiscountPercent / 100);
                lineTotal -= discountAmount;

                quote.Items.Add(new QuoteItem
                {
                    ProductId = item.ProductId,
                    UnitId = item.UnitId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountPercent = item.DiscountPercent,
                    DiscountAmount = discountAmount,
                    LineTotal = lineTotal,
                    Notes = item.Notes
                });

                subtotal += lineTotal;
            }

            quote.Subtotal = subtotal;
            quote.DiscountAmount = dto.DiscountAmount;
            quote.TaxAmount = dto.TaxAmount;
            quote.TotalAmount = subtotal - dto.DiscountAmount + dto.TaxAmount;

            _context.Quotes.Add(quote);
            await _context.SaveChangesAsync();

            // Reload quote with includes (don't use GetQuote as it filters by JWT companyId which may be 0)
            var createdQuote = await _context.Quotes
                .Include(q => q.Customer)
                .Include(q => q.Employee)
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(q => q.Id == quote.Id);

            return new QuoteDetailDto
            {
                Id = createdQuote!.Id,
                QuoteNumber = createdQuote.QuoteNumber,
                CustomerId = createdQuote.CustomerId,
                CustomerName = createdQuote.Customer?.Name ?? "",
                CustomerPhone = createdQuote.Customer?.Phone,
                CustomerAddress = createdQuote.Customer?.Address,
                EmployeeId = createdQuote.EmployeeId,
                EmployeeName = createdQuote.Employee?.Name,
                QuoteDate = createdQuote.QuoteDate,
                ValidUntil = createdQuote.ValidUntil,
                Subtotal = createdQuote.Subtotal,
                DiscountAmount = createdQuote.DiscountAmount,
                TaxAmount = createdQuote.TaxAmount,
                TotalAmount = createdQuote.TotalAmount,
                Status = createdQuote.Status,
                Notes = createdQuote.Notes,
                Terms = createdQuote.Terms,
                ConvertedOrderId = createdQuote.ConvertedOrderId,
                ConvertedAt = createdQuote.ConvertedAt,
                CreatedAt = createdQuote.CreatedAt,
                Items = createdQuote.Items.Select(i => new QuoteItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name ?? "",
                    ProductSku = i.Product?.Sku ?? "",
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    LineTotal = i.LineTotal,
                    Notes = i.Notes
                }).ToList()
            };
        }

        /// <summary>
        /// Update quote status
        /// </summary>
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateQuoteStatusDto dto)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0) return NotFound();
            var query = _context.Quotes.Where(q => q.Id == id && q.CompanyId == companyId);
            var quote = await query.FirstOrDefaultAsync();

            if (quote == null)
                return NotFound();

            quote.Status = dto.Status;
            quote.UpdatedAt = TimeZoneHelper.Now;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Status updated" });
        }

        /// <summary>
        /// Mark quote as converted (called when order is created from quote)
        /// </summary>
        [HttpPost("{id}/convert")]
        public async Task<IActionResult> ConvertToOrder(int id, [FromBody] ConvertQuoteDto dto)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0) return NotFound();
            var query = _context.Quotes.Where(q => q.Id == id && q.CompanyId == companyId);
            var quote = await query.FirstOrDefaultAsync();

            if (quote == null)
                return NotFound();

            if (quote.Status == "converted")
                return BadRequest(new { error = "Quote already converted" });

            quote.Status = "converted";
            quote.ConvertedOrderId = dto.OrderId;
            quote.ConvertedAt = TimeZoneHelper.Now;
            quote.UpdatedAt = TimeZoneHelper.Now;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Quote converted to order" });
        }

        /// <summary>
        /// Update quote
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<QuoteDetailDto>> UpdateQuote(int id, UpdateQuoteDto dto)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0) return NotFound();
            
            var quote = await _context.Quotes
                .Include(q => q.Items)
                .Where(q => q.Id == id && q.CompanyId == companyId)
                .FirstOrDefaultAsync();

            if (quote == null)
                return NotFound();

            if (quote.Status == "converted")
                return BadRequest(new { error = "Cannot update a converted quote" });

            quote.CustomerId = dto.CustomerId;
            quote.EmployeeId = dto.EmployeeId;
            if (!string.IsNullOrEmpty(dto.ValidUntil) && DateTime.TryParse(dto.ValidUntil, out var parsedDate))
                quote.ValidUntil = parsedDate;
            quote.Notes = dto.Notes;
            quote.Terms = dto.Terms;
            quote.UpdatedAt = TimeZoneHelper.Now;

            // Remove old items
            _context.QuoteItems.RemoveRange(quote.Items);

            // Add new items
            decimal subtotal = 0;
            foreach (var item in dto.Items ?? new List<CreateQuoteItemDto>())
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product == null) continue;

                var lineTotal = item.Quantity * item.UnitPrice;
                var discountAmount = lineTotal * (item.DiscountPercent / 100);
                lineTotal -= discountAmount;

                quote.Items.Add(new QuoteItem
                {
                    ProductId = item.ProductId,
                    UnitId = item.UnitId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    DiscountPercent = item.DiscountPercent,
                    DiscountAmount = discountAmount,
                    LineTotal = lineTotal,
                    Notes = item.Notes
                });

                subtotal += lineTotal;
            }

            quote.Subtotal = subtotal;
            quote.DiscountAmount = dto.DiscountAmount;
            quote.TaxAmount = dto.TaxAmount;
            quote.TotalAmount = subtotal - dto.DiscountAmount + dto.TaxAmount;

            await _context.SaveChangesAsync();

            // Reload quote with includes
            var updatedQuote = await _context.Quotes
                .Include(q => q.Customer)
                .Include(q => q.Employee)
                .Include(q => q.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(q => q.Id == quote.Id);

            return new QuoteDetailDto
            {
                Id = updatedQuote!.Id,
                QuoteNumber = updatedQuote.QuoteNumber,
                CustomerId = updatedQuote.CustomerId,
                CustomerName = updatedQuote.Customer?.Name ?? "",
                CustomerPhone = updatedQuote.Customer?.Phone,
                CustomerAddress = updatedQuote.Customer?.Address,
                EmployeeId = updatedQuote.EmployeeId,
                EmployeeName = updatedQuote.Employee?.Name,
                QuoteDate = updatedQuote.QuoteDate,
                ValidUntil = updatedQuote.ValidUntil,
                Subtotal = updatedQuote.Subtotal,
                DiscountAmount = updatedQuote.DiscountAmount,
                TaxAmount = updatedQuote.TaxAmount,
                TotalAmount = updatedQuote.TotalAmount,
                Status = updatedQuote.Status,
                Notes = updatedQuote.Notes,
                Terms = updatedQuote.Terms,
                ConvertedOrderId = updatedQuote.ConvertedOrderId,
                ConvertedAt = updatedQuote.ConvertedAt,
                CreatedAt = updatedQuote.CreatedAt,
                Items = updatedQuote.Items.Select(i => new QuoteItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.Product?.Name ?? "",
                    ProductSku = i.Product?.Sku ?? "",
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    LineTotal = i.LineTotal,
                    Notes = i.Notes
                }).ToList()
            };
        }

        /// <summary>
        /// Delete quote
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteQuote(int id)
        {
            var companyId = GetCompanyId();
            if (companyId <= 0) return NotFound();
            var quote = await _context.Quotes.Include(q => q.Items)
                .Where(q => q.Id == id && q.CompanyId == companyId)
                .FirstOrDefaultAsync();

            if (quote == null)
                return NotFound();

            if (quote.Status == "converted")
                return BadRequest(new { error = "Cannot delete a converted quote" });

            _context.QuoteItems.RemoveRange(quote.Items);
            _context.Quotes.Remove(quote);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Quote deleted" });
        }

        /// <summary>
        /// Get quote summary statistics
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<QuoteSummaryDto>> GetSummary()
        {
            var companyId = GetCompanyId();
            if (companyId <= 0)
                return Ok(new QuoteSummaryDto());
            
            var quotes = await _context.Quotes
                .Where(q => q.CompanyId == companyId)
                .ToListAsync();

            return new QuoteSummaryDto
            {
                TotalQuotes = quotes.Count,
                DraftQuotes = quotes.Count(q => q.Status == "draft"),
                SentQuotes = quotes.Count(q => q.Status == "sent"),
                AcceptedQuotes = quotes.Count(q => q.Status == "accepted"),
                ConvertedQuotes = quotes.Count(q => q.Status == "converted"),
                RejectedQuotes = quotes.Count(q => q.Status == "rejected"),
                TotalValue = quotes.Where(q => q.Status != "rejected").Sum(q => q.TotalAmount),
                ConvertedValue = quotes.Where(q => q.Status == "converted").Sum(q => q.TotalAmount)
            };
        }
    }

    // DTOs
    public class QuoteListDto
    {
        public int Id { get; set; }
        public string QuoteNumber { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? EmployeeName { get; set; }
        public DateTime QuoteDate { get; set; }
        public DateTime ValidUntil { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public int? ConvertedOrderId { get; set; }
    }

    public class QuoteDetailDto
    {
        public int Id { get; set; }
        public string QuoteNumber { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? CustomerAddress { get; set; }
        public int? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public DateTime QuoteDate { get; set; }
        public DateTime ValidUntil { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? Terms { get; set; }
        public int? ConvertedOrderId { get; set; }
        public DateTime? ConvertedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<QuoteItemDto> Items { get; set; } = new();
    }

    public class QuoteItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal LineTotal { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateQuoteDto
    {
        public int CustomerId { get; set; }
        public int? EmployeeId { get; set; }
        public string? ValidUntil { get; set; }  // Accept as string to avoid parsing issues
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public string? Notes { get; set; }
        public string? Terms { get; set; }
        public List<CreateQuoteItemDto>? Items { get; set; }
    }

    public class CreateQuoteItemDto
    {
        public int ProductId { get; set; }
        public int? UnitId { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateQuoteDto
    {
        public int CustomerId { get; set; }
        public int? EmployeeId { get; set; }
        public string? ValidUntil { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public string? Notes { get; set; }
        public string? Terms { get; set; }
        public List<CreateQuoteItemDto>? Items { get; set; }
    }

    public class UpdateQuoteStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class ConvertQuoteDto
    {
        public int OrderId { get; set; }
    }

    public class QuoteSummaryDto
    {
        public int TotalQuotes { get; set; }
        public int DraftQuotes { get; set; }
        public int SentQuotes { get; set; }
        public int AcceptedQuotes { get; set; }
        public int ConvertedQuotes { get; set; }
        public int RejectedQuotes { get; set; }
        public decimal TotalValue { get; set; }
        public decimal ConvertedValue { get; set; }
    }
}
