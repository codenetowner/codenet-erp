using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnitsController : ControllerBase
{
    private readonly AppDbContext _context;

    public UnitsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UnitDto>>> GetUnits([FromQuery] bool? activeOnly)
    {
        var companyId = GetCompanyId();
        var query = _context.Units.Where(u => u.CompanyId == companyId);

        var units = await query
            .OrderBy(u => u.Name)
            .Select(u => new UnitDto
            {
                Id = u.Id,
                Name = u.Name,
                Abbreviation = u.Abbreviation,
                Symbol = u.Symbol,
                IsBase = u.IsBase
            })
            .ToListAsync();

        return units;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UnitDto>> GetUnit(int id)
    {
        var companyId = GetCompanyId();
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId);

        if (unit == null) return NotFound();

        return new UnitDto
        {
            Id = unit.Id,
            Name = unit.Name,
            Abbreviation = unit.Abbreviation,
            Symbol = unit.Symbol,
            IsBase = unit.IsBase
        };
    }

    [HttpPost]
    public async Task<ActionResult<UnitDto>> CreateUnit(CreateUnitDto dto)
    {
        var companyId = GetCompanyId();

        // Check for duplicate name
        var exists = await _context.Units
            .AnyAsync(u => u.CompanyId == companyId && u.Name.ToLower() == dto.Name.ToLower());
        if (exists)
            return BadRequest(new { message = "A unit with this name already exists" });

        var unit = new Unit
        {
            CompanyId = companyId,
            Name = dto.Name,
            Abbreviation = dto.Abbreviation,
            Symbol = dto.Symbol,
            IsBase = dto.IsBase
        };

        _context.Units.Add(unit);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUnit), new { id = unit.Id }, new UnitDto
        {
            Id = unit.Id,
            Name = unit.Name,
            Abbreviation = unit.Abbreviation,
            Symbol = unit.Symbol,
            IsBase = unit.IsBase
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUnit(int id, UpdateUnitDto dto)
    {
        var companyId = GetCompanyId();
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId);

        if (unit == null) return NotFound();

        // Check for duplicate name (excluding current)
        var exists = await _context.Units
            .AnyAsync(u => u.CompanyId == companyId && u.Id != id && u.Name.ToLower() == dto.Name.ToLower());
        if (exists)
            return BadRequest(new { message = "A unit with this name already exists" });

        unit.Name = dto.Name;
        unit.Abbreviation = dto.Abbreviation;
        unit.Symbol = dto.Symbol;
        unit.IsBase = dto.IsBase;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUnit(int id)
    {
        var companyId = GetCompanyId();
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == companyId);

        if (unit == null) return NotFound();

        _context.Units.Remove(unit);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class UnitDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Abbreviation { get; set; }
    public string? Symbol { get; set; }
    public bool IsBase { get; set; }
}

public class CreateUnitDto
{
    public string Name { get; set; } = string.Empty;
    public string? Abbreviation { get; set; }
    public string? Symbol { get; set; }
    public bool IsBase { get; set; } = false;
}

public class UpdateUnitDto : CreateUnitDto { }
