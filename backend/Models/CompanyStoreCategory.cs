using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("company_store_categories")]
public class CompanyStoreCategory
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("store_category_id")]
    [Required]
    public int StoreCategoryId { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public StoreCategory StoreCategory { get; set; } = null!;
}
