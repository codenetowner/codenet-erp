using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.DTOs;
using Catalyst.API.Models;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// SuperAdmin Login
    /// </summary>
    [HttpPost("superadmin/login")]
    public async Task<ActionResult<LoginResponse>> SuperAdminLogin([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginSuperAdminAsync(request);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// Company Admin Login
    /// </summary>
    [HttpPost("company/login")]
    public async Task<ActionResult<LoginResponse>> CompanyLogin([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginCompanyAsync(request);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// Employee Login (requires company context)
    /// </summary>
    [HttpPost("employee/login")]
    public async Task<ActionResult<LoginResponse>> EmployeeLogin([FromBody] LoginRequest request, [FromHeader(Name = "X-Company-Id")] string? companyIdHeader)
    {
        if (string.IsNullOrEmpty(companyIdHeader) || !int.TryParse(companyIdHeader, out int companyId) || companyId <= 0)
            return BadRequest(new { message = "Company ID is required" });

        var result = await _authService.LoginEmployeeAsync(request, companyId);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// Lookup employee's company by username
    /// </summary>
    [HttpPost("employee/lookup")]
    public async Task<ActionResult> LookupEmployee([FromBody] EmployeeLookupRequest request)
    {
        var result = await _authService.LookupEmployeeCompanyAsync(request.Username);
        if (result == null)
            return NotFound(new { message = "Employee not found" });

        return Ok(new { companyId = result });
    }

    /// <summary>
    /// Driver Login with Password
    /// </summary>
    [HttpPost("driver/login")]
    public async Task<ActionResult<LoginResponse>> DriverLogin([FromBody] DriverLoginRequest request)
    {
        var result = await _authService.LoginDriverAsync(request.Username, request.Password);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// Salesman Login with Password
    /// </summary>
    [HttpPost("salesman/login")]
    public async Task<ActionResult<LoginResponse>> SalesmanLogin([FromBody] DriverLoginRequest request)
    {
        var result = await _authService.LoginSalesmanAsync(request.Username, request.Password);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password" });

        return Ok(result);
    }

    /// <summary>
    /// Get current user info
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public ActionResult<UserInfo> GetCurrentUser()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        var username = User.FindFirst("username")?.Value;
        var companyId = User.FindFirst("company_id")?.Value;
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        var isDriver = User.FindFirst("is_driver")?.Value == "true";
        var isSuperAdmin = User.FindFirst("is_superadmin")?.Value == "true";

        return Ok(new UserInfo
        {
            Id = int.Parse(userId ?? "0"),
            Name = name ?? "",
            Username = username ?? "",
            CompanyId = string.IsNullOrEmpty(companyId) ? null : int.Parse(companyId),
            Role = role,
            IsDriver = isDriver,
            IsSuperAdmin = isSuperAdmin
        });
    }
}

public class DriverLoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Seed Controller - Remove in production
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public SeedController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpGet("superadmin")]
    public async Task<IActionResult> SeedSuperAdmin()
    {
        // Check if superadmin already exists
        var existing = await _context.SuperadminUsers.FirstOrDefaultAsync(s => s.Username == "superadmin");
        if (existing != null)
        {
            // Update password
            existing.PasswordHash = _authService.HashPassword("Admin@123");
            await _context.SaveChangesAsync();
            return Ok(new { message = "SuperAdmin password updated", username = "superadmin", password = "Admin@123" });
        }

        var superadmin = new SuperadminUser
        {
            Username = "superadmin",
            PasswordHash = _authService.HashPassword("Admin@123"),
            Name = "Super Administrator",
            Email = "admin@Catalyst.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.SuperadminUsers.Add(superadmin);
        await _context.SaveChangesAsync();

        return Ok(new { message = "SuperAdmin created", username = "superadmin", password = "Admin@123" });
    }

    [HttpGet("reset-company-password/{username}")]
    public async Task<IActionResult> ResetCompanyPassword(string username, [FromQuery] string newPassword = "123456")
    {
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Username == username);
        if (company == null)
            return NotFound(new { message = "Company not found" });

        company.PasswordHash = _authService.HashPassword(newPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset", username = username, password = newPassword });
    }
}
