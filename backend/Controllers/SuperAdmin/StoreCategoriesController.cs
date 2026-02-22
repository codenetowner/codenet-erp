using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/store-categories")]
[Authorize(Roles = "SuperAdmin")]
public class StoreCategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public StoreCategoriesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var categories = await _context.StoreCategories
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
                c.IsActive,
                c.CreatedAt,
                StoreCount = _context.CompanyStoreCategories.Count(csc => csc.StoreCategoryId == c.Id)
            })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(int id)
    {
        var category = await _context.StoreCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Store category not found" });

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] StoreCategoryDto dto)
    {
        var category = new StoreCategory
        {
            Name = dto.Name,
            NameAr = dto.NameAr,
            Icon = dto.Icon,
            ImageUrl = dto.ImageUrl,
            SortOrder = dto.SortOrder,
            IsActive = dto.IsActive
        };

        _context.StoreCategories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] StoreCategoryDto dto)
    {
        var category = await _context.StoreCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Store category not found" });

        category.Name = dto.Name;
        category.NameAr = dto.NameAr;
        category.Icon = dto.Icon;
        category.ImageUrl = dto.ImageUrl;
        category.SortOrder = dto.SortOrder;
        category.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var category = await _context.StoreCategories.FindAsync(id);
        if (category == null)
            return NotFound(new { message = "Store category not found" });

        var hasCompanies = await _context.CompanyStoreCategories.AnyAsync(csc => csc.StoreCategoryId == id);
        if (hasCompanies)
            return BadRequest(new { message = "Cannot delete category that has stores assigned. Deactivate it instead." });

        _context.StoreCategories.Remove(category);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Store category deleted" });
    }
}

public class StoreCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string? Icon { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
