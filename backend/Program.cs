using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Hosting.WindowsServices;
using Catalyst.API.Data;
using Catalyst.API.Services;

var options = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = WindowsServiceHelpers.IsWindowsService() 
        ? AppContext.BaseDirectory 
        : default
};

var builder = WebApplication.CreateBuilder(options);

// Enable Windows Service support
builder.Host.UseWindowsService();

// Configure Npgsql to handle DateTime with legacy timestamp behavior
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<AccountingService>();

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

// Add Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Add CORS - Allow all origins for API
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure database exists before running migrations
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
    var databaseName = connBuilder.Database;
    connBuilder.Database = "postgres"; // Connect to system database first
    
    using var adminConn = new Npgsql.NpgsqlConnection(connBuilder.ConnectionString);
    try
    {
        adminConn.Open();
        using var checkCmd = adminConn.CreateCommand();
        checkCmd.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{databaseName}'";
        var exists = checkCmd.ExecuteScalar() != null;
        
        if (!exists)
        {
            Console.WriteLine($"Database '{databaseName}' does not exist. Creating...");
            using var createCmd = adminConn.CreateCommand();
            createCmd.CommandText = $"CREATE DATABASE \"{databaseName}\"";
            createCmd.ExecuteNonQuery();
            Console.WriteLine($"Database '{databaseName}' created successfully!");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: Could not check/create database: {ex.Message}");
    }
}

// Run database migrations
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        // STEP 1: Create all tables from EF model (handles fresh database)
        context.Database.EnsureCreated();
        Console.WriteLine("Database tables created/verified successfully");



        // Seed default data if no companies exist (first-time setup)
        var companyCount = 0;
        try {
            companyCount = context.Database.SqlQueryRaw<int>("SELECT COUNT(*)::int AS \"Value\" FROM companies").FirstOrDefault();
        } catch { }
        
        if (companyCount == 0)
        {
            Console.WriteLine("No companies found. Seeding default data...");
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");
            
            // Create default company (admin / 123456)
            context.Database.ExecuteSqlRaw(@"
                INSERT INTO companies (name, username, password_hash, phone, status, currency_symbol, low_stock_alert, max_cash_warning, exchange_rate, 
                    show_secondary_price, delivery_enabled, delivery_fee, min_order_amount, store_theme_color, rating, is_premium, is_online_store_enabled,
                    created_at, updated_at)
                VALUES ('My Company', 'admin', {0}, '', 'active', '$', 10, 10000, 1, 
                    false, false, 0, 0, '#000000', 0, false, false,
                    NOW(), NOW())
            ", passwordHash);

            // Get the company ID
            var companyId = context.Database.SqlQueryRaw<int>("SELECT id AS \"Value\" FROM companies WHERE username = 'admin' LIMIT 1").FirstOrDefault();

            if (companyId > 0)
            {
                // Create main warehouse
                context.Database.ExecuteSqlRaw(@"
                    INSERT INTO warehouses (company_id, name, code, is_active, created_at, updated_at)
                    VALUES ({0}, 'Main Warehouse', 'MAIN', true, NOW(), NOW())
                ", companyId);

                // Create inventory settings
                context.Database.ExecuteSqlRaw(@"
                    INSERT INTO inventory_settings (company_id, valuation_method, cost_spike_threshold, low_margin_threshold, enable_cost_alerts, created_at, updated_at)
                    VALUES ({0}, 'fifo', 0.2, 0.1, true, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                ", companyId);

                Console.WriteLine("===========================================");
                Console.WriteLine("  DEFAULT SETUP COMPLETE!");
                Console.WriteLine("  Login: admin / 123456");
                Console.WriteLine("  Warehouse: Main Warehouse");
                Console.WriteLine("===========================================");
            }
        }
        
        // Ensure all companies have a Main Warehouse
        try
        {
            context.Database.ExecuteSqlRaw(@"
                INSERT INTO warehouses (company_id, name, code, is_active, created_at, updated_at)
                SELECT c.id, 'Main Warehouse', 'MAIN', true, NOW(), NOW()
                FROM companies c
                WHERE NOT EXISTS (
                    SELECT 1 FROM warehouses w WHERE w.company_id = c.id
                )
            ");
            Console.WriteLine("Ensured all companies have a Main Warehouse.");
        }
        catch (Exception warehouseEx)
        {
            Console.WriteLine($"Warehouse seeding info: {warehouseEx.Message}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: Could not update database schema: {ex.Message}");
    }
}

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Manual CORS middleware - handles preflight and adds headers to every response
app.Use(async (context, next) =>
{
    var origin = context.Request.Headers["Origin"].ToString();
    if (!string.IsNullOrEmpty(origin))
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = origin;
        context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
        context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With";
    }

    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }

    try
    {
        await next();
    }
    catch (Exception ex)
    {
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { error = "Internal server error", message = ex.Message });
        }
    }
});

app.UseCors();
// Explicitly serve static files from wwwroot
var wwwrootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (Directory.Exists(wwwrootPath))
{
    var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwrootPath);
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });
}
else
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoint
app.MapGet("/api/health", () => new { status = "healthy", service = "Catalyst API", version = "1.0" });

// SPA fallback - serve index.html for non-API routes
app.MapFallbackToFile("index.html");

// Bind to port 5227 explicitly (launchSettings.json only works with dotnet run)
app.Run("http://0.0.0.0:5227");
