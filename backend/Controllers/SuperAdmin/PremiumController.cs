using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/premium-subscriptions")]
[Authorize(Roles = "SuperAdmin")]
public class PremiumController : ControllerBase
{
    private readonly AppDbContext _context;

    public PremiumController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? status)
    {
        try
        {
            var now = DateTime.UtcNow;
            var query = _context.PremiumSubscriptions
                .AsQueryable();

            if (status == "active")
                query = query.Where(ps => ps.EndDate >= now);
            else if (status == "expired")
                query = query.Where(ps => ps.EndDate < now);

            var rawSubs = await query
                .OrderByDescending(ps => ps.CreatedAt)
                .ToListAsync();

            var companyIds = rawSubs.Select(s => s.CompanyId).Distinct().ToList();
            var companies = await _context.Companies
                .Where(c => companyIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Name, c.LogoUrl })
                .ToDictionaryAsync(c => c.Id);

            var result = rawSubs.Select(ps => new
            {
                ps.Id,
                ps.CompanyId,
                CompanyName = companies.ContainsKey(ps.CompanyId) ? companies[ps.CompanyId].Name : "",
                CompanyLogoUrl = companies.ContainsKey(ps.CompanyId) ? companies[ps.CompanyId].LogoUrl : null,
                ps.Tier,
                ps.StartDate,
                ps.EndDate,
                ps.Amount,
                ps.PaymentStatus,
                ps.Features,
                ps.CreatedAt,
                IsExpired = ps.EndDate < now
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] PremiumSubscriptionDto dto)
    {
        var company = await _context.Companies.FindAsync(dto.CompanyId);
        if (company == null)
            return BadRequest(new { message = "Company not found" });

        var sub = new PremiumSubscription
        {
            CompanyId = dto.CompanyId,
            Tier = dto.Tier,
            StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc),
            Amount = dto.Amount,
            PaymentStatus = dto.PaymentStatus,
            Features = dto.Features
        };

        _context.PremiumSubscriptions.Add(sub);

        // Update company premium status
        company.IsPremium = true;
        company.PremiumTier = dto.Tier;
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new
        {
            sub.Id,
            sub.CompanyId,
            CompanyName = company.Name,
            sub.Tier,
            sub.StartDate,
            sub.EndDate,
            sub.Amount,
            sub.PaymentStatus,
            sub.Features,
            sub.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] PremiumSubscriptionDto dto)
    {
        var sub = await _context.PremiumSubscriptions.FindAsync(id);
        if (sub == null)
            return NotFound(new { message = "Subscription not found" });

        sub.Tier = dto.Tier;
        sub.StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);
        sub.EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc);
        sub.Amount = dto.Amount;
        sub.PaymentStatus = dto.PaymentStatus;
        sub.Features = dto.Features;

        // Update company premium status
        var company = await _context.Companies.FindAsync(sub.CompanyId);
        if (company != null)
        {
            company.PremiumTier = dto.Tier;
            if (sub.EndDate < DateTime.UtcNow)
            {
                company.IsPremium = false;
                company.PremiumTier = null;
            }
            company.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(sub);
    }
}

public class PremiumSubscriptionDto
{
    public int CompanyId { get; set; }
    public string Tier { get; set; } = "basic";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Amount { get; set; }
    public string PaymentStatus { get; set; } = "pending";
    public string? Features { get; set; }
}
