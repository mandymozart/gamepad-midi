// Preload script for secure communication between main and renderer processes
const { contextBridge } = require('electron');

// Expose Electron APIs to renderer process securely
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any secure APIs you need here in the future
  platform: process.platform,
  isElectron: true
});

// Mark that we're running in Electron environment
window.isElectron = true;
