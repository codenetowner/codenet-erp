using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/employee-payments")]
[Authorize]
public class EmployeePaymentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public EmployeePaymentsController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst("user_id")?.Value;
        return string.IsNullOrEmpty(userIdClaim) ? 0 : int.Parse(userIdClaim);
    }

    /// <summary>
    /// Get all employee payments with filters
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeePaymentDto>>> GetPayments(
        [FromQuery] int? employeeId,
        [FromQuery] string? paymentType,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var query = _context.EmployeePayments
            .Include(p => p.Employee)
            .Include(p => p.Creator)
            .Where(p => p.CompanyId == companyId);

        if (employeeId.HasValue)
            query = query.Where(p => p.EmployeeId == employeeId);

        if (!string.IsNullOrEmpty(paymentType))
            query = query.Where(p => p.PaymentType == paymentType);

        if (startDate.HasValue)
            query = query.Where(p => p.PaymentDate >= DateOnly.FromDateTime(startDate.Value));

        if (endDate.HasValue)
            query = query.Where(p => p.PaymentDate <= DateOnly.FromDateTime(endDate.Value));

        var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();

        return payments.Select(p => new EmployeePaymentDto
        {
            Id = p.Id,
            EmployeeId = p.EmployeeId,
            EmployeeName = p.Employee.Name,
            PaymentType = p.PaymentType,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate.ToDateTime(TimeOnly.MinValue),
            PeriodStart = p.PeriodStart?.ToDateTime(TimeOnly.MinValue),
            PeriodEnd = p.PeriodEnd?.ToDateTime(TimeOnly.MinValue),
            Notes = p.Notes,
            CreatedBy = p.Creator?.Name,
            CreatedAt = p.CreatedAt
        }).ToList();
    }

    /// <summary>
    /// Get payment by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeePaymentDto>> GetPayment(int id)
    {
        var companyId = GetCompanyId();
        var p = await _context.EmployeePayments
            .Include(p => p.Employee)
            .Include(p => p.Creator)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (p == null) return NotFound();

        return new EmployeePaymentDto
        {
            Id = p.Id,
            EmployeeId = p.EmployeeId,
            EmployeeName = p.Employee.Name,
            PaymentType = p.PaymentType,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate.ToDateTime(TimeOnly.MinValue),
            PeriodStart = p.PeriodStart?.ToDateTime(TimeOnly.MinValue),
            PeriodEnd = p.PeriodEnd?.ToDateTime(TimeOnly.MinValue),
            Notes = p.Notes,
            CreatedBy = p.Creator?.Name,
            CreatedAt = p.CreatedAt
        };
    }

    /// <summary>
    /// Get payments for a specific employee
    /// </summary>
    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<EmployeePaymentSummaryDto>> GetEmployeePayments(int employeeId)
    {
        var companyId = GetCompanyId();
        
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.CompanyId == companyId);

        if (employee == null) return NotFound();

        var payments = await _context.EmployeePayments
            .Include(p => p.Creator)
            .Where(p => p.CompanyId == companyId && p.EmployeeId == employeeId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        var thisMonth = DateOnly.FromDateTime(TimeZoneHelper.Now.AddDays(-TimeZoneHelper.Now.Day + 1));
        var thisYear = new DateOnly(TimeZoneHelper.Now.Year, 1, 1);
        var monthStart = thisMonth.ToDateTime(TimeOnly.MinValue);

        // Calculate commission earned this month from completed tasks and orders
        decimal commissionEarned = 0;
        try
        {
            if (employee.CommissionRate > 0 && 
                (employee.SalaryType == "commission" || employee.SalaryType == "monthly_commission"))
            {
                // For drivers: tasks assigned to them (DriverId)
                if (employee.IsDriver)
                {
                    // Get completed tasks this month
                    var completedTasks = await _context.Tasks
                        .Include(t => t.Items)
                        .ThenInclude(i => i.Product)
                        .Where(t => t.DriverId == employeeId && 
                                   t.CompanyId == companyId &&
                                   (t.Status == "Completed" || t.Status == "Delivered") &&
                                   t.CompletedAt.HasValue && t.CompletedAt.Value >= monthStart)
                        .ToListAsync();

                    foreach (var task in completedTasks)
                    {
                        decimal commissionBase = task.Total;
                        if (employee.CommissionBase == "profit")
                        {
                            decimal totalCost = task.Items.Sum(i => (i.Product?.CostPrice ?? 0) * i.Quantity);
                            commissionBase = task.Total - totalCost;
                        }
                        commissionEarned += commissionBase * (employee.CommissionRate / 100);
                    }

                    // Get POS orders this month
                    var orders = await _context.Orders
                        .Include(o => o.OrderItems)
                        .ThenInclude(i => i.Product)
                        .Where(o => o.DriverId == employeeId && 
                                   o.CompanyId == companyId &&
                                   o.OrderDate >= monthStart)
                        .ToListAsync();

                    foreach (var order in orders)
                    {
                        decimal commissionBase = order.TotalAmount;
                        if (employee.CommissionBase == "profit")
                        {
                            decimal totalCost = order.OrderItems.Sum(i => (i.Product?.CostPrice ?? 0) * i.Quantity);
                            commissionBase = order.TotalAmount - totalCost;
                        }
                        commissionEarned += commissionBase * (employee.CommissionRate / 100);
                    }
                }
                
                // For salesmen: tasks they created (CreatedBy)
                if (employee.IsSalesman)
                {
                    var salesmanTasks = await _context.Tasks
                        .Include(t => t.Items)
                        .ThenInclude(i => i.Product)
                        .Where(t => t.CreatedBy == employeeId && 
                                   t.CompanyId == companyId &&
                                   (t.Status == "Completed" || t.Status == "Delivered") &&
                                   t.CreatedAt >= monthStart)
                        .ToListAsync();

                    foreach (var task in salesmanTasks)
                    {
                        decimal commissionBase = task.Total;
                        if (employee.CommissionBase == "profit")
                        {
                            decimal totalCost = task.Items.Sum(i => (i.Product?.CostPrice ?? 0) * i.Quantity);
                            commissionBase = task.Total - totalCost;
                        }
                        commissionEarned += commissionBase * (employee.CommissionRate / 100);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // Log but don't fail - commission calculation is optional
            Console.WriteLine($"Commission calculation error: {ex.Message}");
        }

        // Exclude deductions from "paid" totals - deductions are not actual money paid out
        var paidPaymentTypes = new[] { "salary", "advance", "bonus", "commission" };
        
        // For daily employees, fetch attendance data for the current month
        int presentDays = 0;
        int halfDays = 0;
        decimal dailyEarned = 0;
        
        if (employee.SalaryType == "daily")
        {
            var attendances = await _context.Attendances
                .Where(a => a.EmployeeId == employeeId && 
                           a.CompanyId == companyId &&
                           a.Date >= monthStart)
                .ToListAsync();
            
            presentDays = attendances.Count(a => a.Status == "present");
            halfDays = attendances.Count(a => a.Status == "half_day");
            
            // Calculate daily earnings: full days + half days (counted as 0.5)
            dailyEarned = (presentDays * employee.BasePay) + (halfDays * employee.BasePay * 0.5m);
        }
        
        return new EmployeePaymentSummaryDto
        {
            EmployeeId = employee.Id,
            EmployeeName = employee.Name,
            SalaryType = employee.SalaryType,
            Salary = employee.BasePay,
            CommissionRate = employee.CommissionRate,
            CommissionBase = employee.CommissionBase,
            CommissionEarnedThisMonth = commissionEarned,
            TotalPaidThisMonth = payments.Where(p => p.PaymentDate >= thisMonth && paidPaymentTypes.Contains(p.PaymentType)).Sum(p => p.Amount),
            TotalPaidThisYear = payments.Where(p => p.PaymentDate >= thisYear && paidPaymentTypes.Contains(p.PaymentType)).Sum(p => p.Amount),
            TotalPaidAllTime = payments.Where(p => paidPaymentTypes.Contains(p.PaymentType)).Sum(p => p.Amount),
            PresentDaysThisMonth = presentDays,
            HalfDaysThisMonth = halfDays,
            DailyRate = employee.SalaryType == "daily" ? employee.BasePay : 0,
            DailyEarnedThisMonth = dailyEarned,
            Payments = payments.Select(p => new EmployeePaymentDto
            {
                Id = p.Id,
                EmployeeId = p.EmployeeId,
                EmployeeName = employee.Name,
                PaymentType = p.PaymentType,
                Amount = p.Amount,
                PaymentDate = p.PaymentDate.ToDateTime(TimeOnly.MinValue),
                PeriodStart = p.PeriodStart?.ToDateTime(TimeOnly.MinValue),
                PeriodEnd = p.PeriodEnd?.ToDateTime(TimeOnly.MinValue),
                Notes = p.Notes,
                CreatedBy = p.Creator?.Name,
                CreatedAt = p.CreatedAt
            }).ToList()
        };
    }

    /// <summary>
    /// Create a new payment
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<EmployeePaymentDto>> CreatePayment(CreateEmployeePaymentDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        // Verify employee exists
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == dto.EmployeeId && e.CompanyId == companyId);

        if (employee == null)
            return BadRequest(new { error = "Employee not found" });

        var payment = new EmployeePayment
        {
            CompanyId = companyId,
            EmployeeId = dto.EmployeeId,
            PaymentType = dto.PaymentType,
            Amount = dto.Amount,
            PaymentDate = DateOnly.FromDateTime(dto.PaymentDate),
            PeriodStart = dto.PeriodStart.HasValue ? DateOnly.FromDateTime(dto.PeriodStart.Value) : null,
            PeriodEnd = dto.PeriodEnd.HasValue ? DateOnly.FromDateTime(dto.PeriodEnd.Value) : null,
            Notes = dto.Notes,
            CreatedBy = userId > 0 ? userId : null,
            CreatedAt = TimeZoneHelper.Now
        };

        try
        {
            _context.EmployeePayments.Add(payment);
            await _context.SaveChangesAsync();

            // Auto-post accounting entry (await to avoid DbContext concurrency issues)
            await _accountingService.PostSalaryEntry(companyId, payment.Id, payment.Amount, payment.PaymentDate.ToDateTime(TimeOnly.MinValue));

            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, new EmployeePaymentDto
            {
                Id = payment.Id,
                EmployeeId = payment.EmployeeId,
                EmployeeName = employee.Name,
                PaymentType = payment.PaymentType,
                Amount = payment.Amount,
                PaymentDate = payment.PaymentDate.ToDateTime(TimeOnly.MinValue),
                CreatedAt = payment.CreatedAt
            });
        }
        catch (Exception ex)
        {
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { error = "Failed to save payment", details = innerMessage });
        }
    }

    /// <summary>
    /// Update a payment
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePayment(int id, UpdateEmployeePaymentDto dto)
    {
        var companyId = GetCompanyId();
        var payment = await _context.EmployeePayments
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (payment == null) return NotFound();

        payment.PaymentType = dto.PaymentType;
        payment.Amount = dto.Amount;
        payment.PaymentDate = DateOnly.FromDateTime(dto.PaymentDate);
        payment.PeriodStart = dto.PeriodStart.HasValue ? DateOnly.FromDateTime(dto.PeriodStart.Value) : null;
        payment.PeriodEnd = dto.PeriodEnd.HasValue ? DateOnly.FromDateTime(dto.PeriodEnd.Value) : null;
        payment.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Delete a payment
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePayment(int id)
    {
        var companyId = GetCompanyId();
        var payment = await _context.EmployeePayments
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (payment == null) return NotFound();

        _context.EmployeePayments.Remove(payment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get payment summary report
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<PaymentsSummaryDto>> GetPaymentsSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var start = startDate.HasValue ? DateOnly.FromDateTime(startDate.Value) : DateOnly.FromDateTime(TimeZoneHelper.Now.AddDays(-30));
        var end = endDate.HasValue ? DateOnly.FromDateTime(endDate.Value) : DateOnly.FromDateTime(TimeZoneHelper.Now);

        var payments = await _context.EmployeePayments
            .Include(p => p.Employee)
            .Where(p => p.CompanyId == companyId && 
                       p.PaymentDate >= start && 
                       p.PaymentDate <= end)
            .ToListAsync();

        var byType = payments
            .GroupBy(p => p.PaymentType)
            .Select(g => new PaymentTypeBreakdown
            {
                Type = g.Key,
                Count = g.Count(),
                Total = g.Sum(p => p.Amount)
            })
            .ToList();

        var byEmployee = payments
            .GroupBy(p => new { p.EmployeeId, p.Employee.Name })
            .Select(g => new EmployeePaymentBreakdown
            {
                EmployeeId = g.Key.EmployeeId,
                EmployeeName = g.Key.Name,
                TotalPaid = g.Sum(p => p.Amount),
                PaymentCount = g.Count()
            })
            .OrderByDescending(e => e.TotalPaid)
            .ToList();

        return new PaymentsSummaryDto
        {
            StartDate = start.ToDateTime(TimeOnly.MinValue),
            EndDate = end.ToDateTime(TimeOnly.MinValue),
            TotalPayments = payments.Count,
            TotalAmount = payments.Sum(p => p.Amount),
            ByType = byType,
            ByEmployee = byEmployee
        };
    }
}

#region DTOs

public class EmployeePaymentDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string PaymentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class EmployeePaymentSummaryDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string SalaryType { get; set; } = "monthly";
    public decimal Salary { get; set; }
    public decimal CommissionRate { get; set; }
    public string? CommissionBase { get; set; }
    public decimal CommissionEarnedThisMonth { get; set; }
    public decimal TotalPaidThisMonth { get; set; }
    public decimal TotalPaidThisYear { get; set; }
    public decimal TotalPaidAllTime { get; set; }
    // Attendance data for daily employees
    public int PresentDaysThisMonth { get; set; }
    public int HalfDaysThisMonth { get; set; }
    public decimal DailyRate { get; set; }
    public decimal DailyEarnedThisMonth { get; set; }
    public List<EmployeePaymentDto> Payments { get; set; } = new();
}

public class CreateEmployeePaymentDto
{
    public int EmployeeId { get; set; }
    public string PaymentType { get; set; } = "salary";
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; } = TimeZoneHelper.Now;
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public string? Notes { get; set; }
}

public class UpdateEmployeePaymentDto
{
    public string PaymentType { get; set; } = "salary";
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public string? Notes { get; set; }
}

public class PaymentsSummaryDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalPayments { get; set; }
    public decimal TotalAmount { get; set; }
    public List<PaymentTypeBreakdown> ByType { get; set; } = new();
    public List<EmployeePaymentBreakdown> ByEmployee { get; set; } = new();
}

public class PaymentTypeBreakdown
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Total { get; set; }
}

public class EmployeePaymentBreakdown
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public decimal TotalPaid { get; set; }
    public int PaymentCount { get; set; }
}

#endregion
