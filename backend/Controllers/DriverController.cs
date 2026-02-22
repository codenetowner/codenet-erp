using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using System.Security.Claims;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/driver")]
[Authorize]
public class DriverController : ControllerBase
{
    private readonly AppDbContext _context;

    public DriverController(AppDbContext context)
    {
        _context = context;
    }

    private int GetEmployeeId() => int.Parse(User.FindFirstValue("EmployeeId") ?? "0");
    private int GetCompanyId() => int.Parse(User.FindFirstValue("CompanyId") ?? "0");
    private int? GetVanId()
    {
        var vanIdClaim = User.FindFirstValue("VanId");
        return string.IsNullOrEmpty(vanIdClaim) ? null : int.Parse(vanIdClaim);
    }

    #region Dashboard & Summary

    /// <summary>
    /// Get driver's dashboard summary for today
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<DriverDashboardDto>> GetDashboard()
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();
        var today = TimeZoneHelper.Now.Date;

        // Get today's tasks
        var tasks = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today)
            .ToListAsync();

        var completedTasks = tasks.Count(t => t.Status == "Completed" || t.Status == "Delivered");
        var pendingTasks = tasks.Count(t => t.Status == "Pending" || t.Status == "In Progress");

        // Get today's POS sales
        var posSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == today)
            .SumAsync(o => o.TotalAmount);

        // Get today's completed task sales
        var taskSales = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today &&
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.Total);

        var totalSales = posSales + taskSales;

        // Get today's collections
        var todayCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId && 
                       c.CollectionDate.Date == today)
            .SumAsync(c => c.Amount);

        // Get today's deposits
        var todayDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId && 
                       d.DepositDate == DateOnly.FromDateTime(today))
            .SumAsync(d => d.Amount);

        // Get task cash (paid amounts from completed tasks today)
        var taskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today &&
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);

        // Get starting cash and calculate cash in hand (daily shift 12AM-12AM)
        decimal startingCash = 0;
        if (vanId.HasValue)
        {
            var van = await _context.Vans
                .FirstOrDefaultAsync(v => v.Id == vanId.Value && v.CompanyId == companyId);
            startingCash = van?.StartingCash ?? 0;
        }
        var vanCashBalance = startingCash + posSales + taskCash + todayCollections - todayDeposits;

        // Get customers visited today
        var customersVisited = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today &&
                       (t.Status == "Completed" || t.Status == "Delivered") &&
                       t.CustomerId != null)
            .Select(t => t.CustomerId)
            .Distinct()
            .CountAsync();

        return new DriverDashboardDto
        {
            TodayTasks = tasks.Count,
            CompletedTasks = completedTasks,
            PendingTasks = pendingTasks,
            TotalSales = totalSales,
            TotalCollections = todayCollections,
            TotalDeposits = todayDeposits,
            CashInHand = vanCashBalance,
            CustomersVisited = customersVisited
        };
    }

    /// <summary>
    /// Get cash summary for the driver
    /// </summary>
    [HttpGet("cash-summary")]
    public async Task<ActionResult<CashSummaryDto>> GetCashSummary()
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();
        var today = TimeZoneHelper.Now.Date;

        // ========== ALL-TIME TOTALS (same as VansController for consistency) ==========
        // All task cash (paid amounts from completed tasks)
        var allTaskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);

        // All POS sales
        var allPosSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.DriverId == employeeId)
            .SumAsync(o => o.PaidAmount);

        // All collections (cash only)
        var allCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId &&
                       c.PaymentType == "cash")
            .SumAsync(c => c.Amount);

        // All deposits (not rejected)
        var allDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId &&
                       d.Status != "rejected")
            .SumAsync(d => d.Amount);

        // CASH IN HAND = All inflows - All deposits (matches VansController exactly)
        var cashInHand = allTaskCash + allPosSales + allCollections - allDeposits;

        // ========== TODAY'S ACTIVITY (for display only) ==========
        // Task cash today
        var taskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today &&
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);

        // Task debts today
        var taskDebts = await _context.Tasks
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today &&
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.DebtAmount);

        // POS sales today
        var posSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == today)
            .SumAsync(o => o.PaidAmount);

        // Collections today (cash only)
        var collections = await _context.Collections
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId && 
                       c.CollectionDate.Date == today &&
                       c.PaymentType == "cash")
            .SumAsync(c => c.Amount);

        // Deposits today (not rejected)
        var deposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId && 
                       d.DepositDate == DateOnly.FromDateTime(today) &&
                       d.Status != "rejected")
            .SumAsync(d => d.Amount);

        // Calculate today's activity totals
        var todayInflows = taskCash + posSales + collections;
        var totalCashBeforeDeposit = cashInHand + deposits; // Reverse calculate for display

        // Previous balance = CashInHand - today's net activity
        var previousBalance = cashInHand - todayInflows + deposits;

        // Get total task sales (including credit)
        var taskTotalSales = taskCash + taskDebts;
        
        // Get total POS sales (including credit)
        var posTotalSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == today)
            .SumAsync(o => o.TotalAmount);

        return new CashSummaryDto
        {
            PreviousBalance = previousBalance,
            TaskTotalSales = taskTotalSales,
            TaskCash = taskCash,
            TaskDebts = taskDebts,
            PosTotalSales = posTotalSales,
            PosSales = posSales,
            Collections = collections,
            TodayInflows = todayInflows,
            TotalBeforeDeposit = totalCashBeforeDeposit,
            Deposits = deposits,
            CashInHand = cashInHand  // This now matches VansController exactly
        };
    }

    /// <summary>
    /// Set starting cash for the day
    /// </summary>
    [HttpPost("starting-cash")]
    public async Task<IActionResult> SetStartingCash([FromBody] SetStartingCashDto dto)
    {
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        if (!vanId.HasValue)
            return BadRequest("No van assigned to this driver");

        var van = await _context.Vans
            .FirstOrDefaultAsync(v => v.Id == vanId.Value && v.CompanyId == companyId);

        if (van == null)
            return NotFound("Van not found");

        van.StartingCash = dto.Amount;
        van.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Starting cash updated", startingCash = van.StartingCash });
    }

    #endregion

    #region Tasks

    /// <summary>
    /// Get driver's tasks for today
    /// </summary>
    [HttpGet("tasks")]
    public async Task<ActionResult<List<DriverTaskDto>>> GetTasks([FromQuery] string? status, [FromQuery] DateTime? date)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();

        var query = _context.Tasks
            .Include(t => t.Customer)
            .Include(t => t.Supplier)
            .Include(t => t.Items)
                .ThenInclude(i => i.Product)
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId);

        // Filter by date if provided, otherwise show today and pending tasks
        if (date.HasValue)
        {
            query = query.Where(t => t.ScheduledDate.Date == date.Value.Date);
        }
        else
        {
            // Show today's tasks (with timezone tolerance) and any pending tasks
            var today = TimeZoneHelper.Now.Date;
            var yesterday = today.AddDays(-1);
            query = query.Where(t => t.ScheduledDate.Date >= yesterday || 
                                    t.Status == "Pending" || 
                                    t.Status == "In Progress");
        }

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);

        var tasks = await query.OrderBy(t => t.CreatedAt).ToListAsync();

        return tasks.Select(t => new DriverTaskDto
        {
            Id = t.Id,
            TaskNumber = t.TaskNumber,
            TaskType = t.Type,
            Status = t.Status,
            Priority = 0,
            TaskDate = t.ScheduledDate,
            Notes = t.Notes,
            CustomerId = t.CustomerId,
            CustomerName = t.Customer?.Name,
            CustomerPhone = t.Customer?.Phone,
            CustomerAddress = t.Customer?.Address,
            CustomerLat = t.Customer?.LocationLat,
            CustomerLng = t.Customer?.LocationLng,
            SupplierId = t.SupplierId,
            SupplierName = t.Supplier?.Name,
            Items = t.Items.Select(i => new DriverTaskItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId ?? 0,
                ProductName = i.ProductName ?? i.Product?.Name ?? "(Deleted)",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Discount = i.DiscountPercent,
                Total = i.Total
            }).ToList(),
            TotalAmount = t.Total,
            ProofOfDeliveryUrl = t.ProofOfDeliveryUrl
        }).ToList();
    }

    /// <summary>
    /// Get a specific task by ID
    /// </summary>
    [HttpGet("tasks/{id}")]
    public async Task<ActionResult<DriverTaskDto>> GetTask(int id)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();

        var task = await _context.Tasks
            .Include(t => t.Customer)
            .Include(t => t.Supplier)
            .Include(t => t.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId && t.DriverId == employeeId);

        if (task == null) return NotFound();

        return new DriverTaskDto
        {
            Id = task.Id,
            TaskNumber = task.TaskNumber,
            TaskType = task.Type,
            Status = task.Status,
            Priority = 0,
            TaskDate = task.ScheduledDate,
            Notes = task.Notes,
            CustomerId = task.CustomerId,
            CustomerName = task.Customer?.Name,
            CustomerPhone = task.Customer?.Phone,
            CustomerAddress = task.Customer?.Address,
            CustomerLat = task.Customer?.LocationLat,
            CustomerLng = task.Customer?.LocationLng,
            SupplierId = task.SupplierId,
            SupplierName = task.Supplier?.Name,
            Items = task.Items.Select(i => new DriverTaskItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId ?? 0,
                ProductName = i.ProductName ?? i.Product?.Name ?? "(Deleted)",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Discount = i.DiscountPercent,
                Total = i.Total
            }).ToList(),
            TotalAmount = task.Total,
            ProofOfDeliveryUrl = task.ProofOfDeliveryUrl
        };
    }

    /// <summary>
    /// Update task status (start, complete, etc.)
    /// </summary>
    [HttpPut("tasks/{id}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateTaskStatusDto dto)
    {
        try
        {
            var employeeId = GetEmployeeId();
            var companyId = GetCompanyId();
            var vanId = GetVanId();

            Console.WriteLine($"UpdateTaskStatus called: taskId={id}, employeeId={employeeId}, companyId={companyId}, vanId={vanId}, status={dto?.Status}");

            if (dto == null)
                return BadRequest(new { message = "Request body is null" });

            // First check if task exists at all
            var taskCheck = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
            if (taskCheck == null)
                return NotFound(new { message = $"Task {id} not found in database" });

            Console.WriteLine($"Task found: driver_id={taskCheck.DriverId}, company_id={taskCheck.CompanyId}");

            // Check if task belongs to this driver
            if (taskCheck.CompanyId != companyId || taskCheck.DriverId != employeeId)
                return NotFound(new { message = $"Task {id} not assigned to you. Task.DriverId={taskCheck.DriverId}, Your.EmployeeId={employeeId}, Task.CompanyId={taskCheck.CompanyId}, Your.CompanyId={companyId}" });

            // Now load with items
            var task = await _context.Tasks
                .Include(t => t.Items)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
                return NotFound(new { message = "Task disappeared after initial check" });

            var oldStatus = task.Status;
            task.Status = dto.Status;
            task.UpdatedAt = TimeZoneHelper.Now;

            if (dto.Status == "Started" && task.StartedAt == null)
                task.StartedAt = TimeZoneHelper.Now;

            if ((dto.Status == "Completed" || dto.Status == "Delivered") && task.CompletedAt == null)
                task.CompletedAt = TimeZoneHelper.Now;

            // If completing a delivery, deduct from van inventory and handle payment
            if ((dto.Status == "Completed" || dto.Status == "Delivered") && 
                oldStatus != "Completed" && oldStatus != "Delivered" &&
                vanId.HasValue)
            {
                foreach (var item in task.Items)
                {
                    var vanInventory = await _context.VanInventories
                        .FirstOrDefaultAsync(vi => vi.VanId == vanId.Value && 
                                                   vi.ProductId == item.ProductId && 
                                                   vi.CompanyId == companyId);
                    
                    if (vanInventory != null)
                    {
                        // Prevent negative inventory - set to 0 if not enough stock
                        vanInventory.Quantity = Math.Max(0, vanInventory.Quantity - item.Quantity);
                        vanInventory.UpdatedAt = TimeZoneHelper.Now;
                    }
                }

                // Handle payment type
                var totalAmount = task.Total;
                var paymentType = dto.PaymentType ?? "cash";
                decimal paidAmount = 0;
                decimal debtAmount = 0;

                if (paymentType == "cash")
                {
                    paidAmount = totalAmount;
                    debtAmount = 0;
                }
                else if (paymentType == "credit")
                {
                    paidAmount = 0;
                    debtAmount = totalAmount;
                }
                else if (paymentType == "split" && dto.PaidAmount.HasValue)
                {
                    paidAmount = dto.PaidAmount.Value;
                    debtAmount = totalAmount - dto.PaidAmount.Value;
                }

                // Update task payment info
                task.PaymentType = paymentType;
                task.PaidAmount = paidAmount;
                task.DebtAmount = debtAmount;

                // Note: Van cash is now calculated dynamically from transactions

                // Add debt to customer
                if (debtAmount > 0 && task.CustomerId.HasValue)
                {
                    var customer = await _context.Customers.FindAsync(task.CustomerId.Value);
                    if (customer != null)
                    {
                        customer.DebtBalance += debtAmount;
                        customer.UpdatedAt = TimeZoneHelper.Now;
                    }
                }

                // Commission is calculated in salary summary, not paid automatically
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Task status updated" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to update task status", error = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Save proof of delivery for a task (accepts JSON url or multipart file upload)
    /// </summary>
    [HttpPost("tasks/{id}/proof")]
    public async Task<IActionResult> UploadProofOfDelivery(int id)
    {
        try
        {
            var employeeId = GetEmployeeId();
            var companyId = GetCompanyId();

            string? imageUrl = null;

            // Check content type to determine how to read the data
            if (Request.ContentType?.Contains("application/json") == true)
            {
                // New frontend: sends { url: "https://cloudinary..." }
                var dto = await Request.ReadFromJsonAsync<ProofOfDeliveryDto>();
                imageUrl = dto?.Url;
            }
            else if (Request.ContentType?.Contains("multipart/form-data") == true)
            {
                // Old frontend: sends file via multipart
                var form = await Request.ReadFormAsync();
                imageUrl = form["url"];

                if (string.IsNullOrEmpty(imageUrl) && form.Files.Count > 0)
                {
                    var photo = form.Files[0];
                    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "proof");
                    Directory.CreateDirectory(uploadsDir);
                    var ext = Path.GetExtension(photo.FileName);
                    var fileName = $"proof_{id}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
                    var filePath = Path.Combine(uploadsDir, fileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await photo.CopyToAsync(stream);
                    }
                    imageUrl = $"/uploads/proof/{fileName}";
                }
            }

            if (string.IsNullOrEmpty(imageUrl))
                return BadRequest(new { message = "No photo URL provided" });

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId && t.DriverId == employeeId);
            if (task == null)
                return NotFound(new { message = "Task not found" });

            task.ProofOfDeliveryUrl = imageUrl;
            task.UpdatedAt = TimeZoneHelper.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Proof saved", url = imageUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to save proof", error = ex.Message });
        }
    }

    /// <summary>
    /// Get customers assigned to a specific task
    /// </summary>
    [HttpGet("tasks/{taskId}/customers")]
    public async Task<ActionResult<List<TaskCustomerDetailDto>>> GetTaskCustomers(int taskId)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();

        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.CompanyId == companyId && t.DriverId == employeeId);

        if (task == null) return NotFound();

        var taskCustomers = await _context.TaskCustomers
            .Include(tc => tc.Customer)
            .Where(tc => tc.TaskId == taskId)
            .OrderBy(tc => tc.VisitOrder)
            .ToListAsync();

        return taskCustomers.Select(tc => new TaskCustomerDetailDto
        {
            Id = tc.Id,
            CustomerId = tc.CustomerId,
            CustomerName = tc.Customer.Name,
            ShopName = tc.Customer.ShopName,
            Phone = tc.Customer.Phone,
            Address = tc.Customer.Address,
            Balance = tc.Customer.DebtBalance,
            VisitOrder = tc.VisitOrder,
            Status = tc.Status,
            VisitedAt = tc.VisitedAt,
            Notes = tc.Notes
        }).ToList();
    }

    /// <summary>
    /// Update task customer visit status (mark as visited/skipped)
    /// </summary>
    [HttpPut("tasks/{taskId}/customers/{customerId}/status")]
    public async Task<IActionResult> UpdateTaskCustomerStatus(int taskId, int customerId, [FromBody] UpdateTaskCustomerStatusDto dto)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();

        var task = await _context.Tasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.CompanyId == companyId && t.DriverId == employeeId);

        if (task == null) return NotFound("Task not found");

        var taskCustomer = await _context.TaskCustomers
            .FirstOrDefaultAsync(tc => tc.TaskId == taskId && tc.CustomerId == customerId);

        if (taskCustomer == null) return NotFound("Customer not found in task");

        taskCustomer.Status = dto.Status; // "visited", "skipped", "pending"
        taskCustomer.Notes = dto.Notes ?? taskCustomer.Notes;

        if (dto.Status == "visited" && taskCustomer.VisitedAt == null)
            taskCustomer.VisitedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Customer visit status updated" });
    }

    #endregion

    #region Customers

    /// <summary>
    /// Get warehouses for this driver's company
    /// </summary>
    [HttpGet("warehouses")]
    public async Task<ActionResult<object>> GetWarehouses()
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        
        // Get driver's assigned warehouse
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.CompanyId == companyId);
        
        var driverWarehouseId = employee?.WarehouseId;
        
        // Get all warehouses for the company
        var warehouses = await _context.Warehouses
            .Where(w => w.CompanyId == companyId)
            .OrderBy(w => w.Name)
            .Select(w => new { w.Id, w.Name })
            .ToListAsync();
        
        return new { driverWarehouseId, warehouses };
    }

    /// <summary>
    /// Get customers assigned to this driver
    /// </summary>
    [HttpGet("customers")]
    public async Task<ActionResult<List<DriverCustomerDto>>> GetCustomers([FromQuery] string? search, [FromQuery] int? warehouseId)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Check if employee has customer restrictions
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
        var restrictCustomers = employee?.RestrictCustomers ?? false;

        var query = _context.Customers
            .Where(c => c.CompanyId == companyId && c.Status == "active");

        // Apply visibility filter if restrictions are enabled
        if (restrictCustomers)
        {
            var allowedCustomerIds = await _context.EmployeeCustomers
                .Where(ec => ec.EmployeeId == employeeId)
                .Select(ec => ec.CustomerId)
                .ToListAsync();
            query = query.Where(c => allowedCustomerIds.Contains(c.Id));
        }

        // Filter by warehouse if specified
        if (warehouseId.HasValue)
            query = query.Where(c => c.WarehouseId == warehouseId.Value);

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(searchLower) || 
                                    (c.Phone != null && c.Phone.Contains(search)));
        }

        var customers = await query.OrderBy(c => c.Name).Take(50).ToListAsync();

        return customers.Select(c => new DriverCustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            Phone = c.Phone,
            Address = c.Address,
            Latitude = c.LocationLat,
            Longitude = c.LocationLng,
            CreditLimit = c.CreditLimit,
            CurrentBalance = c.DebtBalance
        }).ToList();
    }

    /// <summary>
    /// Get customer details with balance
    /// </summary>
    [HttpGet("customers/{id}")]
    public async Task<ActionResult<DriverCustomerDto>> GetCustomer(int id)
    {
        var companyId = GetCompanyId();

        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (customer == null) return NotFound();

        return new DriverCustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            Phone = customer.Phone,
            Address = customer.Address,
            Latitude = customer.LocationLat,
            Longitude = customer.LocationLng,
            CreditLimit = customer.CreditLimit,
            CurrentBalance = customer.DebtBalance
        };
    }

    /// <summary>
    /// Create a new customer
    /// </summary>
    [HttpPost("customers")]
    public async Task<ActionResult<DriverCustomerDto>> CreateCustomer([FromBody] CreateDriverCustomerDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Customer name is required" });

        var customer = new Customer
        {
            CompanyId = companyId,
            Name = dto.Name,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            CustomerType = dto.CustomerType ?? "Retail",
            CreditLimit = dto.CreditLimit ?? 0,
            LocationLat = dto.Latitude.HasValue ? (decimal)dto.Latitude.Value : null,
            LocationLng = dto.Longitude.HasValue ? (decimal)dto.Longitude.Value : null,
            Notes = dto.Notes,
            Status = "active",
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        // Auto-add visibility: the creating employee can see this customer
        _context.EmployeeCustomers.Add(new EmployeeCustomer
        {
            EmployeeId = employeeId,
            CustomerId = customer.Id,
            CreatedAt = TimeZoneHelper.Now
        });
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new DriverCustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            Phone = customer.Phone,
            Address = customer.Address,
            Latitude = customer.LocationLat,
            Longitude = customer.LocationLng,
            CreditLimit = customer.CreditLimit,
            CurrentBalance = 0
        });
    }

    #endregion

    #region Products & Inventory

    /// <summary>
    /// Get products available in driver's van
    /// </summary>
    [HttpGet("products")]
    public async Task<ActionResult<List<DriverProductDto>>> GetProducts()
    {
        var companyId = GetCompanyId();
        var vanId = GetVanId();
        var employeeId = GetEmployeeId();

        if (!vanId.HasValue)
            return BadRequest(new { error = "No van assigned to this driver" });

        // Check if employee has product restrictions
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
        var restrictProducts = employee?.RestrictProducts ?? false;
        List<int>? allowedProductIds = null;

        if (restrictProducts)
        {
            allowedProductIds = await _context.EmployeeProducts
                .Where(ep => ep.EmployeeId == employeeId)
                .Select(ep => ep.ProductId)
                .ToListAsync();
        }

        var query = _context.VanInventories
            .Include(vi => vi.Product)
                .ThenInclude(p => p.Category)
            .Where(vi => vi.VanId == vanId.Value && vi.CompanyId == companyId && vi.Quantity > 0);

        // Apply visibility filter if restrictions are enabled
        if (restrictProducts && allowedProductIds != null)
        {
            query = query.Where(vi => allowedProductIds.Contains(vi.ProductId));
        }

        var vanInventory = await query.ToListAsync();

        return vanInventory.Select(vi => new DriverProductDto
        {
            Id = vi.Product.Id,
            Name = vi.Product.Name,
            Sku = vi.Product.Sku,
            CategoryName = vi.Product.Category?.Name,
            RetailPrice = vi.Product.RetailPrice,
            WholesalePrice = vi.Product.WholesalePrice,
            AvailableQuantity = vi.Quantity,
            BaseUnit = vi.Product.BaseUnit,
            SecondUnit = vi.Product.SecondUnit,
            UnitsPerSecond = vi.Product.UnitsPerSecond
        }).ToList();
    }

    /// <summary>
    /// Get product price for a specific customer (checks special pricing)
    /// </summary>
    [HttpGet("products/{id}/price")]
    public async Task<ActionResult<ProductPriceDto>> GetProductPrice(int id, [FromQuery] int? customerId)
    {
        var companyId = GetCompanyId();

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        if (product == null) return NotFound();

        decimal price = product.RetailPrice;

        // Check for customer special price
        if (customerId.HasValue)
        {
            var specialPrice = await _context.CustomerSpecialPrices
                .FirstOrDefaultAsync(sp => sp.CustomerId == customerId.Value && 
                                          sp.ProductId == id && 
                                          sp.IsActive);
            if (specialPrice != null)
                price = specialPrice.SpecialPrice;
        }

        return new ProductPriceDto
        {
            ProductId = id,
            ProductName = product.Name,
            RetailPrice = product.RetailPrice,
            WholesalePrice = product.WholesalePrice,
            FinalPrice = price,
            HasSpecialPrice = customerId.HasValue && price != product.RetailPrice
        };
    }

    /// <summary>
    /// Get van inventory summary
    /// </summary>
    [HttpGet("inventory")]
    public async Task<ActionResult<List<VanInventoryItemDto>>> GetVanInventory()
    {
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        if (!vanId.HasValue)
            return BadRequest(new { error = "No van assigned to this driver" });

        var inventory = await _context.VanInventories
            .Include(vi => vi.Product)
            .Where(vi => vi.VanId == vanId.Value && vi.CompanyId == companyId && vi.Product != null)
            .ToListAsync();

        return inventory.Select(vi => new VanInventoryItemDto
        {
            ProductId = vi.ProductId,
            ProductName = vi.Product?.Name ?? "Unknown",
            Sku = vi.Product?.Sku ?? "",
            Barcode = vi.Product?.Barcode,
            BoxBarcode = vi.Product?.BoxBarcode,
            Quantity = vi.Quantity,
            BaseUnit = vi.Product?.BaseUnit ?? "Piece",
            SecondUnit = vi.Product?.SecondUnit ?? "Box",
            UnitsPerSecond = vi.Product?.UnitsPerSecond ?? 1,
            RetailPrice = vi.Product?.RetailPrice ?? 0,
            WholesalePrice = vi.Product?.WholesalePrice ?? 0,
            BoxRetailPrice = vi.Product?.BoxRetailPrice ?? 0,
            BoxWholesalePrice = vi.Product?.BoxWholesalePrice ?? 0,
            ImageUrl = vi.Product?.ImageUrl,
            LoadedAt = vi.LoadedAt,
            UpdatedAt = vi.UpdatedAt
        }).ToList();
    }

    /// <summary>
    /// Get customer-specific prices for products in van inventory
    /// </summary>
    [HttpGet("inventory/prices/{customerId}")]
    public async Task<ActionResult<List<CustomerProductPriceDto>>> GetCustomerPrices(int customerId)
    {
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        if (!vanId.HasValue)
            return BadRequest(new { error = "No van assigned to this driver" });

        // Get all special prices for this customer
        var specialPrices = await _context.CustomerSpecialPrices
            .Where(sp => sp.CustomerId == customerId && sp.CompanyId == companyId && sp.IsActive)
            .ToListAsync();

        // Get van inventory
        var inventory = await _context.VanInventories
            .Include(vi => vi.Product)
            .Where(vi => vi.VanId == vanId.Value && vi.CompanyId == companyId && vi.Product != null)
            .ToListAsync();

        return inventory.Select(vi => {
            var pieceSpecial = specialPrices.FirstOrDefault(sp => sp.ProductId == vi.ProductId && sp.UnitType == "piece");
            var boxSpecial = specialPrices.FirstOrDefault(sp => sp.ProductId == vi.ProductId && sp.UnitType == "box");
            
            return new CustomerProductPriceDto
            {
                ProductId = vi.ProductId,
                RetailPrice = vi.Product?.RetailPrice ?? 0,
                WholesalePrice = vi.Product?.WholesalePrice ?? 0,
                BoxRetailPrice = vi.Product?.BoxRetailPrice ?? 0,
                BoxWholesalePrice = vi.Product?.BoxWholesalePrice ?? 0,
                SpecialPrice = pieceSpecial?.SpecialPrice,
                BoxSpecialPrice = boxSpecial?.SpecialPrice,
                HasSpecialPrice = pieceSpecial != null,
                HasBoxSpecialPrice = boxSpecial != null
            };
        }).ToList();
    }

    #endregion

    #region Orders (POS)

    /// <summary>
    /// Get driver's orders for today (or specified date)
    /// </summary>
    [HttpGet("orders")]
    public async Task<ActionResult<List<DriverOrderDto>>> GetOrders([FromQuery] DateTime? date)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var targetDate = date?.Date ?? TimeZoneHelper.Now.Date;

        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == targetDate)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(o => new DriverOrderDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CustomerName = o.Customer.Name,
            TotalAmount = o.TotalAmount,
            PaidAmount = o.PaidAmount,
            PaymentStatus = o.PaymentStatus,
            OrderStatus = o.OrderStatus,
            OrderDate = o.OrderDate,
            ItemCount = o.OrderItems.Count
        }).ToList();
    }

    /// <summary>
    /// Create a new order (POS sale)
    /// </summary>
    [HttpPost("orders")]
    public async Task<ActionResult<DriverOrderDto>> CreateOrder([FromBody] CreateDriverOrderDto dto)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        if (!vanId.HasValue)
            return BadRequest(new { error = "No van assigned to this driver" });

        // Verify customer exists
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.CompanyId == companyId);
        if (customer == null)
            return BadRequest(new { error = "Customer not found" });

        // Generate order number
        var count = await _context.Orders.CountAsync(o => o.CompanyId == companyId);
        var orderNumber = $"ORD-{(count + 1).ToString().PadLeft(5, '0')}";

        // Calculate totals first
        decimal subtotal = 0;
        var orderItems = new List<OrderItem>();

        foreach (var item in dto.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product == null) continue;

            // Check special price (with unit type support)
            decimal unitPrice = item.UnitType == "box" ? product.BoxRetailPrice : product.RetailPrice;
            var specialPrice = await _context.CustomerSpecialPrices
                .FirstOrDefaultAsync(sp => sp.CustomerId == dto.CustomerId && 
                                          sp.ProductId == item.ProductId && 
                                          sp.UnitType == item.UnitType &&
                                          sp.IsActive);
            if (specialPrice != null)
                unitPrice = specialPrice.SpecialPrice;

            var lineTotal = unitPrice * item.Quantity;
            var discountAmount = lineTotal * (item.Discount / 100);
            var itemTotal = lineTotal - discountAmount;
            subtotal += itemTotal;

            orderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                ProductName = product.Name,
                ProductSku = product.Sku,
                ProductBarcode = product.Barcode,
                UnitType = item.UnitType ?? "piece",
                Quantity = item.Quantity,
                UnitPrice = unitPrice,
                DiscountPercent = item.Discount,
                DiscountAmount = discountAmount,
                Total = itemTotal
            });

            // Deduct from van inventory (convert to pieces if box)
            decimal deductQuantity = item.Quantity;
            if (item.UnitType == "box" && product.UnitsPerSecond > 0)
            {
                deductQuantity = item.Quantity * product.UnitsPerSecond;
            }

            var vanInventory = await _context.VanInventories
                .FirstOrDefaultAsync(vi => vi.VanId == vanId.Value && 
                                          vi.ProductId == item.ProductId && 
                                          vi.CompanyId == companyId);
            if (vanInventory != null)
            {
                vanInventory.Quantity -= deductQuantity;
                vanInventory.UpdatedAt = TimeZoneHelper.Now;
            }
        }

        // Determine payment amounts
        decimal cashReceived = 0;
        decimal creditAmount = 0;

        if (dto.PaymentType == "cash")
        {
            cashReceived = subtotal;
        }
        else if (dto.PaymentType == "credit")
        {
            creditAmount = subtotal;
        }
        else if (dto.PaymentType == "split" && dto.CashAmount.HasValue)
        {
            cashReceived = dto.CashAmount.Value;
            creditAmount = subtotal - dto.CashAmount.Value;
        }

        // Create the order
        var order = new Order
        {
            CompanyId = companyId,
            OrderNumber = orderNumber,
            CustomerId = dto.CustomerId,
            DriverId = employeeId,
            VanId = vanId.Value,
            TaskId = dto.TaskId,  // Link to task if provided
            OrderDate = TimeZoneHelper.Now,
            OrderTime = TimeZoneHelper.Now.TimeOfDay,
            Subtotal = subtotal,
            TotalAmount = subtotal,
            PaidAmount = cashReceived,
            PaymentStatus = creditAmount > 0 ? (cashReceived > 0 ? "partial" : "unpaid") : "paid",
            OrderStatus = "delivered",
            Notes = dto.Notes,
            CreatedBy = employeeId,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Add order items with OrderId
        foreach (var item in orderItems)
        {
            item.OrderId = order.Id;
            _context.OrderItems.Add(item);
        }

        // Note: Van cash is now calculated dynamically from transactions

        // Add credit to customer debt
        if (creditAmount > 0)
        {
            customer.DebtBalance += creditAmount;
            customer.UpdatedAt = TimeZoneHelper.Now;
        }

        // Commission is calculated in salary summary, not paid automatically

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, new DriverOrderDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = customer.Name,
            TotalAmount = order.TotalAmount,
            PaidAmount = order.PaidAmount,
            PaymentStatus = order.PaymentStatus,
            OrderStatus = order.OrderStatus,
            OrderDate = order.OrderDate
        });
    }

    #endregion

    #region Collections

    /// <summary>
    /// Get today's collections
    /// </summary>
    [HttpGet("collections")]
    public async Task<ActionResult<List<DriverCollectionDto>>> GetCollections([FromQuery] DateTime? date)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var targetDate = date?.Date ?? TimeZoneHelper.Now.Date;

        var collections = await _context.Collections
            .Include(c => c.Customer)
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId && 
                       c.CollectionDate.Date == targetDate)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return collections.Select(c => new DriverCollectionDto
        {
            Id = c.Id,
            CollectionNumber = c.CollectionNumber ?? "",
            CustomerName = c.Customer.Name,
            Amount = c.Amount,
            PaymentType = c.PaymentType,
            CollectionDate = c.CollectionDate,
            Notes = c.Notes
        }).ToList();
    }

    /// <summary>
    /// Create a new collection
    /// </summary>
    [HttpPost("collections")]
    public async Task<ActionResult<DriverCollectionDto>> CreateCollection([FromBody] CreateDriverCollectionDto dto)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        // Verify customer
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.CompanyId == companyId);
        if (customer == null)
            return BadRequest(new { error = "Customer not found" });

        // Generate collection number
        var count = await _context.Collections.CountAsync(c => c.CompanyId == companyId);
        var collectionNumber = $"COL-{(count + 1).ToString().PadLeft(5, '0')}";

        var collection = new Collection
        {
            CompanyId = companyId,
            CollectionNumber = collectionNumber,
            CustomerId = dto.CustomerId,
            DriverId = employeeId,
            Amount = dto.Amount,
            PaymentType = dto.PaymentType ?? "cash",
            CollectionDate = TimeZoneHelper.Now,
            CollectionTime = TimeSpan.FromTicks(TimeZoneHelper.Now.TimeOfDay.Ticks),
            CheckNumber = dto.CheckNumber,
            CheckDate = dto.CheckDate,
            BankName = dto.BankName,
            Notes = dto.Notes,
            CreatedAt = TimeZoneHelper.Now
        };

        _context.Collections.Add(collection);

        // Reduce customer debt balance
        customer.DebtBalance -= dto.Amount;

        // Note: Van cash is now calculated dynamically from transactions

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCollections), new DriverCollectionDto
        {
            Id = collection.Id,
            CollectionNumber = collection.CollectionNumber,
            CustomerName = customer.Name,
            Amount = collection.Amount,
            PaymentType = collection.PaymentType,
            CollectionDate = collection.CollectionDate
        });
    }

    #endregion

    #region Deposits

    /// <summary>
    /// Get today's deposits
    /// </summary>
    [HttpGet("deposits")]
    public async Task<ActionResult<List<DriverDepositDto>>> GetDeposits([FromQuery] DateTime? date)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var targetDate = DateOnly.FromDateTime(date ?? TimeZoneHelper.Now);

        var deposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId && 
                       d.DepositDate == targetDate)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return deposits.Select(d => new DriverDepositDto
        {
            Id = d.Id,
            DepositNumber = d.DepositNumber,
            Amount = d.Amount,
            DepositType = d.DepositType,
            DepositDate = d.DepositDate.ToDateTime(TimeOnly.MinValue),
            BankName = d.BankName,
            SlipNumber = d.SlipNumber,
            Status = d.Status,
            Notes = d.Notes
        }).ToList();
    }

    /// <summary>
    /// Create a new deposit
    /// </summary>
    [HttpPost("deposits")]
    public async Task<ActionResult<DriverDepositDto>> CreateDeposit([FromBody] CreateDriverDepositDto dto)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();

        // Generate deposit number
        var count = await _context.Deposits.CountAsync(d => d.CompanyId == companyId);
        var depositNumber = $"DEP-{(count + 1).ToString().PadLeft(5, '0')}";

        var deposit = new Deposit
        {
            CompanyId = companyId,
            DepositNumber = depositNumber,
            DriverId = employeeId,
            Amount = dto.Amount,
            DepositType = dto.DepositType ?? "warehouse",
            DepositDate = DateOnly.FromDateTime(TimeZoneHelper.Now),
            DepositTime = TimeZoneHelper.Now.TimeOfDay,
            BankName = dto.BankName,
            SlipNumber = dto.SlipNumber,
            Notes = dto.Notes,
            Status = "pending",
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Deposits.Add(deposit);

        // Note: Van cash is now calculated dynamically from transactions

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDeposits), new DriverDepositDto
        {
            Id = deposit.Id,
            DepositNumber = deposit.DepositNumber,
            Amount = deposit.Amount,
            DepositType = deposit.DepositType,
            DepositDate = deposit.DepositDate.ToDateTime(TimeOnly.MinValue),
            Status = deposit.Status
        });
    }

    #endregion

    #region Shift

    /// <summary>
    /// Get current active shift
    /// </summary>
    [HttpGet("shift/current")]
    public async Task<ActionResult<DriverShiftDto>> GetCurrentShift()
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var today = DateOnly.FromDateTime(TimeZoneHelper.Now);

        var shift = await _context.DriverShifts
            .Include(s => s.Van)
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && 
                                     s.DriverId == employeeId && 
                                     s.ShiftDate == today);

        if (shift == null)
            return Ok(new { hasActiveShift = false });

        return new DriverShiftDto
        {
            Id = shift.Id,
            ShiftDate = shift.ShiftDate.ToDateTime(TimeOnly.MinValue),
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            VanId = shift.VanId,
            VanName = shift.Van?.Name,
            StartCash = shift.StartCash,
            EndCash = shift.EndCash,
            TotalSales = shift.TotalSales,
            TotalCollections = shift.TotalCollections,
            TotalDeposits = shift.TotalDeposits,
            CustomersVisited = shift.CustomersVisited,
            CustomersSkipped = shift.CustomersSkipped,
            OrdersCount = shift.OrdersCount,
            Status = shift.Status,
            HasActiveShift = true
        };
    }

    /// <summary>
    /// Start a new shift
    /// </summary>
    [HttpPost("shift/start")]
    public async Task<ActionResult<DriverShiftDto>> StartShift([FromBody] StartShiftDto dto)
    {
        try
        {
            var employeeId = GetEmployeeId();
            var companyId = GetCompanyId();
            var vanId = GetVanId();
            var today = DateOnly.FromDateTime(TimeZoneHelper.Now);

            Console.WriteLine($"StartShift: employeeId={employeeId}, companyId={companyId}, vanId={vanId}, today={today}");

            if (!vanId.HasValue)
                return BadRequest(new { error = "No van assigned to this driver. Please contact admin to assign a van." });

        // Check if shift already exists for today
        var existingShift = await _context.DriverShifts
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && 
                                     s.DriverId == employeeId && 
                                     s.ShiftDate == today);

        if (existingShift != null)
        {
            if (existingShift.Status == "completed")
                return BadRequest(new { error = "Shift already completed for today" });
            
            return BadRequest(new { error = "Shift already started for today" });
        }

        // Calculate current cash dynamically (same as VansController)
        var allTaskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && t.DriverId == employeeId && 
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);
        var allPosSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.DriverId == employeeId)
            .SumAsync(o => o.PaidAmount);
        var allCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.DriverId == employeeId && c.PaymentType == "cash")
            .SumAsync(c => c.Amount);
        var allDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.DriverId == employeeId && d.Status != "rejected")
            .SumAsync(d => d.Amount);
        var startCash = allTaskCash + allPosSales + allCollections - allDeposits;

        var shift = new DriverShift
        {
            CompanyId = companyId,
            DriverId = employeeId,
            VanId = vanId.Value,
            ShiftDate = today,
            StartTime = TimeZoneHelper.Now,
            StartCash = dto.StartCash ?? startCash,
            Status = "active",
            Notes = dto.Notes
        };

        _context.DriverShifts.Add(shift);

        // Auto-create attendance record with check_in time
        var existingAttendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.CompanyId == companyId && 
                                     a.EmployeeId == employeeId && 
                                     a.Date.Date == TimeZoneHelper.Now.Date);

        if (existingAttendance == null)
        {
            var attendance = new Attendance
            {
                CompanyId = companyId,
                EmployeeId = employeeId,
                Date = TimeZoneHelper.Now.Date,
                CheckIn = TimeZoneHelper.Now,
                Status = "present",
                Notes = "Auto check-in from driver shift start"
            };
            _context.Attendances.Add(attendance);
        }
        else if (!existingAttendance.CheckIn.HasValue)
        {
            existingAttendance.CheckIn = TimeZoneHelper.Now;
            existingAttendance.Status = "present";
            existingAttendance.UpdatedAt = TimeZoneHelper.Now;
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCurrentShift), new DriverShiftDto
        {
            Id = shift.Id,
            ShiftDate = shift.ShiftDate.ToDateTime(TimeOnly.MinValue),
            StartTime = shift.StartTime,
            VanId = shift.VanId,
            StartCash = shift.StartCash,
            Status = shift.Status,
            HasActiveShift = true
        });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"StartShift error: {ex.Message}");
            return BadRequest(new { error = $"Failed to start shift: {ex.Message}" });
        }
    }

    /// <summary>
    /// End current shift
    /// </summary>
    [HttpPost("shift/end")]
    public async Task<ActionResult<DriverShiftDto>> EndShift([FromBody] EndShiftDto dto)
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();
        var today = DateOnly.FromDateTime(TimeZoneHelper.Now);

        var shift = await _context.DriverShifts
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && 
                                     s.DriverId == employeeId && 
                                     s.ShiftDate == today &&
                                     s.Status == "active");

        if (shift == null)
            return BadRequest(new { error = "No active shift found for today" });

        // Calculate shift totals
        var orders = await _context.Orders
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == TimeZoneHelper.Now.Date)
            .ToListAsync();

        var collections = await _context.Collections
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId && 
                       c.CollectionDate.Date == TimeZoneHelper.Now.Date)
            .ToListAsync();

        var deposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId && 
                       d.DepositDate == today)
            .ToListAsync();

        var taskCustomers = await _context.TaskCustomers
            .Include(tc => tc.Task)
            .Where(tc => tc.Task.CompanyId == companyId && 
                        tc.Task.DriverId == employeeId &&
                        tc.Task.ScheduledDate.Date == TimeZoneHelper.Now.Date)
            .ToListAsync();

        // Calculate ending cash dynamically (same as VansController)
        var allTaskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && t.DriverId == employeeId && 
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);
        var allPosSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.DriverId == employeeId)
            .SumAsync(o => o.PaidAmount);
        var allCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.DriverId == employeeId && c.PaymentType == "cash")
            .SumAsync(c => c.Amount);
        var allDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.DriverId == employeeId && d.Status != "rejected")
            .SumAsync(d => d.Amount);
        var endCash = allTaskCash + allPosSales + allCollections - allDeposits;

        // Update shift record
        shift.EndTime = TimeZoneHelper.Now;
        shift.EndCash = endCash;
        shift.TotalSales = orders.Sum(o => o.TotalAmount);
        shift.TotalCollections = collections.Sum(c => c.Amount);
        shift.TotalDeposits = deposits.Sum(d => d.Amount);
        shift.OrdersCount = orders.Count;
        shift.CustomersVisited = taskCustomers.Count(tc => tc.Status == "visited");
        shift.CustomersSkipped = taskCustomers.Count(tc => tc.Status == "skipped");
        shift.Status = "completed";
        shift.Notes = dto.Notes ?? shift.Notes;

        // Auto-update attendance record with check_out time
        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.CompanyId == companyId && 
                                     a.EmployeeId == employeeId && 
                                     a.Date.Date == TimeZoneHelper.Now.Date);

        if (attendance != null)
        {
            attendance.CheckOut = TimeZoneHelper.Now;
            attendance.UpdatedAt = TimeZoneHelper.Now;
            // Calculate overtime if worked more than 8 hours
            if (attendance.CheckIn.HasValue)
            {
                var workedHours = (TimeZoneHelper.Now - attendance.CheckIn.Value).TotalHours;
                if (workedHours > 8)
                    attendance.OvertimeHours = (decimal)(workedHours - 8);
            }
        }

        await _context.SaveChangesAsync();

        return new DriverShiftDto
        {
            Id = shift.Id,
            ShiftDate = shift.ShiftDate.ToDateTime(TimeOnly.MinValue),
            StartTime = shift.StartTime,
            EndTime = shift.EndTime,
            VanId = shift.VanId,
            StartCash = shift.StartCash,
            EndCash = shift.EndCash,
            TotalSales = shift.TotalSales,
            TotalCollections = shift.TotalCollections,
            TotalDeposits = shift.TotalDeposits,
            CustomersVisited = shift.CustomersVisited,
            CustomersSkipped = shift.CustomersSkipped,
            OrdersCount = shift.OrdersCount,
            Status = shift.Status,
            HasActiveShift = false
        };
    }

    /// <summary>
    /// Get shift summary (legacy endpoint - now uses shift data)
    /// </summary>
    [HttpGet("shift/summary")]
    public async Task<ActionResult<ShiftSummaryDto>> GetShiftSummary()
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var vanId = GetVanId();
        var today = TimeZoneHelper.Now.Date;

        // Get all tasks for today
        var tasks = await _context.Tasks
            .Include(t => t.Items)
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today)
            .ToListAsync();

        var completedTasks = tasks.Where(t => t.Status == "Completed" || t.Status == "Delivered").ToList();

        // Get orders for today
        var orders = await _context.Orders
            .Where(o => o.CompanyId == companyId && 
                       o.DriverId == employeeId && 
                       o.OrderDate.Date == today)
            .ToListAsync();

        // Get collections
        var collections = await _context.Collections
            .Where(c => c.CompanyId == companyId && 
                       c.DriverId == employeeId && 
                       c.CollectionDate.Date == today)
            .ToListAsync();

        // Get deposits
        var deposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && 
                       d.DriverId == employeeId && 
                       d.DepositDate == DateOnly.FromDateTime(today))
            .ToListAsync();

        // Calculate cash dynamically (same as VansController)
        var allTaskCash = await _context.Tasks
            .Where(t => t.CompanyId == companyId && t.DriverId == employeeId && 
                       (t.Status == "Completed" || t.Status == "Delivered"))
            .SumAsync(t => t.PaidAmount);
        var allPosSales = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.DriverId == employeeId)
            .SumAsync(o => o.PaidAmount);
        var allCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.DriverId == employeeId && c.PaymentType == "cash")
            .SumAsync(c => c.Amount);
        var allDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.DriverId == employeeId && d.Status != "rejected")
            .SumAsync(d => d.Amount);
        var vanCashBalance = allTaskCash + allPosSales + allCollections - allDeposits;

        // Calculate sales from orders
        var totalSales = orders.Sum(o => o.TotalAmount);
        var cashSales = orders.Where(o => o.PaymentStatus == "paid").Sum(o => o.PaidAmount);
        var creditSales = orders.Sum(o => o.TotalAmount - o.PaidAmount);

        return new ShiftSummaryDto
        {
            TotalTasks = tasks.Count,
            CompletedTasks = completedTasks.Count,
            PendingTasks = tasks.Count - completedTasks.Count,
            TotalSales = totalSales,
            CashSales = cashSales,
            CreditSales = creditSales,
            TotalCollections = collections.Sum(c => c.Amount),
            CashCollections = collections.Where(c => c.PaymentType == "cash").Sum(c => c.Amount),
            CheckCollections = collections.Where(c => c.PaymentType == "check").Sum(c => c.Amount),
            TotalDeposits = deposits.Sum(d => d.Amount),
            CashInHand = vanCashBalance
        };
    }

    #endregion

    #region Leads

    /// <summary>
    /// Capture a new lead (potential customer) from the field
    /// </summary>
    [HttpPost("leads")]
    public async Task<ActionResult<DriverLeadDto>> CaptureLead(CaptureLeadDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        var lead = new Lead
        {
            CompanyId = companyId,
            Name = dto.Name,
            ShopName = dto.ShopName,
            Phone = dto.Phone,
            Address = dto.Address,
            City = dto.City,
            Area = dto.Area,
            LocationLat = dto.LocationLat,
            LocationLng = dto.LocationLng,
            BusinessType = dto.BusinessType,
            EstimatedPotential = dto.EstimatedPotential,
            Notes = dto.Notes,
            Status = "new",
            CapturedBy = employeeId,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Leads.Add(lead);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyLeads), new DriverLeadDto
        {
            Id = lead.Id,
            Name = lead.Name,
            ShopName = lead.ShopName,
            Phone = lead.Phone,
            Address = lead.Address,
            Status = lead.Status,
            CreatedAt = lead.CreatedAt
        });
    }

    /// <summary>
    /// Get leads captured by this driver
    /// </summary>
    [HttpGet("leads")]
    public async Task<ActionResult<IEnumerable<DriverLeadDto>>> GetMyLeads()
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        var leads = await _context.Leads
            .Where(l => l.CompanyId == companyId && l.CapturedBy == employeeId)
            .OrderByDescending(l => l.CreatedAt)
            .Take(50) // Limit for mobile
            .ToListAsync();

        return leads.Select(l => new DriverLeadDto
        {
            Id = l.Id,
            Name = l.Name,
            ShopName = l.ShopName,
            Phone = l.Phone,
            Address = l.Address,
            Status = l.Status,
            CreatedAt = l.CreatedAt
        }).ToList();
    }

    #endregion

    #region Returns

    /// <summary>
    /// Create a return from the driver app
    /// </summary>
    [HttpPost("returns")]
    public async Task<ActionResult<DriverReturnDto>> CreateReturn(CreateDriverReturnDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Verify customer exists
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.CompanyId == companyId);

        if (customer == null)
            return BadRequest(new { error = "Customer not found" });

        // Generate return number
        var today = TimeZoneHelper.Now;
        var prefix = $"RET-{today:yyyyMMdd}";
        var lastReturn = await _context.Returns
            .Where(r => r.CompanyId == companyId && r.ReturnNumber.StartsWith(prefix))
            .OrderByDescending(r => r.ReturnNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastReturn != null)
        {
            var lastSeq = lastReturn.ReturnNumber.Split('-').LastOrDefault();
            if (int.TryParse(lastSeq, out int lastSeqNum))
                sequence = lastSeqNum + 1;
        }
        var returnNumber = $"{prefix}-{sequence:D3}";

        var ret = new Return
        {
            CompanyId = companyId,
            ReturnNumber = returnNumber,
            OrderId = dto.OrderId,
            CustomerId = dto.CustomerId,
            DriverId = employeeId,
            ReturnDate = DateOnly.FromDateTime(TimeZoneHelper.Now),
            Reason = dto.Reason,
            Status = "pending",
            Notes = dto.Notes,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Returns.Add(ret);
        await _context.SaveChangesAsync();

        // Add items
        decimal totalAmount = 0;
        foreach (var item in dto.Items)
        {
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.CompanyId == companyId);

            if (product == null) continue;

            var lineTotal = item.Quantity * item.UnitPrice;
            totalAmount += lineTotal;

            var returnItem = new ReturnItem
            {
                ReturnId = ret.Id,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = lineTotal,
                Reason = item.Reason,
                CreatedAt = TimeZoneHelper.Now
            };

            _context.ReturnItems.Add(returnItem);
        }

        ret.TotalAmount = totalAmount;
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetReturns), new DriverReturnDto
        {
            Id = ret.Id,
            ReturnNumber = ret.ReturnNumber,
            CustomerName = customer.Name,
            TotalAmount = ret.TotalAmount,
            Status = ret.Status,
            ItemCount = dto.Items.Count,
            ReturnDate = ret.ReturnDate.ToDateTime(TimeOnly.MinValue)
        });
    }

    /// <summary>
    /// Get driver's returns for today
    /// </summary>
    [HttpGet("returns")]
    public async Task<ActionResult<IEnumerable<DriverReturnDto>>> GetReturns()
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var today = DateOnly.FromDateTime(TimeZoneHelper.Now);

        var returns = await _context.Returns
            .Include(r => r.Customer)
            .Include(r => r.ReturnItems)
            .Where(r => r.CompanyId == companyId && 
                       r.DriverId == employeeId && 
                       r.ReturnDate == today)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return returns.Select(r => new DriverReturnDto
        {
            Id = r.Id,
            ReturnNumber = r.ReturnNumber,
            CustomerName = r.Customer.Name,
            TotalAmount = r.TotalAmount,
            Status = r.Status,
            ItemCount = r.ReturnItems.Count,
            ReturnDate = r.ReturnDate.ToDateTime(TimeOnly.MinValue)
        }).ToList();
    }

    #endregion
}

#region DTOs

public class DriverDashboardDto
{
    public int TodayTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int PendingTasks { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCollections { get; set; }
    public decimal TotalDeposits { get; set; }
    public decimal CashInHand { get; set; }
    public int CustomersVisited { get; set; }
}

public class CashSummaryDto
{
    public decimal PreviousBalance { get; set; }     // Cash carried over from before today
    public decimal TaskTotalSales { get; set; }      // Today's total task sales (cash + credit)
    public decimal TaskCash { get; set; }            // Today's task payments (cash)
    public decimal TaskDebts { get; set; }           // Today's task debts (credit)
    public decimal PosTotalSales { get; set; }       // Today's total POS sales
    public decimal PosSales { get; set; }            // Today's POS sales (cash paid)
    public decimal Collections { get; set; }         // Today's debt collections
    public decimal TodayInflows { get; set; }        // Today's total inflows (task + POS + collections)
    public decimal TotalBeforeDeposit { get; set; }  // Previous + Today's inflows
    public decimal Deposits { get; set; }            // Today's deposits
    public decimal CashInHand { get; set; }          // Final = TotalBeforeDeposit - Deposits
}

public class SetStartingCashDto
{
    public decimal Amount { get; set; }
}

public class DriverTaskDto
{
    public int Id { get; set; }
    public string TaskNumber { get; set; } = string.Empty;
    public string TaskType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Priority { get; set; }
    public DateTime TaskDate { get; set; }
    public string? Notes { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerAddress { get; set; }
    public decimal? CustomerLat { get; set; }
    public decimal? CustomerLng { get; set; }
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public List<DriverTaskItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string? ProofOfDeliveryUrl { get; set; }
}

public class DriverTaskItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
}

public class UpdateTaskStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? PaymentType { get; set; } // cash, credit, split
    public decimal? PaidAmount { get; set; }
}

public class DriverCustomerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CurrentBalance { get; set; }
}

public class CreateDriverCustomerDto
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? CustomerType { get; set; }
    public string? PaymentTerms { get; set; }
    public decimal? CreditLimit { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Notes { get; set; }
}

public class CustomerProductPriceDto
{
    public int ProductId { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public decimal? SpecialPrice { get; set; }
    public decimal? BoxSpecialPrice { get; set; }
    public bool HasSpecialPrice { get; set; }
    public bool HasBoxSpecialPrice { get; set; }
}

public class DriverProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal AvailableQuantity { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
}

public class ProductPriceDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal FinalPrice { get; set; }
    public bool HasSpecialPrice { get; set; }
}

public class VanInventoryItemDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public decimal Quantity { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; } = "Box";
    public int UnitsPerSecond { get; set; } = 1;
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime LoadedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateDriverOrderDto
{
    public int CustomerId { get; set; }
    public int? TaskId { get; set; }  // Optional link to a task
    public string PaymentType { get; set; } = "cash"; // cash, credit, split
    public decimal? CashAmount { get; set; } // For split payments
    public string? Notes { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}

public class DriverOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public int ItemCount { get; set; }
}

public class OrderItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string UnitType { get; set; } = "piece"; // piece or box
    public decimal UnitPrice { get; set; } // Price at time of sale
    public decimal Discount { get; set; } // Discount amount per unit
}

public class DriverCollectionDto
{
    public int Id { get; set; }
    public string CollectionNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public DateTime CollectionDate { get; set; }
    public string? Notes { get; set; }
}

public class CreateDriverCollectionDto
{
    public int CustomerId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentType { get; set; }
    public string? CheckNumber { get; set; }
    public DateTime? CheckDate { get; set; }
    public string? BankName { get; set; }
    public string? Notes { get; set; }
}

public class DriverDepositDto
{
    public int Id { get; set; }
    public string DepositNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string DepositType { get; set; } = string.Empty;
    public DateTime DepositDate { get; set; }
    public string? BankName { get; set; }
    public string? SlipNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class CreateDriverDepositDto
{
    public decimal Amount { get; set; }
    public string? DepositType { get; set; }
    public string? BankName { get; set; }
    public string? SlipNumber { get; set; }
    public string? Notes { get; set; }
}

public class ShiftSummaryDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int PendingTasks { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashSales { get; set; }
    public decimal CreditSales { get; set; }
    public decimal TotalCollections { get; set; }
    public decimal CashCollections { get; set; }
    public decimal CheckCollections { get; set; }
    public decimal TotalDeposits { get; set; }
    public decimal CashInHand { get; set; }
}

public class DriverShiftDto
{
    public int Id { get; set; }
    public DateTime ShiftDate { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? VanId { get; set; }
    public string? VanName { get; set; }
    public decimal StartCash { get; set; }
    public decimal EndCash { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCollections { get; set; }
    public decimal TotalDeposits { get; set; }
    public int CustomersVisited { get; set; }
    public int CustomersSkipped { get; set; }
    public int OrdersCount { get; set; }
    public string Status { get; set; } = "active";
    public bool HasActiveShift { get; set; }
}

public class StartShiftDto
{
    public decimal? StartCash { get; set; }  // Optional, defaults to van's current cash
    public string? Notes { get; set; }
}

public class EndShiftDto
{
    public string? Notes { get; set; }
}

public class TaskCustomerDetailDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal Balance { get; set; }
    public int VisitOrder { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? VisitedAt { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTaskCustomerStatusDto
{
    public string Status { get; set; } = "visited"; // visited, skipped, pending
    public string? Notes { get; set; }
}

public class DriverReturnDto
{
    public int Id { get; set; }
    public string ReturnNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pending";
    public int ItemCount { get; set; }
    public DateTime ReturnDate { get; set; }
}

public class CreateDriverReturnDto
{
    public int? OrderId { get; set; }
    public int CustomerId { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public List<DriverReturnItemDto> Items { get; set; } = new();
}

public class DriverReturnItemDto
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Reason { get; set; }
}

public class DriverLeadDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string Status { get; set; } = "new";
    public DateTime CreatedAt { get; set; }
}

public class CaptureLeadDto
{
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Area { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string? BusinessType { get; set; }
    public string? EstimatedPotential { get; set; }
    public string? Notes { get; set; }
}

public class ProofOfDeliveryDto
{
    public string Url { get; set; } = string.Empty;
}

#endregion
