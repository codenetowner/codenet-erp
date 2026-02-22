using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using BCrypt.Net;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _context;

    public EmployeesController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    /// <summary>
    /// Get all employees for the company
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetEmployees(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.Employees
            .Include(e => e.Role)
            .Include(e => e.Warehouse)
            .Include(e => e.Van)
            .Where(e => e.CompanyId == companyId);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(e => e.Name.ToLower().Contains(search.ToLower()) || e.Username.ToLower().Contains(search.ToLower()) || (e.Phone != null && e.Phone.Contains(search)));

        if (!string.IsNullOrEmpty(role))
            query = query.Where(e => e.Role != null && e.Role.Name == role);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(e => e.Status == status);

        var employees = await query.OrderBy(e => e.Name).ToListAsync();

        // Get all warehouses to find which ones each employee manages
        var allWarehouses = await _context.Warehouses
            .Where(w => w.CompanyId == companyId)
            .ToListAsync();

        return employees.Select(e => {
            var managedWhs = allWarehouses.Where(w => w.ManagerId == e.Id).Select(w => w.Name).ToList();
            return new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Username = e.Username,
                Phone = e.Phone,
                Email = e.Email,
                Role = e.Role?.Name ?? "Driver",
                RoleId = e.RoleId,
                SalaryType = e.SalaryType,
                BasePay = e.BasePay,
                HourlyRate = e.HourlyRate,
                CommissionRate = e.CommissionRate,
                CommissionBase = e.CommissionBase,
                MinimumGuarantee = e.MinimumGuarantee,
                ExpectedHoursPerWeek = e.ExpectedHoursPerWeek,
                Warehouse = e.Warehouse?.Name,
                WarehouseId = e.WarehouseId,
                ManagedWarehouses = managedWhs.Any() ? string.Join(", ", managedWhs) : null,
                Van = e.Van?.Name,
                VanId = e.VanId,
                Rating = e.Rating,
                Address = e.Address,
                UseDefaultPermissions = e.UseDefaultPermissions,
                CanAccessReports = e.CanAccessReports,
                CanApproveDeposits = e.CanApproveDeposits,
                CanEditPrices = e.CanEditPrices,
                CanEditCreditLimit = e.CanEditCreditLimit,
                IsDriver = e.IsDriver,
                IsSalesman = e.IsSalesman,
                Status = e.Status,
                CreatedAt = e.CreatedAt
            };
        }).ToList();
    }

    /// <summary>
    /// Get single employee
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeDto>> GetEmployee(int id)
    {
        var companyId = GetCompanyId();
        var e = await _context.Employees
            .Include(e => e.Role)
            .Include(e => e.Warehouse)
            .Include(e => e.Van)
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (e == null)
            return NotFound();

        return new EmployeeDto
        {
            Id = e.Id,
            Name = e.Name,
            Username = e.Username,
            Phone = e.Phone,
            Email = e.Email,
            Role = e.Role?.Name ?? "Driver",
            RoleId = e.RoleId,
            SalaryType = e.SalaryType,
            BasePay = e.BasePay,
            HourlyRate = e.HourlyRate,
            CommissionRate = e.CommissionRate,
            CommissionBase = e.CommissionBase,
            MinimumGuarantee = e.MinimumGuarantee,
            ExpectedHoursPerWeek = e.ExpectedHoursPerWeek,
            Warehouse = e.Warehouse?.Name,
            WarehouseId = e.WarehouseId,
            Van = e.Van?.Name,
            VanId = e.VanId,
            Rating = e.Rating,
            Address = e.Address,
            UseDefaultPermissions = e.UseDefaultPermissions,
            CanAccessReports = e.CanAccessReports,
            CanApproveDeposits = e.CanApproveDeposits,
            CanEditPrices = e.CanEditPrices,
            CanEditCreditLimit = e.CanEditCreditLimit,
            IsDriver = e.IsDriver,
            IsSalesman = e.IsSalesman,
            Status = e.Status,
            CreatedAt = e.CreatedAt
        };
    }

    /// <summary>
    /// Create new employee
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> CreateEmployee(CreateEmployeeDto dto)
    {
        var companyId = GetCompanyId();

        // Check if username exists
        if (await _context.Employees.AnyAsync(e => e.CompanyId == companyId && e.Username == dto.Username))
            return BadRequest(new { message = "Username already exists" });

        // Get or create role
        int? roleId = null;
        if (!string.IsNullOrEmpty(dto.Role))
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.CompanyId == companyId && r.Name == dto.Role);
            if (role == null)
            {
                // Auto-create the role if it doesn't exist
                role = new Role
                {
                    CompanyId = companyId,
                    Name = dto.Role,
                    IsSystem = false
                };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }
            roleId = role.Id;
        }

        var employee = new Employee
        {
            CompanyId = companyId,
            Name = dto.Name,
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Phone = dto.Phone,
            Email = dto.Email,
            RoleId = roleId,
            IsDriver = dto.Role?.ToLower() == "driver",
            IsSalesman = dto.Role?.ToLower() == "salesman",
            SalaryType = dto.SalaryType ?? "monthly",
            BasePay = dto.BasePay,
            HourlyRate = dto.HourlyRate,
            CommissionRate = dto.CommissionRate,
            CommissionBase = dto.CommissionBase,
            MinimumGuarantee = dto.MinimumGuarantee,
            ExpectedHoursPerWeek = dto.ExpectedHoursPerWeek,
            WarehouseId = dto.WarehouseId,
            VanId = dto.VanId,
            Rating = 5,
            Address = dto.Address,
            UseDefaultPermissions = dto.UseDefaultPermissions,
            CanAccessReports = dto.CanAccessReports,
            CanApproveDeposits = dto.CanApproveDeposits,
            CanEditPrices = dto.CanEditPrices,
            CanEditCreditLimit = dto.CanEditCreditLimit,
            Status = "active"
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        await _context.Entry(employee).Reference(e => e.Warehouse).LoadAsync();
        await _context.Entry(employee).Reference(e => e.Van).LoadAsync();

        return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, new EmployeeDto
        {
            Id = employee.Id,
            Name = employee.Name,
            Username = employee.Username,
            Phone = employee.Phone,
            Role = dto.Role ?? "Driver",
            SalaryType = employee.SalaryType,
            BasePay = employee.BasePay,
            Warehouse = employee.Warehouse?.Name,
            Van = employee.Van?.Name,
            Rating = employee.Rating,
            Status = employee.Status
        });
    }

    /// <summary>
    /// Update employee
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, UpdateEmployeeDto dto)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (employee == null)
            return NotFound();

        // Check username uniqueness if changed
        if (dto.Username != employee.Username && 
            await _context.Employees.AnyAsync(e => e.CompanyId == companyId && e.Username == dto.Username))
            return BadRequest(new { message = "Username already exists" });

        // Get or create role
        int? roleId = null;
        if (!string.IsNullOrEmpty(dto.Role))
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.CompanyId == companyId && r.Name == dto.Role);
            if (role == null)
            {
                role = new Role
                {
                    CompanyId = companyId,
                    Name = dto.Role,
                    IsSystem = false
                };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }
            roleId = role.Id;
        }

        employee.Name = dto.Name;
        employee.Username = dto.Username;
        employee.Phone = dto.Phone;
        employee.Email = dto.Email;
        employee.RoleId = roleId;
        employee.IsDriver = dto.Role?.ToLower() == "driver";
        employee.IsSalesman = dto.Role?.ToLower() == "salesman";
        employee.SalaryType = dto.SalaryType ?? "monthly";
        employee.BasePay = dto.BasePay;
        employee.HourlyRate = dto.HourlyRate;
        employee.CommissionRate = dto.CommissionRate;
        employee.CommissionBase = dto.CommissionBase;
        employee.MinimumGuarantee = dto.MinimumGuarantee;
        employee.ExpectedHoursPerWeek = dto.ExpectedHoursPerWeek;
        employee.WarehouseId = dto.WarehouseId;
        employee.VanId = dto.VanId;
        employee.Address = dto.Address;
        employee.UseDefaultPermissions = dto.UseDefaultPermissions;
        employee.CanAccessReports = dto.CanAccessReports;
        employee.CanApproveDeposits = dto.CanApproveDeposits;
        employee.CanEditPrices = dto.CanEditPrices;
        employee.CanEditCreditLimit = dto.CanEditCreditLimit;
        employee.UpdatedAt = TimeZoneHelper.Now;

        // Update password if provided
        if (!string.IsNullOrEmpty(dto.Password))
            employee.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Update employee rating
    /// </summary>
    [HttpPatch("{id}/rating")]
    public async Task<IActionResult> UpdateRating(int id, [FromBody] UpdateRatingDto dto)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (employee == null)
            return NotFound();

        employee.Rating = dto.Rating;
        employee.UpdatedAt = TimeZoneHelper.Now;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Toggle employee status (active/inactive)
    /// </summary>
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (employee == null)
            return NotFound();

        employee.Status = employee.Status == "active" ? "inactive" : "active";
        employee.UpdatedAt = TimeZoneHelper.Now;

        // If deactivating, remove employee as warehouse manager and clear assignments
        if (employee.Status == "inactive")
        {
            var managedWarehouses = await _context.Warehouses
                .Where(w => w.CompanyId == companyId && w.ManagerId == id)
                .ToListAsync();
            foreach (var wh in managedWarehouses)
            {
                wh.ManagerId = null;
            }
            // Clear employee's warehouse and van assignments
            employee.WarehouseId = null;
            employee.VanId = null;
        }

        await _context.SaveChangesAsync();

        return Ok(new { status = employee.Status });
    }

    /// <summary>
    /// Delete employee
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (employee == null)
            return NotFound();

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get warehouses for dropdown
    /// </summary>
    [HttpGet("warehouses")]
    public async Task<ActionResult<IEnumerable<object>>> GetWarehouses()
    {
        var companyId = GetCompanyId();
        var warehouses = await _context.Warehouses
            .Where(w => w.CompanyId == companyId)
            .Select(w => new { w.Id, w.Name })
            .ToListAsync();
        return Ok(warehouses);
    }

    /// <summary>
    /// Get vans for dropdown
    /// </summary>
    [HttpGet("vans")]
    public async Task<ActionResult<IEnumerable<object>>> GetVans()
    {
        var companyId = GetCompanyId();
        var vans = await _context.Vans
            .Where(v => v.CompanyId == companyId)
            .Select(v => new { v.Id, v.Name })
            .ToListAsync();
        return Ok(vans);
    }

    /// <summary>
    /// Get all salesmen with performance data
    /// </summary>
    [HttpGet("salesmen")]
    public async Task<ActionResult<List<SalesmanPerformanceDto>>> GetSalesmen()
    {
        var companyId = GetCompanyId();
        var today = TimeZoneHelper.Now.Date;
        
        var salesmen = await _context.Employees
            .Where(e => e.CompanyId == companyId && e.IsSalesman && e.Status == "active")
            .ToListAsync();
        
        var result = new List<SalesmanPerformanceDto>();
        
        foreach (var s in salesmen)
        {
            var leadsToday = await _context.Leads.CountAsync(l => l.CompanyId == companyId && l.CapturedBy == s.Id && l.CreatedAt.Date == today);
            var totalLeads = await _context.Leads.CountAsync(l => l.CompanyId == companyId && l.CapturedBy == s.Id);
            var customersToday = await _context.Customers.CountAsync(c => c.CompanyId == companyId && c.CreatedBy == s.Id && c.CreatedAt.Date == today);
            var totalCustomers = await _context.Customers.CountAsync(c => c.CompanyId == companyId && c.CreatedBy == s.Id);
            
            // Tasks created by salesman today (completed/delivered)
            var tasksToday = await _context.Tasks
                .Where(t => t.CompanyId == companyId && t.CreatedBy == s.Id && t.CreatedAt.Date == today)
                .ToListAsync();
            var tasksTodayCount = tasksToday.Count;
            var tasksSalesToday = tasksToday.Where(t => t.Status == "Completed" || t.Status == "Delivered").Sum(t => t.Total);
            
            // All-time tasks
            var allTasks = await _context.Tasks
                .Where(t => t.CompanyId == companyId && t.CreatedBy == s.Id && (t.Status == "Completed" || t.Status == "Delivered"))
                .SumAsync(t => t.Total);
            
            // Commission calculation
            var commissionToday = tasksSalesToday * (s.CommissionRate / 100);
            var totalCommission = allTasks * (s.CommissionRate / 100);
            
            result.Add(new SalesmanPerformanceDto
            {
                Id = s.Id,
                Name = s.Name,
                Username = s.Username,
                Phone = s.Phone,
                Status = s.Status,
                CommissionRate = s.CommissionRate,
                LeadsToday = leadsToday,
                TotalLeads = totalLeads,
                CustomersToday = customersToday,
                TotalCustomers = totalCustomers,
                TasksToday = tasksTodayCount,
                TasksSalesToday = tasksSalesToday,
                CommissionToday = commissionToday,
                TotalTasksSales = allTasks,
                TotalCommission = totalCommission
            });
        }
        
        return result;
    }

    /// <summary>
    /// Get salesman daily performance
    /// </summary>
    [HttpGet("salesmen/{id}/performance")]
    public async Task<ActionResult<SalesmanDailyPerformanceDto>> GetSalesmanPerformance(int id, [FromQuery] string? date)
    {
        var companyId = GetCompanyId();
        var targetDate = string.IsNullOrEmpty(date) ? TimeZoneHelper.Now.Date : DateTime.Parse(date).Date;
        
        var salesman = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId && e.IsSalesman);
        
        if (salesman == null) return NotFound();
        
        // Leads captured on target date
        var leads = await _context.Leads
            .Where(l => l.CompanyId == companyId && l.CapturedBy == id && l.CreatedAt.Date == targetDate)
            .Select(l => new SalesmanLeadPerformanceDto
            {
                Id = l.Id,
                BusinessName = l.Name,
                ContactName = l.ShopName,
                Phone = l.Phone,
                Address = l.Address,
                Status = l.Status,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();
        
        // Customers created on target date
        var customers = await _context.Customers
            .Where(c => c.CompanyId == companyId && c.CreatedBy == id && c.CreatedAt.Date == targetDate)
            .Select(c => new SalesmanCustomerPerformanceDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Phone = c.Phone,
                Address = c.Address,
                CustomerType = c.CustomerType,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
        
        // Tasks created by salesman on target date
        var tasks = await _context.Tasks
            .Include(t => t.Customer)
            .Where(t => t.CompanyId == companyId && t.CreatedBy == id && t.CreatedAt.Date == targetDate)
            .Select(t => new SalesmanTaskPerformanceDto
            {
                Id = t.Id,
                TaskNumber = t.TaskNumber,
                CustomerName = t.Customer != null ? t.Customer.Name : null,
                Total = t.Total,
                Status = t.Status,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();
        
        // All leads by this salesman
        var allLeads = await _context.Leads.CountAsync(l => l.CompanyId == companyId && l.CapturedBy == id);
        var allCustomers = await _context.Customers.CountAsync(c => c.CompanyId == companyId && c.CreatedBy == id);
        
        // Calculate commission
        var completedTasksTotal = tasks.Where(t => t.Status == "Completed" || t.Status == "Delivered").Sum(t => t.Total);
        var commission = completedTasksTotal * (salesman.CommissionRate / 100);
        
        // All-time totals
        var allTasksSales = await _context.Tasks
            .Where(t => t.CompanyId == companyId && t.CreatedBy == id && (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.Total);
        var totalCommission = allTasksSales * (salesman.CommissionRate / 100);
        
        return new SalesmanDailyPerformanceDto
        {
            SalesmanId = salesman.Id,
            SalesmanName = salesman.Name,
            Date = targetDate,
            CommissionRate = salesman.CommissionRate,
            LeadsToday = leads.Count,
            CustomersToday = customers.Count,
            TasksToday = tasks.Count,
            TasksSalesToday = completedTasksTotal,
            CommissionToday = commission,
            TotalLeads = allLeads,
            TotalCustomers = allCustomers,
            TotalTasksSales = allTasksSales,
            TotalCommission = totalCommission,
            Leads = leads,
            Customers = customers,
            Tasks = tasks
        };
    }

    // ==================== VISIBILITY CONTROL ENDPOINTS ====================

    /// <summary>
    /// Get employee visibility settings
    /// </summary>
    [HttpGet("{id}/visibility")]
    public async Task<ActionResult<EmployeeVisibilityDto>> GetEmployeeVisibility(int id)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);
        if (employee == null) return NotFound();

        var assignedCustomerIds = await _context.EmployeeCustomers
            .Where(ec => ec.EmployeeId == id)
            .Select(ec => ec.CustomerId)
            .ToListAsync();

        var assignedProductIds = await _context.EmployeeProducts
            .Where(ep => ep.EmployeeId == id)
            .Select(ep => ep.ProductId)
            .ToListAsync();

        return new EmployeeVisibilityDto
        {
            EmployeeId = id,
            RestrictCustomers = employee.RestrictCustomers,
            RestrictProducts = employee.RestrictProducts,
            AssignedCustomerIds = assignedCustomerIds,
            AssignedProductIds = assignedProductIds
        };
    }

    /// <summary>
    /// Update employee visibility settings (flags only)
    /// </summary>
    [HttpPut("{id}/visibility/settings")]
    public async Task<IActionResult> UpdateVisibilitySettings(int id, [FromBody] UpdateVisibilitySettingsDto dto)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);
        if (employee == null) return NotFound();

        employee.RestrictCustomers = dto.RestrictCustomers;
        employee.RestrictProducts = dto.RestrictProducts;
        employee.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Visibility settings updated" });
    }

    /// <summary>
    /// Assign customers to an employee
    /// </summary>
    [HttpPut("{id}/visibility/customers")]
    public async Task<IActionResult> AssignCustomers(int id, [FromBody] AssignItemsDto dto)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);
        if (employee == null) return NotFound();

        // Remove existing assignments
        var existing = await _context.EmployeeCustomers.Where(ec => ec.EmployeeId == id).ToListAsync();
        _context.EmployeeCustomers.RemoveRange(existing);

        // Add new assignments
        foreach (var customerId in dto.ItemIds)
        {
            // Verify customer exists and belongs to company
            var customerExists = await _context.Customers.AnyAsync(c => c.Id == customerId && c.CompanyId == companyId);
            if (customerExists)
            {
                _context.EmployeeCustomers.Add(new EmployeeCustomer
                {
                    EmployeeId = id,
                    CustomerId = customerId
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Assigned {dto.ItemIds.Count} customers", count = dto.ItemIds.Count });
    }

    /// <summary>
    /// Assign products to an employee
    /// </summary>
    [HttpPut("{id}/visibility/products")]
    public async Task<IActionResult> AssignProducts(int id, [FromBody] AssignItemsDto dto)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);
        if (employee == null) return NotFound();

        // Remove existing assignments
        var existing = await _context.EmployeeProducts.Where(ep => ep.EmployeeId == id).ToListAsync();
        _context.EmployeeProducts.RemoveRange(existing);

        // Add new assignments
        foreach (var productId in dto.ItemIds)
        {
            // Verify product exists and belongs to company
            var productExists = await _context.Products.AnyAsync(p => p.Id == productId && p.CompanyId == companyId);
            if (productExists)
            {
                _context.EmployeeProducts.Add(new EmployeeProduct
                {
                    EmployeeId = id,
                    ProductId = productId
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Assigned {dto.ItemIds.Count} products", count = dto.ItemIds.Count });
    }

    /// <summary>
    /// Get salesman visit analysis - all customers visited by assignment or task creation
    /// </summary>
    [HttpGet("{id}/visit-analysis")]
    public async Task<ActionResult<SalesmanVisitAnalysisDto>> GetSalesmanVisitAnalysis(int id, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId && e.IsSalesman);
        if (employee == null) return NotFound(new { message = "Salesman not found" });

        var start = startDate ?? TimeZoneHelper.Now.AddMonths(-1);
        var end = endDate ?? TimeZoneHelper.Now;

        // Get tasks assigned to this salesman (SalesmanId) or created by them (CreatedBy)
        var tasks = await _context.Tasks
            .Include(t => t.Customer)
            .Where(t => t.CompanyId == companyId && 
                       (t.SalesmanId == id || t.CreatedBy == id) &&
                       t.CreatedAt >= start && t.CreatedAt <= end)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        // Group visits by customer
        var customerVisits = tasks
            .Where(t => t.CustomerId != null && t.Customer != null)
            .GroupBy(t => t.CustomerId)
            .Select(g => new CustomerVisitSummaryDto
            {
                CustomerId = g.Key!.Value,
                CustomerName = g.First().Customer!.Name,
                CustomerPhone = g.First().Customer!.Phone,
                CustomerAddress = g.First().Customer!.Address,
                TotalVisits = g.Count(),
                AssignedVisits = g.Count(t => t.SalesmanId == id),
                CreatedVisits = g.Count(t => t.CreatedBy == id && t.SalesmanId != id),
                CompletedVisits = g.Count(t => t.Status == "Completed" || t.Status == "Delivered"),
                TotalSales = g.Sum(t => t.Total),
                LastVisitDate = g.Max(t => t.CreatedAt),
                Visits = g.Select(t => new VisitDetailDto
                {
                    TaskId = t.Id,
                    TaskNumber = t.TaskNumber,
                    TaskType = t.Type,
                    Status = t.Status,
                    Total = t.Total,
                    ScheduledDate = t.ScheduledDate,
                    CreatedAt = t.CreatedAt,
                    IsAssigned = t.SalesmanId == id,
                    IsCreatedBySalesman = t.CreatedBy == id
                }).OrderByDescending(v => v.CreatedAt).ToList()
            })
            .OrderByDescending(c => c.TotalVisits)
            .ToList();

        return new SalesmanVisitAnalysisDto
        {
            SalesmanId = id,
            SalesmanName = employee.Name,
            StartDate = start,
            EndDate = end,
            TotalCustomersVisited = customerVisits.Count,
            TotalVisits = tasks.Count,
            TotalAssignedVisits = tasks.Count(t => t.SalesmanId == id),
            TotalCreatedVisits = tasks.Count(t => t.CreatedBy == id),
            TotalCompletedVisits = tasks.Count(t => t.Status == "Completed" || t.Status == "Delivered"),
            TotalSales = tasks.Sum(t => t.Total),
            CustomerVisits = customerVisits
        };
    }
}

// DTOs
public class EmployeeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string Role { get; set; } = "Driver";
    public int? RoleId { get; set; }
    public string SalaryType { get; set; } = "monthly";
    public decimal BasePay { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal CommissionRate { get; set; }
    public string? CommissionBase { get; set; }
    public decimal MinimumGuarantee { get; set; }
    public int ExpectedHoursPerWeek { get; set; }
    public string? Warehouse { get; set; }
    public int? WarehouseId { get; set; }
    public string? ManagedWarehouses { get; set; }
    public string? Van { get; set; }
    public int? VanId { get; set; }
    public int Rating { get; set; }
    public string? Address { get; set; }
    public bool UseDefaultPermissions { get; set; }
    public bool CanAccessReports { get; set; }
    public bool CanApproveDeposits { get; set; }
    public bool CanEditPrices { get; set; }
    public bool CanEditCreditLimit { get; set; }
    public bool IsDriver { get; set; }
    public bool IsSalesman { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
}

public class CreateEmployeeDto
{
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Role { get; set; }
    public string? SalaryType { get; set; }
    public decimal BasePay { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal CommissionRate { get; set; }
    public string? CommissionBase { get; set; }
    public decimal MinimumGuarantee { get; set; }
    public int ExpectedHoursPerWeek { get; set; }
    public int? WarehouseId { get; set; }
    public int? VanId { get; set; }
    public string? Address { get; set; }
    public bool UseDefaultPermissions { get; set; } = true;
    public bool CanAccessReports { get; set; }
    public bool CanApproveDeposits { get; set; }
    public bool CanEditPrices { get; set; }
    public bool CanEditCreditLimit { get; set; }
}

public class UpdateEmployeeDto : CreateEmployeeDto { }

public class UpdateRatingDto
{
    public int Rating { get; set; }
}

public class EmployeeVisibilityDto
{
    public int EmployeeId { get; set; }
    public bool RestrictCustomers { get; set; }
    public bool RestrictProducts { get; set; }
    public List<int> AssignedCustomerIds { get; set; } = new();
    public List<int> AssignedProductIds { get; set; } = new();
}

public class UpdateVisibilitySettingsDto
{
    public bool RestrictCustomers { get; set; }
    public bool RestrictProducts { get; set; }
}

public class AssignItemsDto
{
    public List<int> ItemIds { get; set; } = new();
}

public class SalesmanPerformanceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Username { get; set; } = "";
    public string? Phone { get; set; }
    public string Status { get; set; } = "active";
    public decimal CommissionRate { get; set; }
    public int LeadsToday { get; set; }
    public int TotalLeads { get; set; }
    public int CustomersToday { get; set; }
    public int TotalCustomers { get; set; }
    public int TasksToday { get; set; }
    public decimal TasksSalesToday { get; set; }
    public decimal CommissionToday { get; set; }
    public decimal TotalTasksSales { get; set; }
    public decimal TotalCommission { get; set; }
}

public class SalesmanDailyPerformanceDto
{
    public int SalesmanId { get; set; }
    public string SalesmanName { get; set; } = "";
    public DateTime Date { get; set; }
    public decimal CommissionRate { get; set; }
    public int LeadsToday { get; set; }
    public int CustomersToday { get; set; }
    public int TasksToday { get; set; }
    public decimal TasksSalesToday { get; set; }
    public decimal CommissionToday { get; set; }
    public int TotalLeads { get; set; }
    public int TotalCustomers { get; set; }
    public decimal TotalTasksSales { get; set; }
    public decimal TotalCommission { get; set; }
    public List<SalesmanLeadPerformanceDto> Leads { get; set; } = new();
    public List<SalesmanCustomerPerformanceDto> Customers { get; set; } = new();
    public List<SalesmanTaskPerformanceDto> Tasks { get; set; } = new();
}

public class SalesmanLeadPerformanceDto
{
    public int Id { get; set; }
    public string BusinessName { get; set; } = "";
    public string? ContactName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string Status { get; set; } = "new";
    public DateTime CreatedAt { get; set; }
}

public class SalesmanCustomerPerformanceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Code { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? CustomerType { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SalesmanTaskPerformanceDto
{
    public int Id { get; set; }
    public string TaskNumber { get; set; } = "";
    public string? CustomerName { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}

public class SalesmanVisitAnalysisDto
{
    public int SalesmanId { get; set; }
    public string SalesmanName { get; set; } = "";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalCustomersVisited { get; set; }
    public int TotalVisits { get; set; }
    public int TotalAssignedVisits { get; set; }
    public int TotalCreatedVisits { get; set; }
    public int TotalCompletedVisits { get; set; }
    public decimal TotalSales { get; set; }
    public List<CustomerVisitSummaryDto> CustomerVisits { get; set; } = new();
}

public class CustomerVisitSummaryDto
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public string? CustomerAddress { get; set; }
    public int TotalVisits { get; set; }
    public int AssignedVisits { get; set; }
    public int CreatedVisits { get; set; }
    public int CompletedVisits { get; set; }
    public decimal TotalSales { get; set; }
    public DateTime LastVisitDate { get; set; }
    public List<VisitDetailDto> Visits { get; set; } = new();
}

public class VisitDetailDto
{
    public int TaskId { get; set; }
    public string TaskNumber { get; set; } = "";
    public string TaskType { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Total { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsAssigned { get; set; }
    public bool IsCreatedBySalesman { get; set; }
}
