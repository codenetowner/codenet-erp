const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const fs = require('fs');

let mainWindow;
let backendProcess;
let frontendServer;
const BACKEND_PORT = 5227;
const FRONTEND_PORT = 3000;

// Get the correct paths based on whether we're in development or production
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '..', relativePath);
}

function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.join(__dirname, '..', 'backend');
}

function getRendererPath() {
  return path.join(__dirname, 'renderer');
}

// Start the .NET backend
async function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    const exePath = path.join(backendPath, process.platform === 'win32' ? 'CatalystBackend.exe' : 'CatalystBackend');
    
    // Check if backend executable exists
    if (!fs.existsSync(exePath)) {
      // Try running with dotnet
      const dllPath = path.join(backendPath, 'CatalystBackend.dll');
      if (fs.existsSync(dllPath)) {
        console.log('Starting backend with dotnet...');
        backendProcess = spawn('dotnet', [dllPath], {
          cwd: backendPath,
          env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Local' },
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        console.error('Backend not found at:', backendPath);
        resolve(); // Continue anyway, maybe backend is already running
        return;
      }
    } else {
      console.log('Starting backend executable...');
      backendProcess = spawn(exePath, [], {
        cwd: backendPath,
        env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Local' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Now listening')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      resolve(); // Continue anyway
    });

    // Resolve after timeout if no "listening" message
    setTimeout(resolve, 8000);
  });
}

// Start serving the frontend
function startFrontendServer() {
  return new Promise((resolve) => {
    const expressApp = express();
    const rendererPath = getRendererPath();
    
    // Serve static files
    expressApp.use(express.static(rendererPath));
    
    // Handle SPA routing - return index.html for all routes
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(rendererPath, 'index.html'));
    });
    
    frontendServer = expressApp.listen(FRONTEND_PORT, () => {
      console.log(`Frontend server running on http://localhost:${FRONTEND_PORT}`);
      resolve();
    });
    
    frontendServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('Frontend port already in use, assuming server is running');
      }
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false
  });

  // Load the frontend
  mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Cleanup on exit
function cleanup() {
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill();
  }
  if (frontendServer) {
    console.log('Stopping frontend server...');
    frontendServer.close();
  }
}

app.whenReady().then(async () => {
  try {
    // Start backend first
    console.log('Starting backend...');
    await startBackend();
    
    // Start frontend server
    console.log('Starting frontend server...');
    await startFrontendServer();
    
    // Create window
    createWindow();
  } catch (error) {
    console.error('Startup error:', error);
    dialog.showErrorBox('Startup Error', error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', cleanup);
