using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("ads")]
public class Ad
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    public int? CompanyId { get; set; }

    [Column("placement_id")]
    [Required]
    public int PlacementId { get; set; }

    [Column("title")]
    [MaxLength(255)]
    public string? Title { get; set; }

    [Column("image_url")]
    [Required]
    [MaxLength(500)]
    public string ImageUrl { get; set; } = string.Empty;

    [Column("link_url")]
    [MaxLength(500)]
    public string? LinkUrl { get; set; }

    [Column("start_date")]
    [Required]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    [Required]
    public DateTime EndDate { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("impressions")]
    public int Impressions { get; set; } = 0;

    [Column("clicks")]
    public int Clicks { get; set; } = 0;

    [Column("amount_paid")]
    public decimal AmountPaid { get; set; } = 0;

    [Column("payment_status")]
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company? Company { get; set; }
    public AdPlacement Placement { get; set; } = null!;
}
