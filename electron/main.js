const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // In development, load from the dev server
  if (isDev) {
    win.loadURL('http://localhost:8888');
    win.webContents.openDevTools();
  } else {
    // In production/preview, load the built files
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // Try loading with file protocol
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  // Handle client-side routing
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -102 || errorCode === -6) { // Connection refused or file not found
      if (isDev) {
        win.loadURL('http://localhost:8888');
      } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        win.loadFile(indexPath).catch(() => {
          win.loadFile(path.join(__dirname, '../dist/index.html'));
        });
      }
    }
  });

  // Intercept navigation events
  win.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to localhost in dev mode
    if (isDev && url.startsWith('http://localhost:8888')) {
      return;
    }
    
    // Prevent navigation and load the app
    event.preventDefault();
    if (isDev) {
      win.loadURL('http://localhost:8888');
    } else {
      const indexPath = path.join(__dirname, '../dist/index.html');
      win.loadFile(indexPath).catch(() => {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
      });
    }
  });
}

// Handle app lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 