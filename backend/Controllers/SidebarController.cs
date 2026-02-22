using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SidebarController : ControllerBase
{
    private readonly AppDbContext _context;

    public SidebarController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("CompanyId")?.Value;
        return int.TryParse(companyIdClaim, out var id) ? id : 0;
    }

    // GET: api/sidebar/sections
    [HttpGet("sections")]
    public async Task<ActionResult<List<SidebarSectionDto>>> GetSections()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var sections = await _context.SidebarSections
            .Where(s => s.CompanyId == companyId && s.IsActive)
            .OrderBy(s => s.SortOrder)
            .Select(s => new SidebarSectionDto
            {
                Id = s.Id,
                Name = s.Name,
                SortOrder = s.SortOrder,
                Pages = s.PageAssignments!
                    .OrderBy(p => p.SortOrder)
                    .Select(p => p.PageId)
                    .ToList()
            })
            .ToListAsync();

        return Ok(sections);
    }

    // GET: api/sidebar/config - Get full sidebar config for company
    [HttpGet("config")]
    public async Task<ActionResult<SidebarConfigDto>> GetConfig()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var sections = await _context.SidebarSections
            .Where(s => s.CompanyId == companyId && s.IsActive)
            .OrderBy(s => s.SortOrder)
            .Include(s => s.PageAssignments)
            .ToListAsync();

        var config = new SidebarConfigDto
        {
            Sections = sections.Select(s => new SidebarSectionDto
            {
                Id = s.Id,
                Name = s.Name,
                SortOrder = s.SortOrder,
                Pages = s.PageAssignments?
                    .OrderBy(p => p.SortOrder)
                    .Select(p => p.PageId)
                    .ToList() ?? new List<string>()
            }).ToList()
        };

        return Ok(config);
    }

    // POST: api/sidebar/sections
    [HttpPost("sections")]
    public async Task<ActionResult<SidebarSectionDto>> CreateSection([FromBody] CreateSectionRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var maxOrder = await _context.SidebarSections
            .Where(s => s.CompanyId == companyId)
            .MaxAsync(s => (int?)s.SortOrder) ?? 0;

        var section = new SidebarSection
        {
            CompanyId = companyId,
            Name = request.Name,
            SortOrder = maxOrder + 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SidebarSections.Add(section);
        await _context.SaveChangesAsync();

        return Ok(new SidebarSectionDto
        {
            Id = section.Id,
            Name = section.Name,
            SortOrder = section.SortOrder,
            Pages = new List<string>()
        });
    }

    // PUT: api/sidebar/sections/{id}
    [HttpPut("sections/{id}")]
    public async Task<ActionResult> UpdateSection(int id, [FromBody] UpdateSectionRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var section = await _context.SidebarSections
            .FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);

        if (section == null) return NotFound();

        section.Name = request.Name;
        section.SortOrder = request.SortOrder;
        section.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Section updated" });
    }

    // DELETE: api/sidebar/sections/{id}
    [HttpDelete("sections/{id}")]
    public async Task<ActionResult> DeleteSection(int id)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var section = await _context.SidebarSections
            .FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);

        if (section == null) return NotFound();

        _context.SidebarSections.Remove(section);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Section deleted" });
    }

    // PUT: api/sidebar/sections/{id}/pages - Set pages for a section
    [HttpPut("sections/{id}/pages")]
    public async Task<ActionResult> SetSectionPages(int id, [FromBody] SetPagesRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var section = await _context.SidebarSections
            .FirstOrDefaultAsync(s => s.Id == id && s.CompanyId == companyId);

        if (section == null) return NotFound();

        // Remove existing assignments for this section
        var existing = await _context.SidebarPageAssignments
            .Where(p => p.SectionId == id)
            .ToListAsync();
        _context.SidebarPageAssignments.RemoveRange(existing);

        // Add new assignments
        for (int i = 0; i < request.PageIds.Count; i++)
        {
            _context.SidebarPageAssignments.Add(new SidebarPageAssignment
            {
                CompanyId = companyId,
                SectionId = id,
                PageId = request.PageIds[i],
                SortOrder = i,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Pages updated" });
    }

    // PUT: api/sidebar/sections/reorder - Reorder all sections
    [HttpPut("sections/reorder")]
    public async Task<ActionResult> ReorderSections([FromBody] ReorderSectionsRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var sections = await _context.SidebarSections
            .Where(s => s.CompanyId == companyId)
            .ToListAsync();

        foreach (var item in request.SectionOrder)
        {
            var section = sections.FirstOrDefault(s => s.Id == item.Id);
            if (section != null)
            {
                section.SortOrder = item.SortOrder;
                section.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Sections reordered" });
    }

    // PUT: api/sidebar/config - Save full sidebar config (sections + pages)
    [HttpPut("config")]
    public async Task<ActionResult> SaveConfig([FromBody] SaveConfigRequest request)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        // Delete all existing sections and assignments for this company
        var existingSections = await _context.SidebarSections
            .Where(s => s.CompanyId == companyId)
            .ToListAsync();
        _context.SidebarSections.RemoveRange(existingSections);
        await _context.SaveChangesAsync();

        // Create new sections and assignments
        for (int i = 0; i < request.Sections.Count; i++)
        {
            var sectionData = request.Sections[i];
            var section = new SidebarSection
            {
                CompanyId = companyId,
                Name = sectionData.Name,
                SortOrder = i,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.SidebarSections.Add(section);
            await _context.SaveChangesAsync();

            // Add page assignments
            for (int j = 0; j < sectionData.Pages.Count; j++)
            {
                _context.SidebarPageAssignments.Add(new SidebarPageAssignment
                {
                    CompanyId = companyId,
                    SectionId = section.Id,
                    PageId = sectionData.Pages[j],
                    SortOrder = j,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Sidebar config saved" });
    }
}

// DTOs
public class SidebarSectionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<string> Pages { get; set; } = new();
}

public class SidebarConfigDto
{
    public List<SidebarSectionDto> Sections { get; set; } = new();
}

public class CreateSectionRequest
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateSectionRequest
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class SetPagesRequest
{
    public List<string> PageIds { get; set; } = new();
}

public class ReorderSectionsRequest
{
    public List<SectionOrderItem> SectionOrder { get; set; } = new();
}

public class SectionOrderItem
{
    public int Id { get; set; }
    public int SortOrder { get; set; }
}

public class SaveConfigRequest
{
    public List<SectionConfigItem> Sections { get; set; } = new();
}

public class SectionConfigItem
{
    public string Name { get; set; } = string.Empty;
    public List<string> Pages { get; set; } = new();
}
