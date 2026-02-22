using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/freelance")]
public class FreelanceDriverController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public FreelanceDriverController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    private int GetDriverId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim != null ? int.Parse(claim.Value) : 0;
    }

    // ────────────── AUTH ──────────────

    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] FreelanceRegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Name, phone, and password are required" });

        var existing = await _context.FreelanceDrivers.AnyAsync(d => d.Phone == dto.Phone);
        if (existing)
            return BadRequest(new { message = "Phone number already registered" });

        var driver = new FreelanceDriver
        {
            Name = dto.Name,
            Phone = dto.Phone,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            VehicleType = dto.VehicleType ?? "car",
            VehiclePlate = dto.VehiclePlate,
            VehicleColor = dto.VehicleColor,
            IdDocumentUrl = dto.IdDocumentUrl,
            LicenseUrl = dto.LicenseUrl,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.FreelanceDrivers.Add(driver);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Registration submitted. Pending admin approval.", id = driver.Id });
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] FreelanceLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var driver = await _context.FreelanceDrivers.FirstOrDefaultAsync(d => d.Phone == dto.Phone);
        if (driver == null || !BCrypt.Net.BCrypt.Verify(dto.Password, driver.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        if (driver.Status == "pending")
            return Ok(new { message = "Account pending approval", status = "pending", id = driver.Id });

        if (driver.Status == "rejected")
            return Ok(new { message = "Account rejected", status = "rejected", reason = driver.RejectionReason });

        if (driver.Status == "suspended")
            return Unauthorized(new { message = "Account suspended" });

        var token = GenerateToken(driver);
        return Ok(new
        {
            token,
            status = driver.Status,
            driver = new
            {
                driver.Id,
                driver.Name,
                driver.Phone,
                driver.Email,
                driver.PhotoUrl,
                driver.VehicleType,
                driver.VehiclePlate,
                driver.Rating,
                driver.TotalDeliveries,
                driver.TotalEarnings,
                driver.IsOnline
            }
        });
    }

    // ────────────── PROFILE ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("profile")]
    public async Task<ActionResult> GetProfile()
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        return Ok(new
        {
            driver.Id, driver.Name, driver.Phone, driver.Email,
            driver.PhotoUrl, driver.VehicleType, driver.VehiclePlate, driver.VehicleColor,
            driver.Rating, driver.TotalDeliveries, driver.TotalEarnings,
            driver.IsOnline, driver.Status, driver.CreatedAt
        });
    }

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPut("profile")]
    public async Task<ActionResult> UpdateProfile([FromBody] FreelanceUpdateProfileDto dto)
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) driver.Name = dto.Name;
        if (!string.IsNullOrWhiteSpace(dto.Email)) driver.Email = dto.Email;
        if (dto.PhotoUrl != null) driver.PhotoUrl = dto.PhotoUrl;
        if (dto.VehiclePlate != null) driver.VehiclePlate = dto.VehiclePlate;
        if (dto.VehicleColor != null) driver.VehicleColor = dto.VehicleColor;
        if (dto.VehicleType != null) driver.VehicleType = dto.VehicleType;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Profile updated" });
    }

    // ────────────── ONLINE STATUS ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPost("toggle-online")]
    public async Task<ActionResult> ToggleOnline([FromBody] ToggleOnlineDto dto)
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        driver.IsOnline = dto.IsOnline;
        if (dto.Lat.HasValue) driver.CurrentLat = dto.Lat;
        if (dto.Lng.HasValue) driver.CurrentLng = dto.Lng;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = driver.IsOnline ? "You are now online" : "You are now offline", isOnline = driver.IsOnline });
    }

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPost("update-location")]
    public async Task<ActionResult> UpdateLocation([FromBody] UpdateLocationDto dto)
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        driver.CurrentLat = dto.Lat;
        driver.CurrentLng = dto.Lng;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Location updated" });
    }

    // ────────────── AVAILABLE ORDERS ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("available-orders")]
    public async Task<ActionResult> GetAvailableOrders()
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        var orders = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .Where(o => (o.DeliveryType == "delivery" || o.DeliveryType == "platform_driver")
                && (o.Status == "confirmed" || o.Status == "preparing")
                && o.AssignedFreelanceDriverId == null
                && o.AssignedCompanyDriverId == null)
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .Select(o => new
            {
                o.Id, o.OrderNumber, o.CompanyId,
                StoreName = o.Company.Name,
                StoreLogo = o.Company.LogoUrl,
                StoreAddress = o.Company.Address,
                StoreLat = o.Company.StoreLat,
                StoreLng = o.Company.StoreLng,
                StorePhone = o.Company.Phone,
                o.DeliveryAddress, o.DeliveryLat, o.DeliveryLng,
                CustomerName = o.GuestName,
                CustomerPhone = o.GuestPhone,
                o.Status, o.Total, o.DeliveryFee,
                ItemCount = o.Items.Count,
                o.CreatedAt
            })
            .ToListAsync();

        // Sort by distance if driver has location
        if (driver.CurrentLat.HasValue && driver.CurrentLng.HasValue)
        {
            var sorted = orders.Select(o => new
            {
                o.Id, o.OrderNumber, o.CompanyId,
                o.StoreName, o.StoreLogo, o.StoreAddress, o.StoreLat, o.StoreLng, o.StorePhone,
                o.DeliveryAddress, o.DeliveryLat, o.DeliveryLng,
                o.CustomerName, o.CustomerPhone,
                o.Status, o.Total, o.DeliveryFee, o.ItemCount, o.CreatedAt,
                DistanceKm = o.StoreLat.HasValue && o.StoreLng.HasValue
                    ? Math.Round(CalculateDistance((double)driver.CurrentLat.Value, (double)driver.CurrentLng.Value,
                        (double)o.StoreLat.Value, (double)o.StoreLng.Value), 1)
                    : (double?)null
            })
            .OrderBy(o => o.DistanceKm ?? double.MaxValue)
            .ToList();

            return Ok(sorted);
        }

        return Ok(orders);
    }

    // ────────────── ACCEPT / MY ORDERS ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPost("orders/{id}/accept")]
    public async Task<ActionResult> AcceptOrder(int id)
    {
        var driverId = GetDriverId();

        var order = await _context.OnlineOrders.FindAsync(id);
        if (order == null) return NotFound(new { message = "Order not found" });

        if (order.AssignedFreelanceDriverId != null || order.AssignedCompanyDriverId != null)
            return BadRequest(new { message = "Order already assigned to another driver" });

        order.AssignedDriverType = "freelance";
        order.AssignedFreelanceDriverId = driverId;
        if (order.Status == "confirmed" || order.Status == "preparing")
            order.Status = "delivering";
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Order accepted", status = order.Status });
    }

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("my-orders")]
    public async Task<ActionResult> GetMyOrders([FromQuery] string? status)
    {
        var driverId = GetDriverId();

        var query = _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .Where(o => o.AssignedFreelanceDriverId == driverId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        var orders = await query
            .OrderByDescending(o => o.UpdatedAt)
            .Select(o => new
            {
                o.Id, o.OrderNumber, o.CompanyId,
                StoreName = o.Company.Name,
                StoreLogo = o.Company.LogoUrl,
                StoreAddress = o.Company.Address,
                StorePhone = o.Company.Phone,
                o.DeliveryAddress,
                CustomerName = o.GuestName,
                CustomerPhone = o.GuestPhone,
                o.Status, o.Total, o.DeliveryFee,
                ItemCount = o.Items.Count,
                o.CreatedAt, o.UpdatedAt
            })
            .ToListAsync();

        return Ok(orders);
    }

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("orders/{id}")]
    public async Task<ActionResult> GetOrderDetail(int id)
    {
        var driverId = GetDriverId();

        var order = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .FirstOrDefaultAsync(o => o.Id == id && o.AssignedFreelanceDriverId == driverId);

        if (order == null) return NotFound(new { message = "Order not found" });

        return Ok(new
        {
            order.Id, order.OrderNumber, order.CompanyId,
            StoreName = order.Company?.Name,
            StoreLogo = order.Company?.LogoUrl,
            StoreAddress = order.Company?.Address,
            StorePhone = order.Company?.Phone,
            StoreLat = order.Company?.StoreLat,
            StoreLng = order.Company?.StoreLng,
            CustomerName = order.GuestName,
            CustomerPhone = order.GuestPhone,
            order.DeliveryAddress, order.DeliveryLat, order.DeliveryLng,
            order.Status, order.Subtotal, order.DeliveryFee, order.Total,
            order.PaymentMethod, order.PaymentStatus,
            order.Notes, order.CreatedAt, order.DeliveredAt,
            Items = order.Items.Select(i => new
            {
                i.Id, i.ProductName, i.Quantity, i.UnitPrice, i.Total
            }).ToList()
        });
    }

    // ────────────── STATUS UPDATES ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPut("orders/{id}/picked-up")]
    public async Task<ActionResult> MarkPickedUp(int id)
    {
        var driverId = GetDriverId();
        var order = await _context.OnlineOrders.FirstOrDefaultAsync(o => o.Id == id && o.AssignedFreelanceDriverId == driverId);
        if (order == null) return NotFound();

        order.Status = "delivering";
        order.PickedUpAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Marked as picked up" });
    }

    [Authorize(Roles = "FreelanceDriver")]
    [HttpPut("orders/{id}/delivered")]
    public async Task<ActionResult> MarkDelivered(int id, [FromBody] DeliveryProofDto? dto)
    {
        var driverId = GetDriverId();
        var order = await _context.OnlineOrders.FirstOrDefaultAsync(o => o.Id == id && o.AssignedFreelanceDriverId == driverId);
        if (order == null) return NotFound();

        // COD validation: if payment is COD, driver must confirm collection
        if (order.PaymentMethod == "cod" && (dto == null || !dto.CodCollected))
            return BadRequest(new { message = "Please confirm cash collection for COD orders" });

        order.Status = "delivered";
        order.DeliveredAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        if (dto != null)
        {
            order.DeliveryProofUrl = dto.ProofPhotoUrl;
            order.CodCollected = dto.CodCollected;
            if (dto.CodCollected) order.CodAmount = order.Total;
        }

        await _context.SaveChangesAsync();

        // Update driver stats
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver != null)
        {
            driver.TotalDeliveries++;
            driver.TotalEarnings += order.DeliveryFee;
            driver.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Order delivered", deliveryFee = order.DeliveryFee, codCollected = order.CodCollected });
    }

    // ────────────── EARNINGS ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("earnings")]
    public async Task<ActionResult> GetEarnings()
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var deliveredOrders = _context.OnlineOrders
            .Where(o => o.AssignedFreelanceDriverId == driverId && o.Status == "delivered");

        var todayEarnings = await deliveredOrders
            .Where(o => o.DeliveredAt >= today).SumAsync(o => o.DeliveryFee);
        var weekEarnings = await deliveredOrders
            .Where(o => o.DeliveredAt >= weekStart).SumAsync(o => o.DeliveryFee);
        var monthEarnings = await deliveredOrders
            .Where(o => o.DeliveredAt >= monthStart).SumAsync(o => o.DeliveryFee);

        var todayDeliveries = await deliveredOrders.CountAsync(o => o.DeliveredAt >= today);
        var weekDeliveries = await deliveredOrders.CountAsync(o => o.DeliveredAt >= weekStart);
        var monthDeliveries = await deliveredOrders.CountAsync(o => o.DeliveredAt >= monthStart);

        var recentDeliveries = await deliveredOrders
            .Include(o => o.Company)
            .OrderByDescending(o => o.DeliveredAt)
            .Take(20)
            .Select(o => new
            {
                o.Id, o.OrderNumber,
                StoreName = o.Company.Name,
                o.DeliveryAddress,
                o.DeliveryFee,
                o.DeliveredAt
            })
            .ToListAsync();

        return Ok(new
        {
            totalEarnings = driver.TotalEarnings,
            totalDeliveries = driver.TotalDeliveries,
            today = new { earnings = todayEarnings, deliveries = todayDeliveries },
            week = new { earnings = weekEarnings, deliveries = weekDeliveries },
            month = new { earnings = monthEarnings, deliveries = monthDeliveries },
            recentDeliveries
        });
    }

    // ────────────── DASHBOARD ──────────────

    [Authorize(Roles = "FreelanceDriver")]
    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboard()
    {
        var driverId = GetDriverId();
        var driver = await _context.FreelanceDrivers.FindAsync(driverId);
        if (driver == null) return NotFound();

        var today = DateTime.UtcNow.Date;

        var activeOrders = await _context.OnlineOrders
            .CountAsync(o => o.AssignedFreelanceDriverId == driverId && o.Status == "delivering");

        var todayDelivered = await _context.OnlineOrders
            .CountAsync(o => o.AssignedFreelanceDriverId == driverId && o.Status == "delivered" && o.DeliveredAt >= today);

        var todayEarnings = await _context.OnlineOrders
            .Where(o => o.AssignedFreelanceDriverId == driverId && o.Status == "delivered" && o.DeliveredAt >= today)
            .SumAsync(o => o.DeliveryFee);

        var availableOrders = await _context.OnlineOrders
            .CountAsync(o => o.DeliveryType == "delivery"
                && (o.Status == "confirmed" || o.Status == "preparing")
                && o.AssignedFreelanceDriverId == null
                && o.AssignedCompanyDriverId == null);

        return Ok(new
        {
            driver = new
            {
                driver.Id, driver.Name, driver.PhotoUrl,
                driver.IsOnline, driver.Rating, driver.TotalDeliveries, driver.TotalEarnings
            },
            activeOrders,
            todayDelivered,
            todayEarnings,
            availableOrders
        });
    }

    // ────────────── HELPERS ──────────────

    private string GenerateToken(FreelanceDriver driver)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["JwtSettings:Secret"] ?? "SuperSecretKeyThatIsLongEnough123!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, driver.Id.ToString()),
            new Claim(ClaimTypes.Name, driver.Name),
            new Claim(ClaimTypes.MobilePhone, driver.Phone),
            new Claim(ClaimTypes.Role, "FreelanceDriver")
        };

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"] ?? "CatalystAPI",
            audience: _config["JwtSettings:Audience"] ?? "CatalystClients",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}

// ────────────── DTOs ──────────────

public class FreelanceRegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? VehicleType { get; set; }
    public string? VehiclePlate { get; set; }
    public string? VehicleColor { get; set; }
    public string? IdDocumentUrl { get; set; }
    public string? LicenseUrl { get; set; }
}

public class FreelanceLoginDto
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class FreelanceUpdateProfileDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? PhotoUrl { get; set; }
    public string? VehicleType { get; set; }
    public string? VehiclePlate { get; set; }
    public string? VehicleColor { get; set; }
}

public class ToggleOnlineDto
{
    public bool IsOnline { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
}

public class UpdateLocationDto
{
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
}

public class DeliveryProofDto
{
    public string? ProofPhotoUrl { get; set; }
    public bool CodCollected { get; set; }
}
