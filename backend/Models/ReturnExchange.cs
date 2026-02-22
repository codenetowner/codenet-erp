using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("return_exchanges")]
public class ReturnExchange
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("transaction_number")]
    [Required]
    [MaxLength(50)]
    public string TransactionNumber { get; set; } = string.Empty;

    [Column("original_order_id")]
    [Required]
    public int OriginalOrderId { get; set; }

    [Column("customer_id")]
    [Required]
    public int CustomerId { get; set; }

    [Column("warehouse_id")]
    [Required]
    public int WarehouseId { get; set; }

    [Column("cashier_id")]
    public int? CashierId { get; set; }

    [Column("transaction_date")]
    [Required]
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    [Column("return_total")]
    public decimal ReturnTotal { get; set; } = 0;

    [Column("exchange_total")]
    public decimal ExchangeTotal { get; set; } = 0;

    [Column("net_amount")]
    public decimal NetAmount { get; set; } = 0;

    [Column("refund_method")]
    [MaxLength(50)]
    public string? RefundMethod { get; set; }

    [Column("refund_amount")]
    public decimal RefundAmount { get; set; } = 0;

    [Column("payment_method")]
    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    [Column("payment_amount")]
    public decimal PaymentAmount { get; set; } = 0;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("manager_approval_required")]
    public bool ManagerApprovalRequired { get; set; } = false;

    [Column("approved_by")]
    public int? ApprovedBy { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "completed";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    
    [ForeignKey("OriginalOrderId")]
    public Order OriginalOrder { get; set; } = null!;
    
    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;
    
    [ForeignKey("WarehouseId")]
    public Warehouse Warehouse { get; set; } = null!;
    
    [ForeignKey("CashierId")]
    public Employee? Cashier { get; set; }
    
    [ForeignKey("ApprovedBy")]
    public Employee? Approver { get; set; }
    
    public ICollection<ReturnExchangeItem> ReturnItems { get; set; } = new List<ReturnExchangeItem>();
    public ICollection<ReturnExchangeItem> ExchangeItems { get; set; } = new List<ReturnExchangeItem>();
}

[Table("return_exchange_items")]
public class ReturnExchangeItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("return_exchange_id")]
    [Required]
    public int ReturnExchangeId { get; set; }

    [Column("item_type")]
    [Required]
    [MaxLength(20)]
    public string ItemType { get; set; } = "return";

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("original_order_item_id")]
    public int? OriginalOrderItemId { get; set; }

    [Column("unit_type")]
    [MaxLength(20)]
    public string UnitType { get; set; } = "piece";

    [Column("quantity")]
    [Required]
    public decimal Quantity { get; set; }

    [Column("unit_price")]
    [Required]
    public decimal UnitPrice { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("line_total")]
    [Required]
    public decimal LineTotal { get; set; }

    [Column("reason")]
    [MaxLength(100)]
    public string? Reason { get; set; }

    [Column("condition")]
    [MaxLength(50)]
    public string? Condition { get; set; }

    [Column("inventory_action")]
    [MaxLength(50)]
    public string? InventoryAction { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ReturnExchange ReturnExchange { get; set; } = null!;
    public Product Product { get; set; } = null!;
    
    [ForeignKey("OriginalOrderItemId")]
    public OrderItem? OriginalOrderItem { get; set; }
}
