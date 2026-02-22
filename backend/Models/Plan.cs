using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("plans")]
public class Plan
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column("price")]
    public decimal Price { get; set; }

    [Column("duration_days")]
    public int DurationDays { get; set; } = 30;

    [Column("max_customers")]
    public int? MaxCustomers { get; set; }

    [Column("max_employees")]
    public int? MaxEmployees { get; set; }

    [Column("max_drivers")]
    public int? MaxDrivers { get; set; }

    [Column("max_vans")]
    public int? MaxVans { get; set; }

    [Column("max_warehouses")]
    public int? MaxWarehouses { get; set; }

    [Column("features", TypeName = "jsonb")]
    public string? Features { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Company> Companies { get; set; } = new List<Company>();
}
