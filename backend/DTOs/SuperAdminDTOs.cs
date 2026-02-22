namespace Catalyst.API.DTOs;

// ============ DASHBOARD ============
public class SuperAdminDashboardDto
{
    public int TotalCompanies { get; set; }
    public int ActiveCompanies { get; set; }
    public int InactiveCompanies { get; set; }
    public int SuspendedCompanies { get; set; }
    public decimal TotalIncome { get; set; }
    public int TotalVans { get; set; }
    public int TotalDrivers { get; set; }
    public List<RecentCompanyDto> RecentCompanies { get; set; } = new();
    public List<RecentBillingDto> RecentBillings { get; set; } = new();
}

public class RecentCompanyDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class RecentBillingDto
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
}

// ============ COMPANIES ============
public class CompanyListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? PlanId { get; set; }
    public string? PlanName { get; set; }
    public decimal? PlanPrice { get; set; }
    public int? PlanDurationDays { get; set; }
    public DateTime? PlanExpiryDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? StoreCategoryId { get; set; }
    public string? StoreCategoryName { get; set; }
    public bool IsOnlineStoreEnabled { get; set; }
    public bool IsPremium { get; set; }
    public string? PremiumTier { get; set; }
}

public class CompanyDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string CurrencySymbol { get; set; } = "$";
    public int LowStockAlert { get; set; }
    public decimal MaxCashWarning { get; set; }
    public int? PlanId { get; set; }
    public string? PlanName { get; set; }
    public DateTime? PlanExpiryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? StoreCategoryId { get; set; }
    public string? StoreCategoryName { get; set; }
    public bool IsOnlineStoreEnabled { get; set; }
    public bool IsPremium { get; set; }
    public string? PremiumTier { get; set; }
    
    // Stats
    public int EmployeeCount { get; set; }
    public int DriverCount { get; set; }
    public int VanCount { get; set; }
    public int CustomerCount { get; set; }
}

public class CreateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public int? PlanId { get; set; }
    public DateTime? PlanExpiryDate { get; set; }
    public string Status { get; set; } = "active";
    public string? Notes { get; set; }
    public int? StoreCategoryId { get; set; }
    public bool IsOnlineStoreEnabled { get; set; }
}

public class UpdateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public int? PlanId { get; set; }
    public DateTime? PlanExpiryDate { get; set; }
    public string Status { get; set; } = "active";
    public string? Notes { get; set; }
    public string? NewPassword { get; set; }
    public int? StoreCategoryId { get; set; }
    public bool IsOnlineStoreEnabled { get; set; }
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

// ============ PLANS ============
public class PlanListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public int? MaxCustomers { get; set; }
    public int? MaxEmployees { get; set; }
    public int? MaxDrivers { get; set; }
    public int? MaxVans { get; set; }
    public int? MaxWarehouses { get; set; }
    public bool IsActive { get; set; }
    public int CompanyCount { get; set; }
}

public class PlanDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public int? MaxCustomers { get; set; }
    public int? MaxEmployees { get; set; }
    public int? MaxDrivers { get; set; }
    public int? MaxVans { get; set; }
    public int? MaxWarehouses { get; set; }
    public string? Features { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePlanRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationDays { get; set; } = 30;
    public int? MaxCustomers { get; set; }
    public int? MaxEmployees { get; set; }
    public int? MaxDrivers { get; set; }
    public int? MaxVans { get; set; }
    public int? MaxWarehouses { get; set; }
    public string? Features { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePlanRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationDays { get; set; }
    public int? MaxCustomers { get; set; }
    public int? MaxEmployees { get; set; }
    public int? MaxDrivers { get; set; }
    public int? MaxVans { get; set; }
    public int? MaxWarehouses { get; set; }
    public string? Features { get; set; }
    public bool IsActive { get; set; }
}

// ============ BILLING ============
public class BillingListDto
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? PlanName { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime? NextRenewalDate { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateBillingRequest
{
    public int CompanyId { get; set; }
    public int? PlanId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime? NextRenewalDate { get; set; }
    public string PaymentMethod { get; set; } = "cash";
    public string? TransactionReference { get; set; }
    public string? Notes { get; set; }
}
