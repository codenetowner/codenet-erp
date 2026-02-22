using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("expense_categories")]
public class ExpenseCategory
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}

[Table("expenses")]
public class Expense
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("expense_number")]
    [MaxLength(50)]
    public string? ExpenseNumber { get; set; }

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("expense_date")]
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;

    [Column("description")]
    public string? Description { get; set; }

    [Column("receipt_url")]
    [MaxLength(500)]
    public string? ReceiptUrl { get; set; }

    [Column("employee_id")]
    public int? EmployeeId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [Column("status")]
    public string Status { get; set; } = "approved";

    [Column("approved_by")]
    public int? ApprovedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ExpenseCategory? Category { get; set; }
    public Employee? Employee { get; set; }
    public Van? Van { get; set; }
}
