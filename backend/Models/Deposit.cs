using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("deposits")]
public class Deposit
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("deposit_number")]
    [MaxLength(50)]
    public string DepositNumber { get; set; } = string.Empty;

    [Column("driver_id")]
    [Required]
    public int DriverId { get; set; }

    [Column("task_id")]
    public int? TaskId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("deposit_type")]
    public string DepositType { get; set; } = "warehouse"; // warehouse, bank

    [Column("deposit_date")]
    public DateOnly DepositDate { get; set; }

    [Column("deposit_time")]
    public TimeSpan? DepositTime { get; set; }

    [Column("bank_name")]
    [MaxLength(255)]
    public string? BankName { get; set; }

    [Column("slip_number")]
    [MaxLength(100)]
    public string? SlipNumber { get; set; }

    [Column("slip_photo_url")]
    [MaxLength(500)]
    public string? SlipPhotoUrl { get; set; }

    [Column("received_by")]
    public int? ReceivedBy { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending"; // pending, confirmed, rejected

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Employee Driver { get; set; } = null!;
    public Employee? Receiver { get; set; }
}

[Table("van_cash")]
public class VanCash
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("van_id")]
    [Required]
    public int VanId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("current_balance")]
    public decimal CurrentBalance { get; set; } = 0;

    [Column("last_updated")]
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Van Van { get; set; } = null!;
    public Employee? Driver { get; set; }
}
