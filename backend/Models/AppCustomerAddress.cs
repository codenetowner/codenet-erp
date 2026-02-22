using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("app_customer_addresses")]
public class AppCustomerAddress
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("label")]
    [MaxLength(50)]
    public string? Label { get; set; }

    [Column("address")]
    [Required]
    public string Address { get; set; } = string.Empty;

    [Column("city")]
    [MaxLength(100)]
    public string? City { get; set; }

    [Column("lat")]
    public decimal? Lat { get; set; }

    [Column("lng")]
    public decimal? Lng { get; set; }

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppCustomer Customer { get; set; } = null!;
}
