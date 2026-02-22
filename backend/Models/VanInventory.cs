using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("van_inventory")]
public class VanInventory
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

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 0;

    [Column("loaded_at")]
    public DateTime LoadedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Van Van { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
