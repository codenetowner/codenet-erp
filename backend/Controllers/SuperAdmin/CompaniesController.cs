using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.DTOs;
using Catalyst.API.Models;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/superadmin/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public CompaniesController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CompanyListDto>>> GetCompanies(
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        var query = _context.Companies
            .Include(c => c.Plan)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(c => c.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => 
                c.Name.Contains(search) || 
                c.Username.Contains(search) || 
                (c.Phone != null && c.Phone.Contains(search)));

        var companies = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CompanyListDto
            {
                Id = c.Id,
                Name = c.Name,
                Username = c.Username,
                Phone = c.Phone,
                Address = c.Address,
                Status = c.Status,
                PlanId = c.PlanId,
                LogoUrl = c.LogoUrl,
                PlanName = c.Plan != null ? c.Plan.Name : null,
                PlanPrice = c.Plan != null ? c.Plan.Price : null,
                PlanDurationDays = c.Plan != null ? c.Plan.DurationDays : null,
                PlanExpiryDate = c.PlanExpiryDate,
                CreatedAt = c.CreatedAt,
                StoreCategoryId = c.StoreCategoryId,
                StoreCategoryName = c.StoreCategory != null ? c.StoreCategory.Name : null,
                IsOnlineStoreEnabled = c.IsOnlineStoreEnabled,
                IsPremium = c.IsPremium,
                PremiumTier = c.PremiumTier
            })
            .ToListAsync();

        return Ok(companies);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CompanyDetailDto>> GetCompany(int id)
    {
        var company = await _context.Companies
            .Include(c => c.Plan)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
            return NotFound(new { message = "Company not found" });

        var employeeCount = await _context.Employees.CountAsync(e => e.CompanyId == id);
        var driverCount = await _context.Employees.CountAsync(e => e.CompanyId == id && e.IsDriver);
        var vanCount = await _context.Vans.CountAsync(v => v.CompanyId == id);
        var customerCount = await _context.Customers.CountAsync(c => c.CompanyId == id);

        var storeCategoryName = company.StoreCategoryId.HasValue
            ? await _context.StoreCategories.Where(sc => sc.Id == company.StoreCategoryId).Select(sc => sc.Name).FirstOrDefaultAsync()
            : null;

        return Ok(new CompanyDetailDto
        {
            Id = company.Id,
            Name = company.Name,
            Username = company.Username,
            Phone = company.Phone,
            Address = company.Address,
            LogoUrl = company.LogoUrl,
            CurrencySymbol = company.CurrencySymbol,
            LowStockAlert = company.LowStockAlert,
            MaxCashWarning = company.MaxCashWarning,
            PlanId = company.PlanId,
            PlanName = company.Plan?.Name,
            PlanExpiryDate = company.PlanExpiryDate,
            Status = company.Status,
            Notes = company.Notes,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt,
            StoreCategoryId = company.StoreCategoryId,
            StoreCategoryName = storeCategoryName,
            IsOnlineStoreEnabled = company.IsOnlineStoreEnabled,
            IsPremium = company.IsPremium,
            PremiumTier = company.PremiumTier,
            EmployeeCount = employeeCount,
            DriverCount = driverCount,
            VanCount = vanCount,
            CustomerCount = customerCount
        });
    }

    [HttpPost]
    public async Task<ActionResult<CompanyDetailDto>> CreateCompany([FromBody] CreateCompanyRequest request)
    {
        // Check if username exists
        var exists = await _context.Companies.AnyAsync(c => c.Username == request.Username);
        if (exists)
            return BadRequest(new { message = "Username already exists" });

        // Convert PlanExpiryDate to UTC if provided
        DateTime? planExpiry = null;
        if (request.PlanExpiryDate.HasValue)
        {
            planExpiry = DateTime.SpecifyKind(request.PlanExpiryDate.Value, DateTimeKind.Utc);
        }

        var company = new Company
        {
            Name = request.Name,
            Username = request.Username,
            PasswordHash = _authService.HashPassword(request.Password),
            Phone = request.Phone,
            Address = request.Address,
            PlanId = request.PlanId,
            PlanExpiryDate = planExpiry,
            Status = request.Status,
            Notes = request.Notes,
            StoreCategoryId = request.StoreCategoryId,
            IsOnlineStoreEnabled = request.IsOnlineStoreEnabled,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Companies.Add(company);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCompany), new { id = company.Id }, new CompanyDetailDto
        {
            Id = company.Id,
            Name = company.Name,
            Username = company.Username,
            Status = company.Status,
            CreatedAt = company.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateCompany(int id, [FromBody] UpdateCompanyRequest request)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        // Convert PlanExpiryDate to UTC if provided
        DateTime? planExpiry = null;
        if (request.PlanExpiryDate.HasValue)
        {
            planExpiry = DateTime.SpecifyKind(request.PlanExpiryDate.Value, DateTimeKind.Utc);
        }

        company.Name = request.Name;
        company.Phone = request.Phone;
        company.Address = request.Address;
        company.LogoUrl = request.LogoUrl;
        company.PlanId = request.PlanId;
        company.PlanExpiryDate = planExpiry;
        company.Status = request.Status;
        company.Notes = request.Notes;
        company.StoreCategoryId = request.StoreCategoryId;
        company.IsOnlineStoreEnabled = request.IsOnlineStoreEnabled;
        company.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.NewPassword))
            company.PasswordHash = _authService.HashPassword(request.NewPassword);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Company updated successfully" });
    }

    [HttpPatch("{id}/reset-password")]
    public async Task<ActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest request)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        company.PasswordHash = _authService.HashPassword(request.NewPassword);
        company.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset successfully" });
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        company.Status = request.Status;
        company.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Company status updated to {request.Status}" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteCompany(int id)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        // Check if company has data
        var hasEmployees = await _context.Employees.AnyAsync(e => e.CompanyId == id);
        if (hasEmployees)
            return BadRequest(new { message = "Cannot delete company with employees. Suspend it instead." });

        _context.Companies.Remove(company);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Company deleted successfully" });
    }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
