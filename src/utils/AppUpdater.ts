// ═══════════════════════════════════════════════════════════════════
// 🔄 Sea POS - App Updater (nativo + web)
// ═══════════════════════════════════════════════════════════════════
// Verifica se c'è una versione nuova dell'app e la installa direttamente
// dal telefono (download dell'APK + installer di Android).
//
// Il file version.json viene pubblicato dal CI insieme all'APK:
//   https://github.com/ahmed1p7/-Piccalo/releases/download/latest/version.json
// ═══════════════════════════════════════════════════════════════════

import { registerPlugin, Capacitor } from '@capacitor/core';

const GITHUB_REPO = 'ahmed1p7/-Piccalo';
const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download/latest`;
const VERSION_URL = `${RELEASE_BASE}/version.json`;

export interface InstalledVersion {
  versionName: string;
  versionCode: number;
  packageName?: string;
}

export interface RemoteVersion {
  version: string;
  versionCode: number;
  apkUrl: string;
  publishedAt?: string;
  notes?: string;
  size?: number;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

interface AppUpdaterNativePlugin {
  getInstalledVersion(): Promise<InstalledVersion>;
  downloadAndInstall(options: {
    url: string;
    fileName?: string;
  }): Promise<{ installerOpened: boolean }>;
  clearDownloads(): Promise<{ removed: number }>;
  addListener(
    eventName: string,
    listenerFunc: (data: DownloadProgress) => void
  ): Promise<{ remove: () => void }>;
}

const Native = registerPlugin<AppUpdaterNativePlugin>('AppUpdater');

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Versione compilata dentro l'app (package.json → Vite define) */
export function getBuiltInVersion(): string {
  try {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/** Versione installata (dal sistema operativo su Android, dal bundle sul web) */
export async function getInstalledVersion(): Promise<InstalledVersion> {
  if (isNativeApp()) {
    try {
      return await Native.getInstalledVersion();
    } catch (e) {
      console.warn('AppUpdater: impossibile leggere la versione:', e);
    }
  }
  return { versionName: getBuiltInVersion(), versionCode: 0 };
}

/** Scarica il file version.json dal rilascio più recente */
export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data.versionCode !== 'number') return null;
    return {
      version: data.version,
      versionCode: data.versionCode,
      apkUrl: data.apkUrl || `${RELEASE_BASE}/Sea-POS.apk`,
      publishedAt: data.publishedAt,
      notes: data.notes,
      size: data.size,
    };
  } catch (e) {
    console.warn('AppUpdater: impossibile leggere version.json:', e);
    return null;
  }
}

/**
 * C'è un aggiornamento?
 * - su Android: versionCode remoto > versionCode installato
 * - sul web:    versione remota !== versione già caricata
 */
export async function checkForUpdate(): Promise<{
  updateAvailable: boolean;
  installed: InstalledVersion;
  remote: RemoteVersion | null;
}> {
  const installed = await getInstalledVersion();
  const remote = await fetchRemoteVersion();

  if (!remote) {
    return { updateAvailable: false, installed, remote: null };
  }

  if (isNativeApp()) {
    const updateAvailable = remote.versionCode > installed.versionCode;
    return { updateAvailable, installed, remote };
  }

  // Web / PWA: confronto con la versione memorizzata nel browser
  let lastLoaded = '';
  try {
    lastLoaded = localStorage.getItem('sea_pos_loaded_version') || '';
  } catch {
    lastLoaded = '';
  }
  const updateAvailable = !!lastLoaded && remote.version !== lastLoaded;
  return { updateAvailable, installed, remote };
}

/**
 * Installa l'aggiornamento:
 * - Android: scarica l'APK e apre l'installer di sistema
 * - Web:     svuota la cache del Service Worker e ricarica la pagina
 */
export async function installUpdate(
  remote: RemoteVersion,
  onProgress?: (progress: DownloadProgress) => void
): Promise<'installed' | 'reloaded'> {
  if (!isNativeApp()) {
    await reloadWebApp();
    return 'reloaded';
  }

  const listener = await Native.addListener('downloadProgress', (data) => {
    onProgress?.(data);
  });

  try {
    await Native.downloadAndInstall({
      url: remote.apkUrl,
      fileName: `Sea-POS-${remote.version}.apk`,
    });
    return 'installed';
  } finally {
    await listener.remove();
  }
}

/** Ricarica l'app web svuotando la cache del Service Worker */
export async function reloadWebApp(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch {
    /* ignore */
  }

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    /* ignore */
  }

  setTimeout(() => {
    window.location.reload();
  }, 600);
}

/** Salva la versione attualmente in uso (per il confronto sul web) */
export function rememberLoadedVersion(version: string): void {
  try {
    localStorage.setItem('sea_pos_loaded_version', version);
  } catch {
    /* ignore */
  }
}
