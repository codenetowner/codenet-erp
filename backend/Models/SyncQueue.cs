using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("sync_queue")]
public class SyncQueue
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("entity_type")]
    [Required]
    [MaxLength(50)]
    public string EntityType { get; set; } = string.Empty; // order, collection, return, lead, etc.

    [Column("entity_id")]
    public int? EntityId { get; set; }

    [Column("action")]
    public string Action { get; set; } = "create"; // create, update, delete

    [Column("payload", TypeName = "jsonb")]
    [Required]
    public string Payload { get; set; } = "{}";

    [Column("sync_status")]
    public string SyncStatus { get; set; } = "pending"; // pending, synced, failed

    [Column("retry_count")]
    public int RetryCount { get; set; } = 0;

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("synced_at")]
    public DateTime? SyncedAt { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public Employee? Driver { get; set; }
}
