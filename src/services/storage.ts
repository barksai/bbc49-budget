import { AppData } from '../types/budget';
import { INITIAL_APP_DATA } from '../data/defaultData';

const LOCAL_STORAGE_KEY = 'bbc49_basket_budget_data_v1';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      loadData: () => Promise<{ success: boolean; data?: AppData; notFound?: boolean; path?: string; error?: string }>;
      saveData: (data: AppData) => Promise<{ success: boolean; path?: string; timestamp?: string; error?: string }>;
      getLockStatus: () => Promise<{ isLocked: boolean; isCurrentHolder?: boolean; isStale?: boolean; lockData?: any }>;
      acquireLock: (userName: string) => Promise<{ success: boolean; conflict?: boolean; lockData?: any }>;
      releaseLock: () => Promise<{ success: boolean }>;
      forceUnlock: () => Promise<{ success: boolean; error?: string }>;
      getDataPaths: () => Promise<{ appRoot: string; dataDir: string; dbFilePath: string; backupsDir: string }>;
      openDataFolder: () => Promise<boolean>;
      exportDataFile: (data: AppData, defaultName?: string) => Promise<{ success?: boolean; filePath?: string; canceled?: boolean }>;
      importDataFile: () => Promise<{ success?: boolean; data?: AppData; path?: string; canceled?: boolean }>;
    };
  }
}

export interface StorageStatus {
  isElectron: boolean;
  isServer?: boolean;
  dataPath?: string;
  isLockedByOther: boolean;
  lockDetails?: any;
  lastSavedAt?: string;
  readOnlyMode: boolean;
}

export const StorageService = {
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  },

  async loadInitialData(): Promise<{ data: AppData; status: StorageStatus }> {
    const isElec = this.isElectron();

    // 1. Electron Desktop Mode
    if (isElec && window.electronAPI) {
      try {
        const lockRes = await window.electronAPI.getLockStatus();
        let isLockedByOther = false;
        let readOnlyMode = false;

        if (lockRes.isLocked && !lockRes.isCurrentHolder) {
          isLockedByOther = true;
          readOnlyMode = true;
        } else {
          await window.electronAPI.acquireLock('Utilisateur BBC49');
        }

        const res = await window.electronAPI.loadData();
        if (res.success && res.data) {
          return {
            data: res.data,
            status: {
              isElectron: true,
              isServer: false,
              dataPath: res.path,
              isLockedByOther,
              lockDetails: lockRes.lockData,
              lastSavedAt: res.data.lastUpdated,
              readOnlyMode,
            },
          };
        } else {
          await window.electronAPI.saveData(INITIAL_APP_DATA);
          return {
            data: INITIAL_APP_DATA,
            status: {
              isElectron: true,
              isServer: false,
              dataPath: res.path,
              isLockedByOther: false,
              lastSavedAt: new Date().toISOString(),
              readOnlyMode: false,
            },
          };
        }
      } catch (err) {
        console.warn('Erreur Electron storage, bascule en mode serveur/local:', err);
      }
    }

    // 2. Server API Mode (Docker / Portainer / Debian)
    try {
      const resp = await fetch('/api/data', { cache: 'no-cache' });
      if (resp.ok) {
        const res = await resp.json();
        if (res.success && res.data) {
          console.log('[StorageService] Données chargées avec succès depuis le serveur Docker Debian (/api/data)');
          return {
            data: res.data,
            status: {
              isElectron: false,
              isServer: true,
              dataPath: res.path || 'Serveur Docker / Portainer (/app/data)',
              isLockedByOther: false,
              lastSavedAt: res.lastUpdated || res.data.lastUpdated,
              readOnlyMode: false,
            },
          };
        }
      }
    } catch (err) {
      console.info('[StorageService] Serveur distant /api/data non joignable, tentative en LocalStorage local:', err);
    }

    // 3. Fallback LocalStorage (si serveur éteint ou mode hors ligne)
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          data: parsed,
          status: {
            isElectron: false,
            isServer: false,
            dataPath: 'Stockage Local du Navigateur (localStorage)',
            isLockedByOther: false,
            lastSavedAt: parsed.lastUpdated,
            readOnlyMode: false,
          },
        };
      }
    } catch (e) {
      console.error('Erreur lecture localStorage:', e);
    }

    // Initial default save to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_APP_DATA));
    } catch (e) {}

    return {
      data: INITIAL_APP_DATA,
      status: {
        isElectron: false,
        isServer: false,
        dataPath: 'Stockage Local Navigateur (Hors-ligne)',
        isLockedByOther: false,
        lastSavedAt: new Date().toISOString(),
        readOnlyMode: false,
      },
    };
  },

  async saveData(data: AppData): Promise<{ success: boolean; timestamp: string; error?: string }> {
    const updatedData: AppData = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    // 1. Electron Desktop
    if (this.isElectron() && window.electronAPI) {
      try {
        const res = await window.electronAPI.saveData(updatedData);
        if (res.success) {
          return { success: true, timestamp: res.timestamp || updatedData.lastUpdated };
        }
        return { success: false, timestamp: updatedData.lastUpdated, error: res.error };
      } catch (err: any) {
        return { success: false, timestamp: updatedData.lastUpdated, error: err.message };
      }
    }

    // 2. Server API (Docker / Portainer)
    try {
      const resp = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (resp.ok) {
        const res = await resp.json();
        if (res.success) {
          // Sync also to localStorage as local cache
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
          } catch (_) {}
          return { success: true, timestamp: res.timestamp || updatedData.lastUpdated };
        }
        return { success: false, timestamp: updatedData.lastUpdated, error: res.error };
      }
    } catch (err: any) {
      console.warn('Erreur lors de la sauvegarde sur le serveur API, sauvegarde en LocalStorage:', err);
    }

    // 3. Fallback LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
      return { success: true, timestamp: updatedData.lastUpdated };
    } catch (err: any) {
      return { success: false, timestamp: updatedData.lastUpdated, error: err.message };
    }
  },

  async forceUnlock(): Promise<boolean> {
    if (this.isElectron() && window.electronAPI) {
      const res = await window.electronAPI.forceUnlock();
      if (res.success) {
        await window.electronAPI.acquireLock('Utilisateur BBC49 (Forcé)');
        return true;
      }
    }
    return false;
  },

  async openDataFolder(): Promise<void> {
    if (this.isElectron() && window.electronAPI) {
      await window.electronAPI.openDataFolder();
    }
  },

  // Export as download JSON file (web or electron)
  exportToJsonFile(data: AppData) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donnees_budget_BBC49_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import JSON file from input
  importFromJsonFile(file: File): Promise<AppData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (!parsed.transactions || !parsed.fiscalYears) {
            throw new Error("Format de fichier invalide (sections 'transactions' ou 'fiscalYears' manquantes)");
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsText(file);
    });
  },
};
