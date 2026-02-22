using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

/// <summary>
/// Assigns specific products to employees (drivers/salesmen) for visibility control
/// </summary>
[Table("employee_products")]
public class EmployeeProduct
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("employee_id")]
    [Required]
    public int EmployeeId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
