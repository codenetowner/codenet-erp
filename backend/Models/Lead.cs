using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("leads")]
public class Lead
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

    [Column("shop_name")]
    [MaxLength(255)]
    public string? ShopName { get; set; }

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("city")]
    [MaxLength(100)]
    public string? City { get; set; }

    [Column("area")]
    [MaxLength(100)]
    public string? Area { get; set; }

    [Column("location_lat")]
    public decimal? LocationLat { get; set; }

    [Column("location_lng")]
    public decimal? LocationLng { get; set; }

    [Column("business_type")]
    [MaxLength(100)]
    public string? BusinessType { get; set; }

    [Column("estimated_potential")]
    public string? EstimatedPotential { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("status")]
    public string Status { get; set; } = "new"; // new, contacted, qualified, converted, rejected

    [Column("captured_by")]
    [Required]
    public int CapturedBy { get; set; }

    [Column("assigned_to")]
    public int? AssignedTo { get; set; }

    [Column("converted_customer_id")]
    public int? ConvertedCustomerId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    
    [ForeignKey("CapturedBy")]
    public Employee CapturedByEmployee { get; set; } = null!;
    
    [ForeignKey("AssignedTo")]
    public Employee? AssignedToEmployee { get; set; }
    
    [ForeignKey("ConvertedCustomerId")]
    public Customer? ConvertedCustomer { get; set; }
}
