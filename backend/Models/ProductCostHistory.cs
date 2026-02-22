using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("product_cost_history")]
public class ProductCostHistory
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("supplier_id")]
    public int? SupplierId { get; set; }

    [Column("supplier_name")]
    [MaxLength(255)]
    public string? SupplierName { get; set; }

    [Column("cost")]
    public decimal Cost { get; set; }

    [Column("recorded_date")]
    public DateTime RecordedDate { get; set; } = DateTime.UtcNow;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
