using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeadsController : ControllerBase
{
    private readonly AppDbContext _context;

    public LeadsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value;
        return string.IsNullOrEmpty(userIdClaim) ? 0 : int.Parse(userIdClaim);
    }

    /// <summary>
    /// Get all leads with filters
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeadDto>>> GetLeads(
        [FromQuery] string? status,
        [FromQuery] int? capturedBy,
        [FromQuery] int? assignedTo,
        [FromQuery] string? search)
    {
        var companyId = GetCompanyId();
        var query = _context.Leads
            .Include(l => l.CapturedByEmployee)
            .Include(l => l.AssignedToEmployee)
            .Where(l => l.CompanyId == companyId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(l => l.Status == status);

        if (capturedBy.HasValue)
            query = query.Where(l => l.CapturedBy == capturedBy);

        if (assignedTo.HasValue)
            query = query.Where(l => l.AssignedTo == assignedTo);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(l => l.Name.ToLower().Contains(search.ToLower()) || 
                                    (l.ShopName != null && l.ShopName.ToLower().Contains(search.ToLower())) ||
                                    (l.Phone != null && l.Phone.Contains(search)));

        var leads = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();

        return leads.Select(l => new LeadDto
        {
            Id = l.Id,
            Name = l.Name,
            ShopName = l.ShopName,
            Phone = l.Phone,
            Email = l.Email,
            Address = l.Address,
            City = l.City,
            Area = l.Area,
            BusinessType = l.BusinessType,
            EstimatedPotential = l.EstimatedPotential,
            Notes = l.Notes,
            Status = l.Status,
            CapturedBy = l.CapturedByEmployee.Name,
            AssignedTo = l.AssignedToEmployee?.Name,
            CreatedAt = l.CreatedAt
        }).ToList();
    }

    /// <summary>
    /// Get lead by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<LeadDetailDto>> GetLead(int id)
    {
        var companyId = GetCompanyId();
        var l = await _context.Leads
            .Include(l => l.CapturedByEmployee)
            .Include(l => l.AssignedToEmployee)
            .Include(l => l.ConvertedCustomer)
            .FirstOrDefaultAsync(l => l.Id == id && l.CompanyId == companyId);

        if (l == null) return NotFound();

        return new LeadDetailDto
        {
            Id = l.Id,
            Name = l.Name,
            ShopName = l.ShopName,
            Phone = l.Phone,
            Email = l.Email,
            Address = l.Address,
            City = l.City,
            Area = l.Area,
            LocationLat = l.LocationLat,
            LocationLng = l.LocationLng,
            BusinessType = l.BusinessType,
            EstimatedPotential = l.EstimatedPotential,
            Notes = l.Notes,
            Status = l.Status,
            CapturedById = l.CapturedBy,
            CapturedBy = l.CapturedByEmployee.Name,
            AssignedToId = l.AssignedTo,
            AssignedTo = l.AssignedToEmployee?.Name,
            ConvertedCustomerId = l.ConvertedCustomerId,
            ConvertedCustomerName = l.ConvertedCustomer?.Name,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt
        };
    }

    /// <summary>
    /// Create a new lead (from company dashboard)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<LeadDto>> CreateLead(CreateLeadDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var lead = new Lead
        {
            CompanyId = companyId,
            Name = dto.Name,
            ShopName = dto.ShopName,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            City = dto.City,
            Area = dto.Area,
            LocationLat = dto.LocationLat,
            LocationLng = dto.LocationLng,
            BusinessType = dto.BusinessType,
            EstimatedPotential = dto.EstimatedPotential,
            Notes = dto.Notes,
            Status = "new",
            CapturedBy = userId > 0 ? userId : dto.CapturedBy ?? 1,
            AssignedTo = dto.AssignedTo,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Leads.Add(lead);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLead), new { id = lead.Id }, new LeadDto
        {
            Id = lead.Id,
            Name = lead.Name,
            ShopName = lead.ShopName,
            Phone = lead.Phone,
            Status = lead.Status,
            CreatedAt = lead.CreatedAt
        });
    }

    /// <summary>
    /// Update a lead
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLead(int id, UpdateLeadDto dto)
    {
        var companyId = GetCompanyId();
        var lead = await _context.Leads
            .FirstOrDefaultAsync(l => l.Id == id && l.CompanyId == companyId);

        if (lead == null) return NotFound();

        lead.Name = dto.Name;
        lead.ShopName = dto.ShopName;
        lead.Phone = dto.Phone;
        lead.Email = dto.Email;
        lead.Address = dto.Address;
        lead.City = dto.City;
        lead.Area = dto.Area;
        lead.BusinessType = dto.BusinessType;
        lead.EstimatedPotential = dto.EstimatedPotential;
        lead.Notes = dto.Notes;
        lead.Status = dto.Status;
        lead.AssignedTo = dto.AssignedTo;
        lead.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Convert lead to customer
    /// </summary>
    [HttpPost("{id}/convert")]
    public async Task<ActionResult<object>> ConvertToCustomer(int id, ConvertLeadDto dto)
    {
        var companyId = GetCompanyId();
        var lead = await _context.Leads
            .FirstOrDefaultAsync(l => l.Id == id && l.CompanyId == companyId);

        if (lead == null) return NotFound();

        if (lead.Status == "converted")
            return BadRequest(new { error = "Lead already converted" });

        // Generate customer code
        var lastCustomer = await _context.Customers
            .Where(c => c.CompanyId == companyId)
            .OrderByDescending(c => c.Id)
            .FirstOrDefaultAsync();

        var customerCode = $"CUST-{(lastCustomer?.Id ?? 0) + 1:D5}";

        // Build address with city and area if available
        var fullAddress = lead.Address;
        if (!string.IsNullOrEmpty(lead.Area) || !string.IsNullOrEmpty(lead.City))
        {
            var locationParts = new List<string>();
            if (!string.IsNullOrEmpty(lead.Address)) locationParts.Add(lead.Address);
            if (!string.IsNullOrEmpty(lead.Area)) locationParts.Add(lead.Area);
            if (!string.IsNullOrEmpty(lead.City)) locationParts.Add(lead.City);
            fullAddress = string.Join(", ", locationParts);
        }

        // Create customer from lead
        var customer = new Customer
        {
            CompanyId = companyId,
            Code = customerCode,
            Name = lead.Name,
            ShopName = lead.ShopName,
            Phone = lead.Phone,
            Email = lead.Email,
            Address = fullAddress,
            LocationLat = lead.LocationLat,
            LocationLng = lead.LocationLng,
            CustomerType = dto.CustomerType ?? "Retail",
            CreditLimit = dto.CreditLimit ?? 0,
            AssignedDriverId = dto.AssignedDriverId,
            Status = "active",
            Notes = $"Converted from lead. Business: {lead.BusinessType}. Potential: {lead.EstimatedPotential}. {lead.Notes}",
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        // Update lead
        lead.Status = "converted";
        lead.ConvertedCustomerId = customer.Id;
        lead.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Lead converted to customer successfully",
            customerId = customer.Id,
            customerCode = customer.Code
        });
    }

    /// <summary>
    /// Reject a lead
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectLead(int id, [FromBody] RejectLeadDto dto)
    {
        var companyId = GetCompanyId();
        var lead = await _context.Leads
            .FirstOrDefaultAsync(l => l.Id == id && l.CompanyId == companyId);

        if (lead == null) return NotFound();

        lead.Status = "rejected";
        lead.Notes = string.IsNullOrEmpty(lead.Notes) 
            ? $"Rejected: {dto.Reason}" 
            : $"{lead.Notes}\nRejected: {dto.Reason}";
        lead.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Lead rejected" });
    }

    /// <summary>
    /// Delete a lead
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLead(int id)
    {
        var companyId = GetCompanyId();
        var lead = await _context.Leads
            .FirstOrDefaultAsync(l => l.Id == id && l.CompanyId == companyId);

        if (lead == null) return NotFound();

        if (lead.Status == "converted")
            return BadRequest(new { error = "Cannot delete converted leads" });

        _context.Leads.Remove(lead);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Get leads summary/stats
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<LeadsSummaryDto>> GetSummary()
    {
        var companyId = GetCompanyId();
        var leads = await _context.Leads
            .Where(l => l.CompanyId == companyId)
            .ToListAsync();

        var thisMonth = new DateTime(TimeZoneHelper.Now.Year, TimeZoneHelper.Now.Month, 1);

        return new LeadsSummaryDto
        {
            TotalLeads = leads.Count,
            NewLeads = leads.Count(l => l.Status == "new"),
            ContactedLeads = leads.Count(l => l.Status == "contacted"),
            QualifiedLeads = leads.Count(l => l.Status == "qualified"),
            ConvertedLeads = leads.Count(l => l.Status == "converted"),
            RejectedLeads = leads.Count(l => l.Status == "rejected"),
            LeadsThisMonth = leads.Count(l => l.CreatedAt >= thisMonth),
            ConversionsThisMonth = leads.Count(l => l.Status == "converted" && l.UpdatedAt >= thisMonth)
        };
    }
}

#region DTOs

public class LeadDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Area { get; set; }
    public string? BusinessType { get; set; }
    public string? EstimatedPotential { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "new";
    public string? CapturedBy { get; set; }
    public string? AssignedTo { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LeadDetailDto : LeadDto
{
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public int CapturedById { get; set; }
    public int? AssignedToId { get; set; }
    public int? ConvertedCustomerId { get; set; }
    public string? ConvertedCustomerName { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateLeadDto
{
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Area { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string? BusinessType { get; set; }
    public string? EstimatedPotential { get; set; }
    public string? Notes { get; set; }
    public int? CapturedBy { get; set; }
    public int? AssignedTo { get; set; }
}

public class UpdateLeadDto
{
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Area { get; set; }
    public string? BusinessType { get; set; }
    public string? EstimatedPotential { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "new";
    public int? AssignedTo { get; set; }
}

public class ConvertLeadDto
{
    public string? CustomerType { get; set; } // retail, wholesale
    public string? PriceCategory { get; set; } // retail, wholesale
    public decimal? CreditLimit { get; set; }
    public int? PaymentTerms { get; set; }
    public int? AssignedDriverId { get; set; }
}

public class RejectLeadDto
{
    public string? Reason { get; set; }
}

public class LeadsSummaryDto
{
    public int TotalLeads { get; set; }
    public int NewLeads { get; set; }
    public int ContactedLeads { get; set; }
    public int QualifiedLeads { get; set; }
    public int ConvertedLeads { get; set; }
    public int RejectedLeads { get; set; }
    public int LeadsThisMonth { get; set; }
    public int ConversionsThisMonth { get; set; }
}

#endregion
