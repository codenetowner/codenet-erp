using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("vans")]
public class Van
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("plate_number")]
    [MaxLength(50)]
    public string? PlateNumber { get; set; }

    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("assigned_driver_id")]
    public int? AssignedDriverId { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("max_cash")]
    public decimal MaxCash { get; set; } = 10000;

    [Column("current_cash")]
    public decimal CurrentCash { get; set; } = 0;

    [Column("starting_cash")]
    public decimal StartingCash { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Warehouse? Warehouse { get; set; }
    public Employee? AssignedDriver { get; set; }
    public ICollection<VanInventory> VanInventories { get; set; } = new List<VanInventory>();
}
