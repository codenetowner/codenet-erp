using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("licenses")]
public class License
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("license_key")]
    [Required]
    [MaxLength(100)]
    public string LicenseKey { get; set; } = string.Empty;

    [Column("company_id")]
    public int CompanyId { get; set; }

    [Column("machine_fingerprint")]
    [MaxLength(500)]
    public string? MachineFingerprint { get; set; }

    [Column("max_devices")]
    public int MaxDevices { get; set; } = 1;

    [Column("activated_devices")]
    public int ActivatedDevices { get; set; } = 0;

    [Column("license_type")]
    [MaxLength(50)]
    public string LicenseType { get; set; } = "offline"; // offline, online, trial

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "active"; // active, expired, revoked, suspended

    [Column("issued_at")]
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("last_check_in")]
    public DateTime? LastCheckIn { get; set; }

    [Column("grace_period_days")]
    public int GracePeriodDays { get; set; } = 7;

    [Column("features")]
    public string? Features { get; set; } // JSON array of enabled features

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company? Company { get; set; }
    public ICollection<LicenseActivation> Activations { get; set; } = new List<LicenseActivation>();
}

[Table("license_activations")]
public class LicenseActivation
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("license_id")]
    public int LicenseId { get; set; }

    [Column("machine_fingerprint")]
    [Required]
    [MaxLength(500)]
    public string MachineFingerprint { get; set; } = string.Empty;

    [Column("machine_name")]
    [MaxLength(255)]
    public string? MachineName { get; set; }

    [Column("os_info")]
    [MaxLength(255)]
    public string? OsInfo { get; set; }

    [Column("ip_address")]
    [MaxLength(50)]
    public string? IpAddress { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("activated_at")]
    public DateTime ActivatedAt { get; set; } = DateTime.UtcNow;

    [Column("last_seen")]
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;

    [Column("deactivated_at")]
    public DateTime? DeactivatedAt { get; set; }

    // Navigation
    public License? License { get; set; }
}
