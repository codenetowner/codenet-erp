using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("app_favorites")]
public class AppFavorite
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("company_id")]
    public int? CompanyId { get; set; }

    [Column("product_id")]
    public int? ProductId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppCustomer Customer { get; set; } = null!;
    public Company? Company { get; set; }
    public Product? Product { get; set; }
}
