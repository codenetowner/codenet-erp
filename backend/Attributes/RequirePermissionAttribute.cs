using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Catalyst.API.Services;

namespace Catalyst.API.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _permission;

    public RequirePermissionAttribute(string permission)
    {
        _permission = permission;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var permissionService = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // SuperAdmin and CompanyAdmin bypass permission checks
        if (permissionService.IsSuperAdmin(user) || permissionService.IsCompanyAdmin(user))
        {
            return;
        }

        var hasPermission = await permissionService.HasPermissionAsync(user, _permission);
        if (!hasPermission)
        {
            context.Result = new ForbidResult();
        }
    }
}
