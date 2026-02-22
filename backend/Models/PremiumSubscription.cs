using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("premium_subscriptions")]
public class PremiumSubscription
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("tier")]
    [Required]
    [MaxLength(50)]
    public string Tier { get; set; } = string.Empty;

    [Column("start_date")]
    [Required]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    [Required]
    public DateTime EndDate { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; } = 0;

    [Column("payment_status")]
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "pending";

    [Column("features", TypeName = "jsonb")]
    public string? Features { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
}
