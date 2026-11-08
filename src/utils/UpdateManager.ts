// ═══════════════════════════════════════════════════════════════════
// 🔄 Sea POS - Auto Update System
// ═══════════════════════════════════════════════════════════════════
// Ogni volta che il repository GitHub viene aggiornato, il CI ricostruisce
// l'APK e pubblica version.json + Sea-POS.apk nel rilascio "latest".
// L'app controlla periodicamente quel file: se trova una versione nuova
// mostra l'avviso "Aggiornamento disponibile" e l'utente può installarla
// con un tocco (download + installer di Android, senza perdere i dati).
// ═══════════════════════════════════════════════════════════════════

import {
  checkForUpdate,
  installUpdate,
  rememberLoadedVersion,
  getBuiltInVersion,
  getInstalledVersion,
  isNativeApp,
  type DownloadProgress,
  type RemoteVersion,
} from './AppUpdater';

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // ogni 3 minuti
const LAST_CHECK_KEY = 'sea_pos_last_update_check';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'downloading'
  | 'error';

export interface UpdateInfo {
  version: string;
  versionCode: number;
  installedVersion: string;
  installedVersionCode: number;
  apkUrl: string;
  publishedAt?: string;
  notes?: string;
  size?: number;
}

type UpdateListener = (status: UpdateStatus, info?: UpdateInfo) => void;
type ProgressListener = (progress: DownloadProgress) => void;

class UpdateManager {
  private listeners = new Set<UpdateListener>();
  private progressListeners = new Set<ProgressListener>();
  private currentStatus: UpdateStatus = 'idle';
  private updateInfo: UpdateInfo | null = null;
  private checkTimer: any = null;
  private remote: RemoteVersion | null = null;

  constructor() {
    // segna la versione attualmente in uso
    rememberLoadedVersion(getBuiltInVersion());
    this.startAutoCheck();
  }

  // ═══ Stato ═══
  getStatus(): UpdateStatus {
    return this.currentStatus;
  }

  getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  /** true se l'app gira come APK installato ( Android ) */
  isNative(): boolean {
    return isNativeApp();
  }

  addListener(listener: UpdateListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: UpdateListener) {
    this.listeners.delete(listener);
  }

  addProgressListener(listener: ProgressListener) {
    this.progressListeners.add(listener);
  }

  removeProgressListener(listener: ProgressListener) {
    this.progressListeners.delete(listener);
  }

  private notify(status: UpdateStatus, info?: UpdateInfo) {
    this.currentStatus = status;
    if (info !== undefined) this.updateInfo = info;
    this.listeners.forEach((l) => {
      try {
        l(status, this.updateInfo ?? undefined);
      } catch (e) {
        console.error('Update listener error:', e);
      }
    });
  }

  private notifyProgress(progress: DownloadProgress) {
    this.progressListeners.forEach((l) => {
      try {
        l(progress);
      } catch (e) {
        /* ignore */
      }
    });
  }

  // ═══ Controllo automatico ═══
  startAutoCheck() {
    this.stopAutoCheck();

    // primo controllo dopo 8 secondi dall'apertura
    setTimeout(() => {
      void this.checkForUpdates();
    }, 8000);

    // e poi ogni 3 minuti
    this.checkTimer = setInterval(() => {
      void this.checkForUpdates();
    }, CHECK_INTERVAL_MS);
  }

  stopAutoCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // ═══ Verifica ═══
  async checkForUpdates(): Promise<boolean> {
    this.notify('checking');

    try {
      const result = await checkForUpdate();
      const installed = result.installed;

      try {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      } catch {
        /* ignore */
      }

      if (!result.remote) {
        this.notify('error', {
          version: '',
          versionCode: 0,
          installedVersion: installed.versionName,
          installedVersionCode: installed.versionCode,
          apkUrl: '',
        });
        return false;
      }

      if (result.updateAvailable) {
        this.remote = result.remote;
        this.notify('update-available', {
          version: result.remote.version,
          versionCode: result.remote.versionCode,
          installedVersion: installed.versionName,
          installedVersionCode: installed.versionCode,
          apkUrl: result.remote.apkUrl,
          publishedAt: result.remote.publishedAt,
          notes: result.remote.notes,
          size: result.remote.size,
        });
        return true;
      }

      this.notify('up-to-date', {
        version: result.remote.version,
        versionCode: result.remote.versionCode,
        installedVersion: installed.versionName,
        installedVersionCode: installed.versionCode,
        apkUrl: result.remote.apkUrl,
      });
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Update check failed:', message);
      this.notify('error');
      return false;
    }
  }

  // ═══ Installazione ═══
  async applyUpdate(): Promise<boolean> {
    if (!this.remote) {
      // nessun aggiornamento in memoria → riprova a leggerlo
      await this.checkForUpdates();
      if (!this.remote) return false;
    }

    this.notify('downloading', this.updateInfo ?? undefined);

    try {
      await installUpdate(this.remote, (progress) => this.notifyProgress(progress));
      return true;
    } catch (error) {
      console.error('Apply update failed:', error);
      this.notify('error', this.updateInfo ?? undefined);
      return false;
    }
  }

  /** Versione attualmente installata (per la UI) */
  async getInstalledVersion(): Promise<string> {
    const info = await getInstalledVersion();
    return info.versionName;
  }
}

// ═══ Singleton ═══
export const updateManager = new UpdateManager();
export default updateManager;
