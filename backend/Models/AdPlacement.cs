using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("ad_placements")]
public class AdPlacement
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("max_width")]
    public int? MaxWidth { get; set; }

    [Column("max_height")]
    public int? MaxHeight { get; set; }

    [Column("price_per_day")]
    public decimal PricePerDay { get; set; } = 0;

    [Column("price_per_week")]
    public decimal PricePerWeek { get; set; } = 0;

    [Column("price_per_month")]
    public decimal PricePerMonth { get; set; } = 0;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Ad> Ads { get; set; } = new List<Ad>();
}
