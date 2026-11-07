// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 Sea POS - Auto Update System
// ═══════════════════════════════════════════════════════════════════════════════
// يفحص GitHub تلقائياً عن تحديثات ويخبر المستخدم
// + يحدّث التطبيق عبر Service Worker عند توفر نسخة جديدة

const GITHUB_REPO = 'ahmed1p7/-Piccalo';  // المستودع
const CHECK_INTERVAL_MS = 5 * 60 * 1000;  // كل 5 دقائق
const VERSION_KEY = 'sea_pos_version';
const LAST_CHECK_KEY = 'sea_pos_last_update_check';

type UpdateStatus = 'checking' | 'up-to-date' | 'update-available' | 'error';

type UpdateListener = (status: UpdateStatus, info?: any) => void;

class UpdateManager {
  private listeners: Set<UpdateListener> = new Set();
  private currentStatus: UpdateStatus = 'up-to-date';
  private currentVersion: string = '1.0.0';
  private latestVersion: string | null = null;
  private latestCommit: string | null = null;
  private updateInfo: any = null;
  private checkTimer: any = null;

  constructor() {
    // قراءة الإصدار الحالي
    try {
      const saved = localStorage.getItem(VERSION_KEY);
      if (saved) this.currentVersion = saved;
    } catch (e) {}

    // بدء الفحص التلقائي
    this.startAutoCheck();
  }

  // ═══ الحصول على الحالة ═══
  getStatus(): UpdateStatus {
    return this.currentStatus;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getLatestVersion(): string | null {
    return this.latestVersion;
  }

  getUpdateInfo(): any {
    return this.updateInfo;
  }

  // ═══ Listeners ═══
  addListener(listener: UpdateListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: UpdateListener) {
    this.listeners.delete(listener);
  }

  private notify(status: UpdateStatus, info?: any) {
    this.currentStatus = status;
    this.updateInfo = info;
    this.listeners.forEach((l) => {
      try {
        l(status, info);
      } catch (e) {
        console.error('Update listener error:', e);
      }
    });
  }

  // ═══ الفحص التلقائي ═══
  startAutoCheck() {
    if (this.checkTimer) clearInterval(this.checkTimer);

    // فحص أول بعد 10 ثوانٍ من التحميل
    setTimeout(() => this.checkForUpdates(), 10000);

    // فحص دوري كل 5 دقائق
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, CHECK_INTERVAL_MS);
  }

  stopAutoCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // ═══ فحص التحديثات من GitHub ═══
  async checkForUpdates(): Promise<boolean> {
    this.notify('checking');

    try {
      // فحص آخر commit في المستودع
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`,
        { cache: 'no-cache' }
      );

      if (!response.ok) {
        throw new Error(`GitHub API: ${response.status}`);
      }

      const commits = await response.json();
      if (!commits || !commits.length) {
        throw new Error('No commits found');
      }

      const latestCommit = commits[0];
      const commitSha = latestCommit.sha;
      const commitDate = latestCommit.commit?.author?.date;
      const commitMessage = latestCommit.commit?.message || '';

      // تخزين وقت آخر فحص
      try {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      } catch (e) {}

      // فحص لو عندنا تحديث جديد
      const lastKnownCommit = localStorage.getItem('sea_pos_last_commit');

      if (lastKnownCommit && lastKnownCommit !== commitSha) {
        // تحديث جديد متوفر!
        this.latestCommit = commitSha;
        this.latestVersion = this.extractVersionFromMessage(commitMessage) || commitSha.substring(0, 7);
        this.notify('update-available', {
          commitSha,
          commitDate,
          commitMessage: commitMessage.split('\n')[0],
          shortSha: commitSha.substring(0, 7),
        });
        return true;
      }

      // حفظ آخر commit
      try {
        localStorage.setItem('sea_pos_last_commit', commitSha);
      } catch (e) {}

      this.notify('up-to-date');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Update check failed:', message);
      this.notify('error', { error: message });
      return false;
    }
  }

  // ═══ استخراج رقم الإصدار من رسالة commit ═══
  private extractVersionFromMessage(message: string): string | null {
    // يبحث عن v1.0.0 أو version 1.0.0 في رسالة الـ commit
    const match = message.match(/v?(\d+\.\d+\.\d+)/i);
    return match ? match[1] : null;
  }

  // ═══ تطبيق التحديث ═══
  async applyUpdate(): Promise<boolean> {
    try {
      // 1) إخبار Service Worker بتخطي الانتظار
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }

      // 2) حذف كل الـ caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 3) إعادة تحميل الصفحة بعد ثانية
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('Apply update failed:', error);
      return false;
    }
  }
}

// ═══ Singleton ═══
export const updateManager = new UpdateManager();
export default updateManager;
