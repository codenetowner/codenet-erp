using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Catalyst.API.Data;
using Catalyst.API.DTOs;
using Catalyst.API.Models;

namespace Catalyst.API.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginSuperAdminAsync(LoginRequest request);
    Task<LoginResponse?> LoginCompanyAsync(LoginRequest request);
    Task<LoginResponse?> LoginEmployeeAsync(LoginRequest request, int companyId);
    Task<LoginResponse?> LoginDriverAsync(string username, string pin);
    Task<LoginResponse?> LoginSalesmanAsync(string username, string password);
    Task<int?> LookupEmployeeCompanyAsync(string username);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> LoginSuperAdminAsync(LoginRequest request)
    {
        var superadmin = await _context.SuperadminUsers
            .FirstOrDefaultAsync(s => s.Username == request.Username && s.IsActive);

        if (superadmin == null)
            return null;
        
        // Check password - also allow "Admin@123" as master password for initial setup
        bool validPassword = request.Password == "Admin@123" || VerifyPassword(request.Password, superadmin.PasswordHash);
        if (!validPassword)
            return null;

        // Update last login
        superadmin.LastLogin = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var userInfo = new UserInfo
        {
            Id = superadmin.Id,
            Name = superadmin.Name ?? superadmin.Username,
            Username = superadmin.Username,
            Email = superadmin.Email,
            CompanyId = null,
            Role = "SuperAdmin",
            IsDriver = false,
            IsSuperAdmin = true
        };

        var token = GenerateJwtToken(userInfo);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            User = userInfo
        };
    }

    public async Task<LoginResponse?> LoginCompanyAsync(LoginRequest request)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Username == request.Username && c.Status == "active");

        if (company == null)
        {
            Console.WriteLine($"[AUTH] Company not found: {request.Username}");
            return null;
        }

        var passwordValid = VerifyPassword(request.Password, company.PasswordHash);
        Console.WriteLine($"[AUTH] Company: {company.Username}, Password valid: {passwordValid}");
        
        if (!passwordValid)
            return null;

        // Parse page permissions if set
        List<string>? pagePermissions = null;
        if (!string.IsNullOrEmpty(company.PagePermissions))
        {
            try
            {
                pagePermissions = System.Text.Json.JsonSerializer.Deserialize<List<string>>(company.PagePermissions);
            }
            catch { }
        }

        var userInfo = new UserInfo
        {
            Id = company.Id,
            Name = company.Name,
            Username = company.Username,
            CompanyId = company.Id,
            CompanyName = company.Name,
            IsSuperAdmin = false,
            IsDriver = false,
            IsCompanyAdmin = true,
            Role = "CompanyAdmin",
            Permissions = null, // CompanyAdmin has all permissions - checked on frontend
            PagePermissions = pagePermissions
        };

        var token = GenerateJwtToken(userInfo);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            User = userInfo
        };
    }

    public async Task<LoginResponse?> LoginEmployeeAsync(LoginRequest request, int companyId)
    {
        var employee = await _context.Employees
            .Include(e => e.Role)
            .Include(e => e.Company)
            .FirstOrDefaultAsync(e => e.Username == request.Username 
                && e.CompanyId == companyId 
                && e.Status == "active");

        if (employee == null || !VerifyPassword(request.Password, employee.PasswordHash))
            return null;

        // Parse permissions from role
        Dictionary<string, bool>? permissions = null;
        if (employee.Role?.Permissions != null)
        {
            try
            {
                permissions = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(employee.Role.Permissions);
            }
            catch
            {
                permissions = new Dictionary<string, bool>();
            }
        }

        // Parse page permissions from company if set
        List<string>? pagePermissions = null;
        if (!string.IsNullOrEmpty(employee.Company?.PagePermissions))
        {
            try
            {
                pagePermissions = System.Text.Json.JsonSerializer.Deserialize<List<string>>(employee.Company.PagePermissions);
            }
            catch { }
        }

        var userInfo = new UserInfo
        {
            Id = employee.Id,
            Name = employee.Name,
            Username = employee.Username,
            Email = employee.Email,
            CompanyId = employee.CompanyId,
            CompanyName = employee.Company?.Name ?? "",
            Role = employee.Role?.Name ?? "Employee",
            RoleId = employee.RoleId,
            IsDriver = employee.IsDriver,
            IsSuperAdmin = false,
            IsCompanyAdmin = false,
            Permissions = permissions,
            PagePermissions = pagePermissions
        };

        var token = GenerateJwtToken(userInfo);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            User = userInfo
        };
    }

    public async Task<LoginResponse?> LoginDriverAsync(string username, string password)
    {
        var driver = await _context.Employees
            .Include(e => e.Company)
            .FirstOrDefaultAsync(e => e.Username == username 
                && e.IsDriver 
                && e.Status == "active");

        // Verify password
        if (driver == null || !VerifyPassword(password, driver.PasswordHash))
            return null;

        var userInfo = new UserInfo
        {
            Id = driver.Id,
            Name = driver.Name,
            Username = driver.Username,
            CompanyId = driver.CompanyId,
            CompanyName = driver.Company.Name,
            Role = "Driver",
            IsDriver = true,
            IsSuperAdmin = false,
            VanId = driver.VanId
        };

        var token = GenerateDriverJwtToken(userInfo, driver.Id, driver.VanId);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            User = userInfo
        };
    }

    public async Task<LoginResponse?> LoginSalesmanAsync(string username, string password)
    {
        var salesman = await _context.Employees
            .Include(e => e.Company)
            .FirstOrDefaultAsync(e => e.Username == username 
                && e.IsSalesman 
                && e.Status == "active");

        if (salesman == null || !VerifyPassword(password, salesman.PasswordHash))
            return null;

        var userInfo = new UserInfo
        {
            Id = salesman.Id,
            Name = salesman.Name,
            Username = salesman.Username,
            CompanyId = salesman.CompanyId,
            CompanyName = salesman.Company.Name,
            Role = "Salesman",
            IsDriver = false,
            IsSuperAdmin = false
        };

        var token = GenerateSalesmanJwtToken(userInfo, salesman.Id);

        return new LoginResponse
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            User = userInfo
        };
    }

    public async Task<int?> LookupEmployeeCompanyAsync(string username)
    {
        var employee = await _context.Employees
            .Where(e => e.Username == username && e.Status == "active")
            .Select(e => e.CompanyId)
            .FirstOrDefaultAsync();

        return employee > 0 ? employee : null;
    }

    private string GenerateSalesmanJwtToken(UserInfo user, int employeeId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim("username", user.Username),
            new Claim("CompanyId", user.CompanyId?.ToString() ?? ""),
            new Claim("EmployeeId", employeeId.ToString()),
            new Claim("is_superadmin", user.IsSuperAdmin.ToString().ToLower()),
            new Claim("is_salesman", "true"),
            new Claim(ClaimTypes.Role, "Salesman")
        }; 

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateDriverJwtToken(UserInfo user, int employeeId, int? vanId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim("username", user.Username),
            new Claim("CompanyId", user.CompanyId?.ToString() ?? ""),
            new Claim("EmployeeId", employeeId.ToString()),
            new Claim("VanId", vanId?.ToString() ?? ""),
            new Claim("is_superadmin", user.IsSuperAdmin.ToString().ToLower()),
            new Claim("is_driver", user.IsDriver.ToString().ToLower()),
            new Claim(ClaimTypes.Role, user.Role ?? "Driver")
        }; 

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateJwtToken(UserInfo user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim("username", user.Username),
            new Claim("company_id", user.CompanyId?.ToString() ?? ""),
            new Claim("is_superadmin", user.IsSuperAdmin.ToString().ToLower()),
            new Claim("is_driver", user.IsDriver.ToString().ToLower()),
            new Claim(ClaimTypes.Role, user.Role ?? "User")
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(GetExpirationMinutes()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetExpirationMinutes()
    {
        return int.Parse(_configuration["JwtSettings:ExpirationInMinutes"] ?? "1440");
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
