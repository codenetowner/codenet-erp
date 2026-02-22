using Microsoft.EntityFrameworkCore;
using Catalyst.API.Data;
using Catalyst.API.Models;
using Catalyst.API.Helpers;
using Task = System.Threading.Tasks.Task;

namespace Catalyst.API.Services;

public class AccountingService
{
    private readonly AppDbContext _context;

    public AccountingService(AppDbContext context)
    {
        _context = context;
    }

    // ===== Default Chart of Accounts Setup =====

    public async Task EnsureDefaultAccounts(int companyId)
    {
        var hasAccounts = await _context.ChartOfAccounts.AnyAsync(a => a.CompanyId == companyId);
        if (hasAccounts) return;

        var defaults = new List<ChartOfAccount>
        {
            // Assets (1xxx)
            new() { CompanyId = companyId, Code = "1000", Name = "Cash on Hand", AccountType = "asset", Category = "Current Asset", IsSystem = true },
            new() { CompanyId = companyId, Code = "1010", Name = "Bank Account", AccountType = "asset", Category = "Current Asset", IsSystem = true },
            new() { CompanyId = companyId, Code = "1020", Name = "Accounts Receivable", AccountType = "asset", Category = "Current Asset", IsSystem = true },
            new() { CompanyId = companyId, Code = "1030", Name = "Inventory", AccountType = "asset", Category = "Current Asset", IsSystem = true },
            new() { CompanyId = companyId, Code = "1035", Name = "Raw Material Inventory", AccountType = "asset", Category = "Current Asset", IsSystem = true },
            new() { CompanyId = companyId, Code = "1040", Name = "Van Cash", AccountType = "asset", Category = "Current Asset", IsSystem = true },

            // Liabilities (2xxx)
            new() { CompanyId = companyId, Code = "2000", Name = "Accounts Payable", AccountType = "liability", Category = "Current Liability", IsSystem = true },
            new() { CompanyId = companyId, Code = "2010", Name = "Customer Credits", AccountType = "liability", Category = "Current Liability", IsSystem = true },
            new() { CompanyId = companyId, Code = "2020", Name = "Tax Payable", AccountType = "liability", Category = "Current Liability", IsSystem = true },

            // Equity (3xxx)
            new() { CompanyId = companyId, Code = "3000", Name = "Owner's Equity", AccountType = "equity", Category = "Equity", IsSystem = true },
            new() { CompanyId = companyId, Code = "3010", Name = "Retained Earnings", AccountType = "equity", Category = "Equity", IsSystem = true },

            // Revenue (4xxx)
            new() { CompanyId = companyId, Code = "4000", Name = "Sales Revenue", AccountType = "revenue", Category = "Income", IsSystem = true },
            new() { CompanyId = companyId, Code = "4010", Name = "Direct Sales Revenue", AccountType = "revenue", Category = "Income", IsSystem = true },
            new() { CompanyId = companyId, Code = "4020", Name = "Online Sales Revenue", AccountType = "revenue", Category = "Income", IsSystem = true },
            new() { CompanyId = companyId, Code = "4090", Name = "Other Income", AccountType = "revenue", Category = "Income", IsSystem = true },

            // Expenses (5xxx = COGS, 6xxx = Operating)
            new() { CompanyId = companyId, Code = "5000", Name = "Cost of Goods Sold", AccountType = "expense", Category = "COGS", IsSystem = true },
            new() { CompanyId = companyId, Code = "5010", Name = "Raw Material Cost", AccountType = "expense", Category = "COGS", IsSystem = true },
            new() { CompanyId = companyId, Code = "5020", Name = "Production Cost", AccountType = "expense", Category = "COGS", IsSystem = true },
            new() { CompanyId = companyId, Code = "6000", Name = "Salaries & Wages", AccountType = "expense", Category = "Operating Expense", IsSystem = true },
            new() { CompanyId = companyId, Code = "6010", Name = "General Expenses", AccountType = "expense", Category = "Operating Expense", IsSystem = true },
            new() { CompanyId = companyId, Code = "6020", Name = "Delivery Expenses", AccountType = "expense", Category = "Operating Expense", IsSystem = true },
            new() { CompanyId = companyId, Code = "6090", Name = "Returns & Refunds", AccountType = "expense", Category = "Operating Expense", IsSystem = true },
        };

        _context.ChartOfAccounts.AddRange(defaults);
        await _context.SaveChangesAsync();
    }

    // ===== Helper: Get or create account by code =====

    private async Task<ChartOfAccount?> GetAccount(int companyId, string code)
    {
        return await _context.ChartOfAccounts
            .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.Code == code);
    }

    // ===== Helper: Generate entry number =====

    private async Task<string> GenerateEntryNumber(int companyId)
    {
        var count = await _context.JournalEntries.CountAsync(j => j.CompanyId == companyId);
        return $"JE-{(count + 1).ToString().PadLeft(5, '0')}";
    }

    // ===== Helper: Create and post a journal entry =====

    private async Task<JournalEntry?> CreateEntry(
        int companyId,
        DateTime entryDate,
        string description,
        string referenceType,
        int referenceId,
        List<(string accountCode, decimal debit, decimal credit, string? lineDescription)> lines,
        int? createdBy = null)
    {
        // Ensure accounts exist
        await EnsureDefaultAccounts(companyId);

        var entryLines = new List<JournalEntryLine>();
        decimal totalDebit = 0, totalCredit = 0;

        foreach (var (accountCode, debit, credit, lineDescription) in lines)
        {
            if (debit == 0 && credit == 0) continue;

            var account = await GetAccount(companyId, accountCode);
            if (account == null) continue;

            entryLines.Add(new JournalEntryLine
            {
                AccountId = account.Id,
                Debit = debit,
                Credit = credit,
                Description = lineDescription
            });

            // Update running balance on account
            // Assets & Expenses: debit increases, credit decreases
            // Liabilities, Equity & Revenue: credit increases, debit decreases
            if (account.AccountType == "asset" || account.AccountType == "expense")
                account.Balance += debit - credit;
            else
                account.Balance += credit - debit;

            totalDebit += debit;
            totalCredit += credit;
        }

        if (entryLines.Count == 0 || totalDebit != totalCredit) return null;

        var entry = new JournalEntry
        {
            CompanyId = companyId,
            EntryNumber = await GenerateEntryNumber(companyId),
            EntryDate = entryDate,
            Description = description,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            IsPosted = true,
            CreatedBy = createdBy,
            CreatedAt = TimeZoneHelper.Now,
            UpdatedAt = TimeZoneHelper.Now
        };

        entry.Lines = entryLines;
        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        return entry;
    }

    // ===== Auto-Posting Methods =====

    /// <summary>
    /// Post journal entry for a sales order.
    /// Debit: Cash/AR | Credit: Sales Revenue
    /// Debit: COGS | Credit: Inventory (for gross profit calculation)
    /// </summary>
    public async Task PostOrderEntry(int companyId, int orderId, decimal totalAmount, decimal paidAmount, decimal costAmount, DateTime orderDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>();
            var debtAmount = totalAmount - paidAmount;

            // Revenue recognition
            if (paidAmount > 0)
                lines.Add(("1040", paidAmount, 0, "Cash received")); // Van Cash
            if (debtAmount > 0)
                lines.Add(("1020", debtAmount, 0, "Customer credit")); // AR
            lines.Add(("4000", 0, totalAmount, "Sales revenue")); // Revenue

            // Cost of Goods Sold (for gross profit calculation)
            if (costAmount > 0)
            {
                lines.Add(("5000", costAmount, 0, "Cost of goods sold")); // COGS expense
                lines.Add(("1030", 0, costAmount, "Inventory reduction")); // Reduce inventory asset
            }

            await CreateEntry(companyId, orderDate, $"Sales Order #{orderId}", "order", orderId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post order entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a direct sale (POS).
    /// Debit: Cash | Credit: Direct Sales Revenue
    /// Debit: COGS | Credit: Inventory (for gross profit calculation)
    /// </summary>
    public async Task PostDirectSaleEntry(int companyId, int orderId, decimal totalAmount, decimal paidAmount, decimal costAmount, DateTime saleDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>();
            var debtAmount = totalAmount - paidAmount;

            // Revenue recognition
            if (paidAmount > 0)
                lines.Add(("1000", paidAmount, 0, "Cash received")); // Cash on Hand
            if (debtAmount > 0)
                lines.Add(("1020", debtAmount, 0, "Customer credit")); // AR
            lines.Add(("4010", 0, totalAmount, "Direct sales revenue")); // Revenue

            // Cost of Goods Sold (for gross profit calculation)
            if (costAmount > 0)
            {
                lines.Add(("5000", costAmount, 0, "Cost of goods sold")); // COGS expense
                lines.Add(("1030", 0, costAmount, "Inventory reduction")); // Reduce inventory asset
            }

            await CreateEntry(companyId, saleDate, $"Direct Sale #{orderId}", "direct_sale", orderId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post direct sale entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a customer collection (debt payment).
    /// Debit: Cash/Van Cash | Credit: Accounts Receivable
    /// </summary>
    public async Task PostCollectionEntry(int companyId, int collectionId, decimal amount, string paymentType, DateTime collectionDate, int? createdBy = null)
    {
        try
        {
            var cashAccount = paymentType == "cash" ? "1040" : "1010"; // Van Cash or Bank
            var lines = new List<(string, decimal, decimal, string?)>
            {
                (cashAccount, amount, 0, $"Collection received ({paymentType})"),
                ("1020", 0, amount, "Reduce accounts receivable")
            };

            await CreateEntry(companyId, collectionDate, $"Collection #{collectionId}", "collection", collectionId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post collection entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for an expense.
    /// Debit: Expense Account | Credit: Cash
    /// </summary>
    public async Task PostExpenseEntry(int companyId, int expenseId, decimal amount, DateTime expenseDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("6010", amount, 0, "Expense recorded"),
                ("1000", 0, amount, "Cash paid")
            };

            await CreateEntry(companyId, expenseDate, $"Expense #{expenseId}", "expense", expenseId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post expense entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a supplier invoice.
    /// Debit: Inventory | Credit: Accounts Payable
    /// </summary>
    public async Task PostSupplierInvoiceEntry(int companyId, int invoiceId, decimal totalAmount, DateTime invoiceDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("1030", totalAmount, 0, "Inventory purchased"),
                ("2000", 0, totalAmount, "Supplier payable")
            };

            await CreateEntry(companyId, invoiceDate, $"Supplier Invoice #{invoiceId}", "supplier_invoice", invoiceId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post supplier invoice entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a supplier payment.
    /// Debit: Accounts Payable | Credit: Cash
    /// </summary>
    public async Task PostSupplierPaymentEntry(int companyId, int paymentId, decimal amount, DateTime paymentDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("2000", amount, 0, "Reduce accounts payable"),
                ("1000", 0, amount, "Cash paid to supplier")
            };

            await CreateEntry(companyId, paymentDate, $"Supplier Payment #{paymentId}", "supplier_payment", paymentId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post supplier payment entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for an employee salary payment.
    /// Debit: Salaries & Wages | Credit: Cash
    /// </summary>
    public async Task PostSalaryEntry(int companyId, int paymentId, decimal amount, DateTime paymentDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("6000", amount, 0, "Salary payment"),
                ("1000", 0, amount, "Cash paid")
            };

            await CreateEntry(companyId, paymentDate, $"Salary Payment #{paymentId}", "salary", paymentId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post salary entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for production order completion.
    /// Debit: Inventory (finished goods) | Credit: Raw Material Inventory
    /// </summary>
    public async Task PostProductionEntry(int companyId, int productionId, decimal totalCost, DateTime completionDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("1030", totalCost, 0, "Finished goods added"),
                ("1035", 0, totalCost, "Raw materials consumed")
            };

            await CreateEntry(companyId, completionDate, $"Production #{productionId}", "production", productionId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post production entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a customer return.
    /// Debit: Returns & Refunds | Credit: Cash/Customer Credits
    /// </summary>
    public async Task PostReturnEntry(int companyId, int returnId, decimal amount, DateTime returnDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>
            {
                ("6090", amount, 0, "Return processed"),
                ("2010", 0, amount, "Customer credit issued")
            };

            await CreateEntry(companyId, returnDate, $"Return #{returnId}", "return", returnId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post return entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for a van cash deposit.
    /// Debit: Cash on Hand / Bank | Credit: Van Cash
    /// </summary>
    public async Task PostDepositEntry(int companyId, int depositId, decimal amount, string depositType, DateTime depositDate, int? createdBy = null)
    {
        try
        {
            var cashAccount = depositType == "bank" ? "1010" : "1000";
            var lines = new List<(string, decimal, decimal, string?)>
            {
                (cashAccount, amount, 0, $"Deposit received ({depositType})"),
                ("1040", 0, amount, "Van cash deposited")
            };

            await CreateEntry(companyId, depositDate, $"Deposit #{depositId}", "deposit", depositId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post deposit entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post journal entry for raw material purchase.
    /// Debit: Raw Material Inventory | Credit: Accounts Payable / Cash
    /// </summary>
    public async Task PostRawMaterialPurchaseEntry(int companyId, int purchaseId, decimal totalAmount, decimal paidAmount, DateTime purchaseDate, int? createdBy = null)
    {
        try
        {
            var lines = new List<(string, decimal, decimal, string?)>();
            var unpaidAmount = totalAmount - paidAmount;

            lines.Add(("1035", totalAmount, 0, "Raw materials purchased"));
            if (paidAmount > 0)
                lines.Add(("1000", 0, paidAmount, "Cash paid"));
            if (unpaidAmount > 0)
                lines.Add(("2000", 0, unpaidAmount, "Supplier payable"));

            await CreateEntry(companyId, purchaseDate, $"RM Purchase #{purchaseId}", "rm_purchase", purchaseId, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post raw material purchase entry: {ex.Message}");
        }
    }

    /// <summary>
    /// Post a manual journal entry (user-created).
    /// </summary>
    public async Task<JournalEntry?> PostManualEntry(
        int companyId,
        DateTime entryDate,
        string description,
        List<(string accountCode, decimal debit, decimal credit, string? lineDescription)> lines,
        int? createdBy = null)
    {
        try
        {
            return await CreateEntry(companyId, entryDate, description, "manual", 0, lines, createdBy);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Accounting] Failed to post manual entry: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// Reverse a journal entry by creating a mirror entry.
    /// </summary>
    public async Task<JournalEntry?> ReverseEntry(int companyId, int entryId, int? createdBy = null)
    {
        var original = await _context.JournalEntries
            .Include(j => j.Lines)
            .ThenInclude(l => l.Account)
            .FirstOrDefaultAsync(j => j.Id == entryId && j.CompanyId == companyId);

        if (original == null || original.IsReversed) return null;

        var reverseLines = original.Lines.Select(l => (l.Account.Code, l.Credit, l.Debit, (string?)$"Reverse: {l.Description}")).ToList();

        var reversal = await CreateEntry(
            companyId,
            TimeZoneHelper.Now,
            $"Reversal of {original.EntryNumber}: {original.Description}",
            "reversal",
            original.Id,
            reverseLines,
            createdBy
        );

        if (reversal != null)
        {
            original.IsReversed = true;
            original.ReversedById = reversal.Id;
            original.UpdatedAt = TimeZoneHelper.Now;
            await _context.SaveChangesAsync();
        }

        return reversal;
    }
}
