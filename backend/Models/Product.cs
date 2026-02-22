using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("products")]
public class Product
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("sku")]
    [MaxLength(100)]
    public string? Sku { get; set; }

    [Column("barcode")]
    [MaxLength(100)]
    public string? Barcode { get; set; }

    [Column("box_barcode")]
    [MaxLength(100)]
    public string? BoxBarcode { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("name_ar")]
    [MaxLength(255)]
    public string? NameAr { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Column("image_url")]
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    // Units Configuration
    [Column("base_unit")]
    [MaxLength(50)]
    public string BaseUnit { get; set; } = "Piece";

    [Column("second_unit")]
    [MaxLength(50)]
    public string? SecondUnit { get; set; } = "Box";

    [Column("units_per_second")]
    public int UnitsPerSecond { get; set; } = 1;

    // Currency and Warehouse
    [Column("currency")]
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    [Column("default_warehouse_id")]
    public int? DefaultWarehouseId { get; set; }

    // Piece Prices
    [Column("retail_price")]
    public decimal RetailPrice { get; set; } = 0;

    [Column("wholesale_price")]
    public decimal WholesalePrice { get; set; } = 0;

    [Column("super_wholesale_price")]
    public decimal SuperWholesalePrice { get; set; } = 0;

    [Column("cost_price")]
    public decimal CostPrice { get; set; } = 0;

    // Box/Second Unit Prices
    [Column("box_retail_price")]
    public decimal BoxRetailPrice { get; set; } = 0;

    [Column("box_wholesale_price")]
    public decimal BoxWholesalePrice { get; set; } = 0;

    [Column("box_super_wholesale_price")]
    public decimal BoxSuperWholesalePrice { get; set; } = 0;

    [Column("box_cost_price")]
    public decimal BoxCostPrice { get; set; } = 0;

    // Stock Alerts
    [Column("low_stock_alert")]
    public int LowStockAlert { get; set; } = 10;

    [Column("low_stock_alert_box")]
    public int LowStockAlertBox { get; set; } = 2;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("show_in_online_shop")]
    public bool ShowInOnlineShop { get; set; } = false;

    // Optional Product Attributes
    [Column("color")]
    [MaxLength(100)]
    public string? Color { get; set; }

    [Column("size")]
    [MaxLength(100)]
    public string? Size { get; set; }

    [Column("weight")]
    public decimal? Weight { get; set; }

    [Column("length")]
    public decimal? Length { get; set; }

    [Column("height")]
    public decimal? Height { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ProductCategory? Category { get; set; }
    public Warehouse? DefaultWarehouse { get; set; }
    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}
