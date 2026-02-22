using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("online_orders")]
public class OnlineOrder
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_number")]
    [MaxLength(50)]
    public string? OrderNumber { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("app_customer_id")]
    public int? AppCustomerId { get; set; }

    [Column("guest_name")]
    [MaxLength(255)]
    public string? GuestName { get; set; }

    [Column("guest_phone")]
    [MaxLength(50)]
    public string? GuestPhone { get; set; }

    [Column("guest_address")]
    public string? GuestAddress { get; set; }

    [Column("status")]
    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0;

    [Column("delivery_fee")]
    public decimal DeliveryFee { get; set; } = 0;

    [Column("discount")]
    public decimal Discount { get; set; } = 0;

    [Column("total")]
    public decimal Total { get; set; } = 0;

    [Column("payment_method")]
    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    [Column("payment_status")]
    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "unpaid";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("delivery_address")]
    public string? DeliveryAddress { get; set; }

    [Column("delivery_lat")]
    public decimal? DeliveryLat { get; set; }

    [Column("delivery_lng")]
    public decimal? DeliveryLng { get; set; }

    [Column("estimated_delivery")]
    public DateTime? EstimatedDelivery { get; set; }

    [Column("delivered_at")]
    public DateTime? DeliveredAt { get; set; }

    [Column("cancelled_at")]
    public DateTime? CancelledAt { get; set; }

    [Column("cancel_reason")]
    public string? CancelReason { get; set; }

    [Column("delivery_type")]
    [MaxLength(20)]
    public string DeliveryType { get; set; } = "pickup";

    [Column("assigned_driver_type")]
    [MaxLength(20)]
    public string? AssignedDriverType { get; set; }

    [Column("assigned_company_driver_id")]
    public int? AssignedCompanyDriverId { get; set; }

    [Column("assigned_freelance_driver_id")]
    public int? AssignedFreelanceDriverId { get; set; }

    [Column("delivery_proof_url")]
    [MaxLength(500)]
    public string? DeliveryProofUrl { get; set; }

    [Column("cod_collected")]
    public bool CodCollected { get; set; } = false;

    [Column("cod_amount")]
    public decimal CodAmount { get; set; } = 0;

    [Column("picked_up_at")]
    public DateTime? PickedUpAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Company Company { get; set; } = null!;
    public AppCustomer? AppCustomer { get; set; }
    public ICollection<OnlineOrderItem> Items { get; set; } = new List<OnlineOrderItem>();
}
