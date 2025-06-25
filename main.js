const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
      height: 50
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'xbox-gamepad.svg'), // Use existing gamepad icon
    title: 'Gamepad MIDI Controller'
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Prevent the app from pausing when window loses focus
  mainWindow.webContents.on('dom-ready', () => {
    // Inject script to prevent requestAnimationFrame throttling
    mainWindow.webContents.executeJavaScript(`
      // Override document visibility to always be 'visible'
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: false
      });
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: false
      });
      
      // Ensure requestAnimationFrame continues running
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        return originalRaf.call(window, callback);
      };
      
      console.log('Electron: Focus handling overrides applied');
    `);
  });

  // Keep the app running even when window loses focus
  mainWindow.on('blur', () => {
    // Ensure gamepad polling continues
    mainWindow.webContents.executeJavaScript(`
      if (typeof process !== 'undefined' && process.running) {
        requestAnimationFrame(process);
      }
    `);
  });

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle fullscreen mode - hide window controls
  mainWindow.on('enter-full-screen', () => {
    mainWindow.setTitleBarOverlay({
      color: '#000000',
      symbolColor: '#ffffff',
      height: 0 // Hide the title bar overlay completely
    });
  });

  // Handle leaving fullscreen - show window controls
  mainWindow.on('leave-full-screen', () => {
    mainWindow.setTitleBarOverlay({
      color: '#000000',
      symbolColor: '#ffffff',
      height: 50 // Restore the title bar overlay
    });
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
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

// Create application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
