using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Services;
using Catalyst.API.Helpers;

namespace Catalyst.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AccountingService _accountingService;

    public AccountingController(AppDbContext context, AccountingService accountingService)
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
        return int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
    }

    #region Chart of Accounts

    [HttpGet("accounts")]
    public async Task<ActionResult<IEnumerable<AccountDto>>> GetAccounts([FromQuery] string? type, [FromQuery] bool? activeOnly)
    {
        var companyId = GetCompanyId();

        // Ensure default accounts exist
        await _accountingService.EnsureDefaultAccounts(companyId);

        var query = _context.ChartOfAccounts
            .Where(a => a.CompanyId == companyId);

        if (!string.IsNullOrEmpty(type))
            query = query.Where(a => a.AccountType == type);

        if (activeOnly == true)
            query = query.Where(a => a.IsActive);

        var accounts = await query
            .OrderBy(a => a.Code)
            .Select(a => new AccountDto
            {
                Id = a.Id,
                Code = a.Code,
                Name = a.Name,
                AccountType = a.AccountType,
                Category = a.Category,
                ParentId = a.ParentId,
                ParentName = a.Parent != null ? a.Parent.Name : null,
                Description = a.Description,
                IsSystem = a.IsSystem,
                IsActive = a.IsActive,
                Balance = a.Balance,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return accounts;
    }

    [HttpGet("accounts/{id}")]
    public async Task<ActionResult<AccountDto>> GetAccount(int id)
    {
        var companyId = GetCompanyId();
        var account = await _context.ChartOfAccounts
            .Include(a => a.Parent)
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);

        if (account == null) return NotFound();

        return new AccountDto
        {
            Id = account.Id,
            Code = account.Code,
            Name = account.Name,
            AccountType = account.AccountType,
            Category = account.Category,
            ParentId = account.ParentId,
            ParentName = account.Parent?.Name,
            Description = account.Description,
            IsSystem = account.IsSystem,
            IsActive = account.IsActive,
            Balance = account.Balance,
            CreatedAt = account.CreatedAt
        };
    }

    [HttpPost("accounts")]
    public async Task<ActionResult<AccountDto>> CreateAccount(CreateAccountDto dto)
    {
        var companyId = GetCompanyId();

        // Check code uniqueness
        var exists = await _context.ChartOfAccounts
            .AnyAsync(a => a.CompanyId == companyId && a.Code == dto.Code);
        if (exists)
            return BadRequest(new { message = "Account code already exists" });

        var account = new ChartOfAccount
        {
            CompanyId = companyId,
            Code = dto.Code,
            Name = dto.Name,
            AccountType = dto.AccountType,
            Category = dto.Category,
            ParentId = dto.ParentId,
            Description = dto.Description,
            IsSystem = false,
            IsActive = true,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        _context.ChartOfAccounts.Add(account);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, new AccountDto
        {
            Id = account.Id,
            Code = account.Code,
            Name = account.Name,
            AccountType = account.AccountType,
            Category = account.Category,
            IsActive = account.IsActive,
            Balance = account.Balance
        });
    }

    [HttpPut("accounts/{id}")]
    public async Task<IActionResult> UpdateAccount(int id, UpdateAccountDto dto)
    {
        var companyId = GetCompanyId();
        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);

        if (account == null) return NotFound();

        // Don't allow changing code of system accounts
        if (account.IsSystem && dto.Code != account.Code)
            return BadRequest(new { message = "Cannot change code of system account" });

        // Check code uniqueness if changed
        if (dto.Code != account.Code)
        {
            var exists = await _context.ChartOfAccounts
                .AnyAsync(a => a.CompanyId == companyId && a.Code == dto.Code && a.Id != id);
            if (exists)
                return BadRequest(new { message = "Account code already exists" });
        }

        account.Code = dto.Code;
        account.Name = dto.Name;
        account.AccountType = dto.AccountType;
        account.Category = dto.Category;
        account.ParentId = dto.ParentId;
        account.Description = dto.Description;
        account.IsActive = dto.IsActive;
        account.UpdatedAt = TimeZoneHelper.Now;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("accounts/{id}")]
    public async Task<IActionResult> DeleteAccount(int id)
    {
        var companyId = GetCompanyId();
        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);

        if (account == null) return NotFound();
        if (account.IsSystem)
            return BadRequest(new { message = "Cannot delete system account" });

        // Check if account has journal entries
        var hasEntries = await _context.JournalEntryLines.AnyAsync(l => l.AccountId == id);
        if (hasEntries)
            return BadRequest(new { message = "Cannot delete account with journal entries" });

        // Check if account has children
        var hasChildren = await _context.ChartOfAccounts.AnyAsync(a => a.ParentId == id);
        if (hasChildren)
            return BadRequest(new { message = "Cannot delete account with sub-accounts" });

        _context.ChartOfAccounts.Remove(account);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Journal Entries

    [HttpGet("journal-entries")]
    public async Task<ActionResult<IEnumerable<JournalEntryDto>>> GetJournalEntries(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? referenceType,
        [FromQuery] bool? posted)
    {
        var companyId = GetCompanyId();
        var query = _context.JournalEntries
            .Include(j => j.Lines)
            .ThenInclude(l => l.Account)
            .Where(j => j.CompanyId == companyId);

        if (startDate.HasValue)
            query = query.Where(j => j.EntryDate.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            query = query.Where(j => j.EntryDate.Date <= endDate.Value.Date);
        if (!string.IsNullOrEmpty(referenceType))
            query = query.Where(j => j.ReferenceType == referenceType);
        if (posted.HasValue)
            query = query.Where(j => j.IsPosted == posted.Value);

        var entries = await query
            .OrderByDescending(j => j.EntryDate)
            .ThenByDescending(j => j.Id)
            .Take(500)
            .Select(j => new JournalEntryDto
            {
                Id = j.Id,
                EntryNumber = j.EntryNumber,
                EntryDate = j.EntryDate,
                Description = j.Description,
                ReferenceType = j.ReferenceType,
                ReferenceId = j.ReferenceId,
                TotalDebit = j.TotalDebit,
                TotalCredit = j.TotalCredit,
                IsPosted = j.IsPosted,
                IsReversed = j.IsReversed,
                CreatedAt = j.CreatedAt,
                Lines = j.Lines.Select(l => new JournalEntryLineDto
                {
                    Id = l.Id,
                    AccountId = l.AccountId,
                    AccountCode = l.Account.Code,
                    AccountName = l.Account.Name,
                    Debit = l.Debit,
                    Credit = l.Credit,
                    Description = l.Description
                }).ToList()
            })
            .ToListAsync();

        return entries;
    }

    [HttpGet("journal-entries/{id}")]
    public async Task<ActionResult<JournalEntryDto>> GetJournalEntry(int id)
    {
        var companyId = GetCompanyId();
        var entry = await _context.JournalEntries
            .Include(j => j.Lines)
            .ThenInclude(l => l.Account)
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

        if (entry == null) return NotFound();

        return new JournalEntryDto
        {
            Id = entry.Id,
            EntryNumber = entry.EntryNumber,
            EntryDate = entry.EntryDate,
            Description = entry.Description,
            ReferenceType = entry.ReferenceType,
            ReferenceId = entry.ReferenceId,
            TotalDebit = entry.TotalDebit,
            TotalCredit = entry.TotalCredit,
            IsPosted = entry.IsPosted,
            IsReversed = entry.IsReversed,
            CreatedAt = entry.CreatedAt,
            Lines = entry.Lines.Select(l => new JournalEntryLineDto
            {
                Id = l.Id,
                AccountId = l.AccountId,
                AccountCode = l.Account.Code,
                AccountName = l.Account.Name,
                Debit = l.Debit,
                Credit = l.Credit,
                Description = l.Description
            }).ToList()
        };
    }

    [HttpPost("journal-entries")]
    public async Task<ActionResult<JournalEntryDto>> CreateManualEntry(CreateJournalEntryDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        if (dto.Lines == null || dto.Lines.Count < 2)
            return BadRequest(new { message = "At least 2 lines required" });

        var totalDebit = dto.Lines.Sum(l => l.Debit);
        var totalCredit = dto.Lines.Sum(l => l.Credit);
        if (totalDebit != totalCredit)
            return BadRequest(new { message = $"Debits ({totalDebit:F3}) must equal Credits ({totalCredit:F3})" });

        var lines = dto.Lines.Select(l => (l.AccountCode, l.Debit, l.Credit, l.Description)).ToList();

        var entry = await _accountingService.PostManualEntry(
            companyId,
            dto.EntryDate,
            dto.Description ?? "Manual journal entry",
            lines!,
            userId
        );

        if (entry == null)
            return BadRequest(new { message = "Failed to create journal entry. Check account codes." });

        // Reload with lines
        var created = await _context.JournalEntries
            .Include(j => j.Lines)
            .ThenInclude(l => l.Account)
            .FirstAsync(j => j.Id == entry.Id);

        return CreatedAtAction(nameof(GetJournalEntry), new { id = created.Id }, new JournalEntryDto
        {
            Id = created.Id,
            EntryNumber = created.EntryNumber,
            EntryDate = created.EntryDate,
            Description = created.Description,
            ReferenceType = created.ReferenceType,
            TotalDebit = created.TotalDebit,
            TotalCredit = created.TotalCredit,
            IsPosted = created.IsPosted,
            CreatedAt = created.CreatedAt,
            Lines = created.Lines.Select(l => new JournalEntryLineDto
            {
                Id = l.Id,
                AccountId = l.AccountId,
                AccountCode = l.Account.Code,
                AccountName = l.Account.Name,
                Debit = l.Debit,
                Credit = l.Credit,
                Description = l.Description
            }).ToList()
        });
    }

    [HttpPost("journal-entries/{id}/reverse")]
    public async Task<IActionResult> ReverseEntry(int id)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var reversal = await _accountingService.ReverseEntry(companyId, id, userId);
        if (reversal == null)
            return BadRequest(new { message = "Cannot reverse this entry. It may already be reversed or not found." });

        return Ok(new { message = "Entry reversed successfully", reversalId = reversal.Id });
    }

    #endregion

    #region Account Ledger

    [HttpGet("ledger/{accountId}")]
    public async Task<ActionResult<AccountLedgerDto>> GetAccountLedger(
        int accountId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var companyId = GetCompanyId();
        var account = await _context.ChartOfAccounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

        if (account == null) return NotFound();

        var query = _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId && l.JournalEntry.CompanyId == companyId && l.JournalEntry.IsPosted);

        if (startDate.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate.Date >= startDate.Value.Date);
        if (endDate.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate.Date <= endDate.Value.Date);

        var lines = await query
            .OrderBy(l => l.JournalEntry.EntryDate)
            .ThenBy(l => l.JournalEntry.Id)
            .Select(l => new LedgerLineDto
            {
                Id = l.Id,
                EntryDate = l.JournalEntry.EntryDate,
                EntryNumber = l.JournalEntry.EntryNumber,
                Description = l.Description ?? l.JournalEntry.Description,
                ReferenceType = l.JournalEntry.ReferenceType,
                ReferenceId = l.JournalEntry.ReferenceId,
                Debit = l.Debit,
                Credit = l.Credit
            })
            .ToListAsync();

        // Calculate running balance
        decimal runningBalance = 0;
        var isDebitNormal = account.AccountType == "asset" || account.AccountType == "expense";
        foreach (var line in lines)
        {
            if (isDebitNormal)
                runningBalance += line.Debit - line.Credit;
            else
                runningBalance += line.Credit - line.Debit;
            line.RunningBalance = runningBalance;
        }

        return new AccountLedgerDto
        {
            AccountId = account.Id,
            AccountCode = account.Code,
            AccountName = account.Name,
            AccountType = account.AccountType,
            CurrentBalance = account.Balance,
            Lines = lines
        };
    }

    #endregion

    #region Financial Reports

    [HttpGet("reports/trial-balance")]
    public async Task<ActionResult<IEnumerable<TrialBalanceLineDto>>> GetTrialBalance([FromQuery] DateTime? asOfDate)
    {
        var companyId = GetCompanyId();
        await _accountingService.EnsureDefaultAccounts(companyId);

        var query = _context.ChartOfAccounts
            .Where(a => a.CompanyId == companyId && a.IsActive);

        var accounts = await query.OrderBy(a => a.Code).ToListAsync();

        // If asOfDate provided, calculate balances from journal entries up to that date
        if (asOfDate.HasValue)
        {
            var balances = await _context.JournalEntryLines
                .Include(l => l.JournalEntry)
                .Where(l => l.JournalEntry.CompanyId == companyId
                    && l.JournalEntry.IsPosted
                    && l.JournalEntry.EntryDate.Date <= asOfDate.Value.Date)
                .GroupBy(l => l.AccountId)
                .Select(g => new { AccountId = g.Key, TotalDebit = g.Sum(l => l.Debit), TotalCredit = g.Sum(l => l.Credit) })
                .ToListAsync();

            return accounts.Select(a =>
            {
                var bal = balances.FirstOrDefault(b => b.AccountId == a.Id);
                var debit = bal?.TotalDebit ?? 0;
                var credit = bal?.TotalCredit ?? 0;
                return new TrialBalanceLineDto
                {
                    AccountId = a.Id,
                    AccountCode = a.Code,
                    AccountName = a.Name,
                    AccountType = a.AccountType,
                    Category = a.Category,
                    Debit = debit,
                    Credit = credit,
                    Balance = (a.AccountType == "asset" || a.AccountType == "expense") ? debit - credit : credit - debit
                };
            }).Where(t => t.Debit != 0 || t.Credit != 0).ToList();
        }

        // Use running balance
        return accounts.Select(a => new TrialBalanceLineDto
        {
            AccountId = a.Id,
            AccountCode = a.Code,
            AccountName = a.Name,
            AccountType = a.AccountType,
            Category = a.Category,
            Debit = (a.AccountType == "asset" || a.AccountType == "expense") && a.Balance > 0 ? a.Balance : 0,
            Credit = (a.AccountType == "liability" || a.AccountType == "equity" || a.AccountType == "revenue") && a.Balance > 0 ? a.Balance : 0,
            Balance = a.Balance
        }).Where(t => t.Balance != 0).ToList();
    }

    [HttpGet("reports/income-statement")]
    public async Task<ActionResult<IncomeStatementDto>> GetIncomeStatement(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var companyId = GetCompanyId();

        var entries = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Include(l => l.Account)
            .Where(l => l.JournalEntry.CompanyId == companyId
                && l.JournalEntry.IsPosted
                && l.JournalEntry.EntryDate.Date >= startDate.Date
                && l.JournalEntry.EntryDate.Date <= endDate.Date
                && (l.Account.AccountType == "revenue" || l.Account.AccountType == "expense"))
            .ToListAsync();

        var revenueAccounts = entries
            .Where(l => l.Account.AccountType == "revenue")
            .GroupBy(l => new { l.AccountId, l.Account.Code, l.Account.Name, l.Account.Category })
            .Select(g => new IncomeStatementLineDto
            {
                AccountCode = g.Key.Code,
                AccountName = g.Key.Name,
                Category = g.Key.Category,
                Amount = g.Sum(l => l.Credit) - g.Sum(l => l.Debit)
            })
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var expenseAccounts = entries
            .Where(l => l.Account.AccountType == "expense")
            .GroupBy(l => new { l.AccountId, l.Account.Code, l.Account.Name, l.Account.Category })
            .Select(g => new IncomeStatementLineDto
            {
                AccountCode = g.Key.Code,
                AccountName = g.Key.Name,
                Category = g.Key.Category,
                Amount = g.Sum(l => l.Debit) - g.Sum(l => l.Credit)
            })
            .Where(l => l.Amount != 0)
            .OrderBy(l => l.AccountCode)
            .ToList();

        var totalRevenue = revenueAccounts.Sum(r => r.Amount);
        var cogsAccounts = expenseAccounts.Where(e => e.Category == "COGS").ToList();
        var operatingAccounts = expenseAccounts.Where(e => e.Category != "COGS").ToList();
        var totalCogs = cogsAccounts.Sum(e => e.Amount);
        var totalOperating = operatingAccounts.Sum(e => e.Amount);

        return new IncomeStatementDto
        {
            StartDate = startDate,
            EndDate = endDate,
            Revenue = revenueAccounts,
            TotalRevenue = totalRevenue,
            CostOfGoodsSold = cogsAccounts,
            TotalCOGS = totalCogs,
            GrossProfit = totalRevenue - totalCogs,
            OperatingExpenses = operatingAccounts,
            TotalOperatingExpenses = totalOperating,
            NetProfit = totalRevenue - totalCogs - totalOperating
        };
    }

    [HttpGet("reports/balance-sheet")]
    public async Task<ActionResult<BalanceSheetDto>> GetBalanceSheet([FromQuery] DateTime? asOfDate)
    {
        var companyId = GetCompanyId();
        var targetDate = asOfDate ?? TimeZoneHelper.Today;

        await _accountingService.EnsureDefaultAccounts(companyId);

        var balances = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Include(l => l.Account)
            .Where(l => l.JournalEntry.CompanyId == companyId
                && l.JournalEntry.IsPosted
                && l.JournalEntry.EntryDate.Date <= targetDate.Date)
            .GroupBy(l => new { l.AccountId, l.Account.Code, l.Account.Name, l.Account.AccountType, l.Account.Category })
            .Select(g => new
            {
                g.Key.Code,
                g.Key.Name,
                g.Key.AccountType,
                g.Key.Category,
                Debit = g.Sum(l => l.Debit),
                Credit = g.Sum(l => l.Credit)
            })
            .ToListAsync();

        var assets = balances
            .Where(b => b.AccountType == "asset")
            .Select(b => new BalanceSheetLineDto { AccountCode = b.Code, AccountName = b.Name, Category = b.Category, Amount = b.Debit - b.Credit })
            .Where(b => b.Amount != 0)
            .OrderBy(b => b.AccountCode)
            .ToList();

        var liabilities = balances
            .Where(b => b.AccountType == "liability")
            .Select(b => new BalanceSheetLineDto { AccountCode = b.Code, AccountName = b.Name, Category = b.Category, Amount = b.Credit - b.Debit })
            .Where(b => b.Amount != 0)
            .OrderBy(b => b.AccountCode)
            .ToList();

        var equity = balances
            .Where(b => b.AccountType == "equity")
            .Select(b => new BalanceSheetLineDto { AccountCode = b.Code, AccountName = b.Name, Category = b.Category, Amount = b.Credit - b.Debit })
            .Where(b => b.Amount != 0)
            .OrderBy(b => b.AccountCode)
            .ToList();

        // Calculate retained earnings (revenue - expenses for all time up to asOfDate)
        var revenueTotal = balances.Where(b => b.AccountType == "revenue").Sum(b => b.Credit - b.Debit);
        var expenseTotal = balances.Where(b => b.AccountType == "expense").Sum(b => b.Debit - b.Credit);
        var retainedEarnings = revenueTotal - expenseTotal;

        if (retainedEarnings != 0)
        {
            var existing = equity.FirstOrDefault(e => e.AccountCode == "3010");
            if (existing != null)
                existing.Amount += retainedEarnings;
            else
                equity.Add(new BalanceSheetLineDto { AccountCode = "3010", AccountName = "Retained Earnings", Category = "Equity", Amount = retainedEarnings });
        }

        return new BalanceSheetDto
        {
            AsOfDate = targetDate,
            Assets = assets,
            TotalAssets = assets.Sum(a => a.Amount),
            Liabilities = liabilities,
            TotalLiabilities = liabilities.Sum(l => l.Amount),
            Equity = equity,
            TotalEquity = equity.Sum(e => e.Amount),
            TotalLiabilitiesAndEquity = liabilities.Sum(l => l.Amount) + equity.Sum(e => e.Amount)
        };
    }

    #endregion

    #region Reset

    /// <summary>
    /// Reset all accounting data (journal entries and balances) for the company.
    /// This deletes all journal entries and resets account balances to zero.
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> ResetAccounting()
    {
        var companyId = GetCompanyId();

        // Delete all journal entry lines first (due to FK constraint)
        var entryIds = await _context.JournalEntries
            .Where(j => j.CompanyId == companyId)
            .Select(j => j.Id)
            .ToListAsync();

        if (entryIds.Any())
        {
            await _context.JournalEntryLines
                .Where(l => entryIds.Contains(l.JournalEntryId))
                .ExecuteDeleteAsync();

            // Delete all journal entries
            await _context.JournalEntries
                .Where(j => j.CompanyId == companyId)
                .ExecuteDeleteAsync();
        }

        // Reset all account balances to zero
        await _context.ChartOfAccounts
            .Where(a => a.CompanyId == companyId)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, 0));

        return Ok(new { message = "Accounting data reset successfully", entriesDeleted = entryIds.Count });
    }

    #endregion
}

#region DTOs

public class AccountDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int? ParentId { get; set; }
    public string? ParentName { get; set; }
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
    public decimal Balance { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAccountDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int? ParentId { get; set; }
    public string? Description { get; set; }
}

public class UpdateAccountDto : CreateAccountDto
{
    public bool IsActive { get; set; } = true;
}

public class JournalEntryDto
{
    public int Id { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public DateTime EntryDate { get; set; }
    public string? Description { get; set; }
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public bool IsPosted { get; set; }
    public bool IsReversed { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<JournalEntryLineDto> Lines { get; set; } = new();
}

public class JournalEntryLineDto
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Description { get; set; }
}

public class CreateJournalEntryDto
{
    public DateTime EntryDate { get; set; }
    public string? Description { get; set; }
    public List<CreateJournalEntryLineDto> Lines { get; set; } = new();
}

public class CreateJournalEntryLineDto
{
    public string AccountCode { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Description { get; set; }
}

public class AccountLedgerDto
{
    public int AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public List<LedgerLineDto> Lines { get; set; } = new();
}

public class LedgerLineDto
{
    public int Id { get; set; }
    public DateTime EntryDate { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ReferenceType { get; set; }
    public int? ReferenceId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }
}

public class TrialBalanceLineDto
{
    public int AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
}

public class IncomeStatementDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<IncomeStatementLineDto> Revenue { get; set; } = new();
    public decimal TotalRevenue { get; set; }
    public List<IncomeStatementLineDto> CostOfGoodsSold { get; set; } = new();
    public decimal TotalCOGS { get; set; }
    public decimal GrossProfit { get; set; }
    public List<IncomeStatementLineDto> OperatingExpenses { get; set; } = new();
    public decimal TotalOperatingExpenses { get; set; }
    public decimal NetProfit { get; set; }
}

public class IncomeStatementLineDto
{
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal Amount { get; set; }
}

public class BalanceSheetDto
{
    public DateTime AsOfDate { get; set; }
    public List<BalanceSheetLineDto> Assets { get; set; } = new();
    public decimal TotalAssets { get; set; }
    public List<BalanceSheetLineDto> Liabilities { get; set; } = new();
    public decimal TotalLiabilities { get; set; }
    public List<BalanceSheetLineDto> Equity { get; set; } = new();
    public decimal TotalEquity { get; set; }
    public decimal TotalLiabilitiesAndEquity { get; set; }
}

public class BalanceSheetLineDto
{
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal Amount { get; set; }
}

#endregion
