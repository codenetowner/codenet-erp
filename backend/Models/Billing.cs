using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("billing")]
public class Billing
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    public int CompanyId { get; set; }

    [Column("plan_id")]
    public int? PlanId { get; set; }

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("payment_date")]
    public DateTime PaymentDate { get; set; }

    [Column("next_renewal_date")]
    public DateTime? NextRenewalDate { get; set; }

    [Column("payment_method")]
    public string PaymentMethod { get; set; } = "cash";

    [Column("transaction_reference")]
    public string? TransactionReference { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CompanyId")]
    public virtual Company Company { get; set; } = null!;

    [ForeignKey("PlanId")]
    public virtual Plan? Plan { get; set; }
}
