const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Determine portable application root directory
// If packaged, portable root is beside the executable or in the app directory
const isDev = process.env.NODE_ENV === 'development';
const appRoot = isDev ? path.join(__dirname, '..') : path.dirname(app.getPath('exe'));
const dataDir = path.join(appRoot, 'data');
const backupsDir = path.join(dataDir, 'backups');
const dbFilePath = path.join(dataDir, 'donnees_budget.json');
const lockFilePath = path.join(dataDir, 'budget_lock.lock');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
}

let mainWindow = null;
let currentLockInfo = null;
let lockHeartbeatInterval = null;

// Lock file management for Google Drive / multi-user concurrent access
function readLockFile() {
  try {
    if (fs.existsSync(lockFilePath)) {
      const content = fs.readFileSync(lockFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Erreur lecture lock file:', err);
  }
  return null;
}

function writeLockFile(userName = os.userInfo().username) {
  try {
    ensureDirs();
    const lockData = {
      isLocked: true,
      user: userName,
      machine: os.hostname(),
      pid: process.pid,
      timestamp: new Date().toISOString(),
      updatedAt: Date.now(),
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2), 'utf8');
    currentLockInfo = lockData;
    return lockData;
  } catch (err) {
    console.error('Erreur ecriture lock:', err);
    return null;
  }
}

function removeLockFile() {
  try {
    if (fs.existsSync(lockFilePath)) {
      const existing = readLockFile();
      // Only remove if this process owns the lock or forced
      if (!existing || existing.pid === process.pid || existing.machine === os.hostname()) {
        fs.unlinkSync(lockFilePath);
      }
    }
    currentLockInfo = null;
  } catch (err) {
    console.error('Erreur suppression lock:', err);
  }
}

function updateLockHeartbeat() {
  if (currentLockInfo && fs.existsSync(lockFilePath)) {
    try {
      currentLockInfo.updatedAt = Date.now();
      fs.writeFileSync(lockFilePath, JSON.stringify(currentLockInfo, null, 2), 'utf8');
    } catch (e) {}
  }
}

function createBackup(jsonData) {
  try {
    ensureDirs();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupsDir, `donnees_budget_backup_${dateStr}.json`);
    fs.writeFileSync(backupPath, jsonData, 'utf8');

    // Keep only last 20 backups
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('donnees_budget_backup_') && f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 20) {
      files.slice(20).forEach(file => {
        try { fs.unlinkSync(path.join(backupsDir, file.name)); } catch (e) {}
      });
    }
  } catch (err) {
    console.error('Erreur backup:', err);
  }
}

function createWindow() {
  ensureDirs();

  const iconPath = path.join(__dirname, '../public/logo.jpg');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Bouchemaine Basket Club - Suivi et Pilotage Budgétaire',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    backgroundColor: '#0F1115',
    autoHideMenuBar: true,
  });

  const distIndex = path.join(__dirname, '../dist/index.html');
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    // Fallback load dev server or local file
    mainWindow.loadURL('http://localhost:5173');
  }

  // Start heartbeat
  lockHeartbeatInterval = setInterval(updateLockHeartbeat, 60000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (lockHeartbeatInterval) {
    clearInterval(lockHeartbeatInterval);
  }
  removeLockFile();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('load-budget-data', async () => {
  try {
    ensureDirs();
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf8');
      return { success: true, data: JSON.parse(content), path: dbFilePath };
    }
    return { success: false, notFound: true, path: dbFilePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-budget-data', async (event, data) => {
  try {
    ensureDirs();
    const strData = JSON.stringify(data, null, 2);
    // Write backup first
    createBackup(strData);
    // Write primary database file
    fs.writeFileSync(dbFilePath, strData, 'utf8');
    return { success: true, path: dbFilePath, timestamp: new Date().toISOString() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-lock-status', async () => {
  const existing = readLockFile();
  if (!existing) {
    return { isLocked: false };
  }

  // Check if stale (older than 2 hours without heartbeat update)
  const now = Date.now();
  const lastActive = existing.updatedAt || new Date(existing.timestamp).getTime();
  const isStale = (now - lastActive) > (2 * 60 * 60 * 1000);

  const isCurrentMachine = existing.machine === os.hostname() && existing.pid === process.pid;

  return {
    isLocked: !isStale && !isCurrentMachine,
    isCurrentHolder: isCurrentMachine,
    isStale,
    lockData: existing,
  };
});

ipcMain.handle('acquire-lock', async (event, userName) => {
  const existing = readLockFile();
  if (existing) {
    const isCurrentMachine = existing.machine === os.hostname() && existing.pid === process.pid;
    if (!isCurrentMachine) {
      const now = Date.now();
      const lastActive = existing.updatedAt || new Date(existing.timestamp).getTime();
      const isStale = (now - lastActive) > (2 * 60 * 60 * 1000);
      if (!isStale) {
        return { success: false, conflict: true, lockData: existing };
      }
    }
  }
  const created = writeLockFile(userName);
  return { success: !!created, lockData: created };
});

ipcMain.handle('release-lock', async () => {
  removeLockFile();
  return { success: true };
});

ipcMain.handle('force-unlock', async () => {
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
    currentLockInfo = null;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-data-paths', async () => {
  return {
    appRoot,
    dataDir,
    dbFilePath,
    backupsDir,
  };
});

ipcMain.handle('open-data-folder', async () => {
  ensureDirs();
  await shell.openPath(dataDir);
  return true;
});

ipcMain.handle('export-data-file', async (event, data, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exporter le fichier de données Budgétaires',
    defaultPath: defaultName || 'donnees_budget.json',
    filters: [{ name: 'Fichier JSON', extensions: ['json'] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, filePath };
  }
  return { canceled: true };
});

ipcMain.handle('import-data-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importer un fichier de données Budgétaires',
    filters: [{ name: 'Fichier JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!canceled && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    return { success: true, data: JSON.parse(content), path: filePaths[0] };
  }
  return { canceled: true };
});
