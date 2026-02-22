using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("app_customers")]
public class AppCustomer
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [MaxLength(255)]
    public string? Name { get; set; }

    [Column("phone")]
    [Required]
    [MaxLength(50)]
    public string Phone { get; set; } = string.Empty;

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("password_hash")]
    [MaxLength(500)]
    public string? PasswordHash { get; set; }

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [Column("auth_provider")]
    [MaxLength(50)]
    public string? AuthProvider { get; set; }

    [Column("auth_provider_id")]
    [MaxLength(255)]
    public string? AuthProviderId { get; set; }

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<AppCustomerAddress> Addresses { get; set; } = new List<AppCustomerAddress>();
    public ICollection<OnlineOrder> Orders { get; set; } = new List<OnlineOrder>();
    public ICollection<AppFavorite> Favorites { get; set; } = new List<AppFavorite>();
}
