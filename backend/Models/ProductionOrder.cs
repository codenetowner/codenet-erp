using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("production_orders")]
public class ProductionOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("production_number")]
    [Required]
    [MaxLength(50)]
    public string ProductionNumber { get; set; } = string.Empty;

    [Column("production_date")]
    public DateTime ProductionDate { get; set; } = DateTime.UtcNow;

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("output_quantity")]
    public decimal OutputQuantity { get; set; } = 0;

    [Column("output_warehouse_id")]
    [Required]
    public int OutputWarehouseId { get; set; }

    [Column("raw_material_cost")]
    public decimal RawMaterialCost { get; set; } = 0;

    [Column("extra_cost")]
    public decimal ExtraCost { get; set; } = 0;

    [Column("total_cost")]
    public decimal TotalCost { get; set; } = 0;

    [Column("unit_cost")]
    public decimal UnitCost { get; set; } = 0;

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "draft";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Warehouse OutputWarehouse { get; set; } = null!;
    
    [ForeignKey("CreatedBy")]
    public Employee? Creator { get; set; }
    public ICollection<ProductionOrderMaterial> Materials { get; set; } = new List<ProductionOrderMaterial>();
    public ICollection<ProductionOrderCost> Costs { get; set; } = new List<ProductionOrderCost>();
}

[Table("production_order_materials")]
public class ProductionOrderMaterial
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("production_order_id")]
    [Required]
    public int ProductionOrderId { get; set; }

    [Column("raw_material_id")]
    [Required]
    public int RawMaterialId { get; set; }

    [Column("warehouse_id")]
    [Required]
    public int WarehouseId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 0;

    [Column("unit_cost")]
    public decimal UnitCost { get; set; } = 0;

    [Column("total_cost")]
    public decimal TotalCost { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ProductionOrder ProductionOrder { get; set; } = null!;
    public RawMaterial RawMaterial { get; set; } = null!;
    public Warehouse Warehouse { get; set; } = null!;
}

[Table("production_order_costs")]
public class ProductionOrderCost
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("production_order_id")]
    [Required]
    public int ProductionOrderId { get; set; }

    [Column("description")]
    [Required]
    [MaxLength(255)]
    public string Description { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; } = 0;

    [Column("expense_id")]
    public int? ExpenseId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ProductionOrder ProductionOrder { get; set; } = null!;
    public Expense? Expense { get; set; }
}
