using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Catalyst.API.Data;
using Catalyst.API.Models;
using System.Security.Claims;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/app")]
[Authorize(Roles = "AppCustomer")]
public class AppCustomerController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AppCustomerController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    private int GetCustomerId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim != null ? int.Parse(claim.Value) : 0;
    }

    // ────────────── AUTH ──────────────

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] AppCustomerRegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var exists = await _context.AppCustomers.AnyAsync(c => c.Phone == dto.Phone);
        if (exists)
            return BadRequest(new { message = "Phone number already registered" });

        var customer = new AppCustomer
        {
            Name = dto.Name?.Trim(),
            Phone = dto.Phone.Trim(),
            Email = dto.Email?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsVerified = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AppCustomers.Add(customer);
        await _context.SaveChangesAsync();

        var token = GenerateCustomerToken(customer);
        return Ok(new
        {
            token,
            customer = new { customer.Id, customer.Name, customer.Phone, customer.Email }
        });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] AppCustomerLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Phone and password are required" });

        var customer = await _context.AppCustomers.FirstOrDefaultAsync(c => c.Phone == dto.Phone);
        if (customer == null || string.IsNullOrEmpty(customer.PasswordHash))
            return Unauthorized(new { message = "Invalid phone or password" });

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, customer.PasswordHash))
            return Unauthorized(new { message = "Invalid phone or password" });

        if (!customer.IsActive)
            return Unauthorized(new { message = "Account is disabled" });

        var token = GenerateCustomerToken(customer);
        return Ok(new
        {
            token,
            customer = new { customer.Id, customer.Name, customer.Phone, customer.Email }
        });
    }

    private string GenerateCustomerToken(AppCustomer customer)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["JwtSettings:Secret"] ?? "SuperSecretKeyThatIsLongEnough123!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, customer.Id.ToString()),
            new Claim(ClaimTypes.Name, customer.Name ?? ""),
            new Claim(ClaimTypes.MobilePhone, customer.Phone),
            new Claim(ClaimTypes.Role, "AppCustomer")
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

    [HttpGet("profile")]
    public async Task<ActionResult> GetProfile()
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var customer = await _context.AppCustomers.FindAsync(customerId);
        if (customer == null) return NotFound();

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Phone,
            customer.Email,
            customer.PhotoUrl,
            customer.AuthProvider,
            customer.IsVerified,
            customer.CreatedAt
        });
    }

    [HttpPut("profile")]
    public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var customer = await _context.AppCustomers.FindAsync(customerId);
        if (customer == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) customer.Name = dto.Name;
        if (!string.IsNullOrWhiteSpace(dto.Email)) customer.Email = dto.Email;
        if (dto.PhotoUrl != null) customer.PhotoUrl = dto.PhotoUrl;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Profile updated" });
    }

    // ────────────── ADDRESSES ──────────────

    [HttpGet("addresses")]
    public async Task<ActionResult> GetAddresses()
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var addresses = await _context.AppCustomerAddresses
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Label,
                a.Address,
                a.City,
                a.Lat,
                a.Lng,
                a.IsDefault,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(addresses);
    }

    [HttpPost("addresses")]
    public async Task<ActionResult> AddAddress([FromBody] AddAddressDto dto)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Address))
            return BadRequest(new { message = "Address is required" });

        if (dto.IsDefault)
        {
            var existing = await _context.AppCustomerAddresses
                .Where(a => a.CustomerId == customerId && a.IsDefault)
                .ToListAsync();
            foreach (var a in existing) a.IsDefault = false;
        }

        var address = new AppCustomerAddress
        {
            CustomerId = customerId,
            Label = dto.Label,
            Address = dto.Address,
            City = dto.City,
            Lat = dto.Lat,
            Lng = dto.Lng,
            IsDefault = dto.IsDefault,
            CreatedAt = DateTime.UtcNow
        };

        _context.AppCustomerAddresses.Add(address);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Address added", id = address.Id });
    }

    [HttpPut("addresses/{id}")]
    public async Task<ActionResult> UpdateAddress(int id, [FromBody] AddAddressDto dto)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var address = await _context.AppCustomerAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId);
        if (address == null) return NotFound(new { message = "Address not found" });

        if (!string.IsNullOrWhiteSpace(dto.Address)) address.Address = dto.Address;
        if (dto.Label != null) address.Label = dto.Label;
        if (dto.City != null) address.City = dto.City;
        if (dto.Lat.HasValue) address.Lat = dto.Lat;
        if (dto.Lng.HasValue) address.Lng = dto.Lng;

        if (dto.IsDefault)
        {
            var others = await _context.AppCustomerAddresses
                .Where(a => a.CustomerId == customerId && a.Id != id && a.IsDefault)
                .ToListAsync();
            foreach (var a in others) a.IsDefault = false;
            address.IsDefault = true;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Address updated" });
    }

    [HttpDelete("addresses/{id}")]
    public async Task<ActionResult> DeleteAddress(int id)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var address = await _context.AppCustomerAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId);
        if (address == null) return NotFound(new { message = "Address not found" });

        _context.AppCustomerAddresses.Remove(address);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Address deleted" });
    }

    // ────────────── FAVORITES ──────────────

    [HttpGet("favorites")]
    public async Task<ActionResult> GetFavorites()
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var favorites = await _context.AppFavorites
            .Include(f => f.Company)
            .Include(f => f.Product)
            .Where(f => f.CustomerId == customerId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.CompanyId,
                CompanyName = f.Company != null ? f.Company.Name : null,
                CompanyLogoUrl = f.Company != null ? f.Company.LogoUrl : null,
                f.ProductId,
                ProductName = f.Product != null ? f.Product.Name : null,
                ProductImageUrl = f.Product != null ? f.Product.ImageUrl : null,
                ProductPrice = f.Product != null ? f.Product.RetailPrice : (decimal?)null,
                ProductCurrency = f.Product != null ? f.Product.Currency : null,
                f.CreatedAt
            })
            .ToListAsync();

        return Ok(favorites);
    }

    [HttpPost("favorites")]
    public async Task<ActionResult> AddFavorite([FromBody] AddFavoriteDto dto)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        if (dto.CompanyId == null && dto.ProductId == null)
            return BadRequest(new { message = "Either companyId or productId is required" });

        // Check for duplicate
        var exists = await _context.AppFavorites.AnyAsync(f =>
            f.CustomerId == customerId &&
            f.CompanyId == dto.CompanyId &&
            f.ProductId == dto.ProductId);

        if (exists)
            return Ok(new { message = "Already in favorites" });

        var fav = new AppFavorite
        {
            CustomerId = customerId,
            CompanyId = dto.CompanyId,
            ProductId = dto.ProductId,
            CreatedAt = DateTime.UtcNow
        };

        _context.AppFavorites.Add(fav);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Added to favorites", id = fav.Id });
    }

    [HttpDelete("favorites/{id}")]
    public async Task<ActionResult> RemoveFavorite(int id)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var fav = await _context.AppFavorites
            .FirstOrDefaultAsync(f => f.Id == id && f.CustomerId == customerId);
        if (fav == null) return NotFound(new { message = "Favorite not found" });

        _context.AppFavorites.Remove(fav);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Removed from favorites" });
    }

    // ────────────── ORDERS ──────────────

    [HttpGet("orders")]
    public async Task<ActionResult> GetOrders()
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var orders = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .Where(o => o.AppCustomerId == customerId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.CompanyId,
                StoreName = o.Company.Name,
                StoreLogoUrl = o.Company.LogoUrl,
                o.Status,
                o.Subtotal,
                o.DeliveryFee,
                o.Total,
                o.DeliveryType,
                o.DeliveryAddress,
                o.Notes,
                o.CreatedAt,
                ItemCount = o.Items.Count,
            })
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("orders/{id}")]
    public async Task<ActionResult> GetOrderDetail(int id)
    {
        var customerId = GetCustomerId();
        if (customerId == 0) return Unauthorized();

        var order = await _context.OnlineOrders
            .Include(o => o.Items)
            .Include(o => o.Company)
            .FirstOrDefaultAsync(o => o.Id == id && o.AppCustomerId == customerId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.CompanyId,
            StoreName = order.Company?.Name,
            StoreLogoUrl = order.Company?.LogoUrl,
            StorePhone = order.Company?.Phone,
            order.Status,
            order.Subtotal,
            order.DeliveryFee,
            order.Discount,
            order.Total,
            order.PaymentMethod,
            order.PaymentStatus,
            order.DeliveryType,
            order.DeliveryAddress,
            order.Notes,
            order.EstimatedDelivery,
            order.DeliveredAt,
            order.CancelledAt,
            order.CancelReason,
            order.CreatedAt,
            Items = order.Items.Select(i => new
            {
                i.Id,
                i.ProductId,
                i.ProductName,
                i.UnitType,
                i.Quantity,
                i.UnitPrice,
                i.Total,
                i.Currency
            }).ToList()
        });
    }
}

public class UpdateProfileDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? PhotoUrl { get; set; }
}

public class AddAddressDto
{
    public string? Label { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public bool IsDefault { get; set; }
}

public class AddFavoriteDto
{
    public int? CompanyId { get; set; }
    public int? ProductId { get; set; }
}

public class AppCustomerRegisterDto
{
    public string? Name { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class AppCustomerLoginDto
{
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
