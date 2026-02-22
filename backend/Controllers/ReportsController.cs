using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    /// <summary>
    /// Get dashboard summary statistics
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardReportDto>> GetDashboard()
    {
        var companyId = GetCompanyId();
        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);

        // Today's stats
        var todayOrders = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.OrderDate.Date == today)
            .ToListAsync();

        var todayCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.CollectionDate.Date == today)
            .SumAsync(c => c.Amount);

        var todayDeposits = await _context.Deposits
            .Where(d => d.CompanyId == companyId && d.DepositDate == DateOnly.FromDateTime(today))
            .SumAsync(d => d.Amount);

        // Month stats
        var monthOrders = await _context.Orders
            .Where(o => o.CompanyId == companyId && o.OrderDate >= startOfMonth)
            .ToListAsync();

        var monthCollections = await _context.Collections
            .Where(c => c.CompanyId == companyId && c.CollectionDate >= startOfMonth)
            .SumAsync(c => c.Amount);

        // Outstanding debt
        var totalDebt = await _context.Customers
            .Where(c => c.CompanyId == companyId)
            .SumAsync(c => c.DebtBalance);

        // Cash in vans (calculated from transactions)
        var vansWithDrivers = await _context.Vans
            .Where(v => v.CompanyId == companyId && v.AssignedDriverId.HasValue)
            .ToListAsync();

        decimal cashInVans = 0;
        foreach (var van in vansWithDrivers)
        {
            var driverId = van.AssignedDriverId!.Value;
            var taskCash = await _context.Tasks
                .Where(t => t.CompanyId == companyId && t.DriverId == driverId &&
                           (t.Status == "Completed" || t.Status == "Delivered"))
                .SumAsync(t => t.PaidAmount);
            var posSales = await _context.Orders
                .Where(o => o.CompanyId == companyId && o.DriverId == driverId)
                .SumAsync(o => o.PaidAmount);
            var collections = await _context.Collections
                .Where(c => c.CompanyId == companyId && c.DriverId == driverId && c.PaymentType == "cash")
                .SumAsync(c => c.Amount);
            var deposits = await _context.Deposits
                .Where(d => d.CompanyId == companyId && d.DriverId == driverId && d.Status != "rejected")
                .SumAsync(d => d.Amount);
            cashInVans += taskCash + posSales + collections - deposits;
        }

        // Active drivers
        var activeDrivers = await _context.Employees
            .CountAsync(e => e.CompanyId == companyId && e.IsDriver && e.Status == "active");

        return new DashboardReportDto
        {
            TodaySales = todayOrders.Sum(o => o.TotalAmount),
            TodayOrders = todayOrders.Count,
            TodayCollections = todayCollections,
            TodayDeposits = todayDeposits,
            MonthSales = monthOrders.Sum(o => o.TotalAmount),
            MonthOrders = monthOrders.Count,
            MonthCollections = monthCollections,
            TotalOutstandingDebt = totalDebt,
            CashInVans = cashInVans,
            ActiveDrivers = activeDrivers
        };
    }

    /// <summary>
    /// Get sales report
    /// </summary>
    [HttpGet("sales")]
    public async Task<ActionResult<SalesReportDto>> GetSalesReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? driverId,
        [FromQuery] int? customerId)
    {
        var companyId = GetCompanyId();
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Driver)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Variant)
            .Where(o => o.CompanyId == companyId &&
                       o.OrderDate.Date >= startDate.Date &&
                       o.OrderDate.Date <= endDate.Date);

        if (driverId.HasValue)
            query = query.Where(o => o.DriverId == driverId);

        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId);

        var orders = await query.OrderByDescending(o => o.OrderDate).ToListAsync();

        // Daily breakdown
        var dailySales = orders
            .GroupBy(o => o.OrderDate.Date)
            .Select(g => new DailySalesDto
            {
                Date = g.Key,
                Orders = g.Count(),
                TotalSales = g.Sum(o => o.TotalAmount),
                CashSales = g.Sum(o => o.PaidAmount),
                CreditSales = g.Sum(o => o.TotalAmount - o.PaidAmount)
            })
            .OrderBy(d => d.Date)
            .ToList();

        // Top products (grouped by product name + variant) - use snapshot fields
        var topProducts = orders
            .SelectMany(o => o.OrderItems)
            .Where(oi => !string.IsNullOrEmpty(oi.ProductName) || oi.ProductId != null)
            .GroupBy(oi => new { 
                Name = oi.ProductName ?? oi.Product?.Name ?? "Unknown",
                ProductId = oi.ProductId ?? 0,
                oi.VariantId,
                VariantLabel = oi.VariantName ?? (oi.Variant == null ? null :
                    string.Join(" / ", new[] {
                        oi.Variant.Color, oi.Variant.Size,
                        oi.Variant.Weight.HasValue ? oi.Variant.Weight + "kg" : null,
                        oi.Variant.Length.HasValue ? oi.Variant.Length + "cm" : null,
                        oi.Variant.Height.HasValue ? oi.Variant.Height + "cm" : null
                    }.Where(s => !string.IsNullOrWhiteSpace(s))))
            })
            .Select(g => new TopProductDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.Name,
                VariantId = g.Key.VariantId,
                VariantName = g.Key.VariantLabel,
                QuantitySold = g.Sum(oi => oi.Quantity),
                TotalRevenue = g.Sum(oi => oi.Total)
            })
            .OrderByDescending(p => p.TotalRevenue)
            .Take(10)
            .ToList();

        return new SalesReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalOrders = orders.Count,
            TotalSales = orders.Sum(o => o.TotalAmount),
            TotalCash = orders.Sum(o => o.PaidAmount),
            TotalCredit = orders.Sum(o => o.TotalAmount - o.PaidAmount),
            AverageOrderValue = orders.Count > 0 ? orders.Average(o => o.TotalAmount) : 0,
            DailySales = dailySales,
            TopProducts = topProducts
        };
    }

    /// <summary>
    /// Get collections report
    /// </summary>
    [HttpGet("collections")]
    public async Task<ActionResult<CollectionsReportDto>> GetCollectionsReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? driverId)
    {
        var companyId = GetCompanyId();
        var query = _context.Collections
            .Include(c => c.Customer)
            .Include(c => c.Driver)
            .Where(c => c.CompanyId == companyId &&
                       c.CollectionDate.Date >= startDate.Date &&
                       c.CollectionDate.Date <= endDate.Date);

        if (driverId.HasValue)
            query = query.Where(c => c.DriverId == driverId);

        var collections = await query.OrderByDescending(c => c.CollectionDate).ToListAsync();

        // By payment type
        var byPaymentType = collections
            .GroupBy(c => c.PaymentType)
            .Select(g => new PaymentTypeBreakdownDto
            {
                PaymentType = g.Key,
                Count = g.Count(),
                Amount = g.Sum(c => c.Amount)
            })
            .ToList();

        // Daily breakdown
        var dailyCollections = collections
            .GroupBy(c => c.CollectionDate.Date)
            .Select(g => new DailyCollectionsDto
            {
                Date = g.Key,
                Count = g.Count(),
                Amount = g.Sum(c => c.Amount)
            })
            .OrderBy(d => d.Date)
            .ToList();

        // By driver
        var byDriver = collections
            .Where(c => c.Driver != null)
            .GroupBy(c => new { c.DriverId, c.Driver!.Name })
            .Select(g => new DriverCollectionsDto
            {
                DriverId = g.Key.DriverId ?? 0,
                DriverName = g.Key.Name,
                Count = g.Count(),
                Amount = g.Sum(c => c.Amount)
            })
            .OrderByDescending(d => d.Amount)
            .ToList();

        return new CollectionsReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalCollections = collections.Count,
            TotalAmount = collections.Sum(c => c.Amount),
            ByPaymentType = byPaymentType,
            DailyCollections = dailyCollections,
            ByDriver = byDriver
        };
    }

    /// <summary>
    /// Get customer statement
    /// </summary>
    [HttpGet("customer-statement/{customerId}")]
    public async Task<ActionResult<CustomerStatementDto>> GetCustomerStatement(
        int customerId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var companyId = GetCompanyId();
        
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId && c.CompanyId == companyId);

        if (customer == null) return NotFound();

        // Get orders
        var orders = await _context.Orders
            .Where(o => o.CompanyId == companyId &&
                       o.CustomerId == customerId &&
                       o.OrderDate.Date >= startDate.Date &&
                       o.OrderDate.Date <= endDate.Date)
            .OrderBy(o => o.OrderDate)
            .ToListAsync();

        // Get collections
        var collections = await _context.Collections
            .Where(c => c.CompanyId == companyId &&
                       c.CustomerId == customerId &&
                       c.CollectionDate.Date >= startDate.Date &&
                       c.CollectionDate.Date <= endDate.Date)
            .OrderBy(c => c.CollectionDate)
            .ToListAsync();

        // Build statement lines
        var lines = new List<StatementLineDto>();
        
        foreach (var order in orders)
        {
            lines.Add(new StatementLineDto
            {
                Date = order.OrderDate,
                Type = "Order",
                Reference = order.OrderNumber,
                Description = $"Order #{order.OrderNumber}",
                Debit = order.TotalAmount - order.PaidAmount,
                Credit = 0
            });
        }

        foreach (var collection in collections)
        {
            lines.Add(new StatementLineDto
            {
                Date = collection.CollectionDate,
                Type = "Collection",
                Reference = collection.CollectionNumber ?? "",
                Description = $"Payment - {collection.PaymentType}",
                Debit = 0,
                Credit = collection.Amount
            });
        }

        lines = lines.OrderBy(l => l.Date).ToList();

        // Calculate running balance
        decimal balance = 0;
        foreach (var line in lines)
        {
            balance += line.Debit - line.Credit;
            line.Balance = balance;
        }

        return new CustomerStatementDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            ShopName = customer.ShopName,
            Phone = customer.Phone,
            StartDate = startDate,
            EndDate = endDate,
            OpeningBalance = 0,
            TotalDebits = lines.Sum(l => l.Debit),
            TotalCredits = lines.Sum(l => l.Credit),
            ClosingBalance = customer.DebtBalance,
            Lines = lines
        };
    }

    /// <summary>
    /// Get stock/inventory report
    /// </summary>
    [HttpGet("stock")]
    public async Task<ActionResult<StockReportDto>> GetStockReport([FromQuery] int? warehouseId)
    {
        var companyId = GetCompanyId();

        // Warehouse inventory
        var warehouseQuery = _context.Inventories
            .Include(i => i.Product)
            .Include(i => i.Warehouse)
            .Where(i => i.CompanyId == companyId);

        if (warehouseId.HasValue)
            warehouseQuery = warehouseQuery.Where(i => i.WarehouseId == warehouseId);

        var warehouseStock = await warehouseQuery.ToListAsync();

        // Van inventory
        var vanStock = await _context.VanInventories
            .Include(vi => vi.Product)
            .Include(vi => vi.Van)
            .Where(vi => vi.CompanyId == companyId)
            .ToListAsync();

        // By product summary
        var productSummary = warehouseStock
            .GroupBy(i => new { i.ProductId, i.Product.Name, i.Product.Sku })
            .Select(g => new ProductStockDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.Name,
                Sku = g.Key.Sku,
                WarehouseStock = g.Sum(i => i.Quantity),
                VanStock = vanStock.Where(v => v.ProductId == g.Key.ProductId).Sum(v => v.Quantity),
                TotalStock = g.Sum(i => i.Quantity) + vanStock.Where(v => v.ProductId == g.Key.ProductId).Sum(v => v.Quantity)
            })
            .OrderBy(p => p.ProductName)
            .ToList();

        // Low stock items
        var lowStock = productSummary.Where(p => p.TotalStock <= 10).ToList();

        return new StockReportDto
        {
            TotalProducts = productSummary.Count,
            TotalWarehouseValue = warehouseStock.Sum(i => i.Quantity * i.Product.CostPrice),
            TotalVanValue = vanStock.Sum(v => v.Quantity * v.Product.CostPrice),
            LowStockCount = lowStock.Count,
            Products = productSummary,
            LowStockProducts = lowStock
        };
    }

    /// <summary>
    /// Get expenses report
    /// </summary>
    [HttpGet("expenses")]
    public async Task<ActionResult<ExpensesReportDto>> GetExpensesReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? categoryId)
    {
        var companyId = GetCompanyId();
        var query = _context.Expenses
            .Include(e => e.Category)
            .Where(e => e.CompanyId == companyId &&
                       e.ExpenseDate >= startDate.Date &&
                       e.ExpenseDate <= endDate.Date);

        if (categoryId.HasValue)
            query = query.Where(e => e.CategoryId == categoryId);

        var expenses = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync();

        // By category
        var byCategory = expenses
            .GroupBy(e => new { e.CategoryId, CategoryName = e.Category?.Name ?? "Uncategorized" })
            .Select(g => new ExpenseCategoryBreakdownDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.CategoryName,
                Count = g.Count(),
                Amount = g.Sum(e => e.Amount)
            })
            .OrderByDescending(c => c.Amount)
            .ToList();

        // Daily breakdown
        var dailyExpenses = expenses
            .GroupBy(e => e.ExpenseDate.Date)
            .Select(g => new DailyExpensesDto
            {
                Date = g.Key,
                Count = g.Count(),
                Amount = g.Sum(e => e.Amount)
            })
            .OrderBy(d => d.Date)
            .ToList();

        return new ExpensesReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalExpenses = expenses.Count,
            TotalAmount = expenses.Sum(e => e.Amount),
            ByCategory = byCategory,
            DailyExpenses = dailyExpenses
        };
    }

    /// <summary>
    /// Get driver performance report
    /// </summary>
    [HttpGet("driver-performance")]
    public async Task<ActionResult<DriverPerformanceReportDto>> GetDriverPerformanceReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? driverId)
    {
        var companyId = GetCompanyId();

        var driversQuery = _context.Employees
            .Where(e => e.CompanyId == companyId && e.IsDriver);

        if (driverId.HasValue)
            driversQuery = driversQuery.Where(e => e.Id == driverId);

        var drivers = await driversQuery.ToListAsync();

        var performances = new List<DriverPerformanceDto>();

        foreach (var driver in drivers)
        {
            var orders = await _context.Orders
                .Where(o => o.CompanyId == companyId &&
                           o.DriverId == driver.Id &&
                           o.OrderDate.Date >= startDate.Date &&
                           o.OrderDate.Date <= endDate.Date)
                .ToListAsync();

            var collections = await _context.Collections
                .Where(c => c.CompanyId == companyId &&
                           c.DriverId == driver.Id &&
                           c.CollectionDate.Date >= startDate.Date &&
                           c.CollectionDate.Date <= endDate.Date)
                .ToListAsync();

            var shifts = await _context.DriverShifts
                .Where(s => s.CompanyId == companyId &&
                           s.DriverId == driver.Id &&
                           s.ShiftDate >= DateOnly.FromDateTime(startDate) &&
                           s.ShiftDate <= DateOnly.FromDateTime(endDate))
                .ToListAsync();

            performances.Add(new DriverPerformanceDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                TotalOrders = orders.Count,
                TotalSales = orders.Sum(o => o.TotalAmount),
                TotalCollections = collections.Sum(c => c.Amount),
                ShiftsWorked = shifts.Count,
                CustomersVisited = shifts.Sum(s => s.CustomersVisited),
                AverageSalesPerShift = shifts.Count > 0 ? orders.Sum(o => o.TotalAmount) / shifts.Count : 0
            });
        }

        return new DriverPerformanceReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalDrivers = performances.Count,
            Drivers = performances.OrderByDescending(d => d.TotalSales).ToList()
        };
    }

    /// <summary>
    /// Get van performance report
    /// </summary>
    [HttpGet("van-performance")]
    public async Task<ActionResult<VanPerformanceReportDto>> GetVanPerformanceReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] int? vanId)
    {
        var companyId = GetCompanyId();

        var vansQuery = _context.Vans
            .Include(v => v.AssignedDriver)
            .Where(v => v.CompanyId == companyId);

        if (vanId.HasValue)
            vansQuery = vansQuery.Where(v => v.Id == vanId.Value);

        var vans = await vansQuery.ToListAsync();
        var performances = new List<VanPerformanceDto>();

        foreach (var van in vans)
        {
            // Get orders for this van in date range
            var orders = await _context.Orders
                .Where(o => o.CompanyId == companyId && 
                           o.VanId == van.Id && 
                           o.OrderDate.Date >= startDate.Date && 
                           o.OrderDate.Date <= endDate.Date)
                .ToListAsync();

            // Get collections for this van's driver
            decimal collections = 0;
            if (van.AssignedDriverId.HasValue)
            {
                collections = await _context.Collections
                    .Where(c => c.CompanyId == companyId && 
                               c.DriverId == van.AssignedDriverId && 
                               c.CollectionDate.Date >= startDate.Date && 
                               c.CollectionDate.Date <= endDate.Date)
                    .SumAsync(c => c.Amount);
            }

            // Get deposits
            decimal deposits = 0;
            if (van.AssignedDriverId.HasValue)
            {
                deposits = await _context.Deposits
                    .Where(d => d.CompanyId == companyId && 
                               d.DriverId == van.AssignedDriverId && 
                               d.DepositDate >= DateOnly.FromDateTime(startDate) && 
                               d.DepositDate <= DateOnly.FromDateTime(endDate))
                    .SumAsync(d => d.Amount);
            }

            // Calculate current cash from all transactions
            decimal currentCash = 0;
            if (van.AssignedDriverId.HasValue)
            {
                var driverId = van.AssignedDriverId.Value;
                var taskCash = await _context.Tasks
                    .Where(t => t.CompanyId == companyId && t.DriverId == driverId &&
                               (t.Status == "Completed" || t.Status == "Delivered"))
                    .SumAsync(t => t.PaidAmount);
                var posSales = await _context.Orders
                    .Where(o => o.CompanyId == companyId && o.DriverId == driverId)
                    .SumAsync(o => o.PaidAmount);
                var allCollections = await _context.Collections
                    .Where(c => c.CompanyId == companyId && c.DriverId == driverId && c.PaymentType == "cash")
                    .SumAsync(c => c.Amount);
                var allDeposits = await _context.Deposits
                    .Where(d => d.CompanyId == companyId && d.DriverId == driverId && d.Status != "rejected")
                    .SumAsync(d => d.Amount);
                currentCash = taskCash + posSales + allCollections - allDeposits;
            }

            performances.Add(new VanPerformanceDto
            {
                VanId = van.Id,
                VanName = van.Name,
                DriverName = van.AssignedDriver?.Name ?? "Unassigned",
                TotalOrders = orders.Count,
                TotalSales = orders.Sum(o => o.TotalAmount),
                CashCollected = collections,
                Deposits = deposits,
                CurrentCash = currentCash
            });
        }

        return new VanPerformanceReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalVans = performances.Count,
            Vans = performances.OrderByDescending(v => v.TotalSales).ToList()
        };
    }

    /// <summary>
    /// Get product sales summary
    /// </summary>
    [HttpGet("product-sales/{productId}")]
    public async Task<ActionResult<ProductSalesDto>> GetProductSales(int productId)
    {
        var companyId = GetCompanyId();
        
        // Get product to verify it exists and get cost price
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId && p.CompanyId == companyId);
        if (product == null)
            return NotFound("Product not found");

        // Get all order items for this product
        var orderItems = await _context.OrderItems
            .Include(oi => oi.Order)
            .Where(oi => oi.ProductId == productId && oi.Order.CompanyId == companyId)
            .ToListAsync();

        // Get all task items for this product
        var taskItems = await _context.TaskItems
            .Include(ti => ti.Task)
            .Where(ti => ti.ProductId == productId && ti.Task.CompanyId == companyId && ti.Task.Status == "Completed")
            .ToListAsync();

        // Calculate totals from orders
        var orderQuantity = (int)orderItems.Sum(oi => oi.Quantity);
        var orderRevenue = orderItems.Sum(oi => oi.Total);
        var orderCost = orderItems.Sum(oi => oi.Quantity * (oi.CostPrice ?? product.CostPrice));
        var orderCount = orderItems.Select(oi => oi.OrderId).Distinct().Count();

        // Calculate totals from tasks
        var taskQuantity = taskItems.Sum(ti => ti.Quantity);
        var taskRevenue = taskItems.Sum(ti => ti.Total);
        var taskCost = taskItems.Sum(ti => ti.Quantity * (ti.CostPrice > 0 ? ti.CostPrice : product.CostPrice));
        var taskCount = taskItems.Select(ti => ti.TaskId).Distinct().Count();

        var totalQuantity = orderQuantity + taskQuantity;
        var totalRevenue = orderRevenue + taskRevenue;
        var totalCost = orderCost + taskCost;

        return new ProductSalesDto
        {
            TotalQuantitySold = totalQuantity,
            TotalRevenue = totalRevenue,
            TotalCost = totalCost,
            Profit = totalRevenue - totalCost,
            OrderCount = orderCount + taskCount
        };
    }
}

#region Report DTOs

public class DashboardReportDto
{
    public decimal TodaySales { get; set; }
    public int TodayOrders { get; set; }
    public decimal TodayCollections { get; set; }
    public decimal TodayDeposits { get; set; }
    public decimal MonthSales { get; set; }
    public int MonthOrders { get; set; }
    public decimal MonthCollections { get; set; }
    public decimal TotalOutstandingDebt { get; set; }
    public decimal CashInVans { get; set; }
    public int ActiveDrivers { get; set; }
}

public class SalesReportDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal AverageOrderValue { get; set; }
    public List<DailySalesDto> DailySales { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
}

public class DailySalesDto
{
    public DateTime Date { get; set; }
    public int Orders { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashSales { get; set; }
    public decimal CreditSales { get; set; }
}

public class TopProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int? VariantId { get; set; }
    public string? VariantName { get; set; }
    public decimal QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class CollectionsReportDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalCollections { get; set; }
    public decimal TotalAmount { get; set; }
    public List<PaymentTypeBreakdownDto> ByPaymentType { get; set; } = new();
    public List<DailyCollectionsDto> DailyCollections { get; set; } = new();
    public List<DriverCollectionsDto> ByDriver { get; set; } = new();
}

public class PaymentTypeBreakdownDto
{
    public string PaymentType { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class DailyCollectionsDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class DriverCollectionsDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class CustomerStatementDto
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public string? Phone { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal TotalDebits { get; set; }
    public decimal TotalCredits { get; set; }
    public decimal ClosingBalance { get; set; }
    public List<StatementLineDto> Lines { get; set; } = new();
}

public class StatementLineDto
{
    public DateTime Date { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
}

public class StockReportDto
{
    public int TotalProducts { get; set; }
    public decimal TotalWarehouseValue { get; set; }
    public decimal TotalVanValue { get; set; }
    public int LowStockCount { get; set; }
    public List<ProductStockDto> Products { get; set; } = new();
    public List<ProductStockDto> LowStockProducts { get; set; } = new();
}

public class ProductStockDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal WarehouseStock { get; set; }
    public decimal VanStock { get; set; }
    public decimal TotalStock { get; set; }
}

public class ExpensesReportDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalExpenses { get; set; }
    public decimal TotalAmount { get; set; }
    public List<ExpenseCategoryBreakdownDto> ByCategory { get; set; } = new();
    public List<DailyExpensesDto> DailyExpenses { get; set; } = new();
}

public class ExpenseCategoryBreakdownDto
{
    public int? CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class DailyExpensesDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}

public class DriverPerformanceReportDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalDrivers { get; set; }
    public List<DriverPerformanceDto> Drivers { get; set; } = new();
}

public class DriverPerformanceDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalCollections { get; set; }
    public int ShiftsWorked { get; set; }
    public int CustomersVisited { get; set; }
    public decimal AverageSalesPerShift { get; set; }
}

public class VanPerformanceReportDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalVans { get; set; }
    public List<VanPerformanceDto> Vans { get; set; } = new();
}

public class VanPerformanceDto
{
    public int VanId { get; set; }
    public string VanName { get; set; } = string.Empty;
    public string DriverName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalSales { get; set; }
    public decimal CashCollected { get; set; }
    public decimal Deposits { get; set; }
    public decimal CurrentCash { get; set; }
}

public class ProductSalesDto
{
    public int TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalCost { get; set; }
    public decimal Profit { get; set; }
    public int OrderCount { get; set; }
}

#endregion
