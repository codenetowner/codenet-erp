using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("suppliers")]
public class Supplier
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("company_name")]
    [MaxLength(255)]
    public string? CompanyName { get; set; }

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("city")]
    [MaxLength(100)]
    public string? City { get; set; }

    [Column("country")]
    [MaxLength(100)]
    public string? Country { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("payment_terms")]
    [MaxLength(100)]
    public string? PaymentTerms { get; set; }

    [Column("credit_limit")]
    public decimal CreditLimit { get; set; } = 0;

    [Column("balance")]
    public decimal Balance { get; set; } = 0;

    [Column("credit_balance")]
    public decimal CreditBalance { get; set; } = 0;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("is_manufacturer")]
    public bool IsManufacturer { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
    public ICollection<PurchaseInvoice> Invoices { get; set; } = new List<PurchaseInvoice>();
    public ICollection<SupplierPayment> Payments { get; set; } = new List<SupplierPayment>();
}

[Table("purchase_orders")]
public class PurchaseOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("supplier_id")]
    [Required]
    public int SupplierId { get; set; }

    [Column("po_number")]
    [MaxLength(50)]
    public string PoNumber { get; set; } = string.Empty;

    [Column("po_date")]
    public DateTime PoDate { get; set; } = DateTime.UtcNow;

    [Column("expected_date")]
    public DateTime? ExpectedDate { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("shipping_amount")]
    public decimal ShippingAmount { get; set; } = 0;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "draft"; // draft, sent, confirmed, received, cancelled

    [Column("reference")]
    [MaxLength(255)]
    public string? Reference { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("sent_at")]
    public DateTime? SentAt { get; set; }

    [Column("confirmed_at")]
    public DateTime? ConfirmedAt { get; set; }

    [Column("received_at")]
    public DateTime? ReceivedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
}

[Table("purchase_order_items")]
public class PurchaseOrderItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("purchase_order_id")]
    [Required]
    public int PurchaseOrderId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 1;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("line_total")]
    public decimal LineTotal { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("PurchaseOrderId")]
    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    public Product Product { get; set; } = null!;
}

[Table("purchase_invoices")]
public class PurchaseInvoice
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("supplier_id")]
    [Required]
    public int SupplierId { get; set; }

    [Column("invoice_number")]
    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("invoice_date")]
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    [Column("due_date")]
    public DateTime? DueDate { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("shipping_amount")]
    public decimal ShippingAmount { get; set; } = 0;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0;

    [Column("paid_amount")]
    public decimal PaidAmount { get; set; } = 0;

    [Column("payment_status")]
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "unpaid";

    [Column("reference")]
    [MaxLength(255)]
    public string? Reference { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
    public ICollection<PurchaseInvoiceItem> Items { get; set; } = new List<PurchaseInvoiceItem>();
}

[Table("purchase_invoice_items")]
public class PurchaseInvoiceItem
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("purchase_invoice_id")]
    [Required]
    public int PurchaseInvoiceId { get; set; }

    [Column("product_id")]
    [Required]
    public int ProductId { get; set; }

    [Column("warehouse_id")]
    public int? WarehouseId { get; set; }

    [Column("unit_id")]
    public int? UnitId { get; set; }

    [Column("quantity")]
    public decimal Quantity { get; set; } = 1;

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0;

    [Column("line_total")]
    public decimal LineTotal { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("PurchaseInvoiceId")]
    public PurchaseInvoice Invoice { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Warehouse? Warehouse { get; set; }
}

[Table("supplier_payments")]
public class SupplierPayment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("supplier_id")]
    [Required]
    public int SupplierId { get; set; }

    [Column("payment_number")]
    [MaxLength(50)]
    public string PaymentNumber { get; set; } = string.Empty;

    [Column("payment_date")]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [Column("method")]
    [MaxLength(50)]
    public string Method { get; set; } = "Cash"; // Cash, Bank Transfer, Check

    [Column("amount")]
    public decimal Amount { get; set; } = 0;

    [Column("reference")]
    [MaxLength(255)]
    public string? Reference { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("invoice_id")]
    public int? InvoiceId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public Supplier Supplier { get; set; } = null!;
    public PurchaseInvoice? Invoice { get; set; }
}
