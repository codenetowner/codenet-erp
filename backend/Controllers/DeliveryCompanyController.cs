using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Claims;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/delivery-company")]
public class DeliveryCompanyController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public DeliveryCompanyController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    private int GetCompanyId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? int.Parse(claim.Value) : 0;
    }

    // ────────────── AUTH ──────────────

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] DeliveryCompanyRegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Company name is required" });

        var exists = await _context.DeliveryCompanies.AnyAsync(c => c.Phone == dto.Phone);
        if (exists)
            return BadRequest(new { message = "Phone number already registered" });

        var company = new DeliveryCompany
        {
            Name = dto.Name.Trim(),
            Phone = dto.Phone.Trim(),
            Email = dto.Email?.Trim(),
            Address = dto.Address?.Trim(),
            ContactPerson = dto.ContactPerson?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.DeliveryCompanies.Add(company);
        await _context.SaveChangesAsync();

        var token = GenerateToken(company);
        return Ok(new
        {
            token,
            company = new { company.Id, company.Name, company.Phone, company.Email }
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] DeliveryCompanyLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var company = await _context.DeliveryCompanies.FirstOrDefaultAsync(c => c.Phone == dto.Phone);
        if (company == null)
            return Unauthorized(new { message = "Invalid phone or password" });

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, company.PasswordHash))
            return Unauthorized(new { message = "Invalid phone or password" });

        if (!company.IsActive)
            return Unauthorized(new { message = "Account is disabled" });

        var token = GenerateToken(company);
        return Ok(new
        {
            token,
            company = new { company.Id, company.Name, company.Phone, company.Email }
        });
    }

    private string GenerateToken(DeliveryCompany company)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["JwtSettings:Secret"] ?? "SuperSecretKeyThatIsLongEnough123!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, company.Id.ToString()),
            new Claim(ClaimTypes.Name, company.Name),
            new Claim(ClaimTypes.MobilePhone, company.Phone),
            new Claim(ClaimTypes.Role, "DeliveryCompany")
        };

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"] ?? "CatalystAPI",
            audience: _config["JwtSettings:Audience"] ?? "CatalystClients",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(90),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ────────────── PROFILE ──────────────

    [Authorize(Roles = "DeliveryCompany")]
    [HttpGet("profile")]
    public async Task<ActionResult> GetProfile()
    {
        var id = GetCompanyId();
        var company = await _context.DeliveryCompanies.FindAsync(id);
        if (company == null) return NotFound();

        var driverCount = await _context.FreelanceDrivers.CountAsync(d => d.DeliveryCompanyId == id);

        return Ok(new
        {
            company.Id, company.Name, company.Phone, company.Email,
            company.Address, company.ContactPerson, company.LogoUrl,
            company.IsActive, company.CreatedAt,
            driverCount
        });
    }

    [Authorize(Roles = "DeliveryCompany")]
    [HttpPut("profile")]
    public async Task<ActionResult> UpdateProfile([FromBody] DeliveryCompanyUpdateDto dto)
    {
        var id = GetCompanyId();
        var company = await _context.DeliveryCompanies.FindAsync(id);
        if (company == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) company.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) company.Email = dto.Email.Trim();
        if (dto.Address != null) company.Address = dto.Address.Trim();
        if (dto.ContactPerson != null) company.ContactPerson = dto.ContactPerson.Trim();
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Profile updated" });
    }

    // ────────────── DRIVERS ──────────────

    [Authorize(Roles = "DeliveryCompany")]
    [HttpGet("drivers")]
    public async Task<ActionResult> GetDrivers()
    {
        var id = GetCompanyId();
        var drivers = await _context.FreelanceDrivers
            .Where(d => d.DeliveryCompanyId == id)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id, d.Name, d.Phone, d.Email, d.VehicleType, d.VehiclePlate,
                d.Status, d.IsOnline, d.Rating, d.TotalDeliveries, d.TotalEarnings,
                d.CreatedAt
            })
            .ToListAsync();

        return Ok(drivers);
    }

    [Authorize(Roles = "DeliveryCompany")]
    [HttpPost("drivers")]
    public async Task<ActionResult> AddDriver([FromBody] AddDriverDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Driver name is required" });

        var companyId = GetCompanyId();

        var exists = await _context.FreelanceDrivers.AnyAsync(d => d.Phone == dto.Phone);
        if (exists)
            return BadRequest(new { message = "Phone number already registered" });

        var driver = new FreelanceDriver
        {
            Name = dto.Name.Trim(),
            Phone = dto.Phone.Trim(),
            Email = dto.Email?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            VehicleType = dto.VehicleType ?? "car",
            VehiclePlate = dto.VehiclePlate,
            VehicleColor = dto.VehicleColor,
            DeliveryCompanyId = companyId,
            Status = "approved",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ApprovedAt = DateTime.UtcNow
        };

        _context.FreelanceDrivers.Add(driver);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Driver added",
            driver = new { driver.Id, driver.Name, driver.Phone, driver.Status }
        });
    }

    [Authorize(Roles = "DeliveryCompany")]
    [HttpPut("drivers/{driverId}")]
    public async Task<ActionResult> UpdateDriver(int driverId, [FromBody] UpdateDriverDto dto)
    {
        var companyId = GetCompanyId();
        var driver = await _context.FreelanceDrivers
            .FirstOrDefaultAsync(d => d.Id == driverId && d.DeliveryCompanyId == companyId);

        if (driver == null)
            return NotFound(new { message = "Driver not found" });

        if (!string.IsNullOrWhiteSpace(dto.Name)) driver.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) driver.Email = dto.Email?.Trim();
        if (dto.VehicleType != null) driver.VehicleType = dto.VehicleType;
        if (dto.VehiclePlate != null) driver.VehiclePlate = dto.VehiclePlate;
        if (dto.VehicleColor != null) driver.VehicleColor = dto.VehicleColor;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Driver updated" });
    }

    [Authorize(Roles = "DeliveryCompany")]
    [HttpDelete("drivers/{driverId}")]
    public async Task<ActionResult> RemoveDriver(int driverId)
    {
        var companyId = GetCompanyId();
        var driver = await _context.FreelanceDrivers
            .FirstOrDefaultAsync(d => d.Id == driverId && d.DeliveryCompanyId == companyId);

        if (driver == null)
            return NotFound(new { message = "Driver not found" });

        // Don't delete, just unlink from company
        driver.DeliveryCompanyId = null;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Driver removed from company" });
    }

    [Authorize(Roles = "DeliveryCompany")]
    [HttpPatch("drivers/{driverId}/toggle-status")]
    public async Task<ActionResult> ToggleDriverStatus(int driverId)
    {
        var companyId = GetCompanyId();
        var driver = await _context.FreelanceDrivers
            .FirstOrDefaultAsync(d => d.Id == driverId && d.DeliveryCompanyId == companyId);

        if (driver == null)
            return NotFound(new { message = "Driver not found" });

        driver.Status = driver.Status == "approved" ? "suspended" : "approved";
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Driver {driver.Status}", status = driver.Status });
    }

    // ────────────── ORDERS ──────────────

    [Authorize(Roles = "DeliveryCompany")]
    [HttpGet("orders")]
    public async Task<ActionResult> GetOrders([FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var driverIds = await _context.FreelanceDrivers
            .Where(d => d.DeliveryCompanyId == companyId)
            .Select(d => d.Id)
            .ToListAsync();

        var query = _context.OnlineOrders
            .Include(o => o.Company)
            .Where(o => o.AssignedFreelanceDriverId != null && driverIds.Contains(o.AssignedFreelanceDriverId.Value));

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(100)
            .Select(o => new
            {
                o.Id, o.OrderNumber, o.CompanyId,
                StoreName = o.Company.Name,
                o.DeliveryAddress,
                CustomerName = o.GuestName,
                CustomerPhone = o.GuestPhone,
                o.Status, o.Total, o.DeliveryFee,
                o.AssignedFreelanceDriverId,
                DriverName = _context.FreelanceDrivers
                    .Where(d => d.Id == o.AssignedFreelanceDriverId)
                    .Select(d => d.Name).FirstOrDefault(),
                o.CreatedAt, o.DeliveredAt
            })
            .ToListAsync();

        return Ok(orders);
    }

    // ────────────── STATS / DASHBOARD ──────────────

    [Authorize(Roles = "DeliveryCompany")]
    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboard()
    {
        var companyId = GetCompanyId();
        var driverIds = await _context.FreelanceDrivers
            .Where(d => d.DeliveryCompanyId == companyId)
            .Select(d => d.Id)
            .ToListAsync();

        var today = DateTime.UtcNow.Date;

        var totalDrivers = driverIds.Count;
        var onlineDrivers = await _context.FreelanceDrivers
            .CountAsync(d => d.DeliveryCompanyId == companyId && d.IsOnline);

        var ordersQuery = _context.OnlineOrders
            .Where(o => o.AssignedFreelanceDriverId != null && driverIds.Contains(o.AssignedFreelanceDriverId.Value));

        var totalOrders = await ordersQuery.CountAsync();
        var activeOrders = await ordersQuery.CountAsync(o => o.Status == "delivering");
        var completedToday = await ordersQuery.CountAsync(o => o.Status == "delivered" && o.DeliveredAt >= today);
        var todayRevenue = await ordersQuery
            .Where(o => o.Status == "delivered" && o.DeliveredAt >= today)
            .SumAsync(o => o.DeliveryFee);
        var totalRevenue = await ordersQuery
            .Where(o => o.Status == "delivered")
            .SumAsync(o => o.DeliveryFee);

        return Ok(new
        {
            totalDrivers,
            onlineDrivers,
            totalOrders,
            activeOrders,
            completedToday,
            todayRevenue,
            totalRevenue
        });
    }
}

// ────────────── DTOs ──────────────

public class DeliveryCompanyRegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class DeliveryCompanyLoginDto
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class DeliveryCompanyUpdateDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
}

public class AddDriverDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? VehicleType { get; set; }
    public string? VehiclePlate { get; set; }
    public string? VehicleColor { get; set; }
}

public class UpdateDriverDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? VehicleType { get; set; }
    public string? VehiclePlate { get; set; }
    public string? VehicleColor { get; set; }
}
