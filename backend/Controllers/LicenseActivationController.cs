using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/licenses")]
public class LicenseActivationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public LicenseActivationController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    // POST: api/licenses/activate
    // Public endpoint for installer to validate and activate license
    [HttpPost("activate")]
    public async Task<ActionResult<LicenseActivationResponse>> ActivateLicense([FromBody] ActivateLicenseRequest request)
    {
        if (string.IsNullOrEmpty(request.LicenseKey))
            return BadRequest(new { error = "License key is required" });

        if (string.IsNullOrEmpty(request.MachineFingerprint))
            return BadRequest(new { error = "Machine fingerprint is required" });

        var license = await _context.Licenses
            .Include(l => l.Company)
            .Include(l => l.Activations)
            .FirstOrDefaultAsync(l => l.LicenseKey == request.LicenseKey);

        if (license == null)
            return NotFound(new { error = "Invalid license key" });

        // Check license status
        if (license.Status == "revoked")
            return BadRequest(new { error = "License has been revoked" });

        if (license.Status == "suspended")
            return BadRequest(new { error = "License has been suspended" });

        // Check expiry (with grace period)
        var effectiveExpiry = license.ExpiresAt.AddDays(license.GracePeriodDays);
        if (DateTime.UtcNow > effectiveExpiry)
            return BadRequest(new { error = "License has expired", expiredAt = license.ExpiresAt });

        // Check if this machine is already activated
        var existingActivation = license.Activations
            .FirstOrDefault(a => a.MachineFingerprint == request.MachineFingerprint);

        if (existingActivation != null)
        {
            // Update last seen and reactivate if needed
            existingActivation.LastSeen = DateTime.UtcNow;
            existingActivation.MachineName = request.MachineName ?? existingActivation.MachineName;
            existingActivation.OsInfo = request.OsInfo ?? existingActivation.OsInfo;
            existingActivation.IpAddress = GetClientIpAddress();

            if (!existingActivation.IsActive)
            {
                existingActivation.IsActive = true;
                existingActivation.DeactivatedAt = null;
                license.ActivatedDevices++;
            }

            license.LastCheckIn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(BuildActivationResponse(license, existingActivation));
        }

        // Check device limit
        if (license.ActivatedDevices >= license.MaxDevices)
            return BadRequest(new { 
                error = "Device limit reached", 
                maxDevices = license.MaxDevices,
                activatedDevices = license.ActivatedDevices
            });

        // Create new activation
        var activation = new LicenseActivation
        {
            LicenseId = license.Id,
            MachineFingerprint = request.MachineFingerprint,
            MachineName = request.MachineName,
            OsInfo = request.OsInfo,
            IpAddress = GetClientIpAddress(),
            IsActive = true
        };

        _context.LicenseActivations.Add(activation);
        license.ActivatedDevices++;
        license.LastCheckIn = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(BuildActivationResponse(license, activation));
    }

    // POST: api/licenses/check-in
    // Periodic check-in to verify license and sync subscription status
    [HttpPost("check-in")]
    public async Task<ActionResult<object>> CheckIn([FromBody] CheckInRequest request)
    {
        if (string.IsNullOrEmpty(request.LicenseKey))
            return BadRequest(new { error = "License key is required" });

        var license = await _context.Licenses
            .Include(l => l.Company)
            .Include(l => l.Activations)
            .FirstOrDefaultAsync(l => l.LicenseKey == request.LicenseKey);

        if (license == null)
            return NotFound(new { error = "Invalid license key" });

        // Update activation last seen
        if (!string.IsNullOrEmpty(request.MachineFingerprint))
        {
            var activation = license.Activations
                .FirstOrDefault(a => a.MachineFingerprint == request.MachineFingerprint && a.IsActive);

            if (activation != null)
            {
                activation.LastSeen = DateTime.UtcNow;
                activation.IpAddress = GetClientIpAddress();
            }
        }

        license.LastCheckIn = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var isExpired = DateTime.UtcNow > license.ExpiresAt;
        var isInGracePeriod = isExpired && DateTime.UtcNow <= license.ExpiresAt.AddDays(license.GracePeriodDays);
        var daysUntilExpiry = (license.ExpiresAt - DateTime.UtcNow).Days;

        return Ok(new
        {
            valid = license.Status == "active" && !isExpired,
            status = license.Status,
            expiresAt = license.ExpiresAt,
            daysUntilExpiry = daysUntilExpiry,
            isExpired = isExpired,
            isInGracePeriod = isInGracePeriod,
            gracePeriodDays = license.GracePeriodDays,
            features = license.Features
        });
    }

    // POST: api/licenses/validate
    // Quick validation without activation (for checking license before install)
    [HttpPost("validate")]
    public async Task<ActionResult<object>> ValidateLicense([FromBody] ValidateLicenseRequest request)
    {
        if (string.IsNullOrEmpty(request.LicenseKey))
            return BadRequest(new { valid = false, error = "License key is required" });

        var license = await _context.Licenses
            .Include(l => l.Company)
            .FirstOrDefaultAsync(l => l.LicenseKey == request.LicenseKey);

        if (license == null)
            return Ok(new { valid = false, error = "Invalid license key" });

        var isExpired = DateTime.UtcNow > license.ExpiresAt.AddDays(license.GracePeriodDays);
        var canActivate = license.ActivatedDevices < license.MaxDevices;

        return Ok(new
        {
            valid = license.Status == "active" && !isExpired,
            status = license.Status,
            companyName = license.Company?.Name,
            companyUsername = license.Company?.Username,
            expiresAt = license.ExpiresAt,
            maxDevices = license.MaxDevices,
            activatedDevices = license.ActivatedDevices,
            canActivate = canActivate,
            isExpired = isExpired
        });
    }

    private LicenseActivationResponse BuildActivationResponse(License license, LicenseActivation activation)
    {
        var company = license.Company!;
        var daysUntilExpiry = (license.ExpiresAt - DateTime.UtcNow).Days;

        return new LicenseActivationResponse
        {
            Success = true,
            ActivationId = activation.Id,
            LicenseKey = license.LicenseKey,
            LicenseType = license.LicenseType,
            ExpiresAt = license.ExpiresAt,
            DaysUntilExpiry = daysUntilExpiry,
            GracePeriodDays = license.GracePeriodDays,
            Features = license.Features,
            Company = new CompanyInfo
            {
                Id = company.Id,
                Name = company.Name,
                Username = company.Username,
                PasswordHash = company.PasswordHash, // Needed for offline auth
                Phone = company.Phone,
                Address = company.Address,
                LogoUrl = company.LogoUrl,
                CurrencySymbol = company.CurrencySymbol,
                PagePermissions = company.PagePermissions
            }
        };
    }

    private string? GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

public class ActivateLicenseRequest
{
    public string LicenseKey { get; set; } = string.Empty;
    public string MachineFingerprint { get; set; } = string.Empty;
    public string? MachineName { get; set; }
    public string? OsInfo { get; set; }
}

public class CheckInRequest
{
    public string LicenseKey { get; set; } = string.Empty;
    public string? MachineFingerprint { get; set; }
}

public class ValidateLicenseRequest
{
    public string LicenseKey { get; set; } = string.Empty;
}

public class LicenseActivationResponse
{
    public bool Success { get; set; }
    public int ActivationId { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int DaysUntilExpiry { get; set; }
    public int GracePeriodDays { get; set; }
    public string? Features { get; set; }
    public CompanyInfo Company { get; set; } = new();
}

public class CompanyInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string CurrencySymbol { get; set; } = "$";
    public string? PagePermissions { get; set; }
}
