using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

/// <summary>
/// Assigns specific customers to employees (drivers/salesmen) for visibility control
/// </summary>
[Table("employee_customers")]
public class EmployeeCustomer
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("employee_id")]
    [Required]
    public int EmployeeId { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
