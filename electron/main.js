const { app, BrowserWindow } = require('electron');
const path = require('path');

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
  if (process.env.NODE_ENV != 'development') {
    win.loadURL('http://localhost:8888');
    win.webContents.openDevTools();
  } else {
    // In production, load the built files
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle client-side routing
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -102) { // ERR_CONNECTION_REFUSED
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });

  // Handle navigation
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:8888')) {
      event.preventDefault();
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });

  // Handle hash navigation
  win.webContents.on('did-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:8888')) {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });
}

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