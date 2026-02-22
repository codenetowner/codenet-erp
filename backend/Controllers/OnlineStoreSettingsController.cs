using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/online-store-settings")]
[Authorize]
public class OnlineStoreSettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public OnlineStoreSettingsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var claim = User.FindFirst("company_id")?.Value
                 ?? User.FindFirst("CompanyId")?.Value
                 ?? User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }

    [HttpGet]
    public async Task<ActionResult> GetSettings()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var company = await _context.Companies
            .Include(c => c.StoreCategory)
            .FirstOrDefaultAsync(c => c.Id == companyId);
        if (company == null) return NotFound(new { message = "Company not found" });

        var categories = await _context.CompanyStoreCategories
            .Where(csc => csc.CompanyId == companyId)
            .Select(csc => new { csc.StoreCategoryId, csc.StoreCategory.Name })
            .ToListAsync();

        return Ok(new
        {
            company.IsOnlineStoreEnabled,
            company.StoreDescription,
            company.StoreBannerUrl,
            company.StoreThemeColor,
            company.DeliveryEnabled,
            company.DeliveryFee,
            company.MinOrderAmount,
            company.StoreLat,
            company.StoreLng,
            company.WhatsappNumber,
            company.IsPremium,
            company.PremiumTier,
            company.StoreCategoryId,
            StoreCategoryName = company.StoreCategory?.Name,
            StoreCategories = categories
        });
    }

    [HttpPut]
    public async Task<ActionResult> UpdateSettings([FromBody] OnlineStoreSettingsDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var company = await _context.Companies.FindAsync(companyId);
        if (company == null) return NotFound(new { message = "Company not found" });

        company.IsOnlineStoreEnabled = dto.IsOnlineStoreEnabled;
        company.StoreDescription = dto.StoreDescription;
        company.StoreBannerUrl = dto.StoreBannerUrl;
        company.StoreThemeColor = dto.StoreThemeColor ?? "#003366";
        company.DeliveryEnabled = dto.DeliveryEnabled;
        company.DeliveryFee = dto.DeliveryFee;
        company.MinOrderAmount = dto.MinOrderAmount;
        company.StoreLat = dto.StoreLat;
        company.StoreLng = dto.StoreLng;
        company.WhatsappNumber = dto.WhatsappNumber;
        company.StoreCategoryId = dto.StoreCategoryId;
        company.UpdatedAt = DateTime.UtcNow;

        // Update many-to-many store categories
        if (dto.StoreCategoryIds != null)
        {
            var existing = await _context.CompanyStoreCategories
                .Where(csc => csc.CompanyId == companyId)
                .ToListAsync();
            _context.CompanyStoreCategories.RemoveRange(existing);

            foreach (var catId in dto.StoreCategoryIds)
            {
                _context.CompanyStoreCategories.Add(new Models.CompanyStoreCategory
                {
                    CompanyId = companyId,
                    StoreCategoryId = catId
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Online store settings updated" });
    }

    /// <summary>
    /// Get all available store categories for the dropdown
    /// </summary>
    [HttpGet("available-categories")]
    public async Task<ActionResult> GetAvailableCategories()
    {
        var categories = await _context.StoreCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new { c.Id, c.Name, c.NameAr, c.Icon })
            .ToListAsync();

        return Ok(categories);
    }
}

public class OnlineStoreSettingsDto
{
    public bool IsOnlineStoreEnabled { get; set; }
    public string? StoreDescription { get; set; }
    public string? StoreBannerUrl { get; set; }
    public string? StoreThemeColor { get; set; }
    public bool DeliveryEnabled { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal? StoreLat { get; set; }
    public decimal? StoreLng { get; set; }
    public string? WhatsappNumber { get; set; }
    public int? StoreCategoryId { get; set; }
    public List<int>? StoreCategoryIds { get; set; }
}
