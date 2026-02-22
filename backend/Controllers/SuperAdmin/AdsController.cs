using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdsController(AppDbContext context)
    {
        _context = context;
    }

    // ===== Ad Placements =====

    [HttpGet("ad-placements")]
    public async Task<ActionResult> GetPlacements()
    {
        var placements = await _context.AdPlacements
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.MaxWidth,
                p.MaxHeight,
                p.PricePerDay,
                p.PricePerWeek,
                p.PricePerMonth,
                p.IsActive,
                ActiveAdsCount = p.Ads.Count(a => a.IsActive && a.EndDate >= DateTime.UtcNow)
            })
            .ToListAsync();

        return Ok(placements);
    }

    [HttpPost("ad-placements")]
    public async Task<ActionResult> CreatePlacement([FromBody] AdPlacementDto dto)
    {
        var placement = new AdPlacement
        {
            Name = dto.Name,
            Description = dto.Description,
            MaxWidth = dto.MaxWidth,
            MaxHeight = dto.MaxHeight,
            PricePerDay = dto.PricePerDay,
            PricePerWeek = dto.PricePerWeek,
            PricePerMonth = dto.PricePerMonth,
            IsActive = dto.IsActive
        };

        _context.AdPlacements.Add(placement);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPlacements), new { id = placement.Id }, placement);
    }

    [HttpPut("ad-placements/{id}")]
    public async Task<ActionResult> UpdatePlacement(int id, [FromBody] AdPlacementDto dto)
    {
        var placement = await _context.AdPlacements.FindAsync(id);
        if (placement == null)
            return NotFound(new { message = "Ad placement not found" });

        placement.Name = dto.Name;
        placement.Description = dto.Description;
        placement.MaxWidth = dto.MaxWidth;
        placement.MaxHeight = dto.MaxHeight;
        placement.PricePerDay = dto.PricePerDay;
        placement.PricePerWeek = dto.PricePerWeek;
        placement.PricePerMonth = dto.PricePerMonth;
        placement.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return Ok(placement);
    }

    // ===== Ads =====

    [HttpGet("ads")]
    public async Task<ActionResult> GetAds([FromQuery] string? status, [FromQuery] int? companyId)
    {
        var query = _context.Ads
            .Include(a => a.Placement)
            .Include(a => a.Company)
            .AsQueryable();

        if (companyId.HasValue)
            query = query.Where(a => a.CompanyId == companyId);

        if (status == "active")
            query = query.Where(a => a.IsActive && a.EndDate >= DateTime.UtcNow);
        else if (status == "expired")
            query = query.Where(a => a.EndDate < DateTime.UtcNow);
        else if (status == "inactive")
            query = query.Where(a => !a.IsActive);

        var ads = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.CompanyId,
                CompanyName = a.Company != null ? a.Company.Name : null,
                a.PlacementId,
                PlacementName = a.Placement.Name,
                a.Title,
                a.ImageUrl,
                a.LinkUrl,
                a.StartDate,
                a.EndDate,
                a.IsActive,
                a.Impressions,
                a.Clicks,
                a.AmountPaid,
                a.PaymentStatus,
                a.CreatedAt,
                Ctr = a.Impressions > 0 ? Math.Round((decimal)a.Clicks / a.Impressions * 100, 2) : 0
            })
            .ToListAsync();

        return Ok(ads);
    }

    [HttpPost("ads")]
    public async Task<ActionResult> CreateAd([FromBody] AdDto dto)
    {
        var placement = await _context.AdPlacements.FindAsync(dto.PlacementId);
        if (placement == null)
            return BadRequest(new { message = "Ad placement not found" });

        var ad = new Ad
        {
            CompanyId = dto.CompanyId,
            PlacementId = dto.PlacementId,
            Title = dto.Title,
            ImageUrl = dto.ImageUrl,
            LinkUrl = dto.LinkUrl,
            StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc),
            IsActive = dto.IsActive,
            AmountPaid = dto.AmountPaid,
            PaymentStatus = dto.PaymentStatus
        };

        _context.Ads.Add(ad);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAds), new { id = ad.Id }, ad);
    }

    [HttpPut("ads/{id}")]
    public async Task<ActionResult> UpdateAd(int id, [FromBody] AdDto dto)
    {
        var ad = await _context.Ads.FindAsync(id);
        if (ad == null)
            return NotFound(new { message = "Ad not found" });

        ad.CompanyId = dto.CompanyId;
        ad.PlacementId = dto.PlacementId;
        ad.Title = dto.Title;
        ad.ImageUrl = dto.ImageUrl;
        ad.LinkUrl = dto.LinkUrl;
        ad.StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc);
        ad.EndDate = DateTime.SpecifyKind(dto.EndDate, DateTimeKind.Utc);
        ad.IsActive = dto.IsActive;
        ad.AmountPaid = dto.AmountPaid;
        ad.PaymentStatus = dto.PaymentStatus;

        await _context.SaveChangesAsync();
        return Ok(ad);
    }

    [HttpDelete("ads/{id}")]
    public async Task<ActionResult> DeleteAd(int id)
    {
        var ad = await _context.Ads.FindAsync(id);
        if (ad == null)
            return NotFound(new { message = "Ad not found" });

        _context.Ads.Remove(ad);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Ad deleted" });
    }

    [HttpGet("ads/revenue")]
    public async Task<ActionResult> GetAdRevenue()
    {
        var totalRevenue = await _context.Ads.SumAsync(a => a.AmountPaid);
        var paidRevenue = await _context.Ads.Where(a => a.PaymentStatus == "paid").SumAsync(a => a.AmountPaid);
        var pendingRevenue = await _context.Ads.Where(a => a.PaymentStatus == "pending").SumAsync(a => a.AmountPaid);
        var totalAds = await _context.Ads.CountAsync();
        var activeAds = await _context.Ads.CountAsync(a => a.IsActive && a.EndDate >= DateTime.UtcNow);
        var totalImpressions = await _context.Ads.SumAsync(a => a.Impressions);
        var totalClicks = await _context.Ads.SumAsync(a => a.Clicks);

        return Ok(new
        {
            totalRevenue,
            paidRevenue,
            pendingRevenue,
            totalAds,
            activeAds,
            totalImpressions,
            totalClicks,
            averageCtr = totalImpressions > 0 ? Math.Round((decimal)totalClicks / totalImpressions * 100, 2) : 0
        });
    }
}

public class AdPlacementDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? MaxWidth { get; set; }
    public int? MaxHeight { get; set; }
    public decimal PricePerDay { get; set; }
    public decimal PricePerWeek { get; set; }
    public decimal PricePerMonth { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AdDto
{
    public int? CompanyId { get; set; }
    public int PlacementId { get; set; }
    public string? Title { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? LinkUrl { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal AmountPaid { get; set; }
    public string PaymentStatus { get; set; } = "pending";
}
