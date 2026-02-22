using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("order_items")]
public class OrderItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_id")]
    [Required]
    public int OrderId { get; set; }

    [Column("product_id")]
    public int? ProductId { get; set; }

    [Column("product_name")]
    [MaxLength(255)]
    public string? ProductName { get; set; }

    [Column("product_sku")]
    [MaxLength(100)]
    public string? ProductSku { get; set; }

    [Column("product_barcode")]
    [MaxLength(100)]
    public string? ProductBarcode { get; set; }

    [Column("variant_name")]
    [MaxLength(255)]
    public string? VariantName { get; set; }

    [Column("variant_sku")]
    [MaxLength(100)]
    public string? VariantSku { get; set; }

    [Column("variant_details")]
    [MaxLength(500)]
    public string? VariantDetails { get; set; }

    [Column("unit_id")]
    public int? UnitId { get; set; }

    [Column("variant_id")]
    public int? VariantId { get; set; }

    [Column("unit_type")]
    public string UnitType { get; set; } = "piece";

    [Column("quantity")]
    public decimal Quantity { get; set; }

    [Column("unit_price")]
    public decimal UnitPrice { get; set; }

    [Column("discount_percent")]
    public decimal DiscountPercent { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("line_total")]
    public decimal Total { get; set; }

    [Column("cost_price")]
    public decimal? CostPrice { get; set; }

    [Column("currency")]
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Order Order { get; set; } = null!;
    public Product? Product { get; set; }
    public ProductVariant? Variant { get; set; }
}
