using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.DTOs;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/superadmin/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<SuperAdminDashboardDto>> GetDashboard(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var companies = await _context.Companies.ToListAsync();
        
        var totalIncome = await _context.Billings
            .Where(b => b.PaymentDate >= start && b.PaymentDate <= end)
            .SumAsync(b => b.Amount);

        var totalVans = await _context.Vans.CountAsync();
        var totalDrivers = await _context.Employees.CountAsync(e => e.IsDriver);

        var recentCompanies = await _context.Companies
            .OrderByDescending(c => c.CreatedAt)
            .Take(5)
            .Select(c => new RecentCompanyDto
            {
                Id = c.Id,
                Name = c.Name,
                Status = c.Status,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        var recentBillings = await _context.Billings
            .Include(b => b.Company)
            .OrderByDescending(b => b.PaymentDate)
            .Take(5)
            .Select(b => new RecentBillingDto
            {
                Id = b.Id,
                CompanyName = b.Company.Name,
                Amount = b.Amount,
                PaymentDate = b.PaymentDate
            })
            .ToListAsync();

        return Ok(new SuperAdminDashboardDto
        {
            TotalCompanies = companies.Count,
            ActiveCompanies = companies.Count(c => c.Status == "active"),
            InactiveCompanies = companies.Count(c => c.Status == "inactive"),
            SuspendedCompanies = companies.Count(c => c.Status == "suspended"),
            TotalIncome = totalIncome,
            TotalVans = totalVans,
            TotalDrivers = totalDrivers,
            RecentCompanies = recentCompanies,
            RecentBillings = recentBillings
        });
    }
}
