using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories([FromQuery] bool? parentOnly)
    {
        var companyId = GetCompanyId();
        var query = _context.ProductCategories
            .Where(c => c.CompanyId == companyId);

        if (parentOnly == true)
            query = query.Where(c => c.ParentId == null);

        var categories = await query
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                ImageUrl = c.ImageUrl,
                ParentId = c.ParentId,
                IsActive = c.IsActive,
                SubcategoryCount = _context.ProductCategories.Count(sc => sc.ParentId == c.Id),
                ProductCount = _context.Products.Count(p => p.CategoryId == c.Id)
            })
            .ToListAsync();

        return categories;
    }

    [HttpGet("{id}/subcategories")]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetSubcategories(int id)
    {
        var companyId = GetCompanyId();
        var subcategories = await _context.ProductCategories
            .Where(c => c.CompanyId == companyId && c.ParentId == id)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                ImageUrl = c.ImageUrl,
                ParentId = c.ParentId,
                IsActive = c.IsActive,
                ProductCount = _context.Products.Count(p => p.CategoryId == c.Id)
            })
            .ToListAsync();

        return subcategories;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetCategory(int id)
    {
        var companyId = GetCompanyId();
        var c = await _context.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (c == null) return NotFound();

        return new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            ParentId = c.ParentId,
            IsActive = c.IsActive
        };
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory(CreateCategoryDto dto)
    {
        var companyId = GetCompanyId();

        var category = new ProductCategory
        {
            CompanyId = companyId,
            Name = dto.Name,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            ParentId = dto.ParentId,
            IsActive = dto.IsActive
        };

        _context.ProductCategories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryDto dto)
    {
        var companyId = GetCompanyId();
        var category = await _context.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (category == null) return NotFound();

        category.Name = dto.Name;
        category.Description = dto.Description;
        category.ImageUrl = dto.ImageUrl;
        category.ParentId = dto.ParentId;
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadCategoryImage(int id, IFormFile image)
    {
        var companyId = GetCompanyId();
        var category = await _context.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (category == null) return NotFound();

        if (image == null || image.Length == 0)
            return BadRequest(new { message = "No image uploaded" });

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "categories");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(image.FileName);
        var fileName = $"cat_{id}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        var url = $"/uploads/categories/{fileName}";
        category.ImageUrl = url;
        category.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { imageUrl = url });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var companyId = GetCompanyId();
        var category = await _context.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (category == null) return NotFound();

        // Check if category has products
        var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id);
        if (hasProducts)
            return BadRequest(new { message = "Cannot delete category with products" });

        _context.ProductCategories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int? ParentId { get; set; }
    public bool IsActive { get; set; }
    public int SubcategoryCount { get; set; }
    public int ProductCount { get; set; }
}

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int? ParentId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateCategoryDto : CreateCategoryDto { }
