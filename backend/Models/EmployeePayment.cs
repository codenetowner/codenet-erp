using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("employee_payments")]
public class EmployeePayment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("employee_id")]
    [Required]
    public int EmployeeId { get; set; }

    [Column("payment_type")]
    [Required]
    public string PaymentType { get; set; } = "salary"; // salary, commission, bonus, advance, withdrawal, accrual

    [Column("amount")]
    [Required]
    public decimal Amount { get; set; }

    [Column("payment_date")]
    [Required]
    public DateOnly PaymentDate { get; set; }

    [Column("period_start")]
    public DateOnly? PeriodStart { get; set; }

    [Column("period_end")]
    public DateOnly? PeriodEnd { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    
    [ForeignKey("EmployeeId")]
    public Employee Employee { get; set; } = null!;
    
    [ForeignKey("CreatedBy")]
    public Employee? Creator { get; set; }
}
