using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models
{
    [Table("quotes")]
    public class Quote
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("company_id")]
        public int CompanyId { get; set; }

        [Column("quote_number")]
        [Required]
        [StringLength(50)]
        public string QuoteNumber { get; set; } = string.Empty;

        [Column("customer_id")]
        public int CustomerId { get; set; }

        [Column("employee_id")]
        public int? EmployeeId { get; set; }

        [Column("quote_date")]
        public DateTime QuoteDate { get; set; } = DateTime.UtcNow;

        [Column("valid_until")]
        public DateTime ValidUntil { get; set; }

        [Column("subtotal")]
        public decimal Subtotal { get; set; }

        [Column("discount_amount")]
        public decimal DiscountAmount { get; set; }

        [Column("tax_amount")]
        public decimal TaxAmount { get; set; }

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = "draft"; // draft, sent, accepted, rejected, expired, converted

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("terms")]
        public string? Terms { get; set; }

        [Column("converted_order_id")]
        public int? ConvertedOrderId { get; set; }

        [Column("converted_at")]
        public DateTime? ConvertedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }

        [ForeignKey("CustomerId")]
        public virtual Customer? Customer { get; set; }

        [ForeignKey("EmployeeId")]
        public virtual Employee? Employee { get; set; }

        public virtual ICollection<QuoteItem> Items { get; set; } = new List<QuoteItem>();
    }

    [Table("quote_items")]
    public class QuoteItem
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("quote_id")]
        public int QuoteId { get; set; }

        [Column("product_id")]
        public int ProductId { get; set; }

        [Column("unit_id")]
        public int? UnitId { get; set; }

        [Column("quantity")]
        public decimal Quantity { get; set; }

        [Column("unit_price")]
        public decimal UnitPrice { get; set; }

        [Column("discount_percent")]
        public decimal DiscountPercent { get; set; }

        [Column("discount_amount")]
        public decimal DiscountAmount { get; set; }

        [Column("line_total")]
        public decimal LineTotal { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("QuoteId")]
        public virtual Quote? Quote { get; set; }

        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
    }
}
