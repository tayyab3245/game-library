// C:\Dev\game-library\electron.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { spawn } = require('child_process');

// At runtime, __dirname === C:\Dev\game-library
const ROOT   = __dirname;
const EMUS   = path.join(ROOT, 'emulators');
const ROMS   = path.join(ROOT, 'roms');
const is3DS  = f => ['.3ds', '.cia'].some(ext => f.toLowerCase().endsWith(ext));

// Utility to check file existence
const fileExists = p => fs.existsSync(p) && fs.statSync(p).isFile();

const findEmu = platform => {
  if (platform === '3DS') {
    const candidate = path.join(EMUS, 'citra', 'citra-qt.exe');
    return fileExists(candidate) ? candidate : null;
  }
  if (platform === 'Switch') {
    const candidate = path.join(EMUS, 'ryujinx', 'Ryujinx.exe');
    return fileExists(candidate) ? candidate : null;
  }
  return null;
};

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Development (localhost:3000) vs. production (load built index.html)
  const devURL  = 'http://localhost:3000';
  const prodURL = `file://${path.join(ROOT, 'frontend', 'build', 'index.html')}`;

  // If packaged, load the built React files; otherwise load create-react-app dev server
  const target = app.isPackaged ? prodURL : devURL;
  win.loadURL(target);

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// IPC handlers

ipcMain.handle('fs:exists', (_e, absPath) => {
  return fileExists(absPath);
});

ipcMain.handle('launcher:autoDetect', (_e, title, platform) => {
  const consoleDir = path.join(ROMS, platform.toLowerCase());
  let romPath = null;
  if (fs.existsSync(consoleDir)) {
    const allFiles = fs.readdirSync(consoleDir);
    const match = allFiles.find(f => f.toLowerCase().includes(title.toLowerCase()));
    if (match) {
      romPath = path.join(consoleDir, match);
    }
  }
  const emuPath = findEmu(platform) || null;
  return { romPath, emuPath };
});

ipcMain.handle('launcher:play', (_e, emuPath, romPath) => {
  console.log("📢 [main] got launcher:play →", { emuPath, romPath });
  if (!fileExists(emuPath) || !fileExists(romPath)) {
    return { ok: false, error: 'ROM or Emulator missing' };
  }
  try {
    spawn(emuPath, [romPath], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Failed to spawn process' };
  }
});

// Bootstrapping

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
