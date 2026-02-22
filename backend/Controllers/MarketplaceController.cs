using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarketplaceController : ControllerBase
{
    private readonly AppDbContext _context;

    public MarketplaceController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// List all active store categories
    /// </summary>
    [HttpGet("categories")]
    public async Task<ActionResult> GetCategories()
    {
        var categories = await _context.StoreCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.NameAr,
                c.Icon,
                c.ImageUrl,
                c.SortOrder,
                StoreCount = _context.Companies.Count(co => co.IsOnlineStoreEnabled && co.Status == "active"
                    && (co.StoreCategoryId == c.Id || _context.CompanyStoreCategories.Any(csc => csc.CompanyId == co.Id && csc.StoreCategoryId == c.Id)))
            })
            .ToListAsync();

        return Ok(categories);
    }

    /// <summary>
    /// List stores with optional filters
    /// </summary>
    [HttpGet("stores")]
    public async Task<ActionResult> GetStores(
        [FromQuery] int? categoryId,
        [FromQuery] string? search,
        [FromQuery] decimal? lat,
        [FromQuery] decimal? lng)
    {
        var query = _context.Companies
            .Where(c => c.IsOnlineStoreEnabled && c.Status == "active");

        if (categoryId.HasValue)
        {
            query = query.Where(c =>
                c.StoreCategoryId == categoryId.Value ||
                _context.CompanyStoreCategories.Any(csc => csc.CompanyId == c.Id && csc.StoreCategoryId == categoryId.Value));
        }

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(c =>
                c.Name.Contains(search) ||
                (c.StoreDescription != null && c.StoreDescription.Contains(search)));
        }

        var storeList = await query
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.LogoUrl,
                c.StoreBannerUrl,
                c.StoreDescription,
                c.StoreThemeColor,
                c.DeliveryEnabled,
                c.DeliveryFee,
                c.MinOrderAmount,
                c.IsPremium,
                c.PremiumTier,
                c.StoreLat,
                c.StoreLng,
                c.WhatsappNumber,
                c.Phone,
                c.Address,
                Categories = _context.StoreCategories
                    .Where(sc => sc.Id == c.StoreCategoryId || _context.CompanyStoreCategories.Any(csc => csc.CompanyId == c.Id && csc.StoreCategoryId == sc.Id))
                    .Select(sc => sc.Name)
                    .ToList()
            })
            .ToListAsync();

        // If lat/lng provided, calculate distance and sort by it
        if (lat.HasValue && lng.HasValue)
        {
            var results = storeList.Select(s => new
            {
                s.Id, s.Name, s.LogoUrl, s.StoreBannerUrl, s.StoreDescription, s.StoreThemeColor,
                s.DeliveryEnabled, s.DeliveryFee, s.MinOrderAmount, s.IsPremium, s.PremiumTier,
                s.StoreLat, s.StoreLng, s.WhatsappNumber, s.Phone, s.Address, s.Categories,
                DistanceKm = s.StoreLat.HasValue && s.StoreLng.HasValue
                    ? CalculateDistance((double)lat.Value, (double)lng.Value, (double)s.StoreLat.Value, (double)s.StoreLng.Value)
                    : (double?)null
            })
            .OrderByDescending(s => s.IsPremium)
            .ThenBy(s => s.DistanceKm ?? double.MaxValue)
            .ToList();

            return Ok(results);
        }

        var ordered = storeList
            .OrderByDescending(s => s.IsPremium)
            .ThenBy(s => s.Name)
            .ToList();

        return Ok(ordered);
    }

    /// <summary>
    /// Get nearby stores sorted by distance
    /// </summary>
    [HttpGet("stores/nearby")]
    public async Task<ActionResult> GetNearbyStores(
        [FromQuery] decimal lat,
        [FromQuery] decimal lng,
        [FromQuery] double radiusKm = 50)
    {
        var stores = await _context.Companies
            .Where(c => c.IsOnlineStoreEnabled && c.Status == "active" && c.StoreLat.HasValue && c.StoreLng.HasValue)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.LogoUrl,
                c.StoreDescription,
                c.DeliveryEnabled,
                c.DeliveryFee,
                c.MinOrderAmount,
                c.IsPremium,
                c.PremiumTier,
                c.StoreLat,
                c.StoreLng,
                c.Phone,
                c.Address,
                Categories = _context.StoreCategories
                    .Where(sc => sc.Id == c.StoreCategoryId || _context.CompanyStoreCategories.Any(csc => csc.CompanyId == c.Id && csc.StoreCategoryId == sc.Id))
                    .Select(sc => sc.Name)
                    .ToList()
            })
            .ToListAsync();

        var nearby = stores
            .Select(s => new
            {
                s.Id, s.Name, s.LogoUrl, s.StoreDescription,
                s.DeliveryEnabled, s.DeliveryFee, s.MinOrderAmount,
                s.IsPremium, s.PremiumTier, s.StoreLat, s.StoreLng,
                s.Phone, s.Address, s.Categories,
                DistanceKm = Math.Round(CalculateDistance((double)lat, (double)lng, (double)s.StoreLat!, (double)s.StoreLng!), 1)
            })
            .Where(s => s.DistanceKm <= radiusKm)
            .OrderByDescending(s => s.IsPremium)
            .ThenBy(s => s.DistanceKm)
            .Take(30)
            .ToList();

        return Ok(nearby);
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Earth radius in km
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    /// <summary>
    /// Get featured/premium stores
    /// </summary>
    [HttpGet("stores/featured")]
    public async Task<ActionResult> GetFeaturedStores()
    {
        var stores = await _context.Companies
            .Where(c => c.IsOnlineStoreEnabled && c.Status == "active" && c.IsPremium)
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.LogoUrl,
                c.StoreBannerUrl,
                c.StoreDescription,
                c.StoreThemeColor,
                c.DeliveryEnabled,
                c.DeliveryFee,
                c.MinOrderAmount,
                c.PremiumTier,
                c.StoreLat,
                c.StoreLng,
                c.Phone,
                c.Address
            })
            .ToListAsync();

        return Ok(stores);
    }

    /// <summary>
    /// Get active banners/ads for a placement
    /// </summary>
    [HttpGet("banners")]
    public async Task<ActionResult> GetBanners([FromQuery] string? placement)
    {
        var now = DateTime.UtcNow;
        var query = _context.Ads
            .Include(a => a.Placement)
            .Include(a => a.Company)
            .Where(a => a.IsActive && a.StartDate <= now && a.EndDate >= now);

        if (!string.IsNullOrEmpty(placement))
        {
            query = query.Where(a => a.Placement.Name == placement);
        }

        var banners = await query
            .OrderBy(a => a.Placement.Name)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.ImageUrl,
                a.LinkUrl,
                PlacementName = a.Placement.Name,
                CompanyName = a.Company != null ? a.Company.Name : null,
                CompanyId = a.CompanyId
            })
            .ToListAsync();

        // Increment impressions
        var adIds = banners.Select(b => b.Id).ToList();
        await _context.Ads
            .Where(a => adIds.Contains(a.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.Impressions, a => a.Impressions + 1));

        return Ok(banners);
    }

    /// <summary>
    /// Track ad click
    /// </summary>
    [HttpPost("banners/{id}/click")]
    public async Task<ActionResult> TrackClick(int id)
    {
        var ad = await _context.Ads.FindAsync(id);
        if (ad == null) return NotFound();

        ad.Clicks++;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Click tracked" });
    }
}
