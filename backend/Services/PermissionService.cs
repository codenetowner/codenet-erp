using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Services;

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(ClaimsPrincipal user, string permission);
    Task<Dictionary<string, bool>> GetUserPermissionsAsync(ClaimsPrincipal user);
    bool IsCompanyAdmin(ClaimsPrincipal user);
    bool IsSuperAdmin(ClaimsPrincipal user);
}

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;

    public PermissionService(AppDbContext context)
    {
        _context = context;
    }

    public bool IsCompanyAdmin(ClaimsPrincipal user)
    {
        var role = user.FindFirst(ClaimTypes.Role)?.Value;
        return role == "CompanyAdmin";
    }

    public bool IsSuperAdmin(ClaimsPrincipal user)
    {
        var isSuperAdmin = user.FindFirst("is_superadmin")?.Value;
        return isSuperAdmin?.ToLower() == "true";
    }

    public async Task<bool> HasPermissionAsync(ClaimsPrincipal user, string permission)
    {
        // SuperAdmin and CompanyAdmin have all permissions
        if (IsSuperAdmin(user) || IsCompanyAdmin(user))
            return true;

        var permissions = await GetUserPermissionsAsync(user);
        return permissions.TryGetValue(permission, out var hasPermission) && hasPermission;
    }

    public async Task<Dictionary<string, bool>> GetUserPermissionsAsync(ClaimsPrincipal user)
    {
        // SuperAdmin and CompanyAdmin have all permissions - return empty (means all allowed)
        if (IsSuperAdmin(user) || IsCompanyAdmin(user))
            return new Dictionary<string, bool>();

        var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
            return new Dictionary<string, bool>();

        var employee = await _context.Employees
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Id == userId);

        if (employee?.Role?.Permissions == null)
            return new Dictionary<string, bool>();

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, bool>>(employee.Role.Permissions) 
                ?? new Dictionary<string, bool>();
        }
        catch
        {
            return new Dictionary<string, bool>();
        }
    }
}
