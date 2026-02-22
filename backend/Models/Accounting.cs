using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("chart_of_accounts")]
public class ChartOfAccount
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("code")]
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("account_type")]
    [Required]
    [MaxLength(50)]
    public string AccountType { get; set; } = string.Empty; // asset, liability, equity, revenue, expense

    [Column("category")]
    [MaxLength(100)]
    public string? Category { get; set; } // Current Asset, Fixed Asset, COGS, Operating, etc.

    [Column("parent_id")]
    public int? ParentId { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("is_system")]
    public bool IsSystem { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("balance")]
    public decimal Balance { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ChartOfAccount? Parent { get; set; }
    public ICollection<ChartOfAccount> Children { get; set; } = new List<ChartOfAccount>();
    public ICollection<JournalEntryLine> JournalEntryLines { get; set; } = new List<JournalEntryLine>();
}

[Table("journal_entries")]
public class JournalEntry
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("entry_number")]
    [Required]
    [MaxLength(50)]
    public string EntryNumber { get; set; } = string.Empty;

    [Column("entry_date")]
    public DateTime EntryDate { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("reference_type")]
    [MaxLength(50)]
    public string? ReferenceType { get; set; } // order, expense, supplier_invoice, supplier_payment, collection, deposit, salary, production, return, manual

    [Column("reference_id")]
    public int? ReferenceId { get; set; }

    [Column("total_debit")]
    public decimal TotalDebit { get; set; } = 0;

    [Column("total_credit")]
    public decimal TotalCredit { get; set; } = 0;

    [Column("is_posted")]
    public bool IsPosted { get; set; } = false;

    [Column("is_reversed")]
    public bool IsReversed { get; set; } = false;

    [Column("reversed_by_id")]
    public int? ReversedById { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public JournalEntry? ReversedBy { get; set; }
    public ICollection<JournalEntryLine> Lines { get; set; } = new List<JournalEntryLine>();
}

[Table("journal_entry_lines")]
public class JournalEntryLine
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("journal_entry_id")]
    [Required]
    public int JournalEntryId { get; set; }

    [Column("account_id")]
    [Required]
    public int AccountId { get; set; }

    [Column("debit")]
    public decimal Debit { get; set; } = 0;

    [Column("credit")]
    public decimal Credit { get; set; } = 0;

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public JournalEntry JournalEntry { get; set; } = null!;
    public ChartOfAccount Account { get; set; } = null!;
}
