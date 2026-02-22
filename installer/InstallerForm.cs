using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CatalystInstaller;

public class InstallerForm : Form
{
    private int currentStep = 0;
    private Panel headerPanel = null!;
    private Panel contentPanel = null!;
    private Panel footerPanel = null!;
    private Button backButton = null!;
    private Button nextButton = null!;
    private Button cancelButton = null!;
    private Panel[] stepPanels = null!;
    
    // Step 3 - Database config
    private TextBox txtHost = null!;
    private TextBox txtPort = null!;
    private TextBox txtDbName = null!;
    private TextBox txtUser = null!;
    private TextBox txtPass = null!;
    
    // Step 4 - Progress
    private ProgressBar progressBar = null!;
    private Label progressLabel = null!;
    private TextBox logBox = null!;
    
    // Step 5 - Completion
    private CheckBox chkStartNow = null!;
    
    // Installation paths
    private string installPath = "";
    private string postgresPath = "";
    private bool postgresInstalled = false;
    private string defaultDbName = "catalyst_offline";
    
    public InstallerForm()
    {
        InitializeComponent();
        installPath = Path.GetDirectoryName(Path.GetDirectoryName(Application.ExecutablePath)) ?? "";
        if (string.IsNullOrEmpty(installPath) || installPath.EndsWith("installer"))
        {
            installPath = Path.GetDirectoryName(installPath) ?? AppDomain.CurrentDomain.BaseDirectory;
        }
        CheckPostgresInstalled();
    }
    
    private void CheckPostgresInstalled()
    {
        // Check common PostgreSQL paths
        string[] possiblePaths = {
            @"C:\Program Files\PostgreSQL\16\bin\psql.exe",
            @"C:\Program Files\PostgreSQL\15\bin\psql.exe",
            @"C:\Program Files\PostgreSQL\14\bin\psql.exe",
            @"C:\Program Files\PostgreSQL\13\bin\psql.exe",
            @"C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe",
            @"C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe",
        };
        
        foreach (var path in possiblePaths)
        {
            if (System.IO.File.Exists(path))
            {
                postgresPath = Path.GetDirectoryName(path) ?? "";
                postgresInstalled = true;
                return;
            }
        }
        
        // Check PATH
        var pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (var dir in pathEnv.Split(';'))
        {
            var psqlPath = Path.Combine(dir, "psql.exe");
            if (System.IO.File.Exists(psqlPath))
            {
                postgresPath = dir;
                postgresInstalled = true;
                return;
            }
        }
        
        postgresInstalled = false;
    }
    
    private void InitializeComponent()
    {
        this.Text = "Catalyst Offline Setup";
        this.Size = new Size(650, 550);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.MinimizeBox = false;
        this.BackColor = Color.White;
        
        CreateHeader();
        CreateContent();
        CreateFooter();
        CreateSteps();
        
        ShowStep();
    }
    
    private void CreateHeader()
    {
        headerPanel = new Panel
        {
            Location = new Point(0, 0),
            Size = new Size(650, 80),
            BackColor = Color.FromArgb(41, 128, 185)
        };
        
        var titleLabel = new Label
        {
            Text = "Catalyst Offline Setup",
            Font = new Font("Segoe UI", 20, FontStyle.Bold),
            ForeColor = Color.White,
            Location = new Point(25, 15),
            AutoSize = true
        };
        headerPanel.Controls.Add(titleLabel);
        
        var subLabel = new Label
        {
            Text = "Install Company Portal, Admin Portal & Backend",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.FromArgb(236, 240, 241),
            Location = new Point(25, 50),
            AutoSize = true
        };
        headerPanel.Controls.Add(subLabel);
        
        this.Controls.Add(headerPanel);
    }
    
    private void CreateContent()
    {
        contentPanel = new Panel
        {
            Location = new Point(0, 80),
            Size = new Size(650, 370),
            BackColor = Color.White
        };
        this.Controls.Add(contentPanel);
    }
    
    private void CreateFooter()
    {
        footerPanel = new Panel
        {
            Location = new Point(0, 450),
            Size = new Size(650, 70),
            BackColor = Color.FromArgb(245, 245, 245)
        };
        
        backButton = new Button
        {
            Text = "< Back",
            Location = new Point(330, 20),
            Size = new Size(90, 35),
            Enabled = false,
            Font = new Font("Segoe UI", 10)
        };
        backButton.Click += (s, e) => { if (currentStep > 0) { currentStep--; ShowStep(); } };
        footerPanel.Controls.Add(backButton);
        
        nextButton = new Button
        {
            Text = "Next >",
            Location = new Point(430, 20),
            Size = new Size(90, 35),
            BackColor = Color.FromArgb(41, 128, 185),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        nextButton.Click += NextButton_Click;
        footerPanel.Controls.Add(nextButton);
        
        cancelButton = new Button
        {
            Text = "Cancel",
            Location = new Point(530, 20),
            Size = new Size(90, 35),
            Font = new Font("Segoe UI", 10)
        };
        cancelButton.Click += (s, e) => {
            if (MessageBox.Show("Cancel installation?", "Confirm", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                this.Close();
        };
        footerPanel.Controls.Add(cancelButton);
        
        this.Controls.Add(footerPanel);
    }
    
    private void CreateSteps()
    {
        stepPanels = new Panel[5];
        
        // Step 1: Welcome
        stepPanels[0] = CreateWelcomeStep();
        
        // Step 2: PostgreSQL Check
        stepPanels[1] = CreatePostgresStep();
        
        // Step 3: Database Config
        stepPanels[2] = CreateDatabaseStep();
        
        // Step 4: Installation
        stepPanels[3] = CreateInstallStep();
        
        // Step 5: Complete
        stepPanels[4] = CreateCompleteStep();
        
        foreach (var panel in stepPanels)
        {
            panel.Visible = false;
            contentPanel.Controls.Add(panel);
        }
    }
    
    private Panel CreateWelcomeStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "Welcome to Catalyst Setup",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        panel.Controls.Add(new Label
        {
            Text = @"This wizard will install Catalyst for offline use on your computer.

The following components will be installed:

  ✓ Backend API Server (runs as background service)
  ✓ Company Portal (desktop shortcut)
  ✓ Admin Portal (desktop shortcut)
  ✓ PostgreSQL Database (if not installed)

Installation folder:
" + installPath + @"

Click 'Next' to continue.",
            Font = new Font("Segoe UI", 11),
            Location = new Point(0, 45),
            Size = new Size(580, 280)
        });
        
        return panel;
    }
    
    private Panel CreatePostgresStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "PostgreSQL Database",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        var statusLabel = new Label
        {
            Name = "postgresStatus",
            Font = new Font("Segoe UI", 11),
            Location = new Point(0, 50),
            Size = new Size(580, 200)
        };
        panel.Controls.Add(statusLabel);
        
        var downloadBtn = new Button
        {
            Name = "downloadBtn",
            Text = "Download && Install PostgreSQL",
            Location = new Point(0, 260),
            Size = new Size(250, 40),
            BackColor = Color.FromArgb(39, 174, 96),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            Visible = false
        };
        downloadBtn.Click += async (s, e) => await DownloadPostgres();
        panel.Controls.Add(downloadBtn);
        
        var refreshBtn = new Button
        {
            Name = "refreshBtn",
            Text = "Refresh Check",
            Location = new Point(260, 260),
            Size = new Size(120, 40),
            Font = new Font("Segoe UI", 10)
        };
        refreshBtn.Click += (s, e) => {
            CheckPostgresInstalled();
            UpdatePostgresStatus();
        };
        panel.Controls.Add(refreshBtn);
        
        return panel;
    }
    
    private void UpdatePostgresStatus()
    {
        var statusLabel = stepPanels[1].Controls["postgresStatus"] as Label;
        var downloadBtn = stepPanels[1].Controls["downloadBtn"] as Button;
        
        if (statusLabel == null || downloadBtn == null) return;
        
        if (postgresInstalled)
        {
            statusLabel.ForeColor = Color.FromArgb(39, 174, 96);
            statusLabel.Text = @"✓ PostgreSQL is installed!

Location: " + postgresPath + @"

PostgreSQL is required to store your business data locally.
Click 'Next' to configure the database connection.";
            downloadBtn.Visible = false;
        }
        else
        {
            statusLabel.ForeColor = Color.FromArgb(192, 57, 43);
            statusLabel.Text = @"✗ PostgreSQL is NOT installed

PostgreSQL database is required to run Catalyst offline.

Options:
  1. Click 'Download & Install PostgreSQL' below (recommended)
  2. Install PostgreSQL manually from https://postgresql.org
  3. Click 'Refresh Check' after manual installation";
            downloadBtn.Visible = true;
        }
    }
    
    private async Task DownloadPostgres()
    {
        var downloadBtn = stepPanels[1].Controls["downloadBtn"] as Button;
        var statusLabel = stepPanels[1].Controls["postgresStatus"] as Label;
        
        if (downloadBtn == null || statusLabel == null) return;
        
        downloadBtn.Enabled = false;
        downloadBtn.Text = "Downloading...";
        
        string tempPath = Path.Combine(Path.GetTempPath(), "postgresql-installer.exe");
        
        try
        {
            statusLabel.Text = "Downloading PostgreSQL installer...\nThis may take a few minutes.";
            
            // Delete existing file if present
            if (System.IO.File.Exists(tempPath))
            {
                try { System.IO.File.Delete(tempPath); } catch { }
            }
            
            // Download PostgreSQL installer
            string downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe";
            
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromMinutes(15);
                
                var response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead);
                var totalBytes = response.Content.Headers.ContentLength ?? 0;
                
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var fileStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    var buffer = new byte[81920];
                    long downloaded = 0;
                    int bytesRead;
                    
                    while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                    {
                        await fileStream.WriteAsync(buffer, 0, bytesRead);
                        downloaded += bytesRead;
                        
                        if (totalBytes > 0)
                        {
                            var percent = (int)((downloaded * 100) / totalBytes);
                            statusLabel.Text = $"Downloading PostgreSQL... {percent}%\n({downloaded / 1024 / 1024} MB / {totalBytes / 1024 / 1024} MB)";
                        }
                        Application.DoEvents();
                    }
                    
                    // Ensure all data is written
                    await fileStream.FlushAsync();
                }
            }
            
            // Small delay to ensure file handle is fully released
            await Task.Delay(1000);
            GC.Collect();
            GC.WaitForPendingFinalizers();
            await Task.Delay(500);
            
            statusLabel.Text = "Download complete!\nStarting PostgreSQL installer...\n\nPlease follow the PostgreSQL setup wizard.\nRemember your password!";
            
            // Run installer
            var process = Process.Start(new ProcessStartInfo
            {
                FileName = tempPath,
                Arguments = "--mode qt --unattendedmodeui minimal",
                UseShellExecute = true,
                WorkingDirectory = Path.GetTempPath()
            });
            
            if (process != null)
            {
                await process.WaitForExitAsync();
            }
            
            // Refresh check
            CheckPostgresInstalled();
            UpdatePostgresStatus();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Download failed: {ex.Message}\n\nPlease install PostgreSQL manually from:\nhttps://www.postgresql.org/download/windows/", 
                "Download Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            downloadBtn.Enabled = true;
            downloadBtn.Text = "Download && Install PostgreSQL";
        }
    }
    
    private Panel CreateDatabaseStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "Database Configuration",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        panel.Controls.Add(new Label
        {
            Text = "Enter your PostgreSQL database settings:",
            Font = new Font("Segoe UI", 10),
            Location = new Point(0, 40),
            AutoSize = true
        });
        
        int y = 80;
        int labelWidth = 100;
        int inputX = 120;
        
        // Host
        panel.Controls.Add(new Label { Text = "Host:", Location = new Point(0, y + 3), Size = new Size(labelWidth, 25), Font = new Font("Segoe UI", 10) });
        txtHost = new TextBox { Text = "localhost", Location = new Point(inputX, y), Size = new Size(200, 28), Font = new Font("Segoe UI", 10) };
        panel.Controls.Add(txtHost);
        
        y += 40;
        panel.Controls.Add(new Label { Text = "Port:", Location = new Point(0, y + 3), Size = new Size(labelWidth, 25), Font = new Font("Segoe UI", 10) });
        txtPort = new TextBox { Text = "5432", Location = new Point(inputX, y), Size = new Size(100, 28), Font = new Font("Segoe UI", 10) };
        panel.Controls.Add(txtPort);
        
        y += 40;
        panel.Controls.Add(new Label { Text = "Database:", Location = new Point(0, y + 3), Size = new Size(labelWidth, 25), Font = new Font("Segoe UI", 10) });
        txtDbName = new TextBox { Text = "catalyst_offline", Location = new Point(inputX, y), Size = new Size(200, 28), Font = new Font("Segoe UI", 10) };
        panel.Controls.Add(txtDbName);
        
        y += 40;
        panel.Controls.Add(new Label { Text = "Username:", Location = new Point(0, y + 3), Size = new Size(labelWidth, 25), Font = new Font("Segoe UI", 10) });
        txtUser = new TextBox { Text = "postgres", Location = new Point(inputX, y), Size = new Size(200, 28), Font = new Font("Segoe UI", 10) };
        panel.Controls.Add(txtUser);
        
        y += 40;
        panel.Controls.Add(new Label { Text = "Password:", Location = new Point(0, y + 3), Size = new Size(labelWidth, 25), Font = new Font("Segoe UI", 10) });
        txtPass = new TextBox { Text = "", Location = new Point(inputX, y), Size = new Size(200, 28), Font = new Font("Segoe UI", 10), PasswordChar = '*' };
        panel.Controls.Add(txtPass);
        
        var showPass = new CheckBox { Text = "Show", Location = new Point(330, y), Size = new Size(70, 28), Font = new Font("Segoe UI", 9) };
        showPass.CheckedChanged += (s, e) => txtPass.PasswordChar = showPass.Checked ? '\0' : '*';
        panel.Controls.Add(showPass);
        
        y += 50;
        var testBtn = new Button
        {
            Text = "Test Connection",
            Location = new Point(inputX, y),
            Size = new Size(130, 35),
            Font = new Font("Segoe UI", 10)
        };
        testBtn.Click += TestConnection;
        panel.Controls.Add(testBtn);
        
        return panel;
    }
    
    private void TestConnection(object? sender, EventArgs e)
    {
        try
        {
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database=postgres";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            conn.Open();
            conn.Close();
            MessageBox.Show("Connection successful!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Connection failed:\n\n{ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
    
    private Panel CreateInstallStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "Installing...",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        progressBar = new ProgressBar
        {
            Location = new Point(0, 50),
            Size = new Size(580, 30),
            Style = ProgressBarStyle.Continuous
        };
        panel.Controls.Add(progressBar);
        
        progressLabel = new Label
        {
            Text = "Preparing installation...",
            Font = new Font("Segoe UI", 10),
            Location = new Point(0, 90),
            Size = new Size(580, 25)
        };
        panel.Controls.Add(progressLabel);
        
        logBox = new TextBox
        {
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            Location = new Point(0, 120),
            Size = new Size(580, 190),
            Font = new Font("Consolas", 9),
            ReadOnly = true,
            BackColor = Color.FromArgb(30, 30, 30),
            ForeColor = Color.LightGreen
        };
        panel.Controls.Add(logBox);
        
        return panel;
    }
    
    private Panel CreateCompleteStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "✓ Setup Complete!",
            Font = new Font("Segoe UI", 18, FontStyle.Bold),
            ForeColor = Color.FromArgb(39, 174, 96),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        panel.Controls.Add(new Label
        {
            Text = @"Catalyst has been successfully installed!

Desktop shortcuts created:
  • Catalyst Company Portal
  • Catalyst Admin Portal

The Backend API service will start automatically when you 
launch either portal.

To start using Catalyst:
  1. Double-click 'Catalyst Company Portal' on your desktop
  2. Login with your credentials
  3. Start managing your business offline!",
            Font = new Font("Segoe UI", 11),
            Location = new Point(0, 45),
            Size = new Size(580, 220)
        });
        
        chkStartNow = new CheckBox
        {
            Text = "Launch Catalyst Company Portal now",
            Location = new Point(0, 280),
            Size = new Size(350, 30),
            Checked = true,
            Font = new Font("Segoe UI", 11)
        };
        panel.Controls.Add(chkStartNow);
        
        return panel;
    }
    
    private void ShowStep()
    {
        for (int i = 0; i < stepPanels.Length; i++)
            stepPanels[i].Visible = (i == currentStep);
        
        backButton.Enabled = currentStep > 0 && currentStep < 3;
        
        switch (currentStep)
        {
            case 0: 
                nextButton.Text = "Next >"; 
                nextButton.Enabled = true;
                break;
            case 1: 
                nextButton.Text = "Next >"; 
                nextButton.Enabled = postgresInstalled;
                UpdatePostgresStatus();
                break;
            case 2: 
                nextButton.Text = "Install";
                nextButton.Enabled = true;
                break;
            case 3: 
                nextButton.Text = "Installing..."; 
                nextButton.Enabled = false; 
                break;
            case 4: 
                nextButton.Text = "Finish"; 
                nextButton.Enabled = true; 
                backButton.Enabled = false; 
                break;
        }
        
        // Force UI refresh
        nextButton.Refresh();
        Application.DoEvents();
    }
    
    private async void NextButton_Click(object? sender, EventArgs e)
    {
        switch (currentStep)
        {
            case 0:
                currentStep = 1;
                ShowStep();
                break;
            case 1:
                if (!postgresInstalled)
                {
                    MessageBox.Show("Please install PostgreSQL first.", "PostgreSQL Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                currentStep = 2;
                ShowStep();
                break;
            case 2:
                currentStep = 3;
                ShowStep();
                await RunInstallation();
                break;
            case 4:
                if (chkStartNow.Checked)
                {
                    LaunchCompanyPortal();
                }
                this.Close();
                break;
        }
    }
    
    private void Log(string message)
    {
        logBox.AppendText(message + Environment.NewLine);
        logBox.SelectionStart = logBox.Text.Length;
        logBox.ScrollToCaret();
        Application.DoEvents();
    }
    
    private async Task RunInstallation()
    {
        try
        {
            progressBar.Value = 0;
            
            // Step 1: Create database
            Log("Creating database...");
            progressLabel.Text = "Creating database...";
            await CreateDatabase();
            progressBar.Value = 20;
            
            // Step 2: Apply schema
            Log("Applying database schema...");
            progressLabel.Text = "Applying database schema...";
            await ApplySchema();
            progressBar.Value = 35;
            
            // Step 3: Create superadmin user
            Log("Creating admin user...");
            progressLabel.Text = "Creating admin user...";
            await CreateSuperAdmin();
            progressBar.Value = 45;
            
            // Step 4: Configure backend
            Log("Configuring backend...");
            progressLabel.Text = "Configuring backend...";
            ConfigureBackend();
            progressBar.Value = 55;
            
            // Step 5: Configure portals
            Log("Configuring portals...");
            progressLabel.Text = "Configuring portals...";
            ConfigurePortals();
            FixPortalBasename();
            FixLaunchSettings();
            progressBar.Value = 70;
            
            // Step 5: Create launchers
            Log("Creating portal launchers...");
            progressLabel.Text = "Creating launchers...";
            CreateLaunchers();
            progressBar.Value = 85;
            
            // Step 6: Create desktop shortcuts
            Log("Creating desktop shortcuts...");
            progressLabel.Text = "Creating desktop shortcuts...";
            CreateDesktopShortcuts();
            progressBar.Value = 95;
            
            Log("");
            Log("========================================");
            Log("Installation completed successfully!");
            Log("========================================");
            progressBar.Value = 100;
            progressLabel.Text = "Installation complete!";
            
            await Task.Delay(1500);
            currentStep = 4;
            ShowStep();
        }
        catch (Exception ex)
        {
            Log($"ERROR: {ex.Message}");
            MessageBox.Show($"Installation failed:\n\n{ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            nextButton.Text = "Retry";
            nextButton.Enabled = true;
        }
    }
    
    private async Task CreateDatabase()
    {
        try
        {
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database=postgres";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            // Check if database exists
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{txtDbName.Text}'";
            var exists = await checkCmd.ExecuteScalarAsync() != null;
            
            if (!exists)
            {
                using var createCmd = conn.CreateCommand();
                createCmd.CommandText = $"CREATE DATABASE \"{txtDbName.Text}\"";
                await createCmd.ExecuteNonQueryAsync();
                Log($"Database '{txtDbName.Text}' created.");
            }
            else
            {
                Log($"Database '{txtDbName.Text}' already exists.");
            }
        }
        catch (Exception ex)
        {
            Log($"Warning: {ex.Message}");
        }
    }
    
    private async Task ApplySchema()
    {
        var schemaFile = Path.Combine(installPath, "cashvan_schema.sql");
        if (!System.IO.File.Exists(schemaFile))
        {
            Log("Schema file not found, skipping...");
            return;
        }
        
        try
        {
            Log("Reading schema file...");
            var sql = await System.IO.File.ReadAllTextAsync(schemaFile);
            
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database={txtDbName.Text};Command Timeout=120";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            // Split by semicolons and execute each statement
            var statements = sql.Split(new[] { ";\n", ";\r\n" }, StringSplitOptions.RemoveEmptyEntries);
            int total = statements.Length;
            int done = 0;
            int errors = 0;
            
            foreach (var rawStatement in statements)
            {
                var stmt = rawStatement.Trim();
                if (string.IsNullOrWhiteSpace(stmt)) { done++; continue; }
                
                try
                {
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = stmt;
                    cmd.CommandTimeout = 30;
                    await cmd.ExecuteNonQueryAsync();
                }
                catch
                {
                    // Ignore errors (table already exists, etc.)
                    errors++;
                }
                
                done++;
                if (done % 20 == 0)
                {
                    var pct = (done * 100) / total;
                    progressLabel.Text = $"Applying schema... {pct}%";
                    Application.DoEvents();
                }
            }
            
            Log($"Schema applied. ({done} statements, {errors} skipped)");
        }
        catch (Exception ex)
        {
            Log($"Schema warning: {ex.Message}");
        }
    }
    
    private void ConfigureBackend()
    {
        var config = $@"{{
  ""Logging"": {{
    ""LogLevel"": {{
      ""Default"": ""Information"",
      ""Microsoft.AspNetCore"": ""Warning""
    }}
  }},
  ""AllowedHosts"": ""*"",
  ""ConnectionStrings"": {{
    ""DefaultConnection"": ""Host={txtHost.Text};Port={txtPort.Text};Database={txtDbName.Text};Username={txtUser.Text};Password={txtPass.Text}""
  }},
  ""JwtSettings"": {{
    ""Secret"": ""CatalystLocalSecretKey2026ForOfflineEnvironment123!"",
    ""Issuer"": ""CatalystAPI"",
    ""Audience"": ""CatalystClients"",
    ""ExpirationInMinutes"": 10080
  }}
}}";
        var backendPath = Path.Combine(installPath, "backend", "appsettings.Local.json");
        System.IO.File.WriteAllText(backendPath, config);
        Log("Backend configuration saved.");
    }
    
    private void ConfigurePortals()
    {
        var envContent = @"# Offline/Local Configuration
VITE_API_URL=/api
";
        
        foreach (var portal in new[] { "company", "admin" })
        {
            var envPath = Path.Combine(installPath, portal, ".env.local");
            System.IO.File.WriteAllText(envPath, envContent);
            Log($"{portal} portal configured.");
        }
    }
    
    private void CreateLaunchers()
    {
        // Create Company Portal launcher
        var companyLauncher = @"@echo off
set ROOT=%~dp0

:: Start backend if not already running
netstat -ano | findstr "":5227"" >nul
if errorlevel 1 (
    echo Starting Backend...
    start ""Catalyst Backend"" /min cmd /k ""cd /d %ROOT%backend && set ASPNETCORE_ENVIRONMENT=Local && dotnet run""
    echo Waiting for backend to start...
    timeout /t 8 /nobreak >nul
)

:: Start Company Portal
echo Starting Company Portal...
start ""Catalyst Company"" cmd /k ""cd /d %ROOT%company && npx vite --port 3000""
timeout /t 3 /nobreak >nul
start http://localhost:3000
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Launch-Company.bat"), companyLauncher);
        
        // Create Admin Portal launcher
        var adminLauncher = @"@echo off
set ROOT=%~dp0

:: Start backend if not already running
netstat -ano | findstr "":5227"" >nul
if errorlevel 1 (
    echo Starting Backend...
    start ""Catalyst Backend"" /min cmd /k ""cd /d %ROOT%backend && set ASPNETCORE_ENVIRONMENT=Local && dotnet run""
    echo Waiting for backend to start...
    timeout /t 8 /nobreak >nul
)

:: Start Admin Portal
echo Starting Admin Portal...
start ""Catalyst Admin"" cmd /k ""cd /d %ROOT%admin && npx vite --port 5176""
timeout /t 3 /nobreak >nul
start http://localhost:5176
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Launch-Admin.bat"), adminLauncher);
        
        Log("Launchers created.");
    }
    
    private void CreateDesktopShortcuts()
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            
            // Use PowerShell to create shortcuts
            CreateShortcutWithPowerShell(
                Path.Combine(desktopPath, "Catalyst Company Portal.lnk"),
                Path.Combine(installPath, "Launch-Company.bat"),
                installPath,
                "Launch Catalyst Company Portal"
            );
            Log("Company Portal shortcut created.");
            
            CreateShortcutWithPowerShell(
                Path.Combine(desktopPath, "Catalyst Admin Portal.lnk"),
                Path.Combine(installPath, "Launch-Admin.bat"),
                installPath,
                "Launch Catalyst Admin Portal"
            );
            Log("Admin Portal shortcut created.");
        }
        catch (Exception ex)
        {
            Log($"Shortcut warning: {ex.Message}");
            CreateUrlShortcuts();
        }
    }
    
    private void CreateShortcutWithPowerShell(string shortcutPath, string targetPath, string workingDir, string description)
    {
        var script = $@"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcutPath.Replace("'", "''")}')
$Shortcut.TargetPath = '{targetPath.Replace("'", "''")}'
$Shortcut.WorkingDirectory = '{workingDir.Replace("'", "''")}'
$Shortcut.Description = '{description}'
$Shortcut.Save()
";
        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-ExecutionPolicy Bypass -Command \"{script.Replace("\"", "\\\"")}\"",
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };
        process.Start();
        process.WaitForExit();
    }
    
    private void CreateUrlShortcuts()
    {
        var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        
        // Create simple batch shortcuts
        System.IO.File.Copy(
            Path.Combine(installPath, "Launch-Company.bat"),
            Path.Combine(desktopPath, "Catalyst Company Portal.bat"),
            true);
        
        System.IO.File.Copy(
            Path.Combine(installPath, "Launch-Admin.bat"),
            Path.Combine(desktopPath, "Catalyst Admin Portal.bat"),
            true);
        
        Log("Desktop shortcuts created (batch files).");
    }
    
    private void LaunchCompanyPortal()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = Path.Combine(installPath, "Launch-Company.bat"),
                WorkingDirectory = installPath,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to launch: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
    
    private async Task CreateSuperAdmin()
    {
        try
        {
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database={txtDbName.Text}";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO superadmin_users (username, password_hash, name, email, is_active, created_at) 
                SELECT 'admin', 'admin123', 'Administrator', 'admin@catalyst.local', true, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM superadmin_users WHERE username = 'admin')";
            await cmd.ExecuteNonQueryAsync();
            Log("Admin user created. Login: admin / Admin@123");
        }
        catch (Exception ex)
        {
            Log($"Admin user warning: {ex.Message}");
        }
    }
    
    private void FixPortalBasename()
    {
        try
        {
            // Fix admin portal main.tsx
            var adminMain = Path.Combine(installPath, "admin", "src", "main.tsx");
            if (System.IO.File.Exists(adminMain))
            {
                var content = System.IO.File.ReadAllText(adminMain);
                content = System.Text.RegularExpressions.Regex.Replace(
                    content, 
                    @"basename=\{[^}]+\}", 
                    "basename=\"/\"");
                System.IO.File.WriteAllText(adminMain, content);
            }
            
            // Fix company portal main.tsx
            var companyMain = Path.Combine(installPath, "company", "src", "main.tsx");
            if (System.IO.File.Exists(companyMain))
            {
                var content = System.IO.File.ReadAllText(companyMain);
                content = System.Text.RegularExpressions.Regex.Replace(
                    content, 
                    @"basename=\{[^}]+\}", 
                    "basename=\"/\"");
                System.IO.File.WriteAllText(companyMain, content);
            }
            
            Log("Portal basenames fixed.");
        }
        catch (Exception ex)
        {
            Log($"Basename fix warning: {ex.Message}");
        }
    }
    
    private void FixLaunchSettings()
    {
        try
        {
            var launchSettings = Path.Combine(installPath, "backend", "Properties", "launchSettings.json");
            if (System.IO.File.Exists(launchSettings))
            {
                var content = System.IO.File.ReadAllText(launchSettings);
                content = content.Replace("\"ASPNETCORE_ENVIRONMENT\": \"Development\"", "\"ASPNETCORE_ENVIRONMENT\": \"Local\"");
                content = content.Replace("\"ASPNETCORE_ENVIRONMENT\": \"Production\"", "\"ASPNETCORE_ENVIRONMENT\": \"Local\"");
                System.IO.File.WriteAllText(launchSettings, content);
                Log("Backend launch settings fixed.");
            }
        }
        catch (Exception ex)
        {
            Log($"Launch settings warning: {ex.Message}");
        }
    }
}
