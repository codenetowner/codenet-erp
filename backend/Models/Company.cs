using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("companies")]
public class Company
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Column("username")]
    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Column("password_hash")]
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("phone")]
    [MaxLength(50)]
    public string? Phone { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("logo_url")]
    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [Column("currency_symbol")]
    [MaxLength(10)]
    public string CurrencySymbol { get; set; } = "$";

    [Column("low_stock_alert")]
    public int LowStockAlert { get; set; } = 10;

    [Column("max_cash_warning")]
    public decimal MaxCashWarning { get; set; } = 10000.00m;

    [Column("exchange_rate")]
    public decimal ExchangeRate { get; set; } = 1;

    [Column("show_secondary_price")]
    public bool ShowSecondaryPrice { get; set; } = false;

    [Column("plan_id")]
    public int? PlanId { get; set; }

    [Column("plan_expiry_date")]
    public DateTime? PlanExpiryDate { get; set; }

    [Column("status")]
    public string Status { get; set; } = "active";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Online Store fields
    [Column("store_category_id")]
    public int? StoreCategoryId { get; set; }

    [Column("is_online_store_enabled")]
    public bool IsOnlineStoreEnabled { get; set; } = false;

    [Column("store_description")]
    public string? StoreDescription { get; set; }

    [Column("store_banner_url")]
    [MaxLength(500)]
    public string? StoreBannerUrl { get; set; }

    [Column("store_theme_color")]
    [MaxLength(20)]
    public string StoreThemeColor { get; set; } = "#003366";

    [Column("delivery_enabled")]
    public bool DeliveryEnabled { get; set; } = false;

    [Column("delivery_fee")]
    public decimal DeliveryFee { get; set; } = 0;

    [Column("min_order_amount")]
    public decimal MinOrderAmount { get; set; } = 0;

    [Column("store_lat")]
    public decimal? StoreLat { get; set; }

    [Column("store_lng")]
    public decimal? StoreLng { get; set; }

    [Column("whatsapp_number")]
    [MaxLength(50)]
    public string? WhatsappNumber { get; set; }

    [Column("rating")]
    public int Rating { get; set; } = 0;

    [Column("is_premium")]
    public bool IsPremium { get; set; } = false;

    [Column("premium_tier")]
    [MaxLength(50)]
    public string? PremiumTier { get; set; }

    // Page permissions - JSON array of allowed page paths (null = all pages allowed)
    [Column("page_permissions")]
    public string? PagePermissions { get; set; }

    // Navigation
    public Plan? Plan { get; set; }
    public StoreCategory? StoreCategory { get; set; }
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<Van> Vans { get; set; } = new List<Van>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
}
