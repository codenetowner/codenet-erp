using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Management;
using System.Security.Cryptography;

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
    private string sourcePath = "";  // Where source files are located
    private string installPath = @"C:\Catalyst";  // Where to install (user can change)
    private string postgresPath = "";
    private bool postgresInstalled = false;
    private string defaultDbName = "catalyst_offline";
    
    // Install location UI
    private TextBox txtInstallPath = null!;
    private Button btnBrowse = null!;
    
    // License validation
    private TextBox txtLicenseKey = null!;
    private Label lblLicenseStatus = null!;
    private Button btnValidateLicense = null!;
    private bool licenseValidated = false;
    private LicenseInfo? activatedLicense = null;
    private const string API_BASE_URL = "https://backend-production-c924.up.railway.app/api";
    
    public InstallerForm()
    {
        InitializeComponent();
        
        // Get the directory where the installer EXE is located (source files)
        var exePath = Application.ExecutablePath;
        var exeDir = Path.GetDirectoryName(exePath) ?? "";
        
        // Find source path (where backend/company folders are)
        if (exeDir.Contains("installer"))
        {
            sourcePath = exeDir;
            while (!string.IsNullOrEmpty(sourcePath) && Path.GetFileName(sourcePath) != "cashvan-main-master")
            {
                var parent = Path.GetDirectoryName(sourcePath);
                if (parent == sourcePath || string.IsNullOrEmpty(parent)) break;
                sourcePath = parent;
            }
        }
        else
        {
            sourcePath = exeDir;
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
        stepPanels = new Panel[6];
        
        // Step 1: Welcome
        stepPanels[0] = CreateWelcomeStep();
        
        // Step 2: License Validation (NEW)
        stepPanels[1] = CreateLicenseStep();
        
        // Step 3: PostgreSQL Check
        stepPanels[2] = CreatePostgresStep();
        
        // Step 4: Database Config
        stepPanels[3] = CreateDatabaseStep();
        
        // Step 5: Installation
        stepPanels[4] = CreateInstallStep();
        
        // Step 6: Complete
        stepPanels[5] = CreateCompleteStep();
        
        foreach (var panel in stepPanels)
        {
            panel.Visible = false;
            contentPanel.Controls.Add(panel);
        }
    }
    
    private Panel CreateLicenseStep()
    {
        var panel = new Panel { Location = new Point(25, 20), Size = new Size(600, 330) };
        
        panel.Controls.Add(new Label
        {
            Text = "License Activation",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            Location = new Point(0, 0),
            AutoSize = true
        });
        
        panel.Controls.Add(new Label
        {
            Text = @"Enter your license key to activate Catalyst offline.

Your license key was provided by your administrator from the 
online admin portal. Internet connection is required for activation.",
            Font = new Font("Segoe UI", 10),
            Location = new Point(0, 40),
            Size = new Size(580, 70)
        });
        
        panel.Controls.Add(new Label
        {
            Text = "License Key:",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            Location = new Point(0, 120),
            AutoSize = true
        });
        
        txtLicenseKey = new TextBox
        {
            Location = new Point(0, 145),
            Size = new Size(400, 35),
            Font = new Font("Consolas", 14),
            CharacterCasing = CharacterCasing.Upper
        };
        panel.Controls.Add(txtLicenseKey);
        
        btnValidateLicense = new Button
        {
            Text = "Activate License",
            Location = new Point(410, 143),
            Size = new Size(150, 35),
            BackColor = Color.FromArgb(41, 128, 185),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnValidateLicense.Click += async (s, e) => await ValidateAndActivateLicense();
        panel.Controls.Add(btnValidateLicense);
        
        lblLicenseStatus = new Label
        {
            Name = "licenseStatus",
            Font = new Font("Segoe UI", 10),
            Location = new Point(0, 190),
            Size = new Size(580, 120),
            Text = ""
        };
        panel.Controls.Add(lblLicenseStatus);
        
        return panel;
    }
    
    private async Task ValidateAndActivateLicense()
    {
        var licenseKey = txtLicenseKey.Text.Trim();
        if (string.IsNullOrEmpty(licenseKey))
        {
            lblLicenseStatus.ForeColor = Color.FromArgb(192, 57, 43);
            lblLicenseStatus.Text = "Please enter a license key.";
            return;
        }
        
        btnValidateLicense.Enabled = false;
        btnValidateLicense.Text = "Validating...";
        lblLicenseStatus.ForeColor = Color.Gray;
        lblLicenseStatus.Text = "Connecting to license server...";
        
        try
        {
            var machineFingerprint = GetMachineFingerprint();
            var machineName = Environment.MachineName;
            var osInfo = Environment.OSVersion.ToString();
            
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            
            var requestBody = new
            {
                licenseKey = licenseKey,
                machineFingerprint = machineFingerprint,
                machineName = machineName,
                osInfo = osInfo
            };
            
            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var response = await client.PostAsync($"{API_BASE_URL}/licenses/activate", content);
            var responseBody = await response.Content.ReadAsStringAsync();
            
            if (response.IsSuccessStatusCode)
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                activatedLicense = JsonSerializer.Deserialize<LicenseInfo>(responseBody, options);
                
                if (activatedLicense != null && activatedLicense.Success)
                {
                    licenseValidated = true;
                    lblLicenseStatus.ForeColor = Color.FromArgb(39, 174, 96);
                    lblLicenseStatus.Text = $@"✓ License activated successfully!

Company: {activatedLicense.Company?.Name}
Username: {activatedLicense.Company?.Username}
Expires: {activatedLicense.ExpiresAt:MMM dd, yyyy}
Days remaining: {activatedLicense.DaysUntilExpiry}

Click 'Next' to continue with installation.";
                    nextButton.Enabled = true;
                }
                else
                {
                    lblLicenseStatus.ForeColor = Color.FromArgb(192, 57, 43);
                    lblLicenseStatus.Text = "License activation failed. Please check your license key.";
                }
            }
            else
            {
                var errorResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var errorMessage = errorResponse.TryGetProperty("error", out var err) ? err.GetString() : "Unknown error";
                
                lblLicenseStatus.ForeColor = Color.FromArgb(192, 57, 43);
                lblLicenseStatus.Text = $"✗ Activation failed: {errorMessage}";
            }
        }
        catch (HttpRequestException)
        {
            lblLicenseStatus.ForeColor = Color.FromArgb(192, 57, 43);
            lblLicenseStatus.Text = @"✗ Cannot connect to license server.

Please check your internet connection and try again.
The laptop must be online for initial license activation.";
        }
        catch (Exception ex)
        {
            lblLicenseStatus.ForeColor = Color.FromArgb(192, 57, 43);
            lblLicenseStatus.Text = $"✗ Error: {ex.Message}";
        }
        finally
        {
            btnValidateLicense.Enabled = true;
            btnValidateLicense.Text = "Activate License";
        }
    }
    
    private string GetMachineFingerprint()
    {
        try
        {
            var cpuId = "";
            var diskSerial = "";
            
            // Get CPU ID
            using (var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor"))
            {
                foreach (var item in searcher.Get())
                {
                    cpuId = item["ProcessorId"]?.ToString() ?? "";
                    break;
                }
            }
            
            // Get disk serial
            using (var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_DiskDrive"))
            {
                foreach (var item in searcher.Get())
                {
                    diskSerial = item["SerialNumber"]?.ToString() ?? "";
                    break;
                }
            }
            
            var combined = $"{cpuId}-{diskSerial}-{Environment.MachineName}";
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combined));
            return Convert.ToBase64String(hash).Substring(0, 32);
        }
        catch
        {
            // Fallback to machine name if WMI fails
            return Environment.MachineName + "-" + Environment.UserName;
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
  ✓ PostgreSQL Database (if not installed)

Requirements:
  • Internet connection (for license activation only)
  • License key (from your administrator)

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
        var statusLabel = stepPanels[2].Controls["postgresStatus"] as Label;
        var downloadBtn = stepPanels[2].Controls["downloadBtn"] as Button;
        
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

Desktop shortcut created:
  • Catalyst Company Portal

The Backend API service will start automatically when you 
launch the portal.

To start using Catalyst:
  1. Double-click 'Catalyst Company Portal' on your desktop
  2. Login with your company credentials
  3. Start managing your business offline!

Your license has been saved locally. The system will work 
offline and periodically check for subscription updates 
when internet is available.",
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
        
        backButton.Enabled = currentStep > 0 && currentStep < 4;
        
        switch (currentStep)
        {
            case 0: // Welcome
                nextButton.Text = "Next >"; 
                nextButton.Enabled = true;
                break;
            case 1: // License
                nextButton.Text = "Next >"; 
                nextButton.Enabled = licenseValidated;
                break;
            case 2: // PostgreSQL
                nextButton.Text = "Next >"; 
                nextButton.Enabled = postgresInstalled;
                UpdatePostgresStatus();
                break;
            case 3: // Database Config
                nextButton.Text = "Install";
                nextButton.Enabled = true;
                break;
            case 4: // Installation
                nextButton.Text = "Installing..."; 
                nextButton.Enabled = false; 
                break;
            case 5: // Complete
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
            case 0: // Welcome -> License
                currentStep = 1;
                ShowStep();
                break;
            case 1: // License -> PostgreSQL
                if (!licenseValidated)
                {
                    MessageBox.Show("Please activate your license first.", "License Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                currentStep = 2;
                ShowStep();
                break;
            case 2: // PostgreSQL -> Database Config
                if (!postgresInstalled)
                {
                    MessageBox.Show("Please install PostgreSQL first.", "PostgreSQL Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                currentStep = 3;
                ShowStep();
                break;
            case 3: // Database Config -> Installation
                currentStep = 4;
                ShowStep();
                await RunInstallation();
                break;
            case 5: // Complete -> Close
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
            
            // Step 0: Copy source files to install location
            Log($"Copying files to {installPath}...");
            progressLabel.Text = "Copying files...";
            await CopySourceFiles();
            progressBar.Value = 15;
            
            // Step 1: Create database
            Log("Creating database...");
            progressLabel.Text = "Creating database...";
            await CreateDatabase();
            progressBar.Value = 25;
            
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
            progressBar.Value = 60;
            
            // Step 6: Install npm dependencies
            Log("Installing frontend dependencies...");
            progressLabel.Text = "Installing dependencies (this may take a minute)...";
            await InstallNpmDependencies();
            progressBar.Value = 70;
            
            // Step 6b: Build frontend for desktop app
            Log("Building frontend...");
            progressLabel.Text = "Building frontend...";
            await BuildFrontendForDesktopApp();
            progressBar.Value = 80;
            
            // Step 7: Create launchers
            Log("Creating portal launchers...");
            progressLabel.Text = "Creating launchers...";
            CreateLaunchers();
            progressBar.Value = 85;
            
            // Step 6: Create desktop shortcuts
            Log("Creating desktop shortcuts...");
            progressLabel.Text = "Creating desktop shortcuts...";
            CreateDesktopShortcuts();
            progressBar.Value = 90;
            
            // Step 7: Add backend to Windows startup
            Log("Adding backend to Windows startup...");
            progressLabel.Text = "Configuring auto-start...";
            AddBackendToStartup();
            progressBar.Value = 95;
            
            // Step 8: Save license info locally
            Log("Saving license information...");
            progressLabel.Text = "Saving license...";
            await SaveLicenseLocally();
            progressBar.Value = 98;
            
            Log("");
            Log("========================================");
            Log("Installation completed successfully!");
            Log("========================================");
            progressBar.Value = 100;
            progressLabel.Text = "Installation complete!";
            
            await Task.Delay(1500);
            currentStep = 5;
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
    
    private async Task CopySourceFiles()
    {
        await Task.Run(() =>
        {
            // Create install directory
            if (!Directory.Exists(installPath))
            {
                Directory.CreateDirectory(installPath);
            }
            
            // Copy backend folder
            var srcBackend = Path.Combine(sourcePath, "backend");
            var dstBackend = Path.Combine(installPath, "backend");
            if (Directory.Exists(srcBackend) && !Directory.Exists(dstBackend))
            {
                CopyDirectory(srcBackend, dstBackend);
                Log("Backend files copied.");
            }
            
            // Copy company folder
            var srcCompany = Path.Combine(sourcePath, "company");
            var dstCompany = Path.Combine(installPath, "company");
            if (Directory.Exists(srcCompany) && !Directory.Exists(dstCompany))
            {
                CopyDirectory(srcCompany, dstCompany);
                Log("Company portal files copied.");
            }
            
            // Copy desktop-app folder (WebView2 app)
            var srcDesktop = Path.Combine(sourcePath, "desktop-app", "publish");
            var dstDesktop = Path.Combine(installPath, "desktop-app");
            if (Directory.Exists(srcDesktop) && !Directory.Exists(dstDesktop))
            {
                CopyDirectory(srcDesktop, dstDesktop);
                Log("Desktop app files copied.");
            }
            
            // Copy schema file if exists
            var srcSchema = Path.Combine(sourcePath, "cashvan_schema.sql");
            var dstSchema = Path.Combine(installPath, "cashvan_schema.sql");
            if (System.IO.File.Exists(srcSchema) && !System.IO.File.Exists(dstSchema))
            {
                System.IO.File.Copy(srcSchema, dstSchema);
                Log("Schema file copied.");
            }
        });
    }
    
    private void CopyDirectory(string sourceDir, string destDir)
    {
        Directory.CreateDirectory(destDir);
        
        // Copy files
        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var destFile = Path.Combine(destDir, Path.GetFileName(file));
            System.IO.File.Copy(file, destFile, true);
        }
        
        // Copy subdirectories
        foreach (var dir in Directory.GetDirectories(sourceDir))
        {
            var dirName = Path.GetFileName(dir);
            // Skip bin, obj, .git folders (but keep node_modules - needed for runtime)
            if (dirName == "bin" || dirName == "obj" || dirName == ".git")
                continue;
            CopyDirectory(dir, Path.Combine(destDir, dirName));
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
            
            if (exists)
            {
                // Check if the license in the existing database differs from the activated license
                bool needsDrop = await CheckLicenseDiffers();
                
                if (needsDrop)
                {
                    Log($"Different license detected. Dropping existing database...");
                    
                    // Terminate existing connections to the database
                    using var terminateCmd = conn.CreateCommand();
                    terminateCmd.CommandText = $@"
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = '{txtDbName.Text}' AND pid <> pg_backend_pid()";
                    await terminateCmd.ExecuteNonQueryAsync();
                    
                    // Drop the database
                    using var dropCmd = conn.CreateCommand();
                    dropCmd.CommandText = $"DROP DATABASE \"{txtDbName.Text}\"";
                    await dropCmd.ExecuteNonQueryAsync();
                    Log($"Database '{txtDbName.Text}' dropped.");
                    
                    // Create fresh database
                    using var createCmd = conn.CreateCommand();
                    createCmd.CommandText = $"CREATE DATABASE \"{txtDbName.Text}\"";
                    await createCmd.ExecuteNonQueryAsync();
                    Log($"Fresh database '{txtDbName.Text}' created.");
                }
                else
                {
                    Log($"Database '{txtDbName.Text}' already exists with same license.");
                }
            }
            else
            {
                using var createCmd = conn.CreateCommand();
                createCmd.CommandText = $"CREATE DATABASE \"{txtDbName.Text}\"";
                await createCmd.ExecuteNonQueryAsync();
                Log($"Database '{txtDbName.Text}' created.");
            }
        }
        catch (Exception ex)
        {
            Log($"Warning: {ex.Message}");
        }
    }
    
    private async Task<bool> CheckLicenseDiffers()
    {
        if (activatedLicense == null) return false;
        
        try
        {
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database={txtDbName.Text}";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            // Check if local_licenses table exists
            using var checkTableCmd = conn.CreateCommand();
            checkTableCmd.CommandText = "SELECT 1 FROM information_schema.tables WHERE table_name = 'local_licenses'";
            var tableExists = await checkTableCmd.ExecuteScalarAsync() != null;
            
            if (!tableExists)
            {
                // No license table means fresh install or old version, don't drop
                return false;
            }
            
            // Get the existing license key
            using var getLicenseCmd = conn.CreateCommand();
            getLicenseCmd.CommandText = "SELECT license_key FROM local_licenses LIMIT 1";
            var existingLicenseKey = await getLicenseCmd.ExecuteScalarAsync() as string;
            
            if (string.IsNullOrEmpty(existingLicenseKey))
            {
                // No license in DB, don't drop
                return false;
            }
            
            // Compare with the activated license
            bool differs = existingLicenseKey != activatedLicense.LicenseKey;
            if (differs)
            {
                Log($"Existing license: {existingLicenseKey}");
                Log($"New license: {activatedLicense.LicenseKey}");
            }
            return differs;
        }
        catch (Exception ex)
        {
            Log($"License check info: {ex.Message}");
            // If we can't check, assume it's okay to continue without dropping
            return false;
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
        
        // Only configure company portal (admin is online-only)
        var envPath = Path.Combine(installPath, "company", ".env.local");
        System.IO.File.WriteAllText(envPath, envContent);
        Log("Company portal configured.");
    }
    
    private async Task InstallNpmDependencies()
    {
        try
        {
            var companyPath = Path.Combine(installPath, "company");
            var nodeModulesPath = Path.Combine(companyPath, "node_modules");
            
            // Delete existing node_modules to ensure clean install
            if (Directory.Exists(nodeModulesPath))
            {
                Log("Removing old node_modules...");
                Directory.Delete(nodeModulesPath, true);
            }
            
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npm install",
                    WorkingDirectory = companyPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };
            process.Start();
            await process.WaitForExitAsync();
            
            if (process.ExitCode == 0)
            {
                Log("Frontend dependencies installed.");
            }
            else
            {
                var error = await process.StandardError.ReadToEndAsync();
                Log($"npm install warning: {error}");
            }
            
            // Create .env file for local API URL
            var envFile = Path.Combine(companyPath, ".env");
            System.IO.File.WriteAllText(envFile, "VITE_API_URL=http://localhost:5227/api");
            Log("Frontend environment configured for local backend.");
        }
        catch (Exception ex)
        {
            Log($"npm install error: {ex.Message}");
        }
    }
    
    private async Task BuildFrontendForDesktopApp()
    {
        try
        {
            var companyPath = Path.Combine(installPath, "company");
            var desktopPath = Path.Combine(installPath, "desktop-app");
            var rendererPath = Path.Combine(desktopPath, "renderer");
            
            // Create .env.production.local for local API
            var envFile = Path.Combine(companyPath, ".env.production.local");
            System.IO.File.WriteAllText(envFile, "VITE_API_URL=http://localhost:5227/api");
            
            // Build frontend
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npm run build",
                    WorkingDirectory = companyPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };
            process.Start();
            await process.WaitForExitAsync();
            
            if (process.ExitCode == 0)
            {
                Log("Frontend built successfully.");
                
                // Copy dist to desktop-app/renderer
                var distPath = Path.Combine(companyPath, "dist");
                if (Directory.Exists(distPath))
                {
                    if (Directory.Exists(rendererPath))
                    {
                        Directory.Delete(rendererPath, true);
                    }
                    CopyDirectory(distPath, rendererPath);
                    Log("Frontend copied to desktop app.");
                }
            }
            else
            {
                var error = await process.StandardError.ReadToEndAsync();
                Log($"Frontend build warning: {error}");
            }
        }
        catch (Exception ex)
        {
            Log($"Frontend build error: {ex.Message}");
        }
    }
    
    private async Task InstallElectronDependencies()
    {
        try
        {
            var electronPath = Path.Combine(installPath, "electron-app");
            if (!Directory.Exists(electronPath))
            {
                Log("Electron app folder not found, skipping...");
                return;
            }
            
            var nodeModulesPath = Path.Combine(electronPath, "node_modules");
            
            // Delete existing node_modules to ensure clean install
            if (Directory.Exists(nodeModulesPath))
            {
                Log("Removing old Electron node_modules...");
                Directory.Delete(nodeModulesPath, true);
            }
            
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c npm install",
                    WorkingDirectory = electronPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };
            process.Start();
            await process.WaitForExitAsync();
            
            if (process.ExitCode == 0)
            {
                Log("Electron dependencies installed.");
            }
            else
            {
                var error = await process.StandardError.ReadToEndAsync();
                Log($"Electron npm install warning: {error}");
            }
        }
        catch (Exception ex)
        {
            Log($"Electron npm install error: {ex.Message}");
        }
    }
    
    private void CreateLaunchers()
    {
        // Create desktop app launcher (WebView2)
        var desktopExe = Path.Combine(installPath, "desktop-app", "CatalystERP.exe");
        var launcher = $@"@echo off
start """" ""{desktopExe}""
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Launch-Catalyst.bat"), launcher);
        
        // Create VBS launcher (hidden, no console)
        var companyLauncher = $@"Set WshShell = CreateObject(""WScript.Shell"")
WshShell.Run """"""{desktopExe}"""""", 1, False
Set WshShell = Nothing
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Launch-Company.vbs"), companyLauncher);
        
        // Create Watch-Backend utility
        var watchBackend = $@"@echo off
title Catalyst Backend Monitor
color 0A

:check
cls
echo ========================================
echo    Catalyst Backend Monitor
echo ========================================
echo.

netstat -ano | findstr ""LISTENING"" | findstr "":5227 "" >nul
if errorlevel 1 (
    color 0C
    echo  Status: OFFLINE
    echo.
    echo  The backend is NOT running.
    echo.
    echo  Press R to refresh, S to start manually, or Q to quit...
    choice /C RSQ /N
    if errorlevel 3 exit
    if errorlevel 2 goto start
    if errorlevel 1 goto check
) else (
    color 0A
    echo  Status: ONLINE
    echo.
    echo  Backend is running on http://localhost:5227
    echo.
    for /f ""tokens=5"" %%a in ('netstat -ano ^| findstr "":5227 "" ^| findstr ""LISTENING""') do (
        echo  Process ID: %%a
    )
    echo.
    echo  Press R to refresh, L to view logs, or Q to quit...
    choice /C RLQ /N
    if errorlevel 3 exit
    if errorlevel 2 goto logs
    if errorlevel 1 goto check
)
goto check

:start
echo Starting backend...
cd /d ""{installPath}\backend""
start ""Catalyst Backend"" cmd /k ""set ASPNETCORE_ENVIRONMENT=Local && dotnet run""
timeout /t 5 >nul
goto check

:logs
cls
echo ========================================
echo    Catalyst Backend Live Logs
echo ========================================
echo  (Press Ctrl+C to stop and return)
echo ========================================
echo.
cd /d ""{installPath}\backend""
set ASPNETCORE_ENVIRONMENT=Local
dotnet run
goto check
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Watch-Backend.bat"), watchBackend);
        
        // Create Watch-Frontend utility
        var watchFrontend = $@"@echo off
title Catalyst Frontend Monitor
color 0B

:check
cls
echo ========================================
echo    Catalyst Frontend Monitor
echo ========================================
echo.

netstat -ano | findstr ""LISTENING"" | findstr "":3000 "" >nul
if errorlevel 1 (
    color 0C
    echo  Status: OFFLINE
    echo.
    echo  The frontend portal is NOT running.
    echo.
    echo  Press R to refresh, S to start, or Q to quit...
    choice /C RSQ /N
    if errorlevel 3 exit
    if errorlevel 2 goto start
    if errorlevel 1 goto check
) else (
    color 0B
    echo  Status: ONLINE
    echo.
    echo  Frontend is running on http://localhost:3000
    echo.
    for /f ""tokens=5"" %%a in ('netstat -ano ^| findstr "":3000 "" ^| findstr ""LISTENING""') do (
        echo  Process ID: %%a
    )
    echo.
    echo  Press R to refresh, L to view logs, O to open browser, or Q to quit...
    choice /C RLOQ /N
    if errorlevel 4 exit
    if errorlevel 3 goto open
    if errorlevel 2 goto logs
    if errorlevel 1 goto check
)
goto check

:start
echo Starting frontend...
cd /d ""{installPath}\company""
start ""Catalyst Company"" cmd /k ""npx vite --port 3000""
timeout /t 5 >nul
goto check

:open
start http://localhost:3000
goto check

:logs
cls
echo ========================================
echo    Catalyst Frontend Live Logs
echo ========================================
echo  (Press Ctrl+C to stop and return)
echo ========================================
echo.
cd /d ""{installPath}\company""
npx vite --port 3000
goto check
";
        System.IO.File.WriteAllText(Path.Combine(installPath, "Watch-Frontend.bat"), watchFrontend);
        
        Log("Launchers created.");
    }
    
    private void CreateDesktopShortcuts()
    {
        try
        {
            var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            
            // Use PowerShell to create shortcut (Company Portal only)
            CreateShortcutWithPowerShell(
                Path.Combine(desktopPath, "Catalyst Company Portal.lnk"),
                Path.Combine(installPath, "Launch-Company.vbs"),
                installPath,
                "Launch Catalyst Company Portal"
            );
            Log("Company Portal shortcut created.");
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
        
        // Create simple VBS shortcut (Company Portal only)
        System.IO.File.Copy(
            Path.Combine(installPath, "Launch-Company.vbs"),
            Path.Combine(desktopPath, "Catalyst Company Portal.vbs"),
            true);
        
        Log("Desktop shortcut created (batch file).");
    }
    
    private void AddBackendToStartup()
    {
        try
        {
            // Create a startup batch file that runs silently
            var startupScript = $@"@echo off
cd /d ""{installPath}\backend""
set ASPNETCORE_ENVIRONMENT=Local
start /min """" dotnet run
";
            var startupBatPath = Path.Combine(installPath, "Start-Backend.bat");
            System.IO.File.WriteAllText(startupBatPath, startupScript);
            
            // Create a VBS wrapper to run dotnet completely hidden (no taskbar icon)
            var vbsScript = $@"Set WshShell = CreateObject(""WScript.Shell"")
WshShell.CurrentDirectory = ""{installPath}\backend""
WshShell.Run ""cmd /c set ASPNETCORE_ENVIRONMENT=Local && dotnet run"", 0, False
Set WshShell = Nothing
";
            var vbsPath = Path.Combine(installPath, "Start-Backend-Hidden.vbs");
            System.IO.File.WriteAllText(vbsPath, vbsScript);
            
            // Add to Windows Startup folder
            var startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
            var shortcutPath = Path.Combine(startupFolder, "Catalyst Backend.lnk");
            
            // Use PowerShell to create shortcut in startup folder
            var script = $@"
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcutPath}')
$Shortcut.TargetPath = 'wscript.exe'
$Shortcut.Arguments = '""{vbsPath}""'
$Shortcut.WorkingDirectory = '{installPath}'
$Shortcut.Description = 'Catalyst Backend API'
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
            
            Log("Backend added to Windows startup.");
        }
        catch (Exception ex)
        {
            Log($"Startup configuration warning: {ex.Message}");
        }
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
    
    private async Task SaveLicenseLocally()
    {
        if (activatedLicense == null || activatedLicense.Company == null) return;
        
        try
        {
            var connStr = $"Host={txtHost.Text};Port={txtPort.Text};Username={txtUser.Text};Password={txtPass.Text};Database={txtDbName.Text}";
            using var conn = new Npgsql.NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            // Create licenses table if not exists
            using var createTable = conn.CreateCommand();
            createTable.CommandText = @"
                CREATE TABLE IF NOT EXISTS local_licenses (
                    id SERIAL PRIMARY KEY,
                    license_key VARCHAR(100) NOT NULL,
                    company_id INT NOT NULL,
                    company_name VARCHAR(255),
                    company_username VARCHAR(100),
                    company_password_hash TEXT,
                    expires_at TIMESTAMP,
                    grace_period_days INT DEFAULT 7,
                    machine_fingerprint VARCHAR(500),
                    activated_at TIMESTAMP DEFAULT NOW(),
                    last_check_in TIMESTAMP,
                    features TEXT
                )";
            await createTable.ExecuteNonQueryAsync();
            
            // Insert license info
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO local_licenses (license_key, company_id, company_name, company_username, company_password_hash, expires_at, grace_period_days, machine_fingerprint, features)
                VALUES (@key, @companyId, @name, @username, @passwordHash, @expires, @grace, @fingerprint, @features)
                ON CONFLICT DO NOTHING";
            cmd.Parameters.AddWithValue("key", activatedLicense.LicenseKey);
            cmd.Parameters.AddWithValue("companyId", activatedLicense.Company.Id);
            cmd.Parameters.AddWithValue("name", activatedLicense.Company.Name);
            cmd.Parameters.AddWithValue("username", activatedLicense.Company.Username);
            cmd.Parameters.AddWithValue("passwordHash", activatedLicense.Company.PasswordHash);
            cmd.Parameters.AddWithValue("expires", activatedLicense.ExpiresAt);
            cmd.Parameters.AddWithValue("grace", activatedLicense.GracePeriodDays);
            cmd.Parameters.AddWithValue("fingerprint", GetMachineFingerprint());
            cmd.Parameters.AddWithValue("features", activatedLicense.Features ?? "");
            await cmd.ExecuteNonQueryAsync();
            
            // Also create the company in the companies table with all required fields
            using var companyCmd = conn.CreateCommand();
            companyCmd.CommandText = @"
                INSERT INTO companies (
                    id, name, username, password_hash, status, created_at, updated_at, 
                    currency_symbol, phone, address, logo_url, delivery_enabled, delivery_fee,
                    exchange_rate, is_online_store_enabled, is_premium, low_stock_alert,
                    max_cash_warning, min_order_amount, premium_tier, rating, show_secondary_price,
                    page_permissions
                )
                VALUES (
                    @id, @name, @username, @passwordHash, 'active', NOW(), NOW(),
                    @currency, @phone, @address, @logo, false, 0,
                    1, false, false, 10,
                    1000, 0, 'none', 0, false,
                    @pagePermissions
                )
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name,
                    username = EXCLUDED.username,
                    password_hash = EXCLUDED.password_hash,
                    page_permissions = EXCLUDED.page_permissions,
                    updated_at = NOW()";
            companyCmd.Parameters.AddWithValue("id", activatedLicense.Company.Id);
            companyCmd.Parameters.AddWithValue("name", activatedLicense.Company.Name);
            companyCmd.Parameters.AddWithValue("username", activatedLicense.Company.Username);
            companyCmd.Parameters.AddWithValue("passwordHash", activatedLicense.Company.PasswordHash);
            companyCmd.Parameters.AddWithValue("currency", activatedLicense.Company.CurrencySymbol ?? "$");
            companyCmd.Parameters.AddWithValue("phone", (object?)activatedLicense.Company.Phone ?? DBNull.Value);
            companyCmd.Parameters.AddWithValue("address", (object?)activatedLicense.Company.Address ?? DBNull.Value);
            companyCmd.Parameters.AddWithValue("logo", (object?)activatedLicense.Company.LogoUrl ?? DBNull.Value);
            // Serialize page permissions as JSON
            string? pagePermissionsJson = null;
            if (activatedLicense.Company.PagePermissions != null && activatedLicense.Company.PagePermissions.Count > 0)
            {
                pagePermissionsJson = System.Text.Json.JsonSerializer.Serialize(activatedLicense.Company.PagePermissions);
            }
            companyCmd.Parameters.AddWithValue("pagePermissions", (object?)pagePermissionsJson ?? DBNull.Value);
            await companyCmd.ExecuteNonQueryAsync();
            
            // Create Main Warehouse for the company if it doesn't exist
            using var warehouseCmd = conn.CreateCommand();
            warehouseCmd.CommandText = @"
                INSERT INTO warehouses (company_id, name, code, is_active, created_at, updated_at)
                SELECT @companyId, 'Main Warehouse', 'MAIN', true, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM warehouses WHERE company_id = @companyId
                )";
            warehouseCmd.Parameters.AddWithValue("companyId", activatedLicense.Company.Id);
            await warehouseCmd.ExecuteNonQueryAsync();
            
            // Create inventory settings for the company if it doesn't exist
            using var invSettingsCmd = conn.CreateCommand();
            invSettingsCmd.CommandText = @"
                INSERT INTO inventory_settings (company_id, valuation_method, cost_spike_threshold, low_margin_threshold, enable_cost_alerts, created_at, updated_at)
                SELECT @companyId, 'fifo', 0.2, 0.1, true, NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM inventory_settings WHERE company_id = @companyId
                )";
            invSettingsCmd.Parameters.AddWithValue("companyId", activatedLicense.Company.Id);
            await invSettingsCmd.ExecuteNonQueryAsync();
            
            Log($"License saved for company: {activatedLicense.Company.Name}");
            Log($"Company login: {activatedLicense.Company.Username}");
            Log($"Main Warehouse created.");
        }
        catch (Exception ex)
        {
            Log($"License save warning: {ex.Message}");
        }
    }
}

// License response classes
public class LicenseInfo
{
    public bool Success { get; set; }
    public int ActivationId { get; set; }
    public string LicenseKey { get; set; } = "";
    public string LicenseType { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public int DaysUntilExpiry { get; set; }
    public int GracePeriodDays { get; set; }
    public string? Features { get; set; }
    public CompanyInfo? Company { get; set; }
}

public class CompanyInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? LogoUrl { get; set; }
    public string CurrencySymbol { get; set; } = "$";
    public List<string>? PagePermissions { get; set; }
}
