using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _context;

    public TasksController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId,
        [FromQuery] int? driverId,
        [FromQuery] int? salesmanId,
        [FromQuery] int? vanId,
        [FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var query = _context.Tasks
            .Include(t => t.Customer)
            .Include(t => t.Driver)
            .Include(t => t.Salesman)
            .Include(t => t.Van)
            .Include(t => t.Warehouse)
            .Include(t => t.Supplier)
            .Include(t => t.Items)
                .ThenInclude(i => i.Product)
            .Include(t => t.TaskCustomers)
                .ThenInclude(tc => tc.Customer)
            .Where(t => t.CompanyId == companyId);

        if (date.HasValue)
            query = query.Where(t => t.ScheduledDate.Date == date.Value.Date);
        
        if (startDate.HasValue)
            query = query.Where(t => t.ScheduledDate.Date >= startDate.Value.Date);
        
        if (endDate.HasValue)
            query = query.Where(t => t.ScheduledDate.Date <= endDate.Value.Date);

        if (customerId.HasValue)
            query = query.Where(t => t.CustomerId == customerId);

        if (driverId.HasValue)
            query = query.Where(t => t.DriverId == driverId);

        if (salesmanId.HasValue)
            query = query.Where(t => t.SalesmanId == salesmanId);

        if (vanId.HasValue)
            query = query.Where(t => t.VanId == vanId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);

        var tasks = await query.OrderByDescending(t => t.ScheduledDate).ToListAsync();

        return tasks.Select(t => new TaskDto
        {
            Id = t.Id,
            TaskNumber = t.TaskNumber,
            Type = t.Type,
            CustomerId = t.CustomerId,
            CustomerName = t.Customer?.Name,
            DriverId = t.DriverId,
            DriverName = t.Driver?.Name,
            SalesmanId = t.SalesmanId,
            SalesmanName = t.Salesman?.Name,
            SupplierId = t.SupplierId,
            SupplierName = t.Supplier?.Name,
            VanId = t.VanId,
            VanName = t.Van?.Name,
            WarehouseId = t.WarehouseId,
            WarehouseName = t.Warehouse?.Name,
            ScheduledDate = t.ScheduledDate,
            Status = t.Status,
            Notes = t.Notes,
            Subtotal = t.Subtotal,
            Discount = t.Discount,
            ExtraCharge = t.ExtraCharge,
            Tax = t.Tax,
            Total = t.Total,
            PaidAmount = t.PaidAmount,
            DebtAmount = t.DebtAmount,
            PaymentType = t.PaymentType,
            Items = t.Items.Select(i => new TaskItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId ?? 0,
                ProductName = i.ProductName ?? i.Product?.Name ?? "(Deleted)",
                UnitType = i.UnitType,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DefaultPrice = i.UnitType == "Box" ? (i.Product?.BoxRetailPrice ?? i.Product?.RetailPrice ?? 0) : (i.Product?.RetailPrice ?? 0),
                DiscountPercent = i.DiscountPercent,
                Total = i.Total,
                CostPrice = i.CostPrice > 0 ? i.CostPrice : (i.Product?.CostPrice ?? 0)
            }).ToList(),
            Customers = t.TaskCustomers.OrderBy(tc => tc.VisitOrder).Select(tc => new TaskCustomerDto
            {
                Id = tc.Id,
                CustomerId = tc.CustomerId,
                CustomerName = tc.Customer?.Name ?? "",
                ShopName = tc.Customer?.ShopName,
                Phone = tc.Customer?.Phone,
                Address = tc.Customer?.Address,
                VisitOrder = tc.VisitOrder,
                Status = tc.Status,
                VisitedAt = tc.VisitedAt,
                Notes = tc.Notes
            }).ToList(),
            CreatedAt = t.CreatedAt,
            ProofOfDeliveryUrl = t.ProofOfDeliveryUrl
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var companyId = GetCompanyId();
        var t = await _context.Tasks
            .Include(t => t.Customer)
            .Include(t => t.Driver)
            .Include(t => t.Salesman)
            .Include(t => t.Van)
            .Include(t => t.Warehouse)
            .Include(t => t.Supplier)
            .Include(t => t.Items)
                .ThenInclude(i => i.Product)
            .Include(t => t.TaskCustomers)
                .ThenInclude(tc => tc.Customer)
            .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId);

        if (t == null) return NotFound();

        return new TaskDto
        {
            Id = t.Id,
            TaskNumber = t.TaskNumber,
            Type = t.Type,
            CustomerId = t.CustomerId,
            CustomerName = t.Customer?.Name,
            DriverId = t.DriverId,
            DriverName = t.Driver?.Name,
            SalesmanId = t.SalesmanId,
            SalesmanName = t.Salesman?.Name,
            SupplierId = t.SupplierId,
            SupplierName = t.Supplier?.Name,
            VanId = t.VanId,
            VanName = t.Van?.Name,
            WarehouseId = t.WarehouseId,
            WarehouseName = t.Warehouse?.Name,
            ScheduledDate = t.ScheduledDate,
            Status = t.Status,
            Notes = t.Notes,
            Subtotal = t.Subtotal,
            Discount = t.Discount,
            ExtraCharge = t.ExtraCharge,
            Tax = t.Tax,
            Total = t.Total,
            PaidAmount = t.PaidAmount,
            DebtAmount = t.DebtAmount,
            PaymentType = t.PaymentType,
            Items = t.Items.Select(i => new TaskItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId ?? 0,
                ProductName = i.ProductName ?? i.Product?.Name ?? "(Deleted)",
                UnitType = i.UnitType,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DefaultPrice = i.UnitType == "Box" ? (i.Product?.BoxRetailPrice ?? i.Product?.RetailPrice ?? 0) : (i.Product?.RetailPrice ?? 0),
                DiscountPercent = i.DiscountPercent,
                Total = i.Total,
                CostPrice = i.CostPrice > 0 ? i.CostPrice : (i.Product?.CostPrice ?? 0)
            }).ToList(),
            Customers = t.TaskCustomers.OrderBy(tc => tc.VisitOrder).Select(tc => new TaskCustomerDto
            {
                Id = tc.Id,
                CustomerId = tc.CustomerId,
                CustomerName = tc.Customer?.Name ?? "",
                ShopName = tc.Customer?.ShopName,
                Phone = tc.Customer?.Phone,
                Address = tc.Customer?.Address,
                VisitOrder = tc.VisitOrder,
                Status = tc.Status,
                VisitedAt = tc.VisitedAt,
                Notes = tc.Notes
            }).ToList(),
            CreatedAt = t.CreatedAt,
            ProofOfDeliveryUrl = t.ProofOfDeliveryUrl
        };
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskDto dto)
    {
        var companyId = GetCompanyId();

        // Validate items - filter out invalid ones
        var validItems = dto.Items.Where(i => i.ProductId > 0 && i.Quantity > 0).ToList();
        
        // Generate task number with date prefix to avoid duplicates
        var today = TimeZoneHelper.Now.ToString("yyyyMMdd");
        var prefix = $"TASK-{today}-";
        
        var maxTaskNum = await _context.Tasks
            .Where(t => t.CompanyId == companyId && t.TaskNumber.StartsWith(prefix))
            .Select(t => t.TaskNumber)
            .ToListAsync();
        
        int nextNum = 1;
        if (maxTaskNum.Any())
        {
            var maxNum = maxTaskNum
                .Select(n => int.TryParse(n.Replace(prefix, ""), out int num) ? num : 0)
                .Max();
            nextNum = maxNum + 1;
        }
        var taskNumber = $"{prefix}{nextNum.ToString().PadLeft(3, '0')}";

        var task = new Models.Task
        {
            CompanyId = companyId,
            TaskNumber = taskNumber,
            Type = dto.Type,
            CustomerId = dto.CustomerId,
            DriverId = dto.DriverId,
            SalesmanId = dto.SalesmanId,
            SupplierId = dto.SupplierId,
            VanId = dto.VanId,
            WarehouseId = dto.WarehouseId,
            ScheduledDate = dto.ScheduledDate,
            Status = "Pending",
            Notes = dto.Notes,
            ExtraCharge = dto.ExtraCharge
        };

        // Add items and calculate totals
        decimal subtotal = 0;
        foreach (var item in validItems)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            var itemTotal = item.Quantity * item.UnitPrice * (1 - item.DiscountPercent / 100);
            subtotal += itemTotal;

            task.Items.Add(new Models.TaskItem
            {
                ProductId = item.ProductId,
                ProductName = product?.Name,
                ProductSku = product?.Sku,
                ProductBarcode = product?.Barcode,
                UnitType = item.UnitType,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountPercent = item.DiscountPercent,
                Total = itemTotal
            });
        }

        task.Subtotal = subtotal;
        task.Discount = dto.Discount;
        task.Tax = dto.Tax;
        task.Total = subtotal - dto.Discount + dto.Tax + task.ExtraCharge;

        try
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { error = "Failed to create task", details = innerMessage });
        }

        // Add task customers (multi-customer support)
        if (dto.Customers.Any())
        {
            foreach (var cust in dto.Customers)
            {
                _context.TaskCustomers.Add(new Models.TaskCustomer
                {
                    TaskId = task.Id,
                    CustomerId = cust.CustomerId,
                    VisitOrder = cust.VisitOrder,
                    Status = "pending"
                });
            }
            await _context.SaveChangesAsync();
        }
        // If single customer provided but no Customers list, add to task_customers too
        else if (dto.CustomerId.HasValue)
        {
            _context.TaskCustomers.Add(new Models.TaskCustomer
            {
                TaskId = task.Id,
                CustomerId = dto.CustomerId.Value,
                VisitOrder = 0,
                Status = "pending"
            });
            await _context.SaveChangesAsync();
        }

        // Move inventory: Warehouse -> Van for each item (only if both are specified and items exist)
        if (dto.WarehouseId.HasValue && dto.VanId.HasValue && validItems.Any())
        {
            try
            {
                foreach (var item in validItems)
                {
                    // Get product to check units
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null) continue;

                    // Calculate actual quantity (handle box units)
                    decimal actualQty = item.Quantity;
                    if (item.UnitType == "Box" && product.UnitsPerSecond > 0)
                    {
                        actualQty = item.Quantity * product.UnitsPerSecond;
                    }

                    // Deduct from warehouse inventory
                    var warehouseInv = await _context.Inventories
                        .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && 
                                                 i.WarehouseId == dto.WarehouseId.Value &&
                                                 i.CompanyId == companyId);
                    if (warehouseInv != null)
                    {
                        warehouseInv.Quantity -= actualQty;
                        warehouseInv.UpdatedAt = TimeZoneHelper.Now;
                    }

                    // Log inventory movement (out of warehouse)
                    _context.InventoryMovements.Add(new Models.InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = item.ProductId,
                        WarehouseId = dto.WarehouseId,
                        MovementType = "task_allocation",
                        Quantity = -actualQty,
                        ReferenceType = "task",
                        ReferenceId = task.Id,
                        Notes = $"Allocated for Task: {task.TaskNumber}",
                        CreatedAt = TimeZoneHelper.Now
                    });
                    
                    // Log inventory movement (into van) for tracking loads
                    _context.InventoryMovements.Add(new Models.InventoryMovement
                    {
                        CompanyId = companyId,
                        ProductId = item.ProductId,
                        WarehouseId = dto.WarehouseId,
                        VanId = dto.VanId,
                        MovementType = "load_van",
                        Quantity = actualQty,
                        ReferenceType = "task",
                        ReferenceId = task.Id,
                        Notes = $"Loaded for Task: {task.TaskNumber}",
                        CreatedAt = TimeZoneHelper.Now
                    });

                    // Add to van inventory
                    var vanInv = await _context.VanInventories
                        .FirstOrDefaultAsync(vi => vi.ProductId == item.ProductId && 
                                                  vi.VanId == dto.VanId.Value &&
                                                  vi.CompanyId == companyId);
                    if (vanInv != null)
                    {
                        vanInv.Quantity += actualQty;
                        vanInv.UpdatedAt = TimeZoneHelper.Now;
                    }
                    else
                    {
                        // Create new van inventory record
                        _context.VanInventories.Add(new Models.VanInventory
                        {
                            CompanyId = companyId,
                            VanId = dto.VanId.Value,
                            ProductId = item.ProductId,
                            Quantity = actualQty,
                            LoadedAt = TimeZoneHelper.Now,
                            UpdatedAt = TimeZoneHelper.Now
                        });
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log but don't fail the task creation if inventory movement fails
                Console.WriteLine($"Warning: Inventory movement failed for task {task.TaskNumber}: {ex.Message}");
            }
        }

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, new TaskDto
        {
            Id = task.Id,
            TaskNumber = task.TaskNumber,
            Type = task.Type,
            Status = task.Status,
            Total = task.Total
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto dto)
    {
        var companyId = GetCompanyId();
        var task = await _context.Tasks
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId);

        if (task == null) return NotFound();

        task.Type = dto.Type;
        task.CustomerId = dto.CustomerId;
        task.DriverId = dto.DriverId;
        task.SupplierId = dto.SupplierId;
        task.VanId = dto.VanId;
        task.WarehouseId = dto.WarehouseId;
        task.ScheduledDate = dto.ScheduledDate;
        task.Notes = dto.Notes;
        task.ExtraCharge = dto.ExtraCharge;
        task.UpdatedAt = TimeZoneHelper.Now;

        // Remove existing items and add new ones
        _context.TaskItems.RemoveRange(task.Items);

        decimal subtotal = 0;
        foreach (var item in dto.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            var itemTotal = item.Quantity * item.UnitPrice * (1 - item.DiscountPercent / 100);
            subtotal += itemTotal;

            task.Items.Add(new Models.TaskItem
            {
                ProductId = item.ProductId,
                ProductName = product?.Name,
                ProductSku = product?.Sku,
                ProductBarcode = product?.Barcode,
                UnitType = item.UnitType,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountPercent = item.DiscountPercent,
                Total = itemTotal
            });
        }

        task.Subtotal = subtotal;
        task.Discount = dto.Discount;
        task.Tax = dto.Tax;
        task.Total = subtotal - dto.Discount + dto.Tax + task.ExtraCharge;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateStatusDto dto)
    {
        var companyId = GetCompanyId();
        var task = await _context.Tasks
            .Include(t => t.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId);

        if (task == null) return NotFound();

        var oldStatus = task.Status;
        task.Status = dto.Status;
        task.UpdatedAt = TimeZoneHelper.Now;

        if (dto.Status == "Started" && !task.StartedAt.HasValue)
            task.StartedAt = TimeZoneHelper.Now;
        else if ((dto.Status == "Completed" || dto.Status == "Delivered") && !task.CompletedAt.HasValue)
        {
            task.CompletedAt = TimeZoneHelper.Now;
            // Commission is calculated in salary summary, not paid automatically
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var companyId = GetCompanyId();
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId);

        if (task == null) return NotFound();

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class TaskDto
{
    public int Id { get; set; }
    public string TaskNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public int? SalesmanId { get; set; }
    public string? SalesmanName { get; set; }
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public int? VanId { get; set; }
    public string? VanName { get; set; }
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal ExtraCharge { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DebtAmount { get; set; }
    public string PaymentType { get; set; } = "cash";
    public List<TaskItemDto> Items { get; set; } = new();
    public List<TaskCustomerDto> Customers { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string? ProofOfDeliveryUrl { get; set; }
}

public class TaskCustomerDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public int VisitOrder { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? VisitedAt { get; set; }
    public string? Notes { get; set; }
}

public class TaskItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string UnitType { get; set; } = "Piece";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DefaultPrice { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Total { get; set; }
    public decimal CostPrice { get; set; }
}

public class CreateTaskDto
{
    public string Type { get; set; } = "Delivery";
    public int? CustomerId { get; set; }  // For single-customer tasks (backward compatible)
    public int? DriverId { get; set; }
    public int? SalesmanId { get; set; }
    public int? SupplierId { get; set; }
    public int? VanId { get; set; }
    public int? WarehouseId { get; set; }
    public DateTime ScheduledDate { get; set; } = TimeZoneHelper.Now;
    public string? Notes { get; set; }
    public decimal Discount { get; set; } = 0;
    public decimal ExtraCharge { get; set; } = 0;
    public decimal Tax { get; set; } = 0;
    public List<CreateTaskItemDto> Items { get; set; } = new();
    public List<CreateTaskCustomerDto> Customers { get; set; } = new();  // For multi-customer tasks
}

public class CreateTaskCustomerDto
{
    public int CustomerId { get; set; }
    public int VisitOrder { get; set; } = 0;
}

public class CreateTaskItemDto
{
    public int ProductId { get; set; }
    public string UnitType { get; set; } = "Piece";
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; } = 0;
}

public class UpdateTaskDto : CreateTaskDto { }

public class UpdateStatusDto
{
    public string Status { get; set; } = string.Empty;
}
