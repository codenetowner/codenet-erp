namespace Catalyst.API.DTOs;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class EmployeeLookupRequest
{
    public required string Username { get; set; }
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserInfo User { get; set; } = null!;
}

public class UserInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Role { get; set; }
    public int? RoleId { get; set; }
    public int? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public int? VanId { get; set; }
    public bool IsDriver { get; set; }
    public bool IsSuperAdmin { get; set; }
    public bool IsCompanyAdmin { get; set; }
    public Dictionary<string, bool>? Permissions { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
