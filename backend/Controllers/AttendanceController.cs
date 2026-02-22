using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttendanceController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId() => int.Parse(User.FindFirst("company_id")?.Value ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetAttendances(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? employeeId,
        [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.Attendances
            .Include(a => a.Employee)
            .Where(a => a.CompanyId == companyId);

        if (startDate.HasValue)
            query = query.Where(a => a.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            query = query.Where(a => a.Date <= endDate.Value.Date);
        if (employeeId.HasValue)
            query = query.Where(a => a.EmployeeId == employeeId.Value);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        var attendances = await query
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.Employee!.Name)
            .Select(a => new
            {
                a.Id,
                a.EmployeeId,
                EmployeeName = a.Employee!.Name,
                EmployeeRole = a.Employee.Role != null ? a.Employee.Role.Name : null,
                a.Date,
                a.CheckIn,
                a.CheckOut,
                a.Status,
                a.Notes,
                a.OvertimeHours,
                WorkedHours = a.CheckIn.HasValue && a.CheckOut.HasValue
                    ? Math.Round((a.CheckOut.Value - a.CheckIn.Value).TotalHours, 2)
                    : 0
            })
            .ToListAsync();

        return Ok(attendances);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAttendance(int id)
    {
        var companyId = GetCompanyId();
        var attendance = await _context.Attendances
            .Include(a => a.Employee)
            .Where(a => a.Id == id && a.CompanyId == companyId)
            .Select(a => new
            {
                a.Id,
                a.EmployeeId,
                EmployeeName = a.Employee!.Name,
                a.Date,
                a.CheckIn,
                a.CheckOut,
                a.Status,
                a.Notes,
                a.OvertimeHours
            })
            .FirstOrDefaultAsync();

        if (attendance == null)
            return NotFound();

        return Ok(attendance);
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetEmployeeAttendance(
        int employeeId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var query = _context.Attendances
            .Where(a => a.CompanyId == companyId && a.EmployeeId == employeeId);

        if (startDate.HasValue)
            query = query.Where(a => a.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            query = query.Where(a => a.Date <= endDate.Value.Date);

        var attendances = await query
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                a.Id,
                a.Date,
                a.CheckIn,
                a.CheckOut,
                a.Status,
                a.Notes,
                a.OvertimeHours,
                WorkedHours = a.CheckIn.HasValue && a.CheckOut.HasValue
                    ? Math.Round((a.CheckOut.Value - a.CheckIn.Value).TotalHours, 2)
                    : 0
            })
            .ToListAsync();

        // Summary
        var summary = new
        {
            TotalDays = attendances.Count,
            PresentDays = attendances.Count(a => a.Status == "present"),
            AbsentDays = attendances.Count(a => a.Status == "absent"),
            LateDays = attendances.Count(a => a.Status == "late"),
            HalfDays = attendances.Count(a => a.Status == "half_day"),
            LeaveDays = attendances.Count(a => a.Status == "leave"),
            TotalWorkedHours = attendances.Sum(a => a.WorkedHours),
            TotalOvertimeHours = attendances.Sum(a => a.OvertimeHours)
        };

        return Ok(new { attendances, summary });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetAttendanceSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var start = startDate ?? TimeZoneHelper.Now.AddDays(-30);
        var end = endDate ?? TimeZoneHelper.Now;

        var attendances = await _context.Attendances
            .Include(a => a.Employee)
            .Where(a => a.CompanyId == companyId && a.Date >= start.Date && a.Date <= end.Date)
            .ToListAsync();

        var employees = await _context.Employees
            .Where(e => e.CompanyId == companyId && e.Status == "active")
            .Select(e => new { e.Id, e.Name, Role = e.Role != null ? e.Role.Name : null })
            .ToListAsync();

        var summary = employees.Select(emp => {
            var empAttendances = attendances.Where(a => a.EmployeeId == emp.Id).ToList();
            return new
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                EmployeeRole = emp.Role,
                TotalDays = empAttendances.Count,
                PresentDays = empAttendances.Count(a => a.Status == "present"),
                AbsentDays = empAttendances.Count(a => a.Status == "absent"),
                LateDays = empAttendances.Count(a => a.Status == "late"),
                HalfDays = empAttendances.Count(a => a.Status == "half_day"),
                LeaveDays = empAttendances.Count(a => a.Status == "leave"),
                TotalWorkedHours = empAttendances.Sum(a => 
                    a.CheckIn.HasValue && a.CheckOut.HasValue 
                        ? Math.Round((a.CheckOut.Value - a.CheckIn.Value).TotalHours, 2) 
                        : 0),
                TotalOvertimeHours = empAttendances.Sum(a => (double)a.OvertimeHours)
            };
        }).ToList();

        return Ok(summary);
    }

    public class AttendanceDto
    {
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public string Status { get; set; } = "present";
        public string? Notes { get; set; }
        public decimal OvertimeHours { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAttendance([FromBody] AttendanceDto dto)
    {
        var companyId = GetCompanyId();

        // Check if attendance already exists for this employee on this date
        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a => 
                a.CompanyId == companyId && 
                a.EmployeeId == dto.EmployeeId && 
                a.Date.Date == dto.Date.Date);

        if (existing != null)
            return BadRequest(new { message = "Attendance record already exists for this employee on this date" });

        var attendance = new Attendance
        {
            CompanyId = companyId,
            EmployeeId = dto.EmployeeId,
            Date = dto.Date.Date,
            CheckIn = dto.CheckIn,
            CheckOut = dto.CheckOut,
            Status = dto.Status,
            Notes = dto.Notes,
            OvertimeHours = dto.OvertimeHours
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(attendance);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulkAttendance([FromBody] List<AttendanceDto> dtos)
    {
        var companyId = GetCompanyId();
        var created = 0;
        var updated = 0;

        foreach (var dto in dtos)
        {
            var existing = await _context.Attendances
                .FirstOrDefaultAsync(a => 
                    a.CompanyId == companyId && 
                    a.EmployeeId == dto.EmployeeId && 
                    a.Date.Date == dto.Date.Date);

            if (existing != null)
            {
                existing.CheckIn = dto.CheckIn;
                existing.CheckOut = dto.CheckOut;
                existing.Status = dto.Status;
                existing.Notes = dto.Notes;
                existing.OvertimeHours = dto.OvertimeHours;
                existing.UpdatedAt = TimeZoneHelper.Now;
                updated++;
            }
            else
            {
                var attendance = new Attendance
                {
                    CompanyId = companyId,
                    EmployeeId = dto.EmployeeId,
                    Date = dto.Date.Date,
                    CheckIn = dto.CheckIn,
                    CheckOut = dto.CheckOut,
                    Status = dto.Status,
                    Notes = dto.Notes,
                    OvertimeHours = dto.OvertimeHours
                };
                _context.Attendances.Add(attendance);
                created++;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Created {created}, Updated {updated} attendance records" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAttendance(int id, [FromBody] AttendanceDto dto)
    {
        var companyId = GetCompanyId();
        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);

        if (attendance == null)
            return NotFound();

        attendance.CheckIn = dto.CheckIn;
        attendance.CheckOut = dto.CheckOut;
        attendance.Status = dto.Status;
        attendance.Notes = dto.Notes;
        attendance.OvertimeHours = dto.OvertimeHours;
        attendance.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return Ok(attendance);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var companyId = GetCompanyId();
        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);

        if (attendance == null)
            return NotFound();

        _context.Attendances.Remove(attendance);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Attendance record deleted" });
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployeesForAttendance()
    {
        var companyId = GetCompanyId();
        var employees = await _context.Employees
            .Include(e => e.Role)
            .Where(e => e.CompanyId == companyId && e.Status == "active")
            .Select(e => new
            {
                e.Id,
                e.Name,
                Role = e.Role != null ? e.Role.Name : null
            })
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(employees);
    }
}
