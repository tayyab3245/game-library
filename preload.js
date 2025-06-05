// C:\Dev\game-library\preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
  autoDetect: (title, platform) => ipcRenderer.invoke('launcher:autoDetect', title, platform),
  exists: absPath => ipcRenderer.invoke('fs:exists', absPath),
  play: (emuPath, romPath) => ipcRenderer.invoke('launcher:play', emuPath, romPath),
});
