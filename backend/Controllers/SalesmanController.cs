using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using System.Security.Claims;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/salesman")]
[Authorize]
public class SalesmanController : ControllerBase
{
    private readonly AppDbContext _context;
    public SalesmanController(AppDbContext context) { _context = context; }
    private int GetEmployeeId() => int.Parse(User.FindFirstValue("EmployeeId") ?? "0");
    private int GetCompanyId() => int.Parse(User.FindFirstValue("CompanyId") ?? "0");

    [HttpGet("dashboard")]
    public async Task<ActionResult<SalesmanDashboardDto>> GetDashboard()
    {
        var employeeId = GetEmployeeId();
        var companyId = GetCompanyId();
        var today = TimeZoneHelper.Now.Date;
        var leadsToday = await _context.Leads.CountAsync(l => l.CompanyId == companyId && l.CapturedBy == employeeId && l.CreatedAt.Date == today);
        var totalLeads = await _context.Leads.CountAsync(l => l.CompanyId == companyId && l.CapturedBy == employeeId);
        var customersToday = await _context.Customers.CountAsync(c => c.CompanyId == companyId && c.CreatedBy == employeeId && c.CreatedAt.Date == today);
        var totalCustomers = await _context.Customers.CountAsync(c => c.CompanyId == companyId && c.CreatedBy == employeeId);
        var visitTasksToday = await _context.Tasks.CountAsync(t => t.CompanyId == companyId && t.SalesmanId == employeeId && t.Type == "Customer Visit" && t.ScheduledDate.Date == today);
        var visitTasksPending = await _context.Tasks.CountAsync(t => t.CompanyId == companyId && t.SalesmanId == employeeId && t.Type == "Customer Visit" && t.Status == "Pending");
        var visitTasksCompleted = await _context.Tasks.CountAsync(t => t.CompanyId == companyId && t.SalesmanId == employeeId && t.Type == "Customer Visit" && t.Status == "Completed");
        var totalVisitTasks = await _context.Tasks.CountAsync(t => t.CompanyId == companyId && t.SalesmanId == employeeId && t.Type == "Customer Visit");
        return new SalesmanDashboardDto { LeadsToday = leadsToday, TotalLeads = totalLeads, CustomersToday = customersToday, TotalCustomers = totalCustomers, VisitTasksToday = visitTasksToday, VisitTasksPending = visitTasksPending, VisitTasksCompleted = visitTasksCompleted, TotalVisitTasks = totalVisitTasks };
    }

    [HttpGet("products")]
    public async Task<ActionResult<List<SalesmanProductDto>>> GetProducts([FromQuery] string? search, [FromQuery] int? categoryId)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Check if employee has product restrictions
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
        var restrictProducts = employee?.RestrictProducts ?? false;

        var query = _context.Products.Include(p => p.Category).Where(p => p.CompanyId == companyId && p.IsActive);

        // Apply visibility filter if restrictions are enabled
        if (restrictProducts)
        {
            var allowedProductIds = await _context.EmployeeProducts
                .Where(ep => ep.EmployeeId == employeeId)
                .Select(ep => ep.ProductId)
                .ToListAsync();
            query = query.Where(p => allowedProductIds.Contains(p.Id));
        }

        if (!string.IsNullOrEmpty(search)) query = query.Where(p => p.Name.ToLower().Contains(search.ToLower()) || (p.Barcode != null && p.Barcode.ToLower().Contains(search.ToLower())));
        if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId);
        var products = await query.OrderBy(p => p.Name).ToListAsync();
        return products.Select(p => new SalesmanProductDto { Id = p.Id, Name = p.Name, Sku = p.Sku, Barcode = p.Barcode, CategoryId = p.CategoryId, CategoryName = p.Category?.Name, SalePrice = p.RetailPrice, WholesalePrice = p.WholesalePrice, ImageUrl = p.ImageUrl, Description = p.Description, PiecesPerBox = p.UnitsPerSecond, SecondUnit = p.SecondUnit ?? "Box", BoxPrice = p.BoxRetailPrice }).ToList();
    }

    [HttpGet("products/{id}")]
    public async Task<ActionResult<SalesmanProductDto>> GetProduct(int id)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        
        // Check if employee has product restrictions
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
        if (employee?.RestrictProducts == true)
        {
            var isAllowed = await _context.EmployeeProducts.AnyAsync(ep => ep.EmployeeId == employeeId && ep.ProductId == id);
            if (!isAllowed) return NotFound();
        }
        
        var p = await _context.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId && p.IsActive);
        if (p == null) return NotFound();
        return new SalesmanProductDto { Id = p.Id, Name = p.Name, Sku = p.Sku, Barcode = p.Barcode, CategoryId = p.CategoryId, CategoryName = p.Category?.Name, SalePrice = p.RetailPrice, WholesalePrice = p.WholesalePrice, ImageUrl = p.ImageUrl, Description = p.Description, PiecesPerBox = p.UnitsPerSecond, SecondUnit = p.SecondUnit ?? "Box", BoxPrice = p.BoxRetailPrice };
    }

    [HttpGet("categories")]
    public async Task<ActionResult<List<SalesmanCategoryDto>>> GetCategories()
    {
        var companyId = GetCompanyId();
        var categories = await _context.ProductCategories.Where(c => c.CompanyId == companyId).OrderBy(c => c.Name).ToListAsync();
        return categories.Select(c => new SalesmanCategoryDto { Id = c.Id, Name = c.Name, Description = c.Description }).ToList();
    }

    [HttpGet("customers")]
    public async Task<ActionResult<List<SalesmanCustomerDto>>> GetCustomers([FromQuery] string? search)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Check if employee has customer restrictions
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
        var restrictCustomers = employee?.RestrictCustomers ?? false;

        var query = _context.Customers.Where(c => c.CompanyId == companyId);

        // Apply visibility filter if restrictions are enabled
        if (restrictCustomers)
        {
            var allowedCustomerIds = await _context.EmployeeCustomers
                .Where(ec => ec.EmployeeId == employeeId)
                .Select(ec => ec.CustomerId)
                .ToListAsync();
            query = query.Where(c => allowedCustomerIds.Contains(c.Id));
        }

        if (!string.IsNullOrEmpty(search)) query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()) || (c.Phone != null && c.Phone.Contains(search)));
        var customers = await query.OrderBy(c => c.Name).Take(100).ToListAsync();
        return customers.Select(c => new SalesmanCustomerDto { Id = c.Id, Name = c.Name, Code = c.Code, Phone = c.Phone, Email = c.Email, Address = c.Address, CustomerType = c.CustomerType, CreditLimit = c.CreditLimit, DebtBalance = c.DebtBalance, Latitude = c.LocationLat.HasValue ? (double)c.LocationLat.Value : null, Longitude = c.LocationLng.HasValue ? (double)c.LocationLng.Value : null, Notes = c.Notes }).ToList();
    }

    [HttpGet("customers/{id}")]
    public async Task<ActionResult<SalesmanCustomerDto>> GetCustomer(int id)
    {
        var companyId = GetCompanyId();
        var c = await _context.Customers.FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);
        if (c == null) return NotFound();
        return new SalesmanCustomerDto { Id = c.Id, Name = c.Name, Code = c.Code, Phone = c.Phone, Email = c.Email, Address = c.Address, CustomerType = c.CustomerType, CreditLimit = c.CreditLimit, DebtBalance = c.DebtBalance, Latitude = c.LocationLat.HasValue ? (double)c.LocationLat.Value : null, Longitude = c.LocationLng.HasValue ? (double)c.LocationLng.Value : null, Notes = c.Notes };
    }

    [HttpPost("customers")]
    public async Task<ActionResult<SalesmanCustomerDto>> CreateCustomer([FromBody] SalesmanCreateCustomerDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var count = await _context.Customers.CountAsync(c => c.CompanyId == companyId);
        var code = string.Format("CUST-{0}", (count + 1).ToString().PadLeft(4, '0'));
        var customer = new Customer { CompanyId = companyId, Code = code, Name = dto.Name, Phone = dto.Phone, Email = dto.Email, Address = dto.Address, CustomerType = dto.CustomerType ?? "Retail", CreditLimit = dto.CreditLimit ?? 0, LocationLat = dto.Latitude.HasValue ? (decimal)dto.Latitude.Value : null, LocationLng = dto.Longitude.HasValue ? (decimal)dto.Longitude.Value : null, Notes = dto.Notes, CreatedBy = employeeId, CreatedAt = TimeZoneHelper.Now, UpdatedAt = TimeZoneHelper.Now };
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        
        // Auto-add visibility: the creating employee can see this customer
        _context.EmployeeCustomers.Add(new EmployeeCustomer { EmployeeId = employeeId, CustomerId = customer.Id, CreatedAt = TimeZoneHelper.Now });
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new SalesmanCustomerDto { Id = customer.Id, Name = customer.Name, Code = customer.Code, Phone = customer.Phone, Email = customer.Email, Address = customer.Address, CustomerType = customer.CustomerType, CreditLimit = customer.CreditLimit, DebtBalance = customer.DebtBalance, Latitude = customer.LocationLat.HasValue ? (double)customer.LocationLat.Value : null, Longitude = customer.LocationLng.HasValue ? (double)customer.LocationLng.Value : null, Notes = customer.Notes });
    }

    [HttpGet("leads")]
    public async Task<ActionResult<List<SalesmanLeadDto>>> GetLeads([FromQuery] string? status)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var query = _context.Leads.Where(l => l.CompanyId == companyId && l.CapturedBy == employeeId);
        if (!string.IsNullOrEmpty(status)) query = query.Where(l => l.Status == status);
        var leads = await query.OrderByDescending(l => l.CreatedAt).Take(100).ToListAsync();
        return leads.Select(l => new SalesmanLeadDto { Id = l.Id, BusinessName = l.Name, ContactName = l.ShopName, Phone = l.Phone, Email = l.Email, Address = l.Address, City = l.City, BusinessType = l.BusinessType, Status = l.Status, Notes = l.Notes, Latitude = l.LocationLat.HasValue ? (double)l.LocationLat.Value : null, Longitude = l.LocationLng.HasValue ? (double)l.LocationLng.Value : null, CreatedAt = l.CreatedAt }).ToList();
    }

    [HttpPost("leads")]
    public async Task<ActionResult<SalesmanLeadDto>> CreateLead([FromBody] SalesmanCreateLeadDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var lead = new Lead { CompanyId = companyId, Name = dto.BusinessName, ShopName = dto.ContactName, Phone = dto.Phone, Email = dto.Email, Address = dto.Address, City = dto.City, Area = dto.Region, BusinessType = dto.BusinessType, Status = "new", Notes = dto.Notes, LocationLat = dto.Latitude.HasValue ? (decimal)dto.Latitude.Value : null, LocationLng = dto.Longitude.HasValue ? (decimal)dto.Longitude.Value : null, CapturedBy = employeeId, CreatedAt = TimeZoneHelper.Now, UpdatedAt = TimeZoneHelper.Now };
        _context.Leads.Add(lead);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetLeads), new SalesmanLeadDto { Id = lead.Id, BusinessName = lead.Name, ContactName = lead.ShopName, Phone = lead.Phone, Email = lead.Email, Address = lead.Address, City = lead.City, BusinessType = lead.BusinessType, Status = lead.Status, Notes = lead.Notes, Latitude = lead.LocationLat.HasValue ? (double)lead.LocationLat.Value : null, Longitude = lead.LocationLng.HasValue ? (double)lead.LocationLng.Value : null, CreatedAt = lead.CreatedAt });
    }

    [HttpGet("tasks")]
    public async Task<ActionResult<List<SalesmanTaskDto>>> GetTasks([FromQuery] string? status, [FromQuery] DateTime? date)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        // Only show tasks assigned to this salesman
        var query = _context.Tasks.Include(t => t.Customer).Include(t => t.Driver).Where(t => t.CompanyId == companyId && t.SalesmanId == employeeId);
        if (!string.IsNullOrEmpty(status)) query = query.Where(t => t.Status == status);
        if (date.HasValue) query = query.Where(t => t.ScheduledDate.Date == date.Value.Date);
        var tasks = await query.OrderByDescending(t => t.CreatedAt).Take(100).ToListAsync();
        return tasks.Select(t => new SalesmanTaskDto { Id = t.Id, TaskNumber = t.TaskNumber, TaskType = t.Type, CustomerId = t.CustomerId, CustomerName = t.Customer?.Name, DriverId = t.DriverId, DriverName = t.Driver?.Name, ScheduledDate = t.ScheduledDate, Status = t.Status, Total = t.Total, Notes = t.Notes, CreatedAt = t.CreatedAt }).ToList();
    }

    [HttpGet("tasks/{id}")]
    public async Task<ActionResult<SalesmanTaskDetailDto>> GetTask(int id)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        // Only allow access to tasks assigned to this salesman
        var task = await _context.Tasks.Include(t => t.Customer).Include(t => t.Driver).Include(t => t.Items).ThenInclude(i => i.Product).FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId && t.SalesmanId == employeeId);
        if (task == null) return NotFound();
        return new SalesmanTaskDetailDto { Id = task.Id, TaskNumber = task.TaskNumber, TaskType = task.Type, CustomerId = task.CustomerId, CustomerName = task.Customer?.Name, CustomerAddress = task.Customer?.Address, CustomerPhone = task.Customer?.Phone, DriverId = task.DriverId, DriverName = task.Driver?.Name, ScheduledDate = task.ScheduledDate, Status = task.Status, Total = task.Total, Notes = task.Notes, CreatedAt = task.CreatedAt, Items = task.Items.Select(i => new SalesmanTaskItemDto { Id = i.Id, ProductId = i.ProductId ?? 0, ProductName = i.ProductName ?? i.Product?.Name ?? "(Deleted)", Quantity = i.Quantity, UnitPrice = i.UnitPrice, Subtotal = i.Total }).ToList() };
    }

    [HttpPost("tasks")]
    public async Task<ActionResult<SalesmanTaskDto>> CreateTask([FromBody] CreateSalesmanTaskDto dto)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == dto.CustomerId && c.CompanyId == companyId);
        if (customer == null) return BadRequest(new { message = "Customer not found" });
        var today = TimeZoneHelper.Now;
        var prefix = string.Format("TASK-{0}", today.ToString("yyyyMMdd"));
        var lastTask = await _context.Tasks.Where(t => t.CompanyId == companyId && t.TaskNumber.StartsWith(prefix)).OrderByDescending(t => t.TaskNumber).FirstOrDefaultAsync();
        var seq = 1;
        if (lastTask != null) { var parts = lastTask.TaskNumber.Split('-'); if (parts.Length > 2 && int.TryParse(parts[2], out var lastSeq)) seq = lastSeq + 1; }
        var taskNumber = string.Format("{0}-{1}", prefix, seq.ToString().PadLeft(3, '0'));
        decimal total = 0;
        decimal bonusValue = 0;
        var taskItems = new List<TaskItem>();
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
        
        if (dto.Items != null) { 
            foreach (var item in dto.Items) { 
                var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId && p.CompanyId == companyId); 
                if (product == null) continue;
                // Skip products not allowed for this salesman
                if (restrictProducts && allowedProductIds != null && !allowedProductIds.Contains(item.ProductId)) continue; 
                if (item.IsBonus) {
                    // Bonus items have 0 price but we track their value
                    var bonusItemValue = product.RetailPrice * item.Quantity;
                    bonusValue += bonusItemValue;
                    taskItems.Add(new TaskItem { ProductId = item.ProductId, ProductName = product.Name, ProductSku = product.Sku, ProductBarcode = product.Barcode, Quantity = (int)item.Quantity, UnitType = item.UnitType ?? "Piece", UnitPrice = 0, Total = 0, CostPrice = product.CostPrice, DiscountPercent = 100 }); 
                } else {
                    var price = item.UnitPrice ?? product.RetailPrice; 
                    var itemTotal = price * item.Quantity; 
                    total += itemTotal; 
                    taskItems.Add(new TaskItem { ProductId = item.ProductId, ProductName = product.Name, ProductSku = product.Sku, ProductBarcode = product.Barcode, Quantity = (int)item.Quantity, UnitType = item.UnitType ?? "Piece", UnitPrice = price, Total = itemTotal, CostPrice = product.CostPrice }); 
                }
            } 
        }
        var taskType = (dto.TaskType ?? "Delivery").ToLower() switch { "delivery" => "Delivery", "cash collection" => "Cash Collection", "mixed" => "Mixed", "customer visit" => "Customer Visit", _ => "Delivery" };
        var extraCharge = dto.ExtraCharge ?? 0;
        var finalTotal = total + extraCharge;
        var task = new Catalyst.API.Models.Task { CompanyId = companyId, TaskNumber = taskNumber, Type = taskType, CustomerId = dto.CustomerId, ScheduledDate = dto.ScheduledDate ?? TimeZoneHelper.Now, Status = "Pending", Notes = dto.Notes, Subtotal = total, Discount = 0, ExtraCharge = extraCharge, Total = finalTotal, CreatedAt = TimeZoneHelper.Now, UpdatedAt = TimeZoneHelper.Now, CreatedBy = employeeId };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();
        foreach (var item in taskItems) { item.TaskId = task.Id; _context.Set<TaskItem>().Add(item); }
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, new SalesmanTaskDto { Id = task.Id, TaskNumber = task.TaskNumber, TaskType = task.Type, CustomerId = task.CustomerId, CustomerName = customer.Name, ScheduledDate = task.ScheduledDate, Status = task.Status, Total = task.Total, Notes = task.Notes, CreatedAt = task.CreatedAt });
    }

    [HttpPut("tasks/{id}/visited")]
    public async Task<ActionResult> MarkTaskVisited(int id)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId && t.SalesmanId == employeeId);
        if (task == null) return NotFound(new { message = "Task not found" });
        if (task.Type != "Customer Visit") return BadRequest(new { message = "Only visit tasks can be marked as visited" });
        task.Status = "Completed";
        task.UpdatedAt = TimeZoneHelper.Now;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Task marked as visited" });
    }

    [HttpGet("profile")]
    public async Task<ActionResult<SalesmanProfileDto>> GetProfile()
    {
        var employeeId = GetEmployeeId();
        var employee = await _context.Employees.Include(e => e.Company).FirstOrDefaultAsync(e => e.Id == employeeId);
        if (employee == null) return NotFound();
        return new SalesmanProfileDto { Id = employee.Id, Name = employee.Name, Username = employee.Username, Phone = employee.Phone, Email = employee.Email, CompanyName = employee.Company?.Name ?? "" };
    }

    /// <summary>
    /// Get customer-specific special prices for products
    /// </summary>
    [HttpGet("customers/{customerId}/prices")]
    public async Task<ActionResult<List<SalesmanCustomerPriceDto>>> GetCustomerPrices(int customerId)
    {
        var companyId = GetCompanyId();
        var employeeId = GetEmployeeId();

        // Verify customer belongs to company
        var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.CompanyId == companyId);
        if (customer == null) return NotFound(new { message = "Customer not found" });

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

        // Get all special prices for this customer
        var specialPrices = await _context.CustomerSpecialPrices
            .Where(sp => sp.CustomerId == customerId && sp.CompanyId == companyId && sp.IsActive)
            .ToListAsync();

        // Get products (filtered if restrictions enabled)
        var productsQuery = _context.Products.Where(p => p.CompanyId == companyId && p.IsActive);
        if (restrictProducts && allowedProductIds != null)
        {
            productsQuery = productsQuery.Where(p => allowedProductIds.Contains(p.Id));
        }
        var products = await productsQuery.ToListAsync();

        return products.Select(p => {
            var pieceSpecial = specialPrices.FirstOrDefault(sp => sp.ProductId == p.Id && sp.UnitType == "piece");
            var boxSpecial = specialPrices.FirstOrDefault(sp => sp.ProductId == p.Id && sp.UnitType == "box");
            
            return new SalesmanCustomerPriceDto
            {
                ProductId = p.Id,
                RetailPrice = p.RetailPrice,
                WholesalePrice = p.WholesalePrice,
                BoxRetailPrice = p.BoxRetailPrice,
                BoxWholesalePrice = p.BoxWholesalePrice,
                SpecialPrice = pieceSpecial?.SpecialPrice,
                BoxSpecialPrice = boxSpecial?.SpecialPrice,
                HasSpecialPrice = pieceSpecial != null,
                HasBoxSpecialPrice = boxSpecial != null
            };
        }).ToList();
    }
}

public class SalesmanDashboardDto { public int LeadsToday { get; set; } public int TotalLeads { get; set; } public int CustomersToday { get; set; } public int TotalCustomers { get; set; } public int VisitTasksToday { get; set; } public int VisitTasksPending { get; set; } public int VisitTasksCompleted { get; set; } public int TotalVisitTasks { get; set; } }
public class SalesmanProductDto { public int Id { get; set; } public string Name { get; set; } = ""; public string? Sku { get; set; } public string? Barcode { get; set; } public int? CategoryId { get; set; } public string? CategoryName { get; set; } public decimal SalePrice { get; set; } public decimal? WholesalePrice { get; set; } public string? ImageUrl { get; set; } public string? Description { get; set; } public int PiecesPerBox { get; set; } public string SecondUnit { get; set; } = "Box"; public decimal BoxPrice { get; set; } }
public class SalesmanCategoryDto { public int Id { get; set; } public string Name { get; set; } = ""; public string? Description { get; set; } }
public class SalesmanCustomerDto { public int Id { get; set; } public string Name { get; set; } = ""; public string? Code { get; set; } public string? Phone { get; set; } public string? Email { get; set; } public string? Address { get; set; } public string? CustomerType { get; set; } public decimal CreditLimit { get; set; } public decimal DebtBalance { get; set; } public double? Latitude { get; set; } public double? Longitude { get; set; } public string? Notes { get; set; } }
public class SalesmanCreateCustomerDto { public string Name { get; set; } = ""; public string? Phone { get; set; } public string? Email { get; set; } public string? Address { get; set; } public string? CustomerType { get; set; } public decimal? CreditLimit { get; set; } public double? Latitude { get; set; } public double? Longitude { get; set; } public string? Notes { get; set; } }
public class SalesmanLeadDto { public int Id { get; set; } public string BusinessName { get; set; } = ""; public string? ContactName { get; set; } public string? Phone { get; set; } public string? Email { get; set; } public string? Address { get; set; } public string? City { get; set; } public string? BusinessType { get; set; } public string Status { get; set; } = "new"; public string? Notes { get; set; } public double? Latitude { get; set; } public double? Longitude { get; set; } public DateTime CreatedAt { get; set; } }
public class SalesmanCreateLeadDto { public string BusinessName { get; set; } = ""; public string? ContactName { get; set; } public string? Phone { get; set; } public string? Email { get; set; } public string? Address { get; set; } public string? City { get; set; } public string? Region { get; set; } public string? BusinessType { get; set; } public string? Notes { get; set; } public double? Latitude { get; set; } public double? Longitude { get; set; } }
public class SalesmanTaskDto { public int Id { get; set; } public string TaskNumber { get; set; } = ""; public string TaskType { get; set; } = ""; public int? CustomerId { get; set; } public string? CustomerName { get; set; } public int? DriverId { get; set; } public string? DriverName { get; set; } public DateTime ScheduledDate { get; set; } public string Status { get; set; } = "Pending"; public decimal Total { get; set; } public string? Notes { get; set; } public DateTime CreatedAt { get; set; } }
public class SalesmanTaskDetailDto : SalesmanTaskDto { public string? CustomerAddress { get; set; } public string? CustomerPhone { get; set; } public List<SalesmanTaskItemDto> Items { get; set; } = new(); }
public class SalesmanTaskItemDto { public int Id { get; set; } public int ProductId { get; set; } public string ProductName { get; set; } = ""; public int Quantity { get; set; } public decimal UnitPrice { get; set; } public decimal Subtotal { get; set; } }
public class CreateSalesmanTaskDto { public int CustomerId { get; set; } public string? TaskType { get; set; } public DateTime? ScheduledDate { get; set; } public string? Notes { get; set; } public decimal? DiscountPercent { get; set; } public decimal? ExtraCharge { get; set; } public List<SalesmanCreateTaskItemDto>? Items { get; set; } }
public class SalesmanCreateTaskItemDto { public int ProductId { get; set; } public decimal Quantity { get; set; } public decimal? UnitPrice { get; set; } public string UnitType { get; set; } = "Piece"; public bool IsBonus { get; set; } = false; }
public class SalesmanProfileDto { public int Id { get; set; } public string Name { get; set; } = ""; public string Username { get; set; } = ""; public string? Phone { get; set; } public string? Email { get; set; } public string CompanyName { get; set; } = ""; }
public class SalesmanCustomerPriceDto { public int ProductId { get; set; } public decimal RetailPrice { get; set; } public decimal WholesalePrice { get; set; } public decimal BoxRetailPrice { get; set; } public decimal BoxWholesalePrice { get; set; } public decimal? SpecialPrice { get; set; } public decimal? BoxSpecialPrice { get; set; } public bool HasSpecialPrice { get; set; } public bool HasBoxSpecialPrice { get; set; } }
