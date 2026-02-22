using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("tasks")]
public class Task
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("task_number")]
    [MaxLength(50)]
    public string TaskNumber { get; set; } = string.Empty;

    [Column("type")]
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = "Delivery"; // Delivery, Cash Collection, Mixed, Customer Visit, Supplier Pickup

    [Column("customer_id")]
    public int? CustomerId { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("salesman_id")]
    public int? SalesmanId { get; set; }

    [Column("van_id")]
    public int? VanId { get; set; }

    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("supplier_id")]
    public int? SupplierId { get; set; }

    [Column("scheduled_date")]
    public DateTime ScheduledDate { get; set; } = DateTime.UtcNow;

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Started, In Progress, Completed, Delayed, Cancelled

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("discount")]
    public decimal Discount { get; set; } = 0;

    [Column("extra_charge")]
    public decimal ExtraCharge { get; set; } = 0;

    [Column("tax")]
    public decimal Tax { get; set; } = 0;

    [Column("total")]
    public decimal Total { get; set; } = 0;

    [Column("paid_amount")]
    public decimal PaidAmount { get; set; } = 0;

    [Column("debt_amount")]
    public decimal DebtAmount { get; set; } = 0;

    [Column("payment_type")]
    [MaxLength(20)]
    public string PaymentType { get; set; } = "cash"; // cash, credit, split

    [Column("started_at")]
    public DateTime? StartedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public int? CreatedBy { get; set; }

    [Column("proof_of_delivery_url")]
    [MaxLength(500)]
    public string? ProofOfDeliveryUrl { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public Customer? Customer { get; set; }
    public Employee? Driver { get; set; }
    public Employee? Salesman { get; set; }
    public Van? Van { get; set; }
    public Warehouse? Warehouse { get; set; }
    public Supplier? Supplier { get; set; }
    public ICollection<TaskItem> Items { get; set; } = new List<TaskItem>();
    public ICollection<TaskCustomer> TaskCustomers { get; set; } = new List<TaskCustomer>();
}

[Table("task_items")]
public class TaskItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("task_id")]
    [Required]
    public int TaskId { get; set; }

    [Column("product_id")]
    public int? ProductId { get; set; }

    [Column("product_name")]
    [MaxLength(255)]
    public string? ProductName { get; set; }

    [Column("product_sku")]
    [MaxLength(100)]
    public string? ProductSku { get; set; }

    [Column("product_barcode")]
    [MaxLength(100)]
    public string? ProductBarcode { get; set; }

    [Column("unit_type")]
    [MaxLength(50)]
    public string UnitType { get; set; } = "Piece"; // Piece, Box

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0;

    [Column("discount_percent")]
    public decimal DiscountPercent { get; set; } = 0;

    [Column("total")]
    public decimal Total { get; set; } = 0;

    [Column("cost_price")]
    public decimal CostPrice { get; set; } = 0;

    // Navigation
    public Task Task { get; set; } = null!;
    public Product? Product { get; set; }
}

[Table("task_customers")]
public class TaskCustomer
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("task_id")]
    [Required]
    public int TaskId { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("visit_order")]
    public int VisitOrder { get; set; } = 0;

    [Column("status")]
    public string Status { get; set; } = "pending"; // pending, visited, skipped

    [Column("visited_at")]
    public DateTime? VisitedAt { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Task Task { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
