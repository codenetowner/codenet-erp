using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using Catalyst.API.Services;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public ExpensesController(AppDbContext context, AccountingService accountingService)
    {
        _context = context;
        _accountingService = accountingService;
    }

    private int GetCompanyId()
    {
        var companyIdClaim = User.FindFirst("company_id")?.Value;
        return string.IsNullOrEmpty(companyIdClaim) ? 0 : int.Parse(companyIdClaim);
    }

    #region Expenses

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? vanId,
        [FromQuery] int? categoryId)
    {
        var companyId = GetCompanyId();
        var query = _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.Van)
            .Where(e => e.CompanyId == companyId);

        if (startDate.HasValue)
            query = query.Where(e => e.ExpenseDate.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            query = query.Where(e => e.ExpenseDate.Date <= endDate.Value.Date);
        if (vanId.HasValue)
            query = query.Where(e => e.VanId == vanId);
        if (categoryId.HasValue)
            query = query.Where(e => e.CategoryId == categoryId);

        var expenses = await query
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenseDto
            {
                Id = e.Id,
                CategoryId = e.CategoryId,
                CategoryName = e.Category != null ? e.Category.Name : null,
                VanId = e.VanId,
                VanName = e.Van != null ? e.Van.Name : null,
                Amount = e.Amount,
                ExpenseDate = e.ExpenseDate,
                Description = e.Description,
                ReceiptUrl = e.ReceiptUrl
            })
            .ToListAsync();

        return expenses;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetExpense(int id)
    {
        var companyId = GetCompanyId();
        var e = await _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.Van)
            .FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (e == null) return NotFound();

        return new ExpenseDto
        {
            Id = e.Id,
            CategoryId = e.CategoryId,
            CategoryName = e.Category?.Name,
            VanId = e.VanId,
            VanName = e.Van?.Name,
            Amount = e.Amount,
            ExpenseDate = e.ExpenseDate,
            Description = e.Description,
            ReceiptUrl = e.ReceiptUrl
        };
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> CreateExpense(CreateExpenseDto dto)
    {
        var companyId = GetCompanyId();

        // Generate expense number
        var count = await _context.Expenses.CountAsync(e => e.CompanyId == companyId);
        var expenseNumber = $"EXP-{(count + 1).ToString().PadLeft(4, '0')}";

        var expense = new Expense
        {
            CompanyId = companyId,
            ExpenseNumber = expenseNumber,
            CategoryId = dto.CategoryId,
            VanId = dto.VanId,
            Amount = dto.Amount,
            ExpenseDate = dto.ExpenseDate,
            Description = dto.Description,
            ReceiptUrl = dto.ReceiptUrl,
            PaymentMethod = dto.PaymentMethod ?? "cash",
            Status = "approved"
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        // Auto-post accounting entry (await to avoid DbContext concurrency issues)
        await _accountingService.PostExpenseEntry(companyId, expense.Id, expense.Amount, expense.ExpenseDate);

        return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, new ExpenseDto
        {
            Id = expense.Id,
            Amount = expense.Amount,
            ExpenseDate = expense.ExpenseDate
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateExpense(int id, UpdateExpenseDto dto)
    {
        var companyId = GetCompanyId();
        var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (expense == null) return NotFound();

        expense.CategoryId = dto.CategoryId;
        expense.VanId = dto.VanId;
        expense.Amount = dto.Amount;
        expense.ExpenseDate = dto.ExpenseDate;
        expense.Description = dto.Description;
        expense.ReceiptUrl = dto.ReceiptUrl;
        expense.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var companyId = GetCompanyId();
        var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.CompanyId == companyId);

        if (expense == null) return NotFound();

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Expense Categories

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<ExpenseCategoryDto>>> GetCategories()
    {
        var companyId = GetCompanyId();
        var categories = await _context.ExpenseCategories
            .Where(c => c.CompanyId == companyId)
            .OrderByDescending(c => c.IsDefault).ThenBy(c => c.Name)
            .Select(c => new ExpenseCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsDefault = c.IsDefault,
                IsActive = c.IsActive,
                ExpenseCount = _context.Expenses.Count(e => e.CategoryId == c.Id)
            })
            .ToListAsync();

        return categories;
    }

    [HttpPost("categories")]
    public async Task<ActionResult<ExpenseCategoryDto>> CreateCategory(CreateExpenseCategoryDto dto)
    {
        var companyId = GetCompanyId();

        // If this is default, unset other defaults
        if (dto.IsDefault)
        {
            var defaults = await _context.ExpenseCategories
                .Where(c => c.CompanyId == companyId && c.IsDefault)
                .ToListAsync();
            foreach (var d in defaults)
                d.IsDefault = false;
        }

        var category = new ExpenseCategory
        {
            CompanyId = companyId,
            Name = dto.Name,
            Description = dto.Description,
            IsDefault = dto.IsDefault,
            IsActive = dto.IsActive
        };

        _context.ExpenseCategories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategories), new { }, new ExpenseCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            IsDefault = category.IsDefault,
            IsActive = category.IsActive
        });
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(int id, UpdateExpenseCategoryDto dto)
    {
        var companyId = GetCompanyId();
        var category = await _context.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (category == null) return NotFound();

        // If this is default, unset other defaults
        if (dto.IsDefault && !category.IsDefault)
        {
            var defaults = await _context.ExpenseCategories
                .Where(c => c.CompanyId == companyId && c.IsDefault && c.Id != id)
                .ToListAsync();
            foreach (var d in defaults)
                d.IsDefault = false;
        }

        category.Name = dto.Name;
        category.Description = dto.Description;
        category.IsDefault = dto.IsDefault;
        category.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var companyId = GetCompanyId();
        var category = await _context.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        if (category == null) return NotFound();

        // Check if category has expenses
        var hasExpenses = await _context.Expenses.AnyAsync(e => e.CategoryId == id);
        if (hasExpenses)
            return BadRequest(new { message = "Cannot delete category with expenses" });

        _context.ExpenseCategories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion
}

#region DTOs

public class ExpenseDto
{
    public int Id { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int? VanId { get; set; }
    public string? VanName { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; }
    public string? Description { get; set; }
    public string? ReceiptUrl { get; set; }
}

public class CreateExpenseDto
{
    public int? CategoryId { get; set; }
    public int? VanId { get; set; }
    public decimal Amount { get; set; }
    public DateTime ExpenseDate { get; set; } = TimeZoneHelper.Now;
    public string? Description { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? PaymentMethod { get; set; }
}

public class UpdateExpenseDto : CreateExpenseDto { }

public class ExpenseCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public int ExpenseCount { get; set; }
}

public class CreateExpenseCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class UpdateExpenseCategoryDto : CreateExpenseCategoryDto { }

#endregion
