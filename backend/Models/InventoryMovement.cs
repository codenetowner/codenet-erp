using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("inventory_movements")]
public class InventoryMovement
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

    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    [Column("movement_type")]
    [Required]
    public string MovementType { get; set; } = string.Empty;

    [Column("quantity")]
    [Required]
    public decimal Quantity { get; set; }

    [Column("unit_cost")]
    public decimal? UnitCost { get; set; }

    [Column("reference_type")]
    public string? ReferenceType { get; set; }

    [Column("reference_id")]
    public int? ReferenceId { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Warehouse? Warehouse { get; set; }
    public Van? Van { get; set; }
}
