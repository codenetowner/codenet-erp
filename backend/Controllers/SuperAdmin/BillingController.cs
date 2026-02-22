using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.DTOs;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/superadmin/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _context;

    public BillingController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<BillingListDto>>> GetBillings(
        [FromQuery] int? companyId,
        [FromQuery] int? planId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var query = _context.Billings
            .Include(b => b.Company)
            .Include(b => b.Plan)
            .AsQueryable();

        if (companyId.HasValue)
            query = query.Where(b => b.CompanyId == companyId.Value);

        if (planId.HasValue)
            query = query.Where(b => b.PlanId == planId.Value);

        if (startDate.HasValue)
            query = query.Where(b => b.PaymentDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(b => b.PaymentDate <= endDate.Value);

        var billings = await query
            .OrderByDescending(b => b.PaymentDate)
            .Select(b => new BillingListDto
            {
                Id = b.Id,
                CompanyId = b.CompanyId,
                CompanyName = b.Company.Name,
                PlanName = b.Plan != null ? b.Plan.Name : null,
                Amount = b.Amount,
                PaymentDate = b.PaymentDate,
                NextRenewalDate = b.NextRenewalDate,
                PaymentMethod = b.PaymentMethod,
                TransactionReference = b.TransactionReference,
                Notes = b.Notes,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(billings);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BillingListDto>> GetBilling(int id)
    {
        var billing = await _context.Billings
            .Include(b => b.Company)
            .Include(b => b.Plan)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (billing == null)
            return NotFound(new { message = "Billing record not found" });

        return Ok(new BillingListDto
        {
            Id = billing.Id,
            CompanyId = billing.CompanyId,
            CompanyName = billing.Company.Name,
            PlanName = billing.Plan?.Name,
            Amount = billing.Amount,
            PaymentDate = billing.PaymentDate,
            NextRenewalDate = billing.NextRenewalDate,
            PaymentMethod = billing.PaymentMethod,
            TransactionReference = billing.TransactionReference,
            Notes = billing.Notes,
            CreatedAt = billing.CreatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<BillingListDto>> CreateBilling([FromBody] CreateBillingRequest request)
    {
        var company = await _context.Companies.FindAsync(request.CompanyId);
        if (company == null)
            return BadRequest(new { message = "Company not found" });

        // Convert dates to UTC
        var paymentDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);
        DateTime? nextRenewal = request.NextRenewalDate.HasValue 
            ? DateTime.SpecifyKind(request.NextRenewalDate.Value, DateTimeKind.Utc) 
            : null;

        var billing = new Billing
        {
            CompanyId = request.CompanyId,
            PlanId = request.PlanId,
            Amount = request.Amount,
            PaymentDate = paymentDate,
            NextRenewalDate = nextRenewal,
            PaymentMethod = request.PaymentMethod,
            TransactionReference = request.TransactionReference,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.Billings.Add(billing);

        // Update company plan expiry if provided
        if (nextRenewal.HasValue)
        {
            company.PlanExpiryDate = nextRenewal;
            if (request.PlanId.HasValue)
                company.PlanId = request.PlanId;
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBilling), new { id = billing.Id }, new BillingListDto
        {
            Id = billing.Id,
            CompanyId = billing.CompanyId,
            CompanyName = company.Name,
            Amount = billing.Amount,
            PaymentDate = billing.PaymentDate,
            CreatedAt = billing.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateBilling(int id, [FromBody] CreateBillingRequest request)
    {
        var billing = await _context.Billings.FindAsync(id);
        if (billing == null)
            return NotFound(new { message = "Billing record not found" });

        var company = await _context.Companies.FindAsync(request.CompanyId);
        if (company == null)
            return BadRequest(new { message = "Company not found" });

        // Convert dates to UTC
        billing.CompanyId = request.CompanyId;
        billing.PlanId = request.PlanId;
        billing.Amount = request.Amount;
        billing.PaymentDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);
        billing.NextRenewalDate = request.NextRenewalDate.HasValue 
            ? DateTime.SpecifyKind(request.NextRenewalDate.Value, DateTimeKind.Utc) 
            : null;
        billing.PaymentMethod = request.PaymentMethod;
        billing.TransactionReference = request.TransactionReference;
        billing.Notes = request.Notes;

        // Update company plan expiry if provided
        if (billing.NextRenewalDate.HasValue)
        {
            company.PlanExpiryDate = billing.NextRenewalDate;
            if (request.PlanId.HasValue)
                company.PlanId = request.PlanId;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteBilling(int id)
    {
        var billing = await _context.Billings.FindAsync(id);
        if (billing == null)
            return NotFound(new { message = "Billing record not found" });

        _context.Billings.Remove(billing);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<ActionResult> GetBillingSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-12);
        var end = endDate ?? DateTime.UtcNow;

        var billings = await _context.Billings
            .Where(b => b.PaymentDate >= start && b.PaymentDate <= end)
            .ToListAsync();

        var totalAmount = billings.Sum(b => b.Amount);
        var count = billings.Count;

        var byMonth = billings
            .GroupBy(b => new { b.PaymentDate.Year, b.PaymentDate.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Total = g.Sum(x => x.Amount),
                Count = g.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        var byMethod = billings
            .GroupBy(b => b.PaymentMethod)
            .Select(g => new
            {
                Method = g.Key,
                Total = g.Sum(x => x.Amount),
                Count = g.Count()
            })
            .ToList();

        return Ok(new
        {
            totalAmount,
            count,
            byMonth,
            byMethod
        });
    }
}
