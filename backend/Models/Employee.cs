using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("employees")]
public class Employee
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("username")]
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Column("password_hash")]
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("role_id")]
    public int? RoleId { get; set; }

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [Column("is_driver")]
    public bool IsDriver { get; set; } = false;

    [Column("is_salesman")]
    public bool IsSalesman { get; set; } = false;

    [Column("driver_pin")]
    [MaxLength(10)]
    public string? DriverPin { get; set; }

    [Column("salesman_pin")]
    [MaxLength(10)]
    public string? SalesmanPin { get; set; }

    // Salary & Compensation
    [Column("salary_type")]
    [MaxLength(50)]
    public string SalaryType { get; set; } = "monthly"; // monthly, hourly, commission, monthly_commission

    [Column("base_pay")]
    public decimal BasePay { get; set; } = 0;

    [Column("hourly_rate")]
    public decimal HourlyRate { get; set; } = 0;

    [Column("commission_rate")]
    public decimal CommissionRate { get; set; } = 0;

    [Column("commission_base")]
    [MaxLength(50)]
    public string? CommissionBase { get; set; } // sales, collections, both

    [Column("minimum_guarantee")]
    public decimal MinimumGuarantee { get; set; } = 0;

    [Column("expected_hours_week")]
    public int ExpectedHoursPerWeek { get; set; } = 0;

    // Assignments
    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    // Performance
    [Column("rating")]
    public int Rating { get; set; } = 5;

    [Column("address")]
    public string? Address { get; set; }

    // Permission Overrides (JSON or individual flags)
    [Column("use_default_permissions")]
    public bool UseDefaultPermissions { get; set; } = true;

    [Column("can_access_reports")]
    public bool CanAccessReports { get; set; } = false;

    [Column("can_approve_deposits")]
    public bool CanApproveDeposits { get; set; } = false;

    [Column("can_edit_prices")]
    public bool CanEditPrices { get; set; } = false;

    [Column("can_edit_credit_limit")]
    public bool CanEditCreditLimit { get; set; } = false;

    [Column("status")]
    public string Status { get; set; } = "active";

    // Visibility Control - if false, employee sees ALL customers/products
    [Column("restrict_customers")]
    public bool RestrictCustomers { get; set; } = false;

    [Column("restrict_products")]
    public bool RestrictProducts { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Role? Role { get; set; }
    public Warehouse? Warehouse { get; set; }
    public Van? Van { get; set; }
}
