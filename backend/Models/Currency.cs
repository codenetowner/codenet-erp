using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("currencies")]
public class Currency
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("code")]
    [Required]
    [MaxLength(10)]
    public string Code { get; set; } = string.Empty; // e.g. USD, EUR, GBP

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // e.g. United States Dollar

    [Column("symbol")]
    [MaxLength(10)]
    public string Symbol { get; set; } = string.Empty; // e.g. $, €, £

    [Column("exchange_rate")]
    public decimal ExchangeRate { get; set; } = 1.0m;

    [Column("is_base")]
    public bool IsBase { get; set; } = false;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
}
