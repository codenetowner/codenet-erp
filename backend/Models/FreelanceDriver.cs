using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("freelance_drivers")]
public class FreelanceDriver
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("phone")]
    [Required]
    [MaxLength(50)]
    public string Phone { get; set; } = string.Empty;

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("password_hash")]
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("photo_url")]
    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    [Column("id_document_url")]
    [MaxLength(500)]
    public string? IdDocumentUrl { get; set; }

    [Column("license_url")]
    [MaxLength(500)]
    public string? LicenseUrl { get; set; }

    [Column("vehicle_type")]
    [MaxLength(50)]
    public string VehicleType { get; set; } = "car";

    [Column("vehicle_plate")]
    [MaxLength(50)]
    public string? VehiclePlate { get; set; }

    [Column("vehicle_color")]
    [MaxLength(50)]
    public string? VehicleColor { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    [Column("is_online")]
    public bool IsOnline { get; set; } = false;

    [Column("current_lat")]
    public decimal? CurrentLat { get; set; }

    [Column("current_lng")]
    public decimal? CurrentLng { get; set; }

    [Column("rating")]
    public decimal Rating { get; set; } = 5.0m;

    [Column("total_deliveries")]
    public int TotalDeliveries { get; set; } = 0;

    [Column("total_earnings")]
    public decimal TotalEarnings { get; set; } = 0;

    [Column("rejection_reason")]
    public string? RejectionReason { get; set; }

    [Column("approved_at")]
    public DateTime? ApprovedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("delivery_company_id")]
    public int? DeliveryCompanyId { get; set; }

    [ForeignKey("DeliveryCompanyId")]
    public DeliveryCompany? DeliveryCompany { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
