const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadData: () => ipcRenderer.invoke('load-budget-data'),
  saveData: (data) => ipcRenderer.invoke('save-budget-data', data),
  getLockStatus: () => ipcRenderer.invoke('get-lock-status'),
  acquireLock: (userName) => ipcRenderer.invoke('acquire-lock', userName),
  releaseLock: () => ipcRenderer.invoke('release-lock'),
  forceUnlock: () => ipcRenderer.invoke('force-unlock'),
  getDataPaths: () => ipcRenderer.invoke('get-data-paths'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  exportDataFile: (data, defaultName) => ipcRenderer.invoke('export-data-file', data, defaultName),
  importDataFile: () => ipcRenderer.invoke('import-data-file'),
});
