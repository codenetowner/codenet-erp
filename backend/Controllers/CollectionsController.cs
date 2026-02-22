using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CollectionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CollectionsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetCollections(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId,
        [FromQuery] int? driverId,
        [FromQuery] int? vanId,
        [FromQuery] DateTime? date)
    {
        var companyId = GetCompanyId();
        var query = _context.Collections
            .Include(c => c.Customer)
            .Include(c => c.Driver)
            .Where(c => c.CompanyId == companyId);

        if (date.HasValue)
            query = query.Where(c => c.CollectionDate.Date == date.Value.Date);

        if (startDate.HasValue)
            query = query.Where(c => c.CollectionDate.Date >= startDate.Value.Date);

        if (endDate.HasValue)
            query = query.Where(c => c.CollectionDate.Date <= endDate.Value.Date);

        if (customerId.HasValue)
            query = query.Where(c => c.CustomerId == customerId);

        if (driverId.HasValue)
            query = query.Where(c => c.DriverId == driverId);

        if (vanId.HasValue)
        {
            // Get driver ID assigned to this van
            var van = await _context.Vans.FirstOrDefaultAsync(v => v.Id == vanId.Value);
            if (van?.AssignedDriverId.HasValue == true)
                query = query.Where(c => c.DriverId == van.AssignedDriverId.Value);
            // If no driver assigned, don't filter by driver - show all collections for selected date
        }

        var collections = await query
            .OrderByDescending(c => c.CollectionDate)
            .ThenByDescending(c => c.Id)
            .Select(c => new
            {
                c.Id,
                c.CollectionNumber,
                c.CustomerId,
                CustomerName = c.Customer.Name,
                c.DriverId,
                DriverName = c.Driver != null ? c.Driver.Name : null,
                c.Amount,
                c.PaymentType,
                c.CollectionDate,
                c.CollectionTime,
                c.CheckNumber,
                c.CheckDate,
                c.BankName,
                c.Notes,
                c.CreatedAt
            })
            .ToListAsync();

        return Ok(collections);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetCollection(int id)
    {
        var companyId = GetCompanyId();
        var collection = await _context.Collections
            .Include(c => c.Customer)
            .Include(c => c.Driver)
            .Where(c => c.Id == id && c.CompanyId == companyId)
            .Select(c => new
            {
                c.Id,
                c.CollectionNumber,
                c.CustomerId,
                CustomerName = c.Customer.Name,
                c.DriverId,
                DriverName = c.Driver != null ? c.Driver.Name : null,
                c.Amount,
                c.PaymentType,
                c.CollectionDate,
                c.CollectionTime,
                c.CheckNumber,
                c.CheckDate,
                c.BankName,
                c.Notes,
                c.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (collection == null)
            return NotFound();

        return Ok(collection);
    }
}
