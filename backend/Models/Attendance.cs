using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Catalyst.API.Models;

[Table("attendances")]
public class Attendance
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("company_id")]
    [Required]
    public int CompanyId { get; set; }

    [Column("employee_id")]
    [Required]
    public int EmployeeId { get; set; }

    [Column("date")]
    [Required]
    public DateTime Date { get; set; }

    [Column("check_in")]
    public DateTime? CheckIn { get; set; }

    [Column("check_out")]
    public DateTime? CheckOut { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "present"; // present, absent, late, half_day, leave

    [Column("notes")]
    [MaxLength(500)]
    public string? Notes { get; set; }

    [Column("overtime_hours")]
    public decimal OvertimeHours { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CompanyId")]
    public Company? Company { get; set; }

    [ForeignKey("EmployeeId")]
    public Employee? Employee { get; set; }
}
