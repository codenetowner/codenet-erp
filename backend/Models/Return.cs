using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("returns")]
public class Return
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("return_number")]
    [Required]
    [MaxLength(50)]
    public string ReturnNumber { get; set; } = string.Empty;

    [Column("order_id")]
    public int? OrderId { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("return_date")]
    [Required]
    public DateOnly ReturnDate { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending"; // pending, approved, rejected, processed

    [Column("approved_by")]
    public int? ApprovedBy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    
    [ForeignKey("OrderId")]
    public Order? Order { get; set; }
    
    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;
    
    [ForeignKey("DriverId")]
    public Employee? Driver { get; set; }
    
    [ForeignKey("ApprovedBy")]
    public Employee? Approver { get; set; }
    
    public ICollection<ReturnItem> ReturnItems { get; set; } = new List<ReturnItem>();
}

[Table("return_items")]
public class ReturnItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("return_id")]
    [Required]
    public int ReturnId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("unit_id")]
    public int? UnitId { get; set; }

    [Column("quantity")]
    [Required]
    public decimal Quantity { get; set; }

    [Column("unit_price")]
    [Required]
    public decimal UnitPrice { get; set; }

    [Column("line_total")]
    [Required]
    public decimal LineTotal { get; set; }

    [Column("reason")]
    [MaxLength(255)]
    public string? Reason { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Return Return { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
