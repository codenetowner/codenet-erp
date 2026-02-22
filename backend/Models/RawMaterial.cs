using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("raw_materials")]
public class RawMaterial
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

    [Column("description")]
    public string? Description { get; set; }

    [Column("unit")]
    [MaxLength(50)]
    public string Unit { get; set; } = "Unit";

    [Column("cost_price")]
    public decimal CostPrice { get; set; } = 0;

    [Column("low_stock_alert")]
    public decimal LowStockAlert { get; set; } = 10;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<RawMaterialInventory> Inventories { get; set; } = new List<RawMaterialInventory>();
    public ICollection<RawMaterialPurchaseItem> PurchaseItems { get; set; } = new List<RawMaterialPurchaseItem>();
    public ICollection<ProductionOrderMaterial> ProductionMaterials { get; set; } = new List<ProductionOrderMaterial>();
}

[Table("raw_material_inventory")]
public class RawMaterialInventory
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("raw_material_id")]
    [Required]
    public int RawMaterialId { get; set; }

    [Column("warehouse_id")]
    [Required]
    public int WarehouseId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public RawMaterial RawMaterial { get; set; } = null!;
    public Warehouse Warehouse { get; set; } = null!;
}

[Table("raw_material_purchases")]
public class RawMaterialPurchase
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("purchase_number")]
    [Required]
    [MaxLength(50)]
    public string PurchaseNumber { get; set; } = string.Empty;

    [Column("supplier_id")]
    public int? SupplierId { get; set; }

    [Column("supplier_name")]
    [MaxLength(255)]
    public string? SupplierName { get; set; }

    [Column("supplier_contact")]
    [MaxLength(100)]
    public string? SupplierContact { get; set; }

    [Column("purchase_date")]
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    [Column("due_date")]
    public DateTime? DueDate { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("shipping_cost")]
    public decimal ShippingCost { get; set; } = 0;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("paid_amount")]
    public decimal PaidAmount { get; set; } = 0;

    [Column("payment_status")]
    [MaxLength(20)]
    public string PaymentStatus { get; set; } = "unpaid";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("reference")]
    [MaxLength(255)]
    public string? Reference { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Supplier? Supplier { get; set; }
    
    [ForeignKey("CreatedBy")]
    public Employee? Creator { get; set; }
    public ICollection<RawMaterialPurchaseItem> Items { get; set; } = new List<RawMaterialPurchaseItem>();
}

[Table("raw_material_purchase_items")]
public class RawMaterialPurchaseItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("purchase_id")]
    [Required]
    public int PurchaseId { get; set; }

    [Column("raw_material_id")]
    [Required]
    public int RawMaterialId { get; set; }

    [Column("warehouse_id")]
    [Required]
    public int WarehouseId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 0;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("line_total")]
    public decimal LineTotal { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public RawMaterialPurchase Purchase { get; set; } = null!;
    public RawMaterial RawMaterial { get; set; } = null!;
    public Warehouse Warehouse { get; set; } = null!;
}
