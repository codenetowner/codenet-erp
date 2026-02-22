# Catalyst Offline Installation Wizard
# PowerShell GUI Installer

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Global variables
$script:currentStep = 0
$script:installPath = $PSScriptRoot
$script:dbHost = "localhost"
$script:dbPort = "5432"
$script:dbName = "cashvan_local"
$script:dbUser = "postgres"
$script:dbPassword = "postgres"
$script:installComponents = @{
    Backend = $true
    CompanyPortal = $true
    AdminPortal = $true
    DriverPortal = $true
    SalesmanPortal = $true
    DeliveryPortal = $true
}
$script:skipDatabase = $false

# Create main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Catalyst Offline Setup Wizard"
$form.Size = New-Object System.Drawing.Size(600, 500)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.BackColor = [System.Drawing.Color]::White

# Header Panel
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.Size = New-Object System.Drawing.Size(600, 70)
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(41, 128, 185)

$headerLabel = New-Object System.Windows.Forms.Label
$headerLabel.Text = "Catalyst Offline Setup"
$headerLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$headerLabel.ForeColor = [System.Drawing.Color]::White
$headerLabel.Location = New-Object System.Drawing.Point(20, 15)
$headerLabel.AutoSize = $true
$headerPanel.Controls.Add($headerLabel)

$subHeaderLabel = New-Object System.Windows.Forms.Label
$subHeaderLabel.Text = "Install and configure for offline use"
$subHeaderLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$subHeaderLabel.ForeColor = [System.Drawing.Color]::FromArgb(236, 240, 241)
$subHeaderLabel.Location = New-Object System.Drawing.Point(20, 45)
$subHeaderLabel.AutoSize = $true
$headerPanel.Controls.Add($subHeaderLabel)

$form.Controls.Add($headerPanel)

# Content Panel
$contentPanel = New-Object System.Windows.Forms.Panel
$contentPanel.Location = New-Object System.Drawing.Point(0, 70)
$contentPanel.Size = New-Object System.Drawing.Size(600, 340)
$contentPanel.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($contentPanel)

# Footer Panel with buttons
$footerPanel = New-Object System.Windows.Forms.Panel
$footerPanel.Location = New-Object System.Drawing.Point(0, 410)
$footerPanel.Size = New-Object System.Drawing.Size(600, 60)
$footerPanel.BackColor = [System.Drawing.Color]::FromArgb(245, 245, 245)

$backButton = New-Object System.Windows.Forms.Button
$backButton.Text = "< Back"
$backButton.Location = New-Object System.Drawing.Point(300, 15)
$backButton.Size = New-Object System.Drawing.Size(80, 30)
$backButton.Enabled = $false

$nextButton = New-Object System.Windows.Forms.Button
$nextButton.Text = "Next >"
$nextButton.Location = New-Object System.Drawing.Point(390, 15)
$nextButton.Size = New-Object System.Drawing.Size(80, 30)
$nextButton.BackColor = [System.Drawing.Color]::FromArgb(41, 128, 185)
$nextButton.ForeColor = [System.Drawing.Color]::White

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancel"
$cancelButton.Location = New-Object System.Drawing.Point(490, 15)
$cancelButton.Size = New-Object System.Drawing.Size(80, 30)

$footerPanel.Controls.Add($backButton)
$footerPanel.Controls.Add($nextButton)
$footerPanel.Controls.Add($cancelButton)
$form.Controls.Add($footerPanel)

# Step panels
$stepPanels = @()

# ============ STEP 1: Welcome ============
$step1 = New-Object System.Windows.Forms.Panel
$step1.Location = New-Object System.Drawing.Point(20, 20)
$step1.Size = New-Object System.Drawing.Size(560, 300)

$welcomeTitle = New-Object System.Windows.Forms.Label
$welcomeTitle.Text = "Welcome to Catalyst Setup"
$welcomeTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$welcomeTitle.Location = New-Object System.Drawing.Point(0, 0)
$welcomeTitle.AutoSize = $true
$step1.Controls.Add($welcomeTitle)

$welcomeText = New-Object System.Windows.Forms.Label
$welcomeText.Text = @"
This wizard will help you set up Catalyst for offline use.

The setup will:
  • Configure a local PostgreSQL database
  • Set up all portal configurations
  • Create shortcuts for starting the system

Before continuing, please ensure you have:
  • PostgreSQL installed (with psql in PATH)
  • .NET 8 SDK installed
  • Node.js v18+ installed

Click 'Next' to continue.
"@
$welcomeText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$welcomeText.Location = New-Object System.Drawing.Point(0, 40)
$welcomeText.Size = New-Object System.Drawing.Size(540, 250)
$step1.Controls.Add($welcomeText)

$stepPanels += $step1

# ============ STEP 2: Components ============
$step2 = New-Object System.Windows.Forms.Panel
$step2.Location = New-Object System.Drawing.Point(20, 20)
$step2.Size = New-Object System.Drawing.Size(560, 300)
$step2.Visible = $false

$compTitle = New-Object System.Windows.Forms.Label
$compTitle.Text = "Select Components"
$compTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$compTitle.Location = New-Object System.Drawing.Point(0, 0)
$compTitle.AutoSize = $true
$step2.Controls.Add($compTitle)

$compText = New-Object System.Windows.Forms.Label
$compText.Text = "Select which components to configure for offline use:"
$compText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$compText.Location = New-Object System.Drawing.Point(0, 35)
$compText.AutoSize = $true
$step2.Controls.Add($compText)

$chkBackend = New-Object System.Windows.Forms.CheckBox
$chkBackend.Text = "Backend API (Required)"
$chkBackend.Location = New-Object System.Drawing.Point(20, 70)
$chkBackend.Size = New-Object System.Drawing.Size(300, 25)
$chkBackend.Checked = $true
$chkBackend.Enabled = $false
$chkBackend.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkBackend)

$chkCompany = New-Object System.Windows.Forms.CheckBox
$chkCompany.Text = "Company Portal (Main business portal)"
$chkCompany.Location = New-Object System.Drawing.Point(20, 100)
$chkCompany.Size = New-Object System.Drawing.Size(300, 25)
$chkCompany.Checked = $true
$chkCompany.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkCompany)

$chkAdmin = New-Object System.Windows.Forms.CheckBox
$chkAdmin.Text = "Admin Portal (Super admin management)"
$chkAdmin.Location = New-Object System.Drawing.Point(20, 130)
$chkAdmin.Size = New-Object System.Drawing.Size(300, 25)
$chkAdmin.Checked = $true
$chkAdmin.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkAdmin)

$chkDriver = New-Object System.Windows.Forms.CheckBox
$chkDriver.Text = "Driver Portal (Delivery drivers)"
$chkDriver.Location = New-Object System.Drawing.Point(20, 160)
$chkDriver.Size = New-Object System.Drawing.Size(300, 25)
$chkDriver.Checked = $true
$chkDriver.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkDriver)

$chkSalesman = New-Object System.Windows.Forms.CheckBox
$chkSalesman.Text = "Salesman Portal (Sales representatives)"
$chkSalesman.Location = New-Object System.Drawing.Point(20, 190)
$chkSalesman.Size = New-Object System.Drawing.Size(300, 25)
$chkSalesman.Checked = $true
$chkSalesman.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkSalesman)

$chkDelivery = New-Object System.Windows.Forms.CheckBox
$chkDelivery.Text = "Delivery Portal (Delivery management)"
$chkDelivery.Location = New-Object System.Drawing.Point(20, 220)
$chkDelivery.Size = New-Object System.Drawing.Size(300, 25)
$chkDelivery.Checked = $true
$chkDelivery.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step2.Controls.Add($chkDelivery)

$stepPanels += $step2

# ============ STEP 3: Database Configuration ============
$step3 = New-Object System.Windows.Forms.Panel
$step3.Location = New-Object System.Drawing.Point(20, 20)
$step3.Size = New-Object System.Drawing.Size(560, 300)
$step3.Visible = $false

$dbTitle = New-Object System.Windows.Forms.Label
$dbTitle.Text = "Database Configuration"
$dbTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$dbTitle.Location = New-Object System.Drawing.Point(0, 0)
$dbTitle.AutoSize = $true
$step3.Controls.Add($dbTitle)

$dbText = New-Object System.Windows.Forms.Label
$dbText.Text = "Configure your local PostgreSQL database:"
$dbText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$dbText.Location = New-Object System.Drawing.Point(0, 35)
$dbText.AutoSize = $true
$step3.Controls.Add($dbText)

# Host
$lblHost = New-Object System.Windows.Forms.Label
$lblHost.Text = "Host:"
$lblHost.Location = New-Object System.Drawing.Point(20, 75)
$lblHost.Size = New-Object System.Drawing.Size(100, 25)
$lblHost.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($lblHost)

$txtHost = New-Object System.Windows.Forms.TextBox
$txtHost.Text = "localhost"
$txtHost.Location = New-Object System.Drawing.Point(130, 72)
$txtHost.Size = New-Object System.Drawing.Size(200, 25)
$txtHost.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($txtHost)

# Port
$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Text = "Port:"
$lblPort.Location = New-Object System.Drawing.Point(20, 110)
$lblPort.Size = New-Object System.Drawing.Size(100, 25)
$lblPort.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($lblPort)

$txtPort = New-Object System.Windows.Forms.TextBox
$txtPort.Text = "5432"
$txtPort.Location = New-Object System.Drawing.Point(130, 107)
$txtPort.Size = New-Object System.Drawing.Size(100, 25)
$txtPort.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($txtPort)

# Database Name
$lblDbName = New-Object System.Windows.Forms.Label
$lblDbName.Text = "Database:"
$lblDbName.Location = New-Object System.Drawing.Point(20, 145)
$lblDbName.Size = New-Object System.Drawing.Size(100, 25)
$lblDbName.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($lblDbName)

$txtDbName = New-Object System.Windows.Forms.TextBox
$txtDbName.Text = "cashvan_local"
$txtDbName.Location = New-Object System.Drawing.Point(130, 142)
$txtDbName.Size = New-Object System.Drawing.Size(200, 25)
$txtDbName.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($txtDbName)

# Username
$lblUser = New-Object System.Windows.Forms.Label
$lblUser.Text = "Username:"
$lblUser.Location = New-Object System.Drawing.Point(20, 180)
$lblUser.Size = New-Object System.Drawing.Size(100, 25)
$lblUser.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($lblUser)

$txtUser = New-Object System.Windows.Forms.TextBox
$txtUser.Text = "postgres"
$txtUser.Location = New-Object System.Drawing.Point(130, 177)
$txtUser.Size = New-Object System.Drawing.Size(200, 25)
$txtUser.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($txtUser)

# Password
$lblPass = New-Object System.Windows.Forms.Label
$lblPass.Text = "Password:"
$lblPass.Location = New-Object System.Drawing.Point(20, 215)
$lblPass.Size = New-Object System.Drawing.Size(100, 25)
$lblPass.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step3.Controls.Add($lblPass)

$txtPass = New-Object System.Windows.Forms.TextBox
$txtPass.Text = "postgres"
$txtPass.Location = New-Object System.Drawing.Point(130, 212)
$txtPass.Size = New-Object System.Drawing.Size(200, 25)
$txtPass.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$txtPass.PasswordChar = '*'
$step3.Controls.Add($txtPass)

$chkShowPass = New-Object System.Windows.Forms.CheckBox
$chkShowPass.Text = "Show password"
$chkShowPass.Location = New-Object System.Drawing.Point(340, 212)
$chkShowPass.Size = New-Object System.Drawing.Size(150, 25)
$chkShowPass.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$chkShowPass.Add_CheckedChanged({
    if ($chkShowPass.Checked) { $txtPass.PasswordChar = [char]0 }
    else { $txtPass.PasswordChar = '*' }
})
$step3.Controls.Add($chkShowPass)

# Test Connection Button
$btnTest = New-Object System.Windows.Forms.Button
$btnTest.Text = "Test Connection"
$btnTest.Location = New-Object System.Drawing.Point(130, 255)
$btnTest.Size = New-Object System.Drawing.Size(120, 30)
$btnTest.Add_Click({
    # Check if psql exists
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        [System.Windows.Forms.MessageBox]::Show("PostgreSQL is not installed or not in PATH.`n`nPlease install PostgreSQL from:`nhttps://www.postgresql.org/download/windows/`n`nOr click 'Skip Database' to configure portals only.", "PostgreSQL Not Found", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }
    
    $env:PGPASSWORD = $txtPass.Text
    $result = & psql -h $txtHost.Text -p $txtPort.Text -U $txtUser.Text -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Connection successful!", "Success", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    } else {
        [System.Windows.Forms.MessageBox]::Show("Connection failed.`n`nPossible causes:`n- PostgreSQL service not running`n- Wrong password`n- Wrong port`n`nError: $result", "Connection Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    }
})
$step3.Controls.Add($btnTest)

# Skip Database Button
$btnSkipDb = New-Object System.Windows.Forms.Button
$btnSkipDb.Text = "Skip Database"
$btnSkipDb.Location = New-Object System.Drawing.Point(260, 255)
$btnSkipDb.Size = New-Object System.Drawing.Size(120, 30)
$btnSkipDb.ForeColor = [System.Drawing.Color]::Gray
$btnSkipDb.Add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show("Skip database setup?`n`nThis will only configure portal files.`nYou can set up the database later by running setup-offline.bat", "Skip Database", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $script:skipDatabase = $true
        $script:currentStep = 3
        Show-Step
        Start-Installation
    }
})
$step3.Controls.Add($btnSkipDb)

$stepPanels += $step3

# ============ STEP 4: Installation Progress ============
$step4 = New-Object System.Windows.Forms.Panel
$step4.Location = New-Object System.Drawing.Point(20, 20)
$step4.Size = New-Object System.Drawing.Size(560, 300)
$step4.Visible = $false

$installTitle = New-Object System.Windows.Forms.Label
$installTitle.Text = "Installing..."
$installTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$installTitle.Location = New-Object System.Drawing.Point(0, 0)
$installTitle.AutoSize = $true
$step4.Controls.Add($installTitle)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(0, 50)
$progressBar.Size = New-Object System.Drawing.Size(540, 25)
$progressBar.Style = "Continuous"
$step4.Controls.Add($progressBar)

$progressLabel = New-Object System.Windows.Forms.Label
$progressLabel.Text = "Preparing installation..."
$progressLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$progressLabel.Location = New-Object System.Drawing.Point(0, 85)
$progressLabel.Size = New-Object System.Drawing.Size(540, 25)
$step4.Controls.Add($progressLabel)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.Location = New-Object System.Drawing.Point(0, 120)
$logBox.Size = New-Object System.Drawing.Size(540, 170)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.ReadOnly = $true
$step4.Controls.Add($logBox)

$stepPanels += $step4

# ============ STEP 5: Completion ============
$step5 = New-Object System.Windows.Forms.Panel
$step5.Location = New-Object System.Drawing.Point(20, 20)
$step5.Size = New-Object System.Drawing.Size(560, 300)
$step5.Visible = $false

$completeTitle = New-Object System.Windows.Forms.Label
$completeTitle.Text = "Setup Complete!"
$completeTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$completeTitle.ForeColor = [System.Drawing.Color]::FromArgb(39, 174, 96)
$completeTitle.Location = New-Object System.Drawing.Point(0, 0)
$completeTitle.AutoSize = $true
$step5.Controls.Add($completeTitle)

$completeText = New-Object System.Windows.Forms.Label
$completeText.Text = @"
Catalyst has been successfully configured for offline use!

To start the system:
  • Run 'start-offline.bat' for offline mode
  • Run 'start-online.bat' for online mode
  • Run 'switch-mode.bat' to toggle modes

Portal URLs (after starting):
  • Company Portal:  http://localhost:3000
  • Admin Portal:    http://localhost:5176
  • Driver Portal:   http://localhost:3002
  • Salesman Portal: http://localhost:5175
  • Delivery Portal: http://localhost:8083
  • Backend API:     http://localhost:5227

Click 'Finish' to close this wizard.
"@
$completeText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$completeText.Location = New-Object System.Drawing.Point(0, 40)
$completeText.Size = New-Object System.Drawing.Size(540, 250)
$step5.Controls.Add($completeText)

$chkStartNow = New-Object System.Windows.Forms.CheckBox
$chkStartNow.Text = "Start Catalyst in offline mode now"
$chkStartNow.Location = New-Object System.Drawing.Point(0, 260)
$chkStartNow.Size = New-Object System.Drawing.Size(300, 25)
$chkStartNow.Checked = $true
$chkStartNow.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$step5.Controls.Add($chkStartNow)

$stepPanels += $step5

# Add all panels to content
foreach ($panel in $stepPanels) {
    $contentPanel.Controls.Add($panel)
}

# Helper function to log
function Write-Log {
    param([string]$message)
    $logBox.AppendText("$message`r`n")
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

# Installation function
function Start-Installation {
    $progressBar.Value = 0
    $backButton.Enabled = $false
    $nextButton.Enabled = $false
    
    if (-not $script:skipDatabase) {
        # Step 1: Create database
        $progressLabel.Text = "Creating database..."
        Write-Log "Creating database '$($txtDbName.Text)'..."
        $env:PGPASSWORD = $txtPass.Text
        
        $result = & psql -h $txtHost.Text -p $txtPort.Text -U $txtUser.Text -c "CREATE DATABASE $($txtDbName.Text);" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Note: Database may already exist, continuing..."
        } else {
            Write-Log "Database created successfully."
        }
        $progressBar.Value = 15
        
        # Step 2: Apply schema
        $progressLabel.Text = "Applying database schema..."
        Write-Log "Applying database schema..."
        $schemaFile = Join-Path $script:installPath "cashvan_schema.sql"
        if (Test-Path $schemaFile) {
            $result = & psql -h $txtHost.Text -p $txtPort.Text -U $txtUser.Text -d $txtDbName.Text -f $schemaFile 2>&1
            Write-Log "Schema applied."
        } else {
            Write-Log "Warning: Schema file not found. Skipping."
        }
        $progressBar.Value = 30
    } else {
        Write-Log "Skipping database setup (PostgreSQL not configured)..."
        Write-Log "You can set up the database later using setup-offline.bat"
        $progressBar.Value = 30
    }
    
    # Step 3: Create backend config
    $progressLabel.Text = "Configuring backend..."
    Write-Log "Creating backend configuration..."
    $backendConfig = @"
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=$($txtHost.Text);Port=$($txtPort.Text);Database=$($txtDbName.Text);Username=$($txtUser.Text);Password=$($txtPass.Text)"
  },
  "JwtSettings": {
    "Secret": "CatalystLocalSecretKey2026ForOfflineEnvironment123!",
    "Issuer": "CatalystAPI",
    "Audience": "CatalystClients",
    "ExpirationInMinutes": 10080
  }
}
"@
    $backendConfig | Out-File -FilePath (Join-Path $script:installPath "backend\appsettings.Local.json") -Encoding UTF8
    Write-Log "Backend configuration saved."
    $progressBar.Value = 45
    
    # Step 4: Configure portals
    $progressLabel.Text = "Configuring portals..."
    $envContent = @"
# Offline/Local Configuration
VITE_API_URL=http://localhost:5227/api
"@
    
    $portals = @("admin", "company", "driver", "salesman", "delivery-portal")
    $progressStep = 10
    
    foreach ($portal in $portals) {
        Write-Log "Configuring $portal..."
        $envPath = Join-Path $script:installPath "$portal\.env.local"
        $envContent | Out-File -FilePath $envPath -Encoding UTF8
        $progressBar.Value += $progressStep
        Start-Sleep -Milliseconds 200
    }
    
    Write-Log "All portals configured."
    $progressBar.Value = 95
    
    # Step 5: Complete
    $progressLabel.Text = "Finalizing..."
    Write-Log ""
    Write-Log "============================================"
    Write-Log "Installation completed successfully!"
    Write-Log "============================================"
    $progressBar.Value = 100
    
    Start-Sleep -Seconds 1
    
    # Move to completion step
    $script:currentStep = 4
    Show-Step
}

# Show current step
function Show-Step {
    for ($i = 0; $i -lt $stepPanels.Count; $i++) {
        $stepPanels[$i].Visible = ($i -eq $script:currentStep)
    }
    
    $backButton.Enabled = ($script:currentStep -gt 0 -and $script:currentStep -lt 3)
    
    switch ($script:currentStep) {
        0 { $nextButton.Text = "Next >" }
        1 { $nextButton.Text = "Next >" }
        2 { $nextButton.Text = "Install" }
        3 { $nextButton.Text = "Installing..."; $nextButton.Enabled = $false }
        4 { $nextButton.Text = "Finish"; $nextButton.Enabled = $true; $backButton.Enabled = $false }
    }
}

# Button events
$nextButton.Add_Click({
    switch ($script:currentStep) {
        0 {
            $script:currentStep = 1
            Show-Step
        }
        1 {
            # Save component selections
            $script:installComponents.CompanyPortal = $chkCompany.Checked
            $script:installComponents.AdminPortal = $chkAdmin.Checked
            $script:installComponents.DriverPortal = $chkDriver.Checked
            $script:installComponents.SalesmanPortal = $chkSalesman.Checked
            $script:installComponents.DeliveryPortal = $chkDelivery.Checked
            
            $script:currentStep = 2
            Show-Step
        }
        2 {
            # Save database settings
            $script:dbHost = $txtHost.Text
            $script:dbPort = $txtPort.Text
            $script:dbName = $txtDbName.Text
            $script:dbUser = $txtUser.Text
            $script:dbPassword = $txtPass.Text
            
            $script:currentStep = 3
            Show-Step
            
            # Start installation
            Start-Installation
        }
        4 {
            # Finish
            if ($chkStartNow.Checked) {
                Start-Process -FilePath (Join-Path $script:installPath "start-offline.bat")
            }
            $form.Close()
        }
    }
})

$backButton.Add_Click({
    if ($script:currentStep -gt 0) {
        $script:currentStep--
        Show-Step
    }
})

$cancelButton.Add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show("Are you sure you want to cancel the installation?", "Cancel Setup", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        $form.Close()
    }
})

# Initialize
Show-Step

# Show form
[void]$form.ShowDialog()
