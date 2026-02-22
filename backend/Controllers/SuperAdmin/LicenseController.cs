using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using System.Security.Cryptography;
using System.Text;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/superadmin/licenses")]
[Authorize(Roles = "SuperAdmin")]
public class LicenseController : ControllerBase
{
    private readonly AppDbContext _context;

    public LicenseController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/superadmin/licenses
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetLicenses()
    {
        var licenses = await _context.Licenses
            .Include(l => l.Company)
            .Include(l => l.Activations)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                l.LicenseKey,
                l.CompanyId,
                CompanyName = l.Company != null ? l.Company.Name : null,
                CompanyUsername = l.Company != null ? l.Company.Username : null,
                l.LicenseType,
                l.Status,
                l.MaxDevices,
                l.ActivatedDevices,
                l.IssuedAt,
                l.ExpiresAt,
                l.LastCheckIn,
                l.GracePeriodDays,
                l.Features,
                l.Notes,
                l.CreatedAt,
                ActiveActivations = l.Activations.Count(a => a.IsActive)
            })
            .ToListAsync();

        return Ok(licenses);
    }

    // GET: api/superadmin/licenses/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetLicense(int id)
    {
        var license = await _context.Licenses
            .Include(l => l.Company)
            .Include(l => l.Activations)
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                l.LicenseKey,
                l.CompanyId,
                CompanyName = l.Company != null ? l.Company.Name : null,
                CompanyUsername = l.Company != null ? l.Company.Username : null,
                l.LicenseType,
                l.Status,
                l.MaxDevices,
                l.ActivatedDevices,
                l.IssuedAt,
                l.ExpiresAt,
                l.LastCheckIn,
                l.GracePeriodDays,
                l.Features,
                l.Notes,
                l.CreatedAt,
                Activations = l.Activations.Select(a => new
                {
                    a.Id,
                    a.MachineFingerprint,
                    a.MachineName,
                    a.OsInfo,
                    a.IpAddress,
                    a.IsActive,
                    a.ActivatedAt,
                    a.LastSeen,
                    a.DeactivatedAt
                })
            })
            .FirstOrDefaultAsync();

        if (license == null)
            return NotFound();

        return Ok(license);
    }

    // POST: api/superadmin/licenses
    [HttpPost]
    public async Task<ActionResult<object>> CreateLicense([FromBody] CreateLicenseRequest request)
    {
        var company = await _context.Companies.FindAsync(request.CompanyId);
        if (company == null)
            return BadRequest("Company not found");

        var licenseKey = GenerateLicenseKey();

        var license = new License
        {
            LicenseKey = licenseKey,
            CompanyId = request.CompanyId,
            LicenseType = request.LicenseType ?? "offline",
            MaxDevices = request.MaxDevices > 0 ? request.MaxDevices : 1,
            ExpiresAt = request.ExpiresAt ?? DateTime.UtcNow.AddYears(1),
            GracePeriodDays = request.GracePeriodDays > 0 ? request.GracePeriodDays : 7,
            Features = request.Features,
            Notes = request.Notes,
            Status = "active"
        };

        _context.Licenses.Add(license);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLicense), new { id = license.Id }, new
        {
            license.Id,
            license.LicenseKey,
            license.CompanyId,
            CompanyName = company.Name,
            CompanyUsername = company.Username,
            license.LicenseType,
            license.Status,
            license.MaxDevices,
            license.ExpiresAt,
            license.GracePeriodDays,
            license.Features,
            license.CreatedAt
        });
    }

    // PUT: api/superadmin/licenses/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLicense(int id, [FromBody] UpdateLicenseRequest request)
    {
        var license = await _context.Licenses.FindAsync(id);
        if (license == null)
            return NotFound();

        if (request.Status != null)
            license.Status = request.Status;
        if (request.MaxDevices.HasValue)
            license.MaxDevices = request.MaxDevices.Value;
        if (request.ExpiresAt.HasValue)
            license.ExpiresAt = request.ExpiresAt.Value;
        if (request.GracePeriodDays.HasValue)
            license.GracePeriodDays = request.GracePeriodDays.Value;
        if (request.Features != null)
            license.Features = request.Features;
        if (request.Notes != null)
            license.Notes = request.Notes;

        license.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/superadmin/licenses/{id}/revoke
    [HttpPost("{id}/revoke")]
    public async Task<IActionResult> RevokeLicense(int id)
    {
        var license = await _context.Licenses
            .Include(l => l.Activations)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (license == null)
            return NotFound();

        license.Status = "revoked";
        license.UpdatedAt = DateTime.UtcNow;

        // Deactivate all activations
        foreach (var activation in license.Activations)
        {
            activation.IsActive = false;
            activation.DeactivatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/superadmin/licenses/{id}/renew
    [HttpPost("{id}/renew")]
    public async Task<IActionResult> RenewLicense(int id, [FromBody] RenewLicenseRequest request)
    {
        var license = await _context.Licenses.FindAsync(id);
        if (license == null)
            return NotFound();

        // Extend from current expiry or from now if already expired
        var baseDate = license.ExpiresAt > DateTime.UtcNow ? license.ExpiresAt : DateTime.UtcNow;
        license.ExpiresAt = baseDate.AddMonths(request.Months > 0 ? request.Months : 12);
        license.Status = "active";
        license.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { license.Id, license.ExpiresAt, license.Status });
    }

    // DELETE: api/superadmin/licenses/activations/{activationId}
    [HttpDelete("activations/{activationId}")]
    public async Task<IActionResult> DeactivateDevice(int activationId)
    {
        var activation = await _context.LicenseActivations
            .Include(a => a.License)
            .FirstOrDefaultAsync(a => a.Id == activationId);

        if (activation == null)
            return NotFound();

        activation.IsActive = false;
        activation.DeactivatedAt = DateTime.UtcNow;

        if (activation.License != null && activation.License.ActivatedDevices > 0)
            activation.License.ActivatedDevices--;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string GenerateLicenseKey()
    {
        // Generate a license key in format: XXXX-XXXX-XXXX-XXXX
        var bytes = RandomNumberGenerator.GetBytes(16);
        var base64 = Convert.ToBase64String(bytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "")
            .ToUpper()
            .Substring(0, 16);

        return $"{base64.Substring(0, 4)}-{base64.Substring(4, 4)}-{base64.Substring(8, 4)}-{base64.Substring(12, 4)}";
    }
}

public class CreateLicenseRequest
{
    public int CompanyId { get; set; }
    public string? LicenseType { get; set; }
    public int MaxDevices { get; set; } = 1;
    public DateTime? ExpiresAt { get; set; }
    public int GracePeriodDays { get; set; } = 7;
    public string? Features { get; set; }
    public string? Notes { get; set; }
}

public class UpdateLicenseRequest
{
    public string? Status { get; set; }
    public int? MaxDevices { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? GracePeriodDays { get; set; }
    public string? Features { get; set; }
    public string? Notes { get; set; }
}

public class RenewLicenseRequest
{
    public int Months { get; set; } = 12;
}
