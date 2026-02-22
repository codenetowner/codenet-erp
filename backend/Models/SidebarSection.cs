using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("sidebar_sections")]
public class SidebarSection
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("name")]
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CompanyId")]
    public Company? Company { get; set; }

    public ICollection<SidebarPageAssignment>? PageAssignments { get; set; }
}

[Table("sidebar_page_assignments")]
public class SidebarPageAssignment
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("section_id")]
    [Required]
    public int SectionId { get; set; }

    [Column("page_id")]
    [Required]
    [MaxLength(100)]
    public string PageId { get; set; } = string.Empty;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CompanyId")]
    public Company? Company { get; set; }

    [ForeignKey("SectionId")]
    public SidebarSection? Section { get; set; }
}
