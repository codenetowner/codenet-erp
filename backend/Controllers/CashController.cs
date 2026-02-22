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
public class CashController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public CashController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    // GET: api/cash/collections
    [HttpGet("collections")]
    public async Task<ActionResult<IEnumerable<CollectionDto>>> GetCollections(
        [FromQuery] DateTime? date,
        [FromQuery] int? customerId,
        [FromQuery] int? driverId)
    {
        var companyId = GetCompanyId();
        var query = _context.Collections
            .Include(c => c.Customer)
            .Include(c => c.Driver)
            .Where(c => c.CompanyId == companyId);

        if (date.HasValue)
            query = query.Where(c => c.CollectionDate.Date == date.Value.Date);
        if (customerId.HasValue)
            query = query.Where(c => c.CustomerId == customerId);
        if (driverId.HasValue)
            query = query.Where(c => c.DriverId == driverId);

        var collections = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();

        return collections.Select(c => new CollectionDto
        {
            Id = c.Id,
            CollectionNumber = c.CollectionNumber,
            CustomerId = c.CustomerId,
            CustomerName = c.Customer.Name,
            DriverId = c.DriverId,
            DriverName = c.Driver?.Name,
            Amount = c.Amount,
            PaymentType = c.PaymentType,
            CollectionDate = c.CollectionDate,
            CollectionTime = c.CollectionTime,
            Notes = c.Notes,
            CreatedAt = c.CreatedAt
        }).ToList();
    }

    // POST: api/cash/collections
    [HttpPost("collections")]
    public async Task<ActionResult<CollectionDto>> CreateCollection(CreateCollectionDto dto)
    {
        var companyId = GetCompanyId();
        
        var count = await _context.Collections.CountAsync(c => c.CompanyId == companyId);
        var collectionNumber = $"COL-{(count + 1).ToString().PadLeft(4, '0')}";

        var collection = new Collection
        {
            CompanyId = companyId,
            CollectionNumber = collectionNumber,
            CustomerId = dto.CustomerId,
            DriverId = dto.DriverId,
            OrderId = dto.OrderId,
            Amount = dto.Amount,
            PaymentType = dto.PaymentType,
            CollectionDate = dto.CollectionDate,
            CollectionTime = dto.CollectionTime,
            CheckNumber = dto.CheckNumber,
            CheckDate = dto.CheckDate,
            BankName = dto.BankName,
            Notes = dto.Notes
        };

        _context.Collections.Add(collection);
        
        // Update customer balance
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer != null)
        {
            customer.DebtBalance -= dto.Amount;
            customer.UpdatedAt = TimeZoneHelper.Now;
        }

        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostCollectionEntry(companyId, collection.Id, collection.Amount, collection.PaymentType, collection.CollectionDate);

        return CreatedAtAction(nameof(GetCollections), new { id = collection.Id }, new CollectionDto
        {
            Id = collection.Id,
            CollectionNumber = collection.CollectionNumber,
            Amount = collection.Amount
        });
    }

    // GET: api/cash/deposits
    [HttpGet("deposits")]
    public async Task<ActionResult<IEnumerable<DepositDto>>> GetDeposits(
        [FromQuery] DateTime? date,
        [FromQuery] int? driverId,
        [FromQuery] string? status)
    {
        try
        {
            var companyId = GetCompanyId();
            var query = _context.Deposits
                .Include(d => d.Driver)
                .Where(d => d.CompanyId == companyId);

            if (date.HasValue)
                query = query.Where(d => d.DepositDate == DateOnly.FromDateTime(date.Value));
            if (driverId.HasValue)
                query = query.Where(d => d.DriverId == driverId);
            if (!string.IsNullOrEmpty(status))
                query = query.Where(d => d.Status == status);

            var deposits = await query.OrderByDescending(d => d.CreatedAt).ToListAsync();

            return deposits.Select(d => new DepositDto
            {
                Id = d.Id,
                DepositNumber = d.DepositNumber,
                DriverId = d.DriverId,
                DriverName = d.Driver?.Name ?? "Unknown",
                Amount = d.Amount,
                DepositType = d.DepositType,
                DepositDate = d.DepositDate.ToDateTime(TimeOnly.MinValue),
                DepositTime = d.DepositTime,
                BankName = d.BankName,
                SlipNumber = d.SlipNumber,
                Status = d.Status,
                Notes = d.Notes,
                CreatedAt = d.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"GetDeposits Error: {ex.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            throw;
        }
    }

    // POST: api/cash/deposits
    [HttpPost("deposits")]
    public async Task<ActionResult<DepositDto>> CreateDeposit(CreateDepositDto dto)
    {
        try
        {
            var companyId = GetCompanyId();
            
            var count = await _context.Deposits.CountAsync(d => d.CompanyId == companyId);
            var depositNumber = $"DEP-{(count + 1).ToString().PadLeft(4, '0')}";

            var deposit = new Deposit
            {
                CompanyId = companyId,
                DepositNumber = depositNumber,
                DriverId = dto.DriverId,
                Amount = dto.Amount,
                DepositType = dto.DepositType ?? "warehouse",
                DepositDate = DateOnly.FromDateTime(dto.DepositDate),
                DepositTime = dto.DepositTime,
                BankName = dto.BankName,
                SlipNumber = dto.SlipNumber,
                Notes = dto.Notes,
                Status = "pending"
            };

            _context.Deposits.Add(deposit);
            await _context.SaveChangesAsync();

            // Auto-post accounting entry (await to avoid DbContext concurrency issues)
            await _accountingService.PostDepositEntry(companyId, deposit.Id, deposit.Amount, deposit.DepositType, dto.DepositDate);

            return CreatedAtAction(nameof(GetDeposits), new { id = deposit.Id }, new DepositDto
            {
                Id = deposit.Id,
                DepositNumber = deposit.DepositNumber,
                Amount = deposit.Amount,
                Status = deposit.Status
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"CreateDeposit Error: {ex.Message}");
            if (ex.InnerException != null)
                Console.WriteLine($"Inner: {ex.InnerException.Message}");
            return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    // PUT: api/cash/deposits/{id}/status
    [HttpPut("deposits/{id}/status")]
    public async Task<IActionResult> UpdateDepositStatus(int id, [FromBody] UpdateDepositStatusDto dto)
    {
        var companyId = GetCompanyId();
        var deposit = await _context.Deposits.FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);

        if (deposit == null) return NotFound();

        deposit.Status = dto.Status;
        deposit.ReceivedBy = dto.ReceivedBy;
        deposit.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/cash/van-cash
    [HttpGet("van-cash")]
    public async Task<ActionResult<IEnumerable<VanCashDto>>> GetVanCash()
    {
        var companyId = GetCompanyId();
        
        var vans = await _context.Vans
            .Include(v => v.AssignedDriver)
            .Where(v => v.CompanyId == companyId)
            .ToListAsync();

        // Calculate actual cash for each van from transactions
        var result = new List<VanCashDto>();
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

            result.Add(new VanCashDto
            {
                Id = v.Id,
                VanId = v.Id,
                VanName = v.Name,
                DriverId = v.AssignedDriverId,
                DriverName = v.AssignedDriver?.Name,
                CurrentBalance = calculatedCash,
                MaxCash = v.MaxCash,
                LastUpdated = v.UpdatedAt
            });
        }

        return result;
    }

    // GET: api/cash/overview
    [HttpGet("overview")]
    public async Task<ActionResult<CashOverviewDto>> GetOverview()
    {
        var companyId = GetCompanyId();
        var today = DateOnly.FromDateTime(TimeZoneHelper.Now);

        var todayCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.CollectionDate.Date == TimeZoneHelper.Now.Date)
            .SumAsync(c => c.Amount);

        var todayDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.DepositDate == today && d.Status == "confirmed")
            .SumAsync(d => d.Amount);

        // Calculate cash in vans from transactions (not stored value)
        var vans = await _context.Vans
            .Where(v => v.CompanyId == companyId && v.AssignedDriverId.HasValue)
            .ToListAsync();

        decimal cashInVans = 0;
        foreach (var v in vans)
        {
            var driverId = v.AssignedDriverId!.Value;
            
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

            cashInVans += taskCash + posSales + collections - deposits;
        }

        var pendingDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.Status == "pending")
            .SumAsync(d => d.Amount);

        return new CashOverviewDto
        {
            TodayCollections = todayCollections,
            TodayDeposits = todayDeposits,
            CashInVans = cashInVans,
            PendingDeposits = pendingDeposits
        };
    }
}

// DTOs
public class CollectionDto
{
    public int Id { get; set; }
    public string? CollectionNumber { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = "cash";
    public DateTime CollectionDate { get; set; }
    public TimeSpan? CollectionTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCollectionDto
{
    public int CustomerId { get; set; }
    public int? DriverId { get; set; }
    public int? OrderId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = "cash";
    public DateTime CollectionDate { get; set; } = TimeZoneHelper.Now;
    public TimeSpan? CollectionTime { get; set; }
    public string? CheckNumber { get; set; }
    public DateTime? CheckDate { get; set; }
    public string? BankName { get; set; }
    public string? Notes { get; set; }
}

public class DepositDto
{
    public int Id { get; set; }
    public string DepositNumber { get; set; } = string.Empty;
    public int DriverId { get; set; }
    public string? DriverName { get; set; }
    public decimal Amount { get; set; }
    public string DepositType { get; set; } = "warehouse";
    public DateTime DepositDate { get; set; }
    public TimeSpan? DepositTime { get; set; }
    public string? BankName { get; set; }
    public string? SlipNumber { get; set; }
    public string Status { get; set; } = "pending";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDepositDto
{
    public int DriverId { get; set; }
    public decimal Amount { get; set; }
    public string DepositType { get; set; } = "warehouse";
    public DateTime DepositDate { get; set; } = TimeZoneHelper.Now;
    public TimeSpan? DepositTime { get; set; }
    public string? BankName { get; set; }
    public string? SlipNumber { get; set; }
    public string? Notes { get; set; }
}

public class UpdateDepositStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int? ReceivedBy { get; set; }
}

public class VanCashDto
{
    public int Id { get; set; }
    public int VanId { get; set; }
    public string VanName { get; set; } = string.Empty;
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal MaxCash { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class CashOverviewDto
{
    public decimal TodayCollections { get; set; }
    public decimal TodayDeposits { get; set; }
    public decimal CashInVans { get; set; }
    public decimal PendingDeposits { get; set; }
}
