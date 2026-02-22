using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("online_order_items")]
public class OnlineOrderItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_id")]
    [Required]
    public int OrderId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("product_name")]
    [MaxLength(255)]
    public string? ProductName { get; set; }

    [Column("unit_type")]
    [MaxLength(50)]
    public string UnitType { get; set; } = "piece";

    [Column("quantity")]
    public decimal Quantity { get; set; } = 1;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0;

    [Column("total")]
    public decimal Total { get; set; } = 0;

    [Column("currency")]
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    [Column("notes")]
    public string? Notes { get; set; }

    // Navigation
    public OnlineOrder Order { get; set; } = null!;
}
