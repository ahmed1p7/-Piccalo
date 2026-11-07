// ═══════════════════════════════════════════════════════════════════
// 🔐 Sea POS - Configurazione Sincronizzazione (runtime)
// ═══════════════════════════════════════════════════════════════════
// Obiettivo: installare lo STESSO APK su N telefoni e collegarli
// tra loro incollando un solo "Codice di sincronizzazione".
//
// Priorità dei valori:
//   1) Config salvato sul dispositivo (runtime)  ← permette di usare lo stesso APK
//   2) Config compilata nel bundle (VITE_FIREBASE_*) ← da GitHub Actions / CI
//
// Nessun valore sensibile: sono le chiavi pubbliche "web config" di Firebase.
// ═══════════════════════════════════════════════════════════════════

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const CONFIG_KEY = 'sea_pos_sync_config_v1';
const DEVICE_KEY = 'sea_pos_device_v1';

// ═══ Lettura / scrittura sicura del localStorage ═══
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ═══════════════════════════════════════════════════════════════════
// ⚙️ Configurazione Firebase
// ═══════════════════════════════════════════════════════════════════

/** Config da env di build (CI secrets) */
function getBuildConfig(): Partial<FirebaseWebConfig> {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

/** Config salvata sul dispositivo (quella incollata dall'utente) */
export function getRuntimeConfig(): FirebaseWebConfig | null {
  const raw = safeGet(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FirebaseWebConfig;
    if (!parsed?.apiKey || !parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRuntimeConfig(config: FirebaseWebConfig): void {
  safeSet(CONFIG_KEY, JSON.stringify(config));
}

export function clearRuntimeConfig(): void {
  safeRemove(CONFIG_KEY);
}

/**
 * Config "attiva" = runtime (se presente) altrimenti build.
 * Il runtime ha la precedenza così lo stesso APK funziona con
 * progetti Firebase diversi semplicemente incollando un altro codice.
 */
export function getEffectiveConfig(): FirebaseWebConfig | null {
  const runtime = getRuntimeConfig();
  if (runtime) return runtime;

  const build = getBuildConfig();
  if (build.apiKey && build.projectId) {
    return {
      apiKey: build.apiKey,
      authDomain: build.authDomain || '',
      projectId: build.projectId,
      storageBucket: build.storageBucket || '',
      messagingSenderId: build.messagingSenderId || '',
      appId: build.appId || '',
    };
  }
  return null;
}

/** true se esiste una config valida (runtime o build) */
export function isSyncConfigured(): boolean {
  return !!getEffectiveConfig();
}

/** true se la config è arrivata solo da runtime (cioè incollata sul telefono) */
export function isRuntimeConfigured(): boolean {
  return !!getRuntimeConfig();
}

// ═══════════════════════════════════════════════════════════════════
// 🔑 Codice di sincronizzazione
// ═══════════════════════════════════════════════════════════════════

/**
 * Accetta 3 formati:
 *  1) JSON diretto:            {"apiKey":"...","projectId":"...", ...}
 *  2) Base64 del JSON:         eyJhcGlLZXkiOi...
 *  3) Formato "chiave=valore": apiKey=...&projectId=...&authDomain=...
 */
export function parseSyncCode(
  raw: string
): { ok: boolean; config?: FirebaseWebConfig; error?: string } {
  const text = (raw || '').trim();
  if (!text) {
    return { ok: false, error: 'Incolla un codice di sincronizzazione.' };
  }

  const candidates: string[] = [text];

  // Prova base64 → JSON
  try {
    const decoded = atob(text.replace(/\s+/g, ''));
    if (decoded.trim().startsWith('{')) candidates.push(decoded);
  } catch {
    /* non è base64 */
  }

  for (const candidate of candidates) {
    // JSON
    if (candidate.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(candidate);
        const cfg = normalizeConfig(parsed);
        if (cfg) return { ok: true, config: cfg };
      } catch {
        /* continua */
      }
    }

    // chiave=valore
    if (candidate.includes('=')) {
      const cfg = normalizeConfig(parseKeyValue(candidate));
      if (cfg) return { ok: true, config: cfg };
    }
  }

  return {
    ok: false,
    error: 'Codice non valido. Incolla il codice generato dal dispositivo principale.',
  };
}

function parseKeyValue(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  text.split(/[&\n,;]+/).forEach((chunk) => {
    const idx = chunk.indexOf('=');
    if (idx <= 0) return;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  });
  return out;
}

/** Normalizza e valida: servono almeno apiKey + projectId */
function normalizeConfig(raw: any): FirebaseWebConfig | null {
  if (!raw || typeof raw !== 'object') return null;

  const pick = (...names: string[]): string => {
    for (const name of names) {
      const value = raw[name];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const config: FirebaseWebConfig = {
    apiKey: pick('apiKey', 'api_key'),
    authDomain: pick('authDomain', 'auth_domain'),
    projectId: pick('projectId', 'project_id'),
    storageBucket: pick('storageBucket', 'storage_bucket'),
    messagingSenderId: pick('messagingSenderId', 'messaging_sender_id'),
    appId: pick('appId', 'app_id'),
  };

  if (!config.apiKey || !config.projectId) return null;

  // Completamenti automatici ( Firebase li ricava dal projectId )
  if (!config.storageBucket) {
    config.storageBucket = `${config.projectId}.appspot.com`;
  }
  if (!config.authDomain) {
    config.authDomain = `${config.projectId}.firebaseapp.com`;
  }
  return config;
}

/** Genera il codice da condividere (base64 del JSON, compatto e sicuro) */
export function encodeSyncCode(config: FirebaseWebConfig): string {
  const json = JSON.stringify({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  return btoa(unescape(encodeURIComponent(json)));
}

// ═══════════════════════════════════════════════════════════════════
// 📱 Identità del dispositivo
// ═══════════════════════════════════════════════════════════════════

export interface DeviceInfo {
  id: string;
  name: string;
  role: string;
  platform: string;
  createdAt: number;
}

function randomId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function detectPlatform(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac/i.test(ua)) return 'mac';
  if (/linux/i.test(ua)) return 'linux';
  return 'web';
}

/** Ritorna l'identità del dispositivo, creandola se non esiste */
export function getDevice(): DeviceInfo {
  const raw = safeGet(DEVICE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DeviceInfo;
      if (parsed?.id) return parsed;
    } catch {
      /* rigenera */
    }
  }

  const device: DeviceInfo = {
    id: randomId(),
    name: defaultDeviceName(),
    role: 'terminale',
    platform: detectPlatform(),
    createdAt: Date.now(),
  };
  safeSet(DEVICE_KEY, JSON.stringify(device));
  return device;
}

function defaultDeviceName(): string {
  const platform = detectPlatform();
  if (platform === 'android') return 'Telefono Android';
  if (platform === 'ios') return 'iPhone / iPad';
  if (platform === 'windows') return 'PC Windows';
  if (platform === 'mac') return 'Mac';
  return 'Dispositivo';
}

export function updateDevice(updates: Partial<Pick<DeviceInfo, 'name' | 'role'>>): DeviceInfo {
  const device = { ...getDevice(), ...updates };
  safeSet(DEVICE_KEY, JSON.stringify(device));
  return device;
}
