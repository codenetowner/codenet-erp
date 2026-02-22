using Microsoft.EntityFrameworkCore;
using Catalyst.API.Models;

namespace Catalyst.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // SuperAdmin Tables
    public DbSet<Plan> Plans { get; set; }
    public DbSet<Company> Companies { get; set; }
    public DbSet<SuperadminUser> SuperadminUsers { get; set; }
    public DbSet<Billing> Billings { get; set; }

    // Company Tables
    public DbSet<Role> Roles { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<Van> Vans { get; set; }
    public DbSet<ProductCategory> ProductCategories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Inventory> Inventories { get; set; }
    public DbSet<VanInventory> VanInventories { get; set; }
    public DbSet<InventoryMovement> InventoryMovements { get; set; }
    public DbSet<InventorySettings> InventorySettings { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<CustomerSpecialPrice> CustomerSpecialPrices { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Collection> Collections { get; set; }
    public DbSet<Deposit> Deposits { get; set; }
    public DbSet<VanCash> VanCash { get; set; }
    public DbSet<Models.Task> Tasks { get; set; }
    public DbSet<TaskItem> TaskItems { get; set; }
    public DbSet<TaskCustomer> TaskCustomers { get; set; }
    public DbSet<DriverShift> DriverShifts { get; set; }
    public DbSet<EmployeePayment> EmployeePayments { get; set; }
    public DbSet<Return> Returns { get; set; }
    public DbSet<ReturnItem> ReturnItems { get; set; }
    public DbSet<Quote> Quotes { get; set; }
    public DbSet<QuoteItem> QuoteItems { get; set; }
    public DbSet<Lead> Leads { get; set; }
    public DbSet<SyncQueue> SyncQueue { get; set; }
    public DbSet<ProductCostHistory> ProductCostHistories { get; set; }
    public DbSet<Currency> Currencies { get; set; }
    public DbSet<ExpenseCategory> ExpenseCategories { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
    public DbSet<PurchaseInvoice> PurchaseInvoices { get; set; }
    public DbSet<PurchaseInvoiceItem> PurchaseInvoiceItems { get; set; }
    public DbSet<SupplierPayment> SupplierPayments { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<Attendance> Attendances { get; set; }
    public DbSet<ReturnExchange> ReturnExchanges { get; set; }
    public DbSet<ReturnExchangeItem> ReturnExchangeItems { get; set; }
    public DbSet<EmployeeCustomer> EmployeeCustomers { get; set; }
    public DbSet<EmployeeProduct> EmployeeProducts { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    
    // Online Store / Marketplace
    public DbSet<StoreCategory> StoreCategories { get; set; }
    public DbSet<CompanyStoreCategory> CompanyStoreCategories { get; set; }
    public DbSet<AdPlacement> AdPlacements { get; set; }
    public DbSet<Ad> Ads { get; set; }
    public DbSet<PremiumSubscription> PremiumSubscriptions { get; set; }
    public DbSet<AppCustomer> AppCustomers { get; set; }
    public DbSet<AppCustomerAddress> AppCustomerAddresses { get; set; }
    public DbSet<OnlineOrder> OnlineOrders { get; set; }
    public DbSet<OnlineOrderItem> OnlineOrderItems { get; set; }
    public DbSet<AppFavorite> AppFavorites { get; set; }
    public DbSet<FreelanceDriver> FreelanceDrivers { get; set; }
    public DbSet<DeliveryCompany> DeliveryCompanies { get; set; }
    public DbSet<StoreReview> StoreReviews { get; set; }

    // Raw Materials & Production
    public DbSet<RawMaterial> RawMaterials { get; set; }
    public DbSet<RawMaterialInventory> RawMaterialInventories { get; set; }
    public DbSet<RawMaterialPurchase> RawMaterialPurchases { get; set; }
    public DbSet<RawMaterialPurchaseItem> RawMaterialPurchaseItems { get; set; }
    public DbSet<ProductionOrder> ProductionOrders { get; set; }
    public DbSet<ProductionOrderMaterial> ProductionOrderMaterials { get; set; }
    public DbSet<ProductionOrderCost> ProductionOrderCosts { get; set; }

    // Accounting
    public DbSet<ChartOfAccount> ChartOfAccounts { get; set; }
    public DbSet<JournalEntry> JournalEntries { get; set; }
    public DbSet<JournalEntryLine> JournalEntryLines { get; set; }

    // Licensing
    public DbSet<License> Licenses { get; set; }
    public DbSet<LicenseActivation> LicenseActivations { get; set; }

    // Sidebar Customization
    public DbSet<SidebarSection> SidebarSections { get; set; }
    public DbSet<SidebarPageAssignment> SidebarPageAssignments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Plan -> Companies
        modelBuilder.Entity<Company>()
            .HasOne(c => c.Plan)
            .WithMany(p => p.Companies)
            .HasForeignKey(c => c.PlanId)
            .OnDelete(DeleteBehavior.SetNull);

        // Company -> Employees
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Company)
            .WithMany(c => c.Employees)
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company -> Warehouses
        modelBuilder.Entity<Warehouse>()
            .HasOne(w => w.Company)
            .WithMany(c => c.Warehouses)
            .HasForeignKey(w => w.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company -> Vans
        modelBuilder.Entity<Van>()
            .HasOne(v => v.Company)
            .WithMany(c => c.Vans)
            .HasForeignKey(v => v.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company -> Products
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Company)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Company -> Customers
        modelBuilder.Entity<Customer>()
            .HasOne(c => c.Company)
            .WithMany(co => co.Customers)
            .HasForeignKey(c => c.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Employee -> Role
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Role)
            .WithMany(r => r.Employees)
            .HasForeignKey(e => e.RoleId)
            .OnDelete(DeleteBehavior.SetNull);

        // Employee -> Warehouse
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Warehouse)
            .WithMany()
            .HasForeignKey(e => e.WarehouseId)
            .OnDelete(DeleteBehavior.SetNull);

        // Employee -> Van
        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Van)
            .WithMany()
            .HasForeignKey(e => e.VanId)
            .OnDelete(DeleteBehavior.SetNull);

        // Warehouse -> Manager (Employee)
        modelBuilder.Entity<Warehouse>()
            .HasOne(w => w.Manager)
            .WithMany()
            .HasForeignKey(w => w.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Van -> AssignedDriver (Employee)
        modelBuilder.Entity<Van>()
            .HasOne(v => v.AssignedDriver)
            .WithMany()
            .HasForeignKey(v => v.AssignedDriverId)
            .OnDelete(DeleteBehavior.SetNull);

        // Product -> Category
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // Category -> Parent (self-reference)
        modelBuilder.Entity<ProductCategory>()
            .HasOne(c => c.Parent)
            .WithMany(c => c.Children)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Order -> Customer
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Order -> OrderItems
        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.OrderItems)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // OrderItem -> Product (SetNull to preserve order history when product is deleted)
        modelBuilder.Entity<OrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany(p => p.OrderItems)
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        // TaskItem -> Product (SetNull to preserve task history when product is deleted)
        modelBuilder.Entity<TaskItem>()
            .HasOne(ti => ti.Product)
            .WithMany()
            .HasForeignKey(ti => ti.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        // Collection -> Customer
        modelBuilder.Entity<Collection>()
            .HasOne(c => c.Customer)
            .WithMany(cu => cu.Collections)
            .HasForeignKey(c => c.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Task relationships
        modelBuilder.Entity<Models.Task>()
            .HasOne(t => t.Customer)
            .WithMany()
            .HasForeignKey(t => t.CustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Models.Task>()
            .HasOne(t => t.Driver)
            .WithMany()
            .HasForeignKey(t => t.DriverId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Models.Task>()
            .HasOne(t => t.Van)
            .WithMany()
            .HasForeignKey(t => t.VanId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Models.Task>()
            .HasOne(t => t.Warehouse)
            .WithMany()
            .HasForeignKey(t => t.WarehouseId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Models.Task>()
            .HasOne(t => t.Supplier)
            .WithMany()
            .HasForeignKey(t => t.SupplierId)
            .OnDelete(DeleteBehavior.SetNull);

        // TaskItem relationships
        modelBuilder.Entity<TaskItem>()
            .HasOne(ti => ti.Task)
            .WithMany(t => t.Items)
            .HasForeignKey(ti => ti.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskItem>()
            .HasOne(ti => ti.Product)
            .WithMany()
            .HasForeignKey(ti => ti.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskCustomer relationships
        modelBuilder.Entity<TaskCustomer>()
            .HasOne(tc => tc.Task)
            .WithMany(t => t.TaskCustomers)
            .HasForeignKey(tc => tc.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskCustomer>()
            .HasOne(tc => tc.Customer)
            .WithMany()
            .HasForeignKey(tc => tc.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskCustomer>()
            .HasIndex(tc => new { tc.TaskId, tc.CustomerId })
            .IsUnique();

        // DriverShift relationships
        modelBuilder.Entity<DriverShift>()
            .HasOne(ds => ds.Driver)
            .WithMany()
            .HasForeignKey(ds => ds.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DriverShift>()
            .HasOne(ds => ds.Van)
            .WithMany()
            .HasForeignKey(ds => ds.VanId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DriverShift>()
            .HasIndex(ds => new { ds.DriverId, ds.ShiftDate })
            .IsUnique();

        // ProductVariant -> Product
        modelBuilder.Entity<ProductVariant>()
            .HasOne(pv => pv.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(pv => pv.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductVariant>()
            .HasOne(pv => pv.Company)
            .WithMany()
            .HasForeignKey(pv => pv.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Inventory unique constraint (product + warehouse + variant)
        modelBuilder.Entity<Inventory>()
            .HasIndex(i => new { i.ProductId, i.WarehouseId, i.VariantId })
            .IsUnique();

        // VanInventory unique constraint
        modelBuilder.Entity<VanInventory>()
            .HasIndex(vi => new { vi.VanId, vi.ProductId })
            .IsUnique();

        // Unique constraints
        modelBuilder.Entity<Company>()
            .HasIndex(c => c.Username)
            .IsUnique();

        modelBuilder.Entity<Employee>()
            .HasIndex(e => new { e.CompanyId, e.Username })
            .IsUnique();

        modelBuilder.Entity<Product>()
            .HasIndex(p => new { p.CompanyId, p.Sku })
            .IsUnique();

        modelBuilder.Entity<Order>()
            .HasIndex(o => new { o.CompanyId, o.OrderNumber })
            .IsUnique();

        // CustomerSpecialPrice unique constraint (customer + product + unit_type)
        modelBuilder.Entity<CustomerSpecialPrice>()
            .HasIndex(csp => new { csp.CustomerId, csp.ProductId, csp.UnitType })
            .IsUnique();

        // CustomerSpecialPrice -> Customer
        modelBuilder.Entity<CustomerSpecialPrice>()
            .HasOne(csp => csp.Customer)
            .WithMany()
            .HasForeignKey(csp => csp.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        // CustomerSpecialPrice -> Product
        modelBuilder.Entity<CustomerSpecialPrice>()
            .HasOne(csp => csp.Product)
            .WithMany()
            .HasForeignKey(csp => csp.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Deposit -> Driver (Employee)
        modelBuilder.Entity<Deposit>()
            .HasOne(d => d.Driver)
            .WithMany()
            .HasForeignKey(d => d.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Deposit -> Receiver (Employee)
        modelBuilder.Entity<Deposit>()
            .HasOne(d => d.Receiver)
            .WithMany()
            .HasForeignKey(d => d.ReceivedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // VanCash -> Van
        modelBuilder.Entity<VanCash>()
            .HasOne(vc => vc.Van)
            .WithMany()
            .HasForeignKey(vc => vc.VanId)
            .OnDelete(DeleteBehavior.Cascade);

        // VanCash -> Driver (Employee)
        modelBuilder.Entity<VanCash>()
            .HasOne(vc => vc.Driver)
            .WithMany()
            .HasForeignKey(vc => vc.DriverId)
            .OnDelete(DeleteBehavior.SetNull);

        // ReturnExchange -> OriginalOrder
        modelBuilder.Entity<ReturnExchange>()
            .HasOne(re => re.OriginalOrder)
            .WithMany()
            .HasForeignKey(re => re.OriginalOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        // ReturnExchange -> Customer
        modelBuilder.Entity<ReturnExchange>()
            .HasOne(re => re.Customer)
            .WithMany()
            .HasForeignKey(re => re.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // ReturnExchange -> Items (both ReturnItems and ExchangeItems use same FK, differentiated by ItemType)
        modelBuilder.Entity<ReturnExchange>()
            .HasMany(re => re.ReturnItems)
            .WithOne(rei => rei.ReturnExchange)
            .HasForeignKey(rei => rei.ReturnExchangeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Ignore ExchangeItems navigation - use ReturnItems and filter by ItemType in queries
        modelBuilder.Entity<ReturnExchange>()
            .Ignore(re => re.ExchangeItems);

        // ReturnExchangeItem -> Product
        modelBuilder.Entity<ReturnExchangeItem>()
            .HasOne(rei => rei.Product)
            .WithMany()
            .HasForeignKey(rei => rei.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // ReturnExchange unique constraint
        modelBuilder.Entity<ReturnExchange>()
            .HasIndex(re => new { re.CompanyId, re.TransactionNumber })
            .IsUnique();

        // Raw Material relationships
        modelBuilder.Entity<RawMaterial>()
            .HasOne(rm => rm.Company)
            .WithMany()
            .HasForeignKey(rm => rm.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RawMaterialInventory>()
            .HasOne(rmi => rmi.RawMaterial)
            .WithMany(rm => rm.Inventories)
            .HasForeignKey(rmi => rmi.RawMaterialId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RawMaterialInventory>()
            .HasOne(rmi => rmi.Warehouse)
            .WithMany()
            .HasForeignKey(rmi => rmi.WarehouseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RawMaterialInventory>()
            .HasIndex(rmi => new { rmi.RawMaterialId, rmi.WarehouseId })
            .IsUnique();

        // Raw Material Purchase relationships
        modelBuilder.Entity<RawMaterialPurchase>()
            .HasOne(rmp => rmp.Company)
            .WithMany()
            .HasForeignKey(rmp => rmp.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RawMaterialPurchaseItem>()
            .HasOne(rmpi => rmpi.Purchase)
            .WithMany(rmp => rmp.Items)
            .HasForeignKey(rmpi => rmpi.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RawMaterialPurchaseItem>()
            .HasOne(rmpi => rmpi.RawMaterial)
            .WithMany(rm => rm.PurchaseItems)
            .HasForeignKey(rmpi => rmpi.RawMaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        // Production Order relationships
        modelBuilder.Entity<ProductionOrder>()
            .HasOne(po => po.Company)
            .WithMany()
            .HasForeignKey(po => po.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductionOrder>()
            .HasOne(po => po.Product)
            .WithMany()
            .HasForeignKey(po => po.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductionOrder>()
            .HasOne(po => po.OutputWarehouse)
            .WithMany()
            .HasForeignKey(po => po.OutputWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductionOrderMaterial>()
            .HasOne(pom => pom.ProductionOrder)
            .WithMany(po => po.Materials)
            .HasForeignKey(pom => pom.ProductionOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductionOrderMaterial>()
            .HasOne(pom => pom.RawMaterial)
            .WithMany(rm => rm.ProductionMaterials)
            .HasForeignKey(pom => pom.RawMaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductionOrderCost>()
            .HasOne(poc => poc.ProductionOrder)
            .WithMany(po => po.Costs)
            .HasForeignKey(poc => poc.ProductionOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductionOrderCost>()
            .HasOne(poc => poc.Expense)
            .WithMany()
            .HasForeignKey(poc => poc.ExpenseId)
            .OnDelete(DeleteBehavior.SetNull);

        // ===== Online Store / Marketplace =====

        // Company -> StoreCategory
        modelBuilder.Entity<Company>()
            .HasOne(c => c.StoreCategory)
            .WithMany()
            .HasForeignKey(c => c.StoreCategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // CompanyStoreCategory (many-to-many)
        modelBuilder.Entity<CompanyStoreCategory>()
            .HasOne(csc => csc.Company)
            .WithMany()
            .HasForeignKey(csc => csc.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CompanyStoreCategory>()
            .HasOne(csc => csc.StoreCategory)
            .WithMany()
            .HasForeignKey(csc => csc.StoreCategoryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CompanyStoreCategory>()
            .HasIndex(csc => new { csc.CompanyId, csc.StoreCategoryId })
            .IsUnique();

        // Ad -> Placement
        modelBuilder.Entity<Ad>()
            .HasOne(a => a.Placement)
            .WithMany(p => p.Ads)
            .HasForeignKey(a => a.PlacementId)
            .OnDelete(DeleteBehavior.Cascade);

        // Ad -> Company
        modelBuilder.Entity<Ad>()
            .HasOne(a => a.Company)
            .WithMany()
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // PremiumSubscription -> Company
        modelBuilder.Entity<PremiumSubscription>()
            .HasOne(ps => ps.Company)
            .WithMany()
            .HasForeignKey(ps => ps.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // AppCustomer -> Addresses
        modelBuilder.Entity<AppCustomerAddress>()
            .HasOne(a => a.Customer)
            .WithMany(c => c.Addresses)
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        // OnlineOrder -> Company
        modelBuilder.Entity<OnlineOrder>()
            .HasOne(o => o.Company)
            .WithMany()
            .HasForeignKey(o => o.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // OnlineOrder -> AppCustomer
        modelBuilder.Entity<OnlineOrder>()
            .HasOne(o => o.AppCustomer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.AppCustomerId)
            .OnDelete(DeleteBehavior.SetNull);

        // OnlineOrderItem -> OnlineOrder
        modelBuilder.Entity<OnlineOrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // AppFavorite -> AppCustomer
        modelBuilder.Entity<AppFavorite>()
            .HasOne(f => f.Customer)
            .WithMany(c => c.Favorites)
            .HasForeignKey(f => f.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        // AppFavorite -> Company
        modelBuilder.Entity<AppFavorite>()
            .HasOne(f => f.Company)
            .WithMany()
            .HasForeignKey(f => f.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // AppFavorite -> Product
        modelBuilder.Entity<AppFavorite>()
            .HasOne(f => f.Product)
            .WithMany()
            .HasForeignKey(f => f.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // ===== Accounting =====

        // ChartOfAccount -> Company
        modelBuilder.Entity<ChartOfAccount>()
            .HasOne(a => a.Company)
            .WithMany()
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // ChartOfAccount -> Parent (self-reference)
        modelBuilder.Entity<ChartOfAccount>()
            .HasOne(a => a.Parent)
            .WithMany(a => a.Children)
            .HasForeignKey(a => a.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ChartOfAccount>()
            .HasIndex(a => new { a.CompanyId, a.Code })
            .IsUnique();

        // JournalEntry -> Company
        modelBuilder.Entity<JournalEntry>()
            .HasOne(j => j.Company)
            .WithMany()
            .HasForeignKey(j => j.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntry>()
            .HasIndex(j => new { j.CompanyId, j.EntryNumber })
            .IsUnique();

        // JournalEntry -> ReversedBy (self-reference)
        modelBuilder.Entity<JournalEntry>()
            .HasOne(j => j.ReversedBy)
            .WithMany()
            .HasForeignKey(j => j.ReversedById)
            .OnDelete(DeleteBehavior.SetNull);

        // JournalEntryLine -> JournalEntry
        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(l => l.JournalEntry)
            .WithMany(j => j.Lines)
            .HasForeignKey(l => l.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        // JournalEntryLine -> Account
        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(l => l.Account)
            .WithMany(a => a.JournalEntryLines)
            .HasForeignKey(l => l.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // ===== Licensing =====

        // License -> Company
        modelBuilder.Entity<License>()
            .HasOne(l => l.Company)
            .WithMany()
            .HasForeignKey(l => l.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<License>()
            .HasIndex(l => l.LicenseKey)
            .IsUnique();

        // LicenseActivation -> License
        modelBuilder.Entity<LicenseActivation>()
            .HasOne(la => la.License)
            .WithMany(l => l.Activations)
            .HasForeignKey(la => la.LicenseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LicenseActivation>()
            .HasIndex(la => new { la.LicenseId, la.MachineFingerprint })
            .IsUnique();
    }
}
