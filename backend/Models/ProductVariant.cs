using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("product_variants")]
public class ProductVariant
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

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty; // e.g. "Red", "Large", "Red - Large"

    [Column("sku")]
    [MaxLength(100)]
    public string? Sku { get; set; }

    [Column("barcode")]
    [MaxLength(100)]
    public string? Barcode { get; set; }

    // Price overrides (null = use parent product price)
    [Column("retail_price")]
    public decimal? RetailPrice { get; set; }

    [Column("wholesale_price")]
    public decimal? WholesalePrice { get; set; }

    [Column("cost_price")]
    public decimal? CostPrice { get; set; }

    [Column("box_retail_price")]
    public decimal? BoxRetailPrice { get; set; }

    [Column("box_wholesale_price")]
    public decimal? BoxWholesalePrice { get; set; }

    [Column("box_cost_price")]
    public decimal? BoxCostPrice { get; set; }

    [Column("image_url")]
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    // Optional Attributes
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

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
