using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("store_reviews")]
public class StoreReview
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("app_customer_id")]
    public int? AppCustomerId { get; set; }

    [Column("order_id")]
    public int? OrderId { get; set; }

    [Column("guest_name")]
    [MaxLength(255)]
    public string? GuestName { get; set; }

    [Column("rating")]
    [Required]
    public int Rating { get; set; }

    [Column("comment")]
    public string? Comment { get; set; }

    [Column("reply")]
    public string? Reply { get; set; }

    [Column("replied_at")]
    public DateTime? RepliedAt { get; set; }

    [Column("is_visible")]
    public bool IsVisible { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public AppCustomer? AppCustomer { get; set; }
    public OnlineOrder? Order { get; set; }
}
