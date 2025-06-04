console.log("🚀 Electron main process starting...");
const { app, BrowserWindow, ipcMain } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { spawn } = require('child_process');


const ROOT   = __dirname;
const EMUS   = path.join(ROOT, 'emulators');          
const ROMS   = path.join(ROOT, 'roms');               
const is3DS  = f => ['.3ds', '.cia'].some(ext => f.toLowerCase().endsWith(ext));


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
  console.log("🪟 Creating main window...");
  const win = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  const dev = 'http://localhost:3000';
  const prod = `file://${path.join(ROOT, 'frontend', 'build', 'index.html')}`;
  win.loadURL(app.isPackaged ? prod : dev);
  
  console.log("Loading URL:", target);
  win.loadURL(target);

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}


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


app.whenReady().then(createWindow);
app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});
