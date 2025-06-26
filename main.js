const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Keep a global reference of the window object
let mainWindow;

// Register protocol handler for serving local files
function registerFileProtocol() {
  protocol.registerFileProtocol('file', (request, callback) => {
    const filePath = decodeURI(request.url.replace('file://', ''));
    callback({ path: filePath });
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Check if we're in development or production
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In development, try to load from Vite dev server
    console.log('Loading from Vite dev server...');
    mainWindow.loadURL('http://localhost:5173')
      .catch(() => {
        // If Vite server is not running, load from dist
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          mainWindow.loadFile(indexPath);
        } else {
          console.error('Neither Vite server nor dist/index.html is available');
        }
      });
    
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from dist directory
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  registerFileProtocol();
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});