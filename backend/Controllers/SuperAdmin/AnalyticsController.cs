using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;

namespace Catalyst.API.Controllers.SuperAdmin;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Roles = "SuperAdmin")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AnalyticsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAnalytics()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var thisMonth = new DateTime(now.Year, now.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);

        // Platform metrics
        var totalAppCustomers = await _context.AppCustomers.CountAsync();
        var newCustomersThisMonth = await _context.AppCustomers.CountAsync(c => c.CreatedAt >= thisMonth);
        var newCustomersLastMonth = await _context.AppCustomers.CountAsync(c => c.CreatedAt >= lastMonth && c.CreatedAt < thisMonth);

        var totalOnlineOrders = await _context.OnlineOrders.CountAsync();
        var ordersToday = await _context.OnlineOrders.CountAsync(o => o.CreatedAt >= today);
        var ordersThisMonth = await _context.OnlineOrders.CountAsync(o => o.CreatedAt >= thisMonth);
        var ordersLastMonth = await _context.OnlineOrders.CountAsync(o => o.CreatedAt >= lastMonth && o.CreatedAt < thisMonth);

        var totalGMV = await _context.OnlineOrders
            .Where(o => o.Status == "delivered")
            .SumAsync(o => o.Total);
        var gmvThisMonth = await _context.OnlineOrders
            .Where(o => o.Status == "delivered" && o.CreatedAt >= thisMonth)
            .SumAsync(o => o.Total);
        var gmvLastMonth = await _context.OnlineOrders
            .Where(o => o.Status == "delivered" && o.CreatedAt >= lastMonth && o.CreatedAt < thisMonth)
            .SumAsync(o => o.Total);

        // Ad revenue
        var totalAdRevenue = await _context.Ads
            .Where(a => a.PaymentStatus == "paid")
            .SumAsync(a => a.AmountPaid);
        var adRevenueThisMonth = await _context.Ads
            .Where(a => a.PaymentStatus == "paid" && a.CreatedAt >= thisMonth)
            .SumAsync(a => a.AmountPaid);

        // Premium subscriptions
        var activePremiums = await _context.PremiumSubscriptions
            .CountAsync(p => p.EndDate >= now && p.PaymentStatus == "paid");
        var premiumRevenue = await _context.PremiumSubscriptions
            .Where(p => p.PaymentStatus == "paid")
            .SumAsync(p => p.Amount);

        // Online stores
        var totalOnlineStores = await _context.Companies.CountAsync(c => c.IsOnlineStoreEnabled && c.Status == "active");
        var premiumStores = await _context.Companies.CountAsync(c => c.IsPremium && c.Status == "active");

        // Order status breakdown
        var statusBreakdown = new
        {
            pending = await _context.OnlineOrders.CountAsync(o => o.Status == "pending"),
            confirmed = await _context.OnlineOrders.CountAsync(o => o.Status == "confirmed"),
            preparing = await _context.OnlineOrders.CountAsync(o => o.Status == "preparing"),
            delivering = await _context.OnlineOrders.CountAsync(o => o.Status == "delivering"),
            delivered = await _context.OnlineOrders.CountAsync(o => o.Status == "delivered"),
            cancelled = await _context.OnlineOrders.CountAsync(o => o.Status == "cancelled")
        };

        // Top stores by order count
        var topStores = await _context.OnlineOrders
            .Where(o => o.Status == "delivered")
            .GroupBy(o => new { o.CompanyId, o.Company.Name })
            .Select(g => new
            {
                CompanyId = g.Key.CompanyId,
                StoreName = g.Key.Name,
                OrderCount = g.Count(),
                Revenue = g.Sum(o => o.Total)
            })
            .OrderByDescending(s => s.Revenue)
            .Take(10)
            .ToListAsync();

        // Orders per day (last 30 days)
        var thirtyDaysAgo = today.AddDays(-30);
        var ordersPerDay = await _context.OnlineOrders
            .Where(o => o.CreatedAt >= thirtyDaysAgo)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count(), Revenue = g.Sum(o => o.Total) })
            .OrderBy(d => d.Date)
            .ToListAsync();

        return Ok(new
        {
            customers = new
            {
                total = totalAppCustomers,
                thisMonth = newCustomersThisMonth,
                lastMonth = newCustomersLastMonth
            },
            orders = new
            {
                total = totalOnlineOrders,
                today = ordersToday,
                thisMonth = ordersThisMonth,
                lastMonth = ordersLastMonth,
                statusBreakdown
            },
            revenue = new
            {
                totalGMV,
                gmvThisMonth,
                gmvLastMonth,
                totalAdRevenue,
                adRevenueThisMonth,
                premiumRevenue,
                activePremiums,
                totalPlatformRevenue = totalAdRevenue + premiumRevenue
            },
            stores = new
            {
                totalOnlineStores,
                premiumStores
            },
            topStores,
            ordersPerDay = ordersPerDay.Select(d => new
            {
                date = d.Date.ToString("yyyy-MM-dd"),
                count = d.Count,
                revenue = d.Revenue
            })
        });
    }
}
