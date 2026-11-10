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
// ⚠️ Si usa l'API di GitHub (NON il link diretto all'asset): il link diretto
// reindirizza a release-assets.githubusercontent.com che NON invia le intestazioni
// CORS → il browser bloccherebbe la lettura e l'app non vedrebbe mai gli aggiornamenti.
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`;
const ETAG_KEY = 'sea_pos_releases_etag';
const LAST_RELEASE_KEY = 'sea_pos_last_release';

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

/**
 * Legge l'ultima versione pubblicata tramite l'API di GitHub.
 * L'API invia le intestazioni CORS (a differenza del link diretto all'asset),
 * quindi funziona sia nella PWA sia dentro l'APK.
 * Usa ETag/If-None-Match: le risposte 304 non contano nel rate limit.
 */
export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    let etag = '';
    try {
      etag = localStorage.getItem(ETAG_KEY) || '';
    } catch {
      etag = '';
    }

    const response = await fetch(RELEASES_API, {
      headers: etag ? { 'If-None-Match': etag } : {},
    });

    // 304 → nessuna novità, si riusa l'ultima versione nota
    if (response.status === 304) {
      try {
        const cached = localStorage.getItem(LAST_RELEASE_KEY);
        return cached ? (JSON.parse(cached) as RemoteVersion) : null;
      } catch {
        return null;
      }
    }

    if (!response.ok) {
      console.warn('AppUpdater: GitHub API', response.status);
      // rate limit o errore → riusa l'ultima versione nota
      try {
        const cached = localStorage.getItem(LAST_RELEASE_KEY);
        return cached ? (JSON.parse(cached) as RemoteVersion) : null;
      } catch {
        return null;
      }
    }

    try {
      const newEtag = response.headers.get('etag');
      if (newEtag) localStorage.setItem(ETAG_KEY, newEtag);
    } catch {
      /* ignore */
    }

    const releases = (await response.json()) as any[];
    if (!Array.isArray(releases)) return null;

    const best = selectLatestRelease(releases);
    if (!best) return null;

    const asset = (best.release.assets || []).find(
      (a: any) => a.name?.toLowerCase().endsWith('.apk')
    );

    const remote: RemoteVersion = {
      version: best.version!,
      versionCode: versionToCode(best.version!),
      apkUrl: asset?.browser_download_url || `${RELEASE_BASE}/Sea-POS.apk`,
      publishedAt: best.release.published_at,
      notes: (best.release.body || '').split('\n').slice(0, 4).join(' ').trim(),
      size: asset?.size,
    };

    try {
      localStorage.setItem(LAST_RELEASE_KEY, JSON.stringify(remote));
    } catch {
      /* ignore */
    }

    return remote;
  } catch (e) {
    console.warn('AppUpdater: impossibile leggere le release:', e);
    return null;
  }
}

/**
 * Sceglie il rilascio con la versione più alta (tag semver),
 * ignorando draft, prerelease e tag non-numerici (es. "latest").
 */
export function selectLatestRelease(
  releases: any[]
): { release: any; version: string } | null {
  const candidates = (releases || [])
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({
      release: r,
      version: parseVersion(String(r?.tag_name || '')) as string | null,
    }))
    .filter((x): x is { release: any; version: string } => x.version !== null)
    .sort((a, b) => compareVersions(a.version, b.version));

  return candidates.length ? candidates[candidates.length - 1] : null;
}

/** "v1.2.3" → "1.2.3" */
export function parseVersion(tag: string): string | null {
  const m = tag.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

/** "1.2.3" → 10203 (stesso calcolo del versionCode Android) */
export function versionToCode(version: string): number {
  const [major, minor, patch] = version.split('.').map((n) => parseInt(n, 10) || 0);
  return major * 10000 + minor * 100 + patch;
}

/** confronto semver */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
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
  // ⚠️ Deve essere PIÙ NUOVO, non semplicemente diverso: altrimenti dopo
  //    aver installato la 1.2.0 l'app continuerebbe a segnalare la 1.1.5.
  const updateAvailable =
    !!lastLoaded && compareVersions(remote.version, lastLoaded) > 0;
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
