using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("orders")]
public class Order
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("order_number")]
    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    [Column("task_id")]
    public int? TaskId { get; set; }

    [Column("order_date")]
    public DateTime OrderDate { get; set; }

    [Column("order_time")]
    public TimeSpan? OrderTime { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("paid_amount")]
    public decimal PaidAmount { get; set; } = 0;

    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "unpaid";

    [Column("order_status")]
    public string OrderStatus { get; set; } = "confirmed";

    [Column("delivery_address")]
    public string? DeliveryAddress { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("payment_currencies", TypeName = "jsonb")]
    public string? PaymentCurrencies { get; set; }

    [Column("exchange_rate_snapshot", TypeName = "jsonb")]
    public string? ExchangeRateSnapshot { get; set; }

    [Column("location_lat")]
    public decimal? LocationLat { get; set; }

    [Column("location_lng")]
    public decimal? LocationLng { get; set; }

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public Employee? Driver { get; set; }
    public Van? Van { get; set; }
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
