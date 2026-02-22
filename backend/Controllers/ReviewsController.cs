using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/marketplace/stores/{companyId}/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewsController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get reviews for a store
    /// </summary>
    [HttpGet]
    public async Task<ActionResult> GetReviews(int companyId, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var query = _context.StoreReviews
            .Where(r => r.CompanyId == companyId && r.IsVisible)
            .OrderByDescending(r => r.CreatedAt);

        var total = await query.CountAsync();
        var reviews = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(r => new
            {
                r.Id,
                r.Rating,
                r.Comment,
                r.Reply,
                r.RepliedAt,
                CustomerName = r.AppCustomer != null ? r.AppCustomer.Name : r.GuestName,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { reviews, total, page, limit });
    }

    /// <summary>
    /// Get review summary (avg rating, count, breakdown)
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary(int companyId)
    {
        var reviews = _context.StoreReviews
            .Where(r => r.CompanyId == companyId && r.IsVisible);

        var total = await reviews.CountAsync();
        if (total == 0)
            return Ok(new { averageRating = 0.0, totalReviews = 0, breakdown = new { s5 = 0, s4 = 0, s3 = 0, s2 = 0, s1 = 0 } });

        var avg = await reviews.AverageAsync(r => r.Rating);

        return Ok(new
        {
            averageRating = Math.Round(avg, 1),
            totalReviews = total,
            breakdown = new
            {
                s5 = await reviews.CountAsync(r => r.Rating == 5),
                s4 = await reviews.CountAsync(r => r.Rating == 4),
                s3 = await reviews.CountAsync(r => r.Rating == 3),
                s2 = await reviews.CountAsync(r => r.Rating == 2),
                s1 = await reviews.CountAsync(r => r.Rating == 1),
            }
        });
    }

    /// <summary>
    /// Submit a review (guest or authenticated)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult> CreateReview(int companyId, [FromBody] CreateReviewDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5" });

        var company = await _context.Companies.FindAsync(companyId);
        if (company == null)
            return NotFound(new { message = "Store not found" });

        // Check if order exists and belongs to this store
        if (dto.OrderId.HasValue)
        {
            var order = await _context.OnlineOrders
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.CompanyId == companyId && o.Status == "delivered");
            if (order == null)
                return BadRequest(new { message = "Order not found or not delivered" });

            // Check for duplicate review on same order
            var existing = await _context.StoreReviews
                .AnyAsync(r => r.OrderId == dto.OrderId);
            if (existing)
                return BadRequest(new { message = "You have already reviewed this order" });
        }

        var review = new StoreReview
        {
            CompanyId = companyId,
            AppCustomerId = dto.AppCustomerId,
            OrderId = dto.OrderId,
            GuestName = dto.GuestName,
            Rating = dto.Rating,
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow,
        };

        _context.StoreReviews.Add(review);
        await _context.SaveChangesAsync();

        // Update company average rating
        var avgRating = await _context.StoreReviews
            .Where(r => r.CompanyId == companyId && r.IsVisible)
            .AverageAsync(r => (double?)r.Rating) ?? 0;

        company.Rating = (int)Math.Round(avgRating);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Review submitted", id = review.Id });
    }
}

/// <summary>
/// Company owner replies to a review
/// </summary>
[ApiController]
[Route("api/online-orders/reviews")]
[Microsoft.AspNetCore.Authorization.Authorize]
public class StoreReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StoreReviewsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCompanyId()
    {
        var claim = User.FindFirst("CompanyId");
        return claim != null ? int.Parse(claim.Value) : 0;
    }

    [HttpGet]
    public async Task<ActionResult> GetStoreReviews([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var query = _context.StoreReviews
            .Where(r => r.CompanyId == companyId)
            .OrderByDescending(r => r.CreatedAt);

        var total = await query.CountAsync();
        var reviews = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(r => new
            {
                r.Id, r.Rating, r.Comment, r.Reply, r.RepliedAt,
                r.IsVisible, r.OrderId,
                CustomerName = r.AppCustomer != null ? r.AppCustomer.Name : r.GuestName,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { reviews, total, page, limit });
    }

    [HttpPut("{id}/reply")]
    public async Task<ActionResult> ReplyToReview(int id, [FromBody] ReplyDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Unauthorized();

        var review = await _context.StoreReviews
            .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);
        if (review == null) return NotFound();

        review.Reply = dto.Reply;
        review.RepliedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Reply saved" });
    }
}

public class CreateReviewDto
{
    public int? AppCustomerId { get; set; }
    public int? OrderId { get; set; }
    public string? GuestName { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
}

public class ReplyDto
{
    public string? Reply { get; set; }
}
