using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("customers")]
public class Customer
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("code")]
    [MaxLength(50)]
    public string? Code { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("shop_name")]
    [MaxLength(255)]
    public string? ShopName { get; set; }

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("location_lat")]
    public decimal? LocationLat { get; set; }

    [Column("location_lng")]
    public decimal? LocationLng { get; set; }

    [Column("location_url")]
    [MaxLength(500)]
    public string? LocationUrl { get; set; }

    [Column("customer_type")]
    [MaxLength(50)]
    public string CustomerType { get; set; } = "Retail"; // Retail, Wholesale, Special

    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("credit_limit")]
    public decimal CreditLimit { get; set; } = 0;

    [Column("credit_balance")]
    public decimal CreditBalance { get; set; } = 0; // We owe them (advance/refund)

    [Column("debt_balance")]
    public decimal DebtBalance { get; set; } = 0; // They owe us (unpaid invoices)

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("assigned_driver_id")]
    public int? AssignedDriverId { get; set; }

    [Column("visit_frequency")]
    public string VisitFrequency { get; set; } = "weekly";

    [Column("preferred_visit_day")]
    [MaxLength(20)]
    public string? PreferredVisitDay { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("supplier_id")]
    public int? SupplierId { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Employee? AssignedDriver { get; set; }
    public Warehouse? Warehouse { get; set; }
    public Supplier? Supplier { get; set; }
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<Collection> Collections { get; set; } = new List<Collection>();
}
