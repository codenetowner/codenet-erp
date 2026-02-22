using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("inventory_settings")]
public class InventorySettings
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    public int CompanyId { get; set; }

    [Column("valuation_method")]
    [MaxLength(50)]
    public string ValuationMethod { get; set; } = "fifo"; // fifo, lifo, weighted_average

    [Column("cost_spike_threshold")]
    public decimal CostSpikeThreshold { get; set; } = 20;

    [Column("low_margin_threshold")]
    public decimal LowMarginThreshold { get; set; } = 10;

    [Column("enable_cost_alerts")]
    public bool EnableCostAlerts { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("CompanyId")]
    public virtual Company? Company { get; set; }
}
