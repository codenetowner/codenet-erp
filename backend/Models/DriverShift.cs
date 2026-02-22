using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("driver_shifts")]
public class DriverShift
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("driver_id")]
    [Required]
    public int DriverId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    [Column("task_id")]
    public int? TaskId { get; set; }

    [Column("shift_date")]
    public DateOnly ShiftDate { get; set; }

    [Column("start_time")]
    public DateTime? StartTime { get; set; }

    [Column("end_time")]
    public DateTime? EndTime { get; set; }

    [Column("start_cash")]
    public decimal StartCash { get; set; } = 0;

    [Column("end_cash")]
    public decimal EndCash { get; set; } = 0;

    [Column("total_collections")]
    public decimal TotalCollections { get; set; } = 0;

    [Column("total_deposits")]
    public decimal TotalDeposits { get; set; } = 0;

    [Column("total_sales")]
    public decimal TotalSales { get; set; } = 0;

    [Column("customers_visited")]
    public int CustomersVisited { get; set; } = 0;

    [Column("customers_skipped")]
    public int CustomersSkipped { get; set; } = 0;

    [Column("orders_count")]
    public int OrdersCount { get; set; } = 0;

    [Column("new_customers")]
    public int NewCustomers { get; set; } = 0;

    [Column("status")]
    public string Status { get; set; } = "active"; // active, completed

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Employee Driver { get; set; } = null!;
    public Van? Van { get; set; }
    public Task? Task { get; set; }
}
