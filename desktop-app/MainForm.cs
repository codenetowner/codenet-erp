using System;
using System.Diagnostics;
using System.IO;
using System.Net;
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
        private Process? backendProcess;
        private HttpListener? httpListener;
        private string frontendPath;
        private const int BACKEND_PORT = 5227;
        private const int FRONTEND_PORT = 3000;
        private Label statusLabel;
        private bool isClosing = false;

        public MainForm()
        {
            // Get paths
            var appPath = AppDomain.CurrentDomain.BaseDirectory;
            frontendPath = Path.Combine(appPath, "renderer");
            
            // Form setup
            this.Text = "Catalyst ERP";
            this.Size = new System.Drawing.Size(1400, 900);
            this.MinimumSize = new System.Drawing.Size(1024, 700);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = System.Drawing.Color.FromArgb(16, 185, 129); // Emerald
            
            // Status label
            statusLabel = new Label
            {
                Text = "Starting Catalyst ERP...",
                ForeColor = System.Drawing.Color.White,
                Font = new System.Drawing.Font("Segoe UI", 14),
                AutoSize = true,
                Location = new System.Drawing.Point(20, 20)
            };
            this.Controls.Add(statusLabel);

            // WebView2
            webView = new WebView2
            {
                Dock = DockStyle.Fill,
                Visible = false
            };
            this.Controls.Add(webView);

            this.Load += MainForm_Load;
            this.FormClosing += MainForm_FormClosing;
        }

        private async void MainForm_Load(object? sender, EventArgs e)
        {
            try
            {
                // Start backend
                statusLabel.Text = "Starting backend server...";
                await StartBackend();
                
                // Start frontend server
                statusLabel.Text = "Starting frontend server...";
                StartFrontendServer();
                
                // Wait for servers
                statusLabel.Text = "Waiting for servers...";
                await WaitForServer(BACKEND_PORT, 15000);
                await WaitForServer(FRONTEND_PORT, 5000);
                
                // Initialize WebView2
                statusLabel.Text = "Loading application...";
                await InitializeWebView();
                
                // Show WebView
                statusLabel.Visible = false;
                webView.Visible = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Startup error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async Task StartBackend()
        {
            // Try multiple locations for backend
            var possiblePaths = new[]
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "backend"), // Installed: C:\Catalyst\desktop-app\..\backend
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "backend"),        // Alongside app
                @"C:\Catalyst\backend",                                                  // Default install location
                Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "backend")) // Dev location
            };
            
            string? backendPath = null;
            foreach (var path in possiblePaths)
            {
                if (Directory.Exists(path))
                {
                    backendPath = path;
                    break;
                }
            }
            
            if (backendPath == null)
            {
                throw new Exception($"Backend not found. Searched: {string.Join(", ", possiblePaths)}");
            }

            // Check if backend is already running
            if (IsPortInUse(BACKEND_PORT))
            {
                return; // Already running
            }

            backendProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "dotnet",
                    Arguments = "run",
                    WorkingDirectory = backendPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                }
            };
            backendProcess.StartInfo.EnvironmentVariables["ASPNETCORE_ENVIRONMENT"] = "Local";
            backendProcess.Start();
            
            await Task.Delay(2000); // Give it time to start
        }

        private void StartFrontendServer()
        {
            if (!Directory.Exists(frontendPath))
            {
                throw new Exception($"Frontend not found at: {frontendPath}");
            }

            // Check if something is already on port 3000
            if (IsPortInUse(FRONTEND_PORT))
            {
                return;
            }

            // Start simple HTTP server for frontend
            Task.Run(() => RunHttpServer());
        }

        private void RunHttpServer()
        {
            try
            {
                httpListener = new HttpListener();
                httpListener.Prefixes.Add($"http://localhost:{FRONTEND_PORT}/");
                httpListener.Start();

                while (!isClosing && httpListener.IsListening)
                {
                    try
                    {
                        var context = httpListener.GetContext();
                        Task.Run(() => HandleRequest(context));
                    }
                    catch (HttpListenerException)
                    {
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"HTTP Server error: {ex.Message}");
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            try
            {
                var requestPath = context.Request.Url?.AbsolutePath ?? "/";
                if (requestPath == "/") requestPath = "/index.html";
                
                var filePath = Path.Combine(frontendPath, requestPath.TrimStart('/'));
                
                // SPA fallback - return index.html for routes
                if (!File.Exists(filePath) && !Path.HasExtension(requestPath))
                {
                    filePath = Path.Combine(frontendPath, "index.html");
                }

                if (File.Exists(filePath))
                {
                    var content = File.ReadAllBytes(filePath);
                    context.Response.ContentType = GetMimeType(filePath);
                    context.Response.ContentLength64 = content.Length;
                    context.Response.OutputStream.Write(content, 0, content.Length);
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch { }
            finally
            {
                context.Response.Close();
            }
        }

        private string GetMimeType(string filePath)
        {
            var ext = Path.GetExtension(filePath).ToLower();
            return ext switch
            {
                ".html" => "text/html",
                ".css" => "text/css",
                ".js" => "application/javascript",
                ".json" => "application/json",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                ".svg" => "image/svg+xml",
                ".ico" => "image/x-icon",
                ".woff" => "font/woff",
                ".woff2" => "font/woff2",
                ".ttf" => "font/ttf",
                _ => "application/octet-stream"
            };
        }

        private async Task InitializeWebView()
        {
            var env = await CoreWebView2Environment.CreateAsync();
            await webView.EnsureCoreWebView2Async(env);
            webView.Source = new Uri($"http://localhost:{FRONTEND_PORT}");
        }

        private async Task WaitForServer(int port, int timeoutMs)
        {
            var start = DateTime.Now;
            while ((DateTime.Now - start).TotalMilliseconds < timeoutMs)
            {
                if (IsPortInUse(port))
                {
                    return;
                }
                await Task.Delay(500);
            }
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

        private void MainForm_FormClosing(object? sender, FormClosingEventArgs e)
        {
            isClosing = true;
            
            // Stop HTTP listener
            try { httpListener?.Stop(); } catch { }
            
            // Stop backend
            try
            {
                if (backendProcess != null && !backendProcess.HasExited)
                {
                    backendProcess.Kill();
                }
            }
            catch { }
        }
    }
}
