using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult> GetSettings()
    {
        var companyId = GetCompanyId();
        if (companyId == 0)
            return Unauthorized();

        var company = await _context.Companies.FindAsync(companyId);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        return Ok(new
        {
            name = company.Name,
            phone = company.Phone,
            address = company.Address,
            logoUrl = company.LogoUrl,
            exchangeRate = company.ExchangeRate,
            showSecondaryPrice = company.ShowSecondaryPrice,
            currencySymbol = company.CurrencySymbol
        });
    }

    [HttpPut]
    public async Task<ActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0)
            return Unauthorized();

        var company = await _context.Companies.FindAsync(companyId);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        company.Name = request.Name ?? company.Name;
        company.Phone = request.Phone;
        company.Address = request.Address;
        if (request.ExchangeRate.HasValue)
            company.ExchangeRate = request.ExchangeRate.Value;
        if (request.ShowSecondaryPrice.HasValue)
            company.ShowSecondaryPrice = request.ShowSecondaryPrice.Value;
        if (request.CurrencySymbol != null)
            company.CurrencySymbol = request.CurrencySymbol;
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Settings updated successfully" });
    }
}

public class UpdateSettingsRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal? ExchangeRate { get; set; }
    public bool? ShowSecondaryPrice { get; set; }
    public string? CurrencySymbol { get; set; }
}
