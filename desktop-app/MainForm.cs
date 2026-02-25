using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CatalystApp
{
    public class MainForm : Form
    {
        private WebView2 webView;
        private string frontendPath;
        private string logFile;
        private const int BACKEND_PORT = 5227;
        private const string SERVICE_NAME = "CatalystAPI";
        private Label statusLabel;
        private Button retryButton;

        public MainForm()
        {
            var appPath = AppDomain.CurrentDomain.BaseDirectory;
            frontendPath = Path.Combine(appPath, "renderer");
            logFile = Path.Combine(appPath, "catalyst_log.txt");
            
            this.Text = "Catalyst ERP";
            this.Size = new System.Drawing.Size(1400, 900);
            this.MinimumSize = new System.Drawing.Size(1024, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = System.Drawing.Color.FromArgb(16, 185, 129);
            
            statusLabel = new Label
            {
                Text = "Starting Catalyst ERP...",
                ForeColor = System.Drawing.Color.White,
                Font = new System.Drawing.Font("Segoe UI", 14),
                AutoSize = true,
                MaximumSize = new System.Drawing.Size(600, 0),
                Location = new System.Drawing.Point(20, 20)
            };
            this.Controls.Add(statusLabel);

            retryButton = new Button
            {
                Text = "Retry",
                Size = new System.Drawing.Size(100, 35),
                Location = new System.Drawing.Point(20, 100),
                Visible = false
            };
            retryButton.Click += async (s, e) => await StartupSequence();
            this.Controls.Add(retryButton);

            webView = new WebView2
            {
                Dock = DockStyle.Fill,
                Visible = false
            };
            this.Controls.Add(webView);

            this.Load += MainForm_Load;
        }

        private void Log(string message)
        {
            try
            {
                var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}";
                File.AppendAllText(logFile, line + Environment.NewLine);
                Debug.WriteLine(line);
            }
            catch { }
        }

        private async void MainForm_Load(object? sender, EventArgs e)
        {
            Log("=== Catalyst ERP Starting ===");
            Log($"App Path: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"Frontend Path: {frontendPath}");
            await StartupSequence();
        }

        private async Task StartupSequence()
        {
            retryButton.Visible = false;
            statusLabel.ForeColor = System.Drawing.Color.White;
            
            try
            {
                // Step 1: Check if backend service is running
                statusLabel.Text = "Checking backend service...";
                Log("Checking CatalystAPI service...");
                
                if (!IsPortInUse(BACKEND_PORT))
                {
                    // Try to start the service
                    statusLabel.Text = "Starting backend service...";
                    Log("Backend not running, attempting to start service...");
                    await StartBackendService();
                }
                
                // Step 2: Wait for backend to be ready
                statusLabel.Text = "Waiting for backend...";
                Log("Waiting for backend on port 5227...");
                var backendReady = await WaitForServer(BACKEND_PORT, 15000);
                
                if (!backendReady)
                {
                    throw new Exception("Backend service not responding.\n\nPlease ensure:\n1. PostgreSQL is running\n2. Installer was run as Administrator");
                }
                Log("Backend is ready!");
                
                // Step 3: Initialize WebView2
                statusLabel.Text = "Loading application...";
                Log("Initializing WebView2...");
                await InitializeWebView();
                
                Log("Startup complete!");
                statusLabel.Visible = false;
                webView.Visible = true;
            }
            catch (Exception ex)
            {
                Log($"ERROR: {ex.Message}");
                statusLabel.Text = $"Error: {ex.Message}";
                statusLabel.ForeColor = System.Drawing.Color.Yellow;
                retryButton.Visible = true;
            }
        }

        private async Task StartBackendService()
        {
            try
            {
                // Try using sc.exe to start the service (works without admin for already-installed services)
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"start {SERVICE_NAME}",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true
                    }
                };
                process.Start();
                await process.WaitForExitAsync();
                Log($"Service start command sent. Exit code: {process.ExitCode}");
            }
            catch (Exception ex)
            {
                Log($"Could not start service via sc.exe: {ex.Message}");
            }
            
            await Task.Delay(2000); // Give service time to start
        }

        private async Task InitializeWebView()
        {
            if (!Directory.Exists(frontendPath))
            {
                throw new Exception($"Frontend not found at: {frontendPath}");
            }

            var indexFile = Path.Combine(frontendPath, "index.html");
            if (!File.Exists(indexFile))
            {
                throw new Exception($"index.html not found at: {indexFile}");
            }

            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                "CatalystERP", "WebView2");
            Directory.CreateDirectory(userDataFolder);
            
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);
            
            // Map virtual host to local files - avoids localhost server issues
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "catalyst.local", 
                frontendPath, 
                CoreWebView2HostResourceAccessKind.Allow);
            
            webView.Source = new Uri("https://catalyst.local/index.html");
            Log("WebView2 initialized with virtual host mapping");
        }

        private async Task<bool> WaitForServer(int port, int timeoutMs)
        {
            var start = DateTime.Now;
            while ((DateTime.Now - start).TotalMilliseconds < timeoutMs)
            {
                if (IsPortInUse(port))
                {
                    return true;
                }
                await Task.Delay(500);
            }
            return false;
        }

        private bool IsPortInUse(int port)
        {
            try
            {
                using var client = new TcpClient();
                client.Connect("127.0.0.1", port);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
