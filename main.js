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
      backgroundThrottling: false, // Critical: Prevents background throttling
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'), // Use existing gamepad icon
    title: 'Gamepad MIDI Controller'
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Prevent the app from pausing when window loses focus
  mainWindow.webContents.on('dom-ready', () => {
    // Inject comprehensive script to prevent all forms of throttling
    mainWindow.webContents.executeJavaScript(`
      // Override document visibility to always be 'visible'
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: false,
        configurable: false
      });
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: false,
        configurable: false
      });
      
      // Block visibility change events
      document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
      }, true);
      
      // Store original timing functions
      const originalRaf = window.requestAnimationFrame;
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;
      
      // Create a high-frequency timer as fallback
      let fallbackTimers = new Set();
      let isUsingFallback = false;
      
      // Enhanced requestAnimationFrame with fallback
      window.requestAnimationFrame = function(callback) {
        const id = originalRaf.call(window, callback);
        
        // Set up a fallback timer in case RAF gets throttled
        const fallbackId = originalSetTimeout(() => {
          if (isUsingFallback) {
            callback(performance.now());
          }
        }, 16); // ~60fps
        
        fallbackTimers.add(fallbackId);
        return id;
      };
      
      // Monitor if RAF is being throttled
      let lastRafTime = performance.now();
      let rafThrottleCheck = originalSetInterval(() => {
        const now = performance.now();
        const timeSinceLastRaf = now - lastRafTime;
        
        // If RAF hasn't been called in over 100ms, assume it's throttled
        if (timeSinceLastRaf > 100) {
          isUsingFallback = true;
          console.log('Electron: requestAnimationFrame throttled, using fallback timer');
        } else {
          isUsingFallback = false;
        }
      }, 50);
      
      // Track RAF calls
      const originalRafCallback = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        lastRafTime = performance.now();
        return originalRafCallback.call(window, callback);
      };
      
      console.log('Electron: Enhanced focus handling overrides applied');
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
