using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CurrenciesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CurrenciesController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CurrencyDto>>> GetCurrencies()
    {
        var companyId = GetCompanyId();
        var currencies = await _context.Currencies
            .Where(c => c.CompanyId == companyId)
            .OrderByDescending(c => c.IsBase).ThenBy(c => c.Code)
            .Select(c => new CurrencyDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                Symbol = c.Symbol,
                ExchangeRate = c.ExchangeRate,
                IsBase = c.IsBase,
                IsActive = c.IsActive
            })
            .ToListAsync();

        return currencies;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CurrencyDto>> GetCurrency(int id)
    {
        var companyId = GetCompanyId();
        var c = await _context.Currencies
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (c == null) return NotFound();

        return new CurrencyDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            Symbol = c.Symbol,
            ExchangeRate = c.ExchangeRate,
            IsBase = c.IsBase,
            IsActive = c.IsActive
        };
    }

    [HttpPost]
    public async Task<ActionResult<CurrencyDto>> CreateCurrency(CreateCurrencyDto dto)
    {
        var companyId = GetCompanyId();

        // Check if code already exists
        var exists = await _context.Currencies.AnyAsync(c => c.CompanyId == companyId && c.Code == dto.Code);
        if (exists)
            return BadRequest(new { message = "Currency code already exists" });

        // If this is base currency, unset other base currencies
        if (dto.IsBase)
        {
            var baseCurrencies = await _context.Currencies
                .Where(c => c.CompanyId == companyId && c.IsBase)
                .ToListAsync();
            foreach (var bc in baseCurrencies)
                bc.IsBase = false;
        }

        var currency = new Currency
        {
            CompanyId = companyId,
            Code = dto.Code.ToUpper(),
            Name = dto.Name,
            Symbol = dto.Symbol,
            ExchangeRate = dto.ExchangeRate,
            IsBase = dto.IsBase,
            IsActive = dto.IsActive
        };

        _context.Currencies.Add(currency);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCurrency), new { id = currency.Id }, new CurrencyDto
        {
            Id = currency.Id,
            Code = currency.Code,
            Name = currency.Name,
            Symbol = currency.Symbol,
            ExchangeRate = currency.ExchangeRate,
            IsBase = currency.IsBase,
            IsActive = currency.IsActive
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCurrency(int id, UpdateCurrencyDto dto)
    {
        var companyId = GetCompanyId();
        var currency = await _context.Currencies
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (currency == null) return NotFound();

        // Check if code already exists (excluding current)
        var exists = await _context.Currencies.AnyAsync(c => c.CompanyId == companyId && c.Code == dto.Code && c.Id != id);
        if (exists)
            return BadRequest(new { message = "Currency code already exists" });

        // If this is base currency, unset other base currencies
        if (dto.IsBase && !currency.IsBase)
        {
            var baseCurrencies = await _context.Currencies
                .Where(c => c.CompanyId == companyId && c.IsBase && c.Id != id)
                .ToListAsync();
            foreach (var bc in baseCurrencies)
                bc.IsBase = false;
        }

        currency.Code = dto.Code.ToUpper();
        currency.Name = dto.Name;
        currency.Symbol = dto.Symbol;
        currency.ExchangeRate = dto.ExchangeRate;
        currency.IsBase = dto.IsBase;
        currency.IsActive = dto.IsActive;
        currency.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCurrency(int id)
    {
        var companyId = GetCompanyId();
        var currency = await _context.Currencies
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (currency == null) return NotFound();

        if (currency.IsBase)
            return BadRequest(new { message = "Cannot delete base currency" });

        _context.Currencies.Remove(currency);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CurrencyDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal ExchangeRate { get; set; }
    public bool IsBase { get; set; }
    public bool IsActive { get; set; }
}

public class CreateCurrencyDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal ExchangeRate { get; set; } = 1.0m;
    public bool IsBase { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class UpdateCurrencyDto : CreateCurrencyDto { }
