using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("collections")]
public class Collection
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("collection_number")]
    [MaxLength(50)]
    public string? CollectionNumber { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("order_id")]
    public int? OrderId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("task_id")]
    public int? TaskId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("payment_type")]
    public string PaymentType { get; set; } = "cash";

    [Column("collection_date")]
    public DateTime CollectionDate { get; set; }

    [Column("collection_time")]
    public TimeSpan? CollectionTime { get; set; }

    [Column("check_number")]
    [MaxLength(100)]
    public string? CheckNumber { get; set; }

    [Column("check_date")]
    public DateTime? CheckDate { get; set; }

    [Column("bank_name")]
    [MaxLength(255)]
    public string? BankName { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("location_lat")]
    public decimal? LocationLat { get; set; }

    [Column("location_lng")]
    public decimal? LocationLng { get; set; }

    [Column("is_synced")]
    public bool IsSynced { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public Order? Order { get; set; }
    public Employee? Driver { get; set; }
}
