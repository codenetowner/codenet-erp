using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using System.Text.Json;

namespace Catalyst.API.Controllers;

/// <summary>
/// Handles offline sync for the driver mobile app.
/// Drivers can work offline and sync data when they have connectivity.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SyncController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly JsonSerializerOptions _jsonOptions;

    public SyncController(AppDbContext context)
    {
        _context = context;
        _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    private int GetEmployeeId()
    {
        var employeeIdClaim = User.FindFirst("employee_id")?.Value;
        return string.IsNullOrEmpty(employeeIdClaim) ? 0 : int.Parse(employeeIdClaim);
    }

    /// <summary>
    /// Pull all data needed for offline operation.
    /// Called when driver starts their shift or needs to refresh data.
    /// </summary>
    [HttpGet("pull")]
    public async Task<ActionResult<SyncPullResponseDto>> PullData([FromQuery] DateTime? lastSync)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Get driver's assigned van
        var van = await _context.Vans
            .FirstOrDefaultAsync(v => v.CompanyId == companyId && v.AssignedDriverId == employeeId);

        // Get today's tasks for this driver
        var today = TimeZoneHelper.Now.Date;
        var tasks = await _context.Tasks
            .Include(t => t.TaskCustomers)
                .ThenInclude(tc => tc.Customer)
            .Include(t => t.Items)
                .ThenInclude(ti => ti.Product)
            .Where(t => t.CompanyId == companyId && 
                       t.DriverId == employeeId && 
                       t.ScheduledDate.Date == today)
            .ToListAsync();

        // Get customers assigned to this driver
        var customers = await _context.Customers
            .Where(c => c.CompanyId == companyId && 
                       (c.AssignedDriverId == employeeId || c.AssignedDriverId == null) &&
                       c.Status == "active")
            .ToListAsync();

        // Get products (or only changed products if lastSync provided)
        var productsQuery = _context.Products
            .Where(p => p.CompanyId == companyId && p.IsActive);

        if (lastSync.HasValue)
            productsQuery = productsQuery.Where(p => p.UpdatedAt > lastSync.Value);

        var products = await productsQuery.ToListAsync();

        // Get van inventory
        List<VanInventory> vanInventory = new();
        if (van != null)
        {
            vanInventory = await _context.VanInventories
                .Include(vi => vi.Product)
                .Where(vi => vi.VanId == van.Id)
                .ToListAsync();
        }

        // Get current shift
        var shift = await _context.DriverShifts
            .FirstOrDefaultAsync(s => s.CompanyId == companyId && 
                                     s.DriverId == employeeId && 
                                     s.ShiftDate == DateOnly.FromDateTime(today));

        // Calculate current cash from transactions
        decimal calculatedCash = 0;
        if (van != null)
        {
            var taskCash = await _context.Tasks
                .Where(t => t.CompanyId == companyId && t.DriverId == employeeId &&
                           (t.Status == "Completed" || t.Status == "Delivered"))
                .SumAsync(t => t.PaidAmount);
            var posSales = await _context.Orders
                .Where(o => o.CompanyId == companyId && o.DriverId == employeeId)
                .SumAsync(o => o.PaidAmount);
            var collections = await _context.Collections
                .Where(c => c.CompanyId == companyId && c.DriverId == employeeId && c.PaymentType == "cash")
                .SumAsync(c => c.Amount);
            var deposits = await _context.Deposits
                .Where(d => d.CompanyId == companyId && d.DriverId == employeeId && d.Status != "rejected")
                .SumAsync(d => d.Amount);
            calculatedCash = taskCash + posSales + collections - deposits;
        }

        return new SyncPullResponseDto
        {
            SyncedAt = TimeZoneHelper.Now,
            Van = van != null ? new SyncVanDto
            {
                Id = van.Id,
                Name = van.Name,
                PlateNumber = van.PlateNumber,
                CurrentCash = calculatedCash,
                MaxCash = van.MaxCash
            } : null,
            Shift = shift != null ? new SyncShiftDto
            {
                Id = shift.Id,
                Status = shift.Status,
                StartTime = shift.StartTime,
                StartCash = shift.StartCash
            } : null,
            Tasks = tasks.Select(t => new SyncTaskDto
            {
                Id = t.Id,
                TaskNumber = t.TaskNumber ?? "",
                ScheduledDate = t.ScheduledDate,
                Status = t.Status,
                Notes = t.Notes,
                Customers = t.TaskCustomers.Select(tc => new SyncTaskCustomerDto
                {
                    Id = tc.Id,
                    CustomerId = tc.CustomerId,
                    CustomerName = tc.Customer.Name,
                    ShopName = tc.Customer.ShopName,
                    Phone = tc.Customer.Phone,
                    Address = tc.Customer.Address,
                    Balance = tc.Customer.DebtBalance,
                    VisitOrder = tc.VisitOrder,
                    Status = tc.Status
                }).ToList()
            }).ToList(),
            Customers = customers.Select(c => new SyncCustomerDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                ShopName = c.ShopName,
                Phone = c.Phone,
                Address = c.Address,
                LocationLat = c.LocationLat,
                LocationLng = c.LocationLng,
                CustomerType = c.CustomerType,
                CreditLimit = c.CreditLimit,
                DebtBalance = c.DebtBalance
            }).ToList(),
            Products = products.Select(p => new SyncProductDto
            {
                Id = p.Id,
                Sku = p.Sku,
                Name = p.Name,
                Barcode = p.Barcode,
                BoxBarcode = p.BoxBarcode,
                BaseUnit = p.BaseUnit,
                SecondUnit = p.SecondUnit,
                UnitsPerSecond = p.UnitsPerSecond,
                RetailPrice = p.RetailPrice,
                WholesalePrice = p.WholesalePrice,
                BoxRetailPrice = p.BoxRetailPrice,
                BoxWholesalePrice = p.BoxWholesalePrice,
                ImageUrl = p.ImageUrl
            }).ToList(),
            Inventory = vanInventory.Select(vi => new SyncInventoryDto
            {
                ProductId = vi.ProductId,
                ProductName = vi.Product.Name,
                Quantity = vi.Quantity
            }).ToList()
        };
    }

    /// <summary>
    /// Push offline changes to the server.
    /// Processes queued operations created while offline.
    /// </summary>
    [HttpPost("push")]
    public async Task<ActionResult<SyncPushResponseDto>> PushData([FromBody] SyncPushRequestDto request)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var results = new List<SyncResultDto>();

        foreach (var item in request.Items)
        {
            var result = new SyncResultDto
            {
                ClientId = item.ClientId,
                EntityType = item.EntityType,
                Success = false
            };

            try
            {
                switch (item.EntityType.ToLower())
                {
                    case "order":
                        result = await ProcessOrderSync(companyId, employeeId, item);
                        break;
                    case "collection":
                        result = await ProcessCollectionSync(companyId, employeeId, item);
                        break;
                    case "return":
                        result = await ProcessReturnSync(companyId, employeeId, item);
                        break;
                    case "lead":
                        result = await ProcessLeadSync(companyId, employeeId, item);
                        break;
                    case "task_customer":
                        result = await ProcessTaskCustomerSync(companyId, item);
                        break;
                    default:
                        result.Error = $"Unknown entity type: {item.EntityType}";
                        break;
                }
            }
            catch (Exception ex)
            {
                result.Error = ex.Message;
                
                // Log to sync queue for retry
                _context.SyncQueue.Add(new SyncQueue
                {
                    CompanyId = companyId,
                    DriverId = employeeId,
                    EntityType = item.EntityType,
                    Action = item.Action,
                    Payload = JsonSerializer.Serialize(item.Data, _jsonOptions),
                    SyncStatus = "failed",
                    ErrorMessage = ex.Message,
                    CreatedAt = TimeZoneHelper.Now
                });
            }

            results.Add(result);
        }

        await _context.SaveChangesAsync();

        return new SyncPushResponseDto
        {
            SyncedAt = TimeZoneHelper.Now,
            Results = results,
            SuccessCount = results.Count(r => r.Success),
            FailedCount = results.Count(r => !r.Success)
        };
    }

    private async Task<SyncResultDto> ProcessOrderSync(int companyId, int employeeId, SyncItemDto item)
    {
        var result = new SyncResultDto { ClientId = item.ClientId, EntityType = "order" };
        var data = JsonSerializer.Deserialize<SyncOrderData>(
            JsonSerializer.Serialize(item.Data), _jsonOptions);

        if (data == null)
        {
            result.Error = "Invalid order data";
            return result;
        }

        // Get van
        var van = await _context.Vans
            .FirstOrDefaultAsync(v => v.CompanyId == companyId && v.AssignedDriverId == employeeId);

        // Generate order number
        var today = TimeZoneHelper.Now;
        var prefix = $"ORD-{today:yyyyMMdd}";
        var lastOrder = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.OrderNumber.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastOrder != null)
        {
            var parts = lastOrder.OrderNumber.Split('-');
            if (parts.Length > 2 && int.TryParse(parts[2], out int lastSeq))
                sequence = lastSeq + 1;
        }

        var order = new Order
        {
            CompanyId = companyId,
            OrderNumber = $"{prefix}-{sequence:D4}",
            CustomerId = data.CustomerId,
            DriverId = employeeId,
            VanId = van?.Id,
            TaskId = data.TaskId,
            OrderDate = data.OrderDate ?? TimeZoneHelper.Now,
            TotalAmount = data.TotalAmount,
            PaidAmount = data.PaidAmount,
            PaymentStatus = data.PaidAmount >= data.TotalAmount ? "paid" : (data.PaidAmount > 0 ? "partial" : "unpaid"),
            OrderStatus = "completed",
            Notes = data.Notes,
            CreatedAt = TimeZoneHelper.Now
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Add order items
        foreach (var itemData in data.Items)
        {
            var product = await _context.Products.FindAsync(itemData.ProductId);
            _context.OrderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                ProductId = itemData.ProductId,
                ProductName = product?.Name,
                ProductSku = product?.Sku,
                ProductBarcode = product?.Barcode,
                Quantity = itemData.Quantity,
                UnitType = itemData.UnitType,
                UnitPrice = itemData.UnitPrice,
                Total = itemData.Quantity * itemData.UnitPrice
            });

            // Deduct from van inventory
            if (van != null)
            {
                var inv = await _context.VanInventories
                    .FirstOrDefaultAsync(vi => vi.VanId == van.Id && vi.ProductId == itemData.ProductId);
                if (inv != null)
                {
                    inv.Quantity -= itemData.Quantity;
                    inv.UpdatedAt = TimeZoneHelper.Now;
                }
            }
        }

        // Update customer debt
        var customer = await _context.Customers.FindAsync(data.CustomerId);
        if (customer != null)
        {
            customer.DebtBalance += (data.TotalAmount - data.PaidAmount);
        }

        // Note: Van cash is now calculated dynamically from transactions, no need to update here

        await _context.SaveChangesAsync();

        result.Success = true;
        result.ServerId = order.Id;
        result.ServerRef = order.OrderNumber;
        return result;
    }

    private async Task<SyncResultDto> ProcessCollectionSync(int companyId, int employeeId, SyncItemDto item)
    {
        var result = new SyncResultDto { ClientId = item.ClientId, EntityType = "collection" };
        var data = JsonSerializer.Deserialize<SyncCollectionData>(
            JsonSerializer.Serialize(item.Data), _jsonOptions);

        if (data == null)
        {
            result.Error = "Invalid collection data";
            return result;
        }

        var van = await _context.Vans
            .FirstOrDefaultAsync(v => v.CompanyId == companyId && v.AssignedDriverId == employeeId);

        // Generate collection number
        var today = TimeZoneHelper.Now;
        var prefix = $"COL-{today:yyyyMMdd}";
        var lastCollection = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.CollectionNumber != null && c.CollectionNumber.StartsWith(prefix))
            .OrderByDescending(c => c.CollectionNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastCollection?.CollectionNumber != null)
        {
            var parts = lastCollection.CollectionNumber.Split('-');
            if (parts.Length > 2 && int.TryParse(parts[2], out int lastSeq))
                sequence = lastSeq + 1;
        }

        var collection = new Collection
        {
            CompanyId = companyId,
            CollectionNumber = $"{prefix}-{sequence:D4}",
            CustomerId = data.CustomerId,
            DriverId = employeeId,
            Amount = data.Amount,
            PaymentType = data.PaymentType ?? "cash",
            CollectionDate = data.CollectionDate ?? TimeZoneHelper.Now,
            Notes = data.Notes,
            CreatedAt = TimeZoneHelper.Now
        };

        _context.Collections.Add(collection);

        // Update customer balance
        var customer = await _context.Customers.FindAsync(data.CustomerId);
        if (customer != null)
        {
            customer.DebtBalance -= data.Amount;
        }

        // Note: Van cash is now calculated dynamically from transactions, no need to update here

        await _context.SaveChangesAsync();

        result.Success = true;
        result.ServerId = collection.Id;
        result.ServerRef = collection.CollectionNumber;
        return result;
    }

    private async Task<SyncResultDto> ProcessReturnSync(int companyId, int employeeId, SyncItemDto item)
    {
        var result = new SyncResultDto { ClientId = item.ClientId, EntityType = "return" };
        var data = JsonSerializer.Deserialize<SyncReturnData>(
            JsonSerializer.Serialize(item.Data), _jsonOptions);

        if (data == null)
        {
            result.Error = "Invalid return data";
            return result;
        }

        var today = TimeZoneHelper.Now;
        var prefix = $"RET-{today:yyyyMMdd}";
        var lastReturn = await _context.Returns
            .Where(r => r.CompanyId == companyId && r.ReturnNumber.StartsWith(prefix))
            .OrderByDescending(r => r.ReturnNumber)
            .FirstOrDefaultAsync();

        int sequence = 1;
        if (lastReturn != null)
        {
            var parts = lastReturn.ReturnNumber.Split('-');
            if (parts.Length > 2 && int.TryParse(parts[2], out int lastSeq))
                sequence = lastSeq + 1;
        }

        var ret = new Return
        {
            CompanyId = companyId,
            ReturnNumber = $"{prefix}-{sequence:D3}",
            CustomerId = data.CustomerId,
            DriverId = employeeId,
            ReturnDate = DateOnly.FromDateTime(TimeZoneHelper.Now),
            Reason = data.Reason,
            Status = "pending",
            Notes = data.Notes,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Returns.Add(ret);
        await _context.SaveChangesAsync();

        decimal totalAmount = 0;
        foreach (var itemData in data.Items)
        {
            var lineTotal = itemData.Quantity * itemData.UnitPrice;
            totalAmount += lineTotal;

            _context.ReturnItems.Add(new ReturnItem
            {
                ReturnId = ret.Id,
                ProductId = itemData.ProductId,
                Quantity = itemData.Quantity,
                UnitPrice = itemData.UnitPrice,
                LineTotal = lineTotal,
                Reason = itemData.Reason
            });
        }

        ret.TotalAmount = totalAmount;
        await _context.SaveChangesAsync();

        result.Success = true;
        result.ServerId = ret.Id;
        result.ServerRef = ret.ReturnNumber;
        return result;
    }

    private async Task<SyncResultDto> ProcessLeadSync(int companyId, int employeeId, SyncItemDto item)
    {
        var result = new SyncResultDto { ClientId = item.ClientId, EntityType = "lead" };
        var data = JsonSerializer.Deserialize<SyncLeadData>(
            JsonSerializer.Serialize(item.Data), _jsonOptions);

        if (data == null)
        {
            result.Error = "Invalid lead data";
            return result;
        }

        var lead = new Lead
        {
            CompanyId = companyId,
            Name = data.Name,
            ShopName = data.ShopName,
            Phone = data.Phone,
            Address = data.Address,
            City = data.City,
            Area = data.Area,
            LocationLat = data.LocationLat,
            LocationLng = data.LocationLng,
            BusinessType = data.BusinessType,
            Notes = data.Notes,
            Status = "new",
            CapturedBy = employeeId,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.Leads.Add(lead);
        await _context.SaveChangesAsync();

        result.Success = true;
        result.ServerId = lead.Id;
        return result;
    }

    private async Task<SyncResultDto> ProcessTaskCustomerSync(int companyId, SyncItemDto item)
    {
        var result = new SyncResultDto { ClientId = item.ClientId, EntityType = "task_customer" };
        var data = JsonSerializer.Deserialize<SyncTaskCustomerData>(
            JsonSerializer.Serialize(item.Data), _jsonOptions);

        if (data == null)
        {
            result.Error = "Invalid task customer data";
            return result;
        }

        var taskCustomer = await _context.TaskCustomers
            .FirstOrDefaultAsync(tc => tc.Id == data.Id);

        if (taskCustomer != null)
        {
            taskCustomer.Status = data.Status;
            taskCustomer.VisitedAt = data.VisitedAt;
            taskCustomer.Notes = data.Notes;
            await _context.SaveChangesAsync();
            result.Success = true;
            result.ServerId = taskCustomer.Id;
        }
        else
        {
            result.Error = "Task customer not found";
        }

        return result;
    }

    /// <summary>
    /// Get pending sync items for retry
    /// </summary>
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<SyncQueueDto>>> GetPendingItems()
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        var items = await _context.SyncQueue
            .Where(s => s.CompanyId == companyId && 
                       s.DriverId == employeeId && 
                       s.SyncStatus == "pending")
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

        return items.Select(s => new SyncQueueDto
        {
            Id = s.Id,
            EntityType = s.EntityType,
            Action = s.Action,
            RetryCount = s.RetryCount,
            CreatedAt = s.CreatedAt
        }).ToList();
    }
}

#region DTOs

public class SyncPullResponseDto
{
    public DateTime SyncedAt { get; set; }
    public SyncVanDto? Van { get; set; }
    public SyncShiftDto? Shift { get; set; }
    public List<SyncTaskDto> Tasks { get; set; } = new();
    public List<SyncCustomerDto> Customers { get; set; } = new();
    public List<SyncProductDto> Products { get; set; } = new();
    public List<SyncInventoryDto> Inventory { get; set; } = new();
}

public class SyncVanDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PlateNumber { get; set; }
    public decimal CurrentCash { get; set; }
    public decimal MaxCash { get; set; }
}

public class SyncShiftDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public decimal StartCash { get; set; }
}

public class SyncTaskDto
{
    public int Id { get; set; }
    public string TaskNumber { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<SyncTaskCustomerDto> Customers { get; set; } = new();
}

public class SyncTaskCustomerDto
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
}

public class SyncCustomerDto
{
    public int Id { get; set; }
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public string CustomerType { get; set; } = "Retail";
    public decimal CreditLimit { get; set; }
    public decimal DebtBalance { get; set; }
}

public class SyncProductDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? BoxBarcode { get; set; }
    public string BaseUnit { get; set; } = "Piece";
    public string? SecondUnit { get; set; }
    public int UnitsPerSecond { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal WholesalePrice { get; set; }
    public decimal BoxRetailPrice { get; set; }
    public decimal BoxWholesalePrice { get; set; }
    public string? ImageUrl { get; set; }
}

public class SyncInventoryDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}

public class SyncPushRequestDto
{
    public List<SyncItemDto> Items { get; set; } = new();
}

public class SyncItemDto
{
    public string ClientId { get; set; } = string.Empty; // UUID from client
    public string EntityType { get; set; } = string.Empty;
    public string Action { get; set; } = "create";
    public object Data { get; set; } = new();
}

public class SyncPushResponseDto
{
    public DateTime SyncedAt { get; set; }
    public List<SyncResultDto> Results { get; set; } = new();
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
}

public class SyncResultDto
{
    public string ClientId { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public bool Success { get; set; }
    public int? ServerId { get; set; }
    public string? ServerRef { get; set; }
    public string? Error { get; set; }
}

public class SyncQueueDto
{
    public long Id { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Data models for sync payload
public class SyncOrderData
{
    public int CustomerId { get; set; }
    public int? TaskId { get; set; }
    public DateTime? OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
    public List<SyncOrderItemData> Items { get; set; } = new();
}

public class SyncOrderItemData
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public string UnitType { get; set; } = "piece";
    public decimal UnitPrice { get; set; }
}

public class SyncCollectionData
{
    public int CustomerId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentType { get; set; }
    public DateTime? CollectionDate { get; set; }
    public string? Notes { get; set; }
}

public class SyncReturnData
{
    public int CustomerId { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public List<SyncReturnItemData> Items { get; set; } = new();
}

public class SyncReturnItemData
{
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Reason { get; set; }
}

public class SyncLeadData
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
    public string? Notes { get; set; }
}

public class SyncTaskCustomerData
{
    public int Id { get; set; }
    public string Status { get; set; } = "visited";
    public DateTime? VisitedAt { get; set; }
    public string? Notes { get; set; }
}

#endregion
