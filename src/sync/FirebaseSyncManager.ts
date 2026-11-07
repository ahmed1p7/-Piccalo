// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 Sea POS - Firebase Sync Manager
// ═══════════════════════════════════════════════════════════════════════════════
// تزامن تلقائي بين الأجهزة عبر Firebase Firestore
// - لا حاجة لسيرفر محلي
// - لا حاجة لـ IP أو إعداد يدوي
// - يعمل من أي مكان (Wi-Fi أو بيانات الهاتف)
// - تزامن فوري تلقائي
// ═══════════════════════════════════════════════════════════════════════════════

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// ═══ قراءة الإعدادات من متغيرات البيئة ═══
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type SyncListener = (msg: any) => void;
type StatusListener = (status: SyncStatus, clientsCount: number) => void;

class FirebaseSyncManager {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private status: SyncStatus = 'disconnected';
  private listeners: Set<SyncListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private unsubscribe: Unsubscribe | null = null;
  private currentUser: User | null = null;
  private lastUpdate: number = 0;
  private isLocalUpdate = false; // يمنع الحلقات اللانهائية

  // ═══ الحالة ═══
  getStatus(): SyncStatus {
    return this.status;
  }

  isConfigured(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // ═══ الاتصال التلقائي (بدون إعداد يدوي) ═══
  async connect(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('🔥 Firebase: لم يتم الإعداد. ضع VITE_FIREBASE_* في .env');
      this._setStatus('error');
      return false;
    }

    if (this.status === 'connected' || this.status === 'connecting') {
      return true;
    }

    this._setStatus('connecting');

    try {
      // 1) تهيئة Firebase
      if (!this.app) {
        this.app = initializeApp(firebaseConfig, 'sea-pos');
        this.db = getFirestore(this.app);
      }

      // 2) تسجيل دخول مجهول (لا يحتاج حساب)
      const auth = getAuth(this.app);
      try {
        const userCredential = await signInAnonymously(auth);
        this.currentUser = userCredential.user;
        console.log('🔥 Firebase: تم تسجيل الدخول كمجهول:', this.currentUser.uid);
      } catch (authErr: any) {
        // لو Auth غير مفعّل، نكمل بدونه (الـ Firestore سيعمل)
        console.warn('🔥 Firebase Auth غير مفعّل - نكمل بدونه:', authErr.message);
      }

      // 3) الاستماع لتغييرات المستند المشترك
      const docRef = doc(this.db!, 'sea_pos', 'shared_state');
      
      this.unsubscribe = onSnapshot(
        docRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const serverTimestamp = data.lastUpdate || 0;

            // تجاهل تحديثاتنا الخاصة (منع الحلقات)
            if (this.isLocalUpdate || serverTimestamp <= this.lastUpdate) {
              this.isLocalUpdate = false;
              return;
            }

            console.log('🔥 Firebase: استلام تحديث من جهاز آخر');
            this._notifyListeners({
              type: 'state_update',
              data: data.state || data,
              timestamp: serverTimestamp,
            });
          } else {
            // المستند غير موجود - ربما أول جهاز
            console.log('🔥 Firebase: المستند غير موجود بعد - بانتظار أول تحديث');
          }
        },
        (err) => {
          console.error('🔥 Firebase: خطأ في الاستماع:', err.message);
          this._setStatus('error');
        }
      );

      this._setStatus('connected');
      console.log('🔥 Firebase: متصل! التزامن نشط');
      return true;
    } catch (error: any) {
      console.error('🔥 Firebase: فشل الاتصال:', error.message);
      this._setStatus('error');
      return false;
    }
  }

  // ═══ إرسال تحديث لكل الأجهزة ═══
  async sendUpdate(data: any): Promise<boolean> {
    if (!this.db || this.status !== 'connected') {
      return false;
    }

    try {
      this.isLocalUpdate = true;
      this.lastUpdate = Date.now();

      const docRef = doc(this.db!, 'sea_pos', 'shared_state');
      await setDoc(docRef, {
        state: data,
        lastUpdate: this.lastUpdate,
        updatedBy: this.currentUser?.uid || 'unknown',
        updatedAt: new Date().toISOString(),
      }, { merge: false });

      console.log('🔥 Firebase: تم إرسال التحديث');
      return true;
    } catch (error: any) {
      console.error('🔥 Firebase: فشل الإرسال:', error.message);
      this.isLocalUpdate = false;
      return false;
    }
  }

  // ═══ قطع الاتصال ═══
  disconnect() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this._setStatus('disconnected');
    console.log('🔥 Firebase: تم قطع الاتصال');
  }

  // ═══ إعادة الاتصال (في حالة الانقطاع) ═══
  async reconnect(): Promise<boolean> {
    this.disconnect();
    return this.connect();
  }

  // ═══ Listeners ═══
  addListener(listener: SyncListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: SyncListener) {
    this.listeners.delete(listener);
  }

  addStatusListener(listener: StatusListener) {
    this.statusListeners.add(listener);
  }

  removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener);
  }

  private _notifyListeners(msg: any) {
    this.listeners.forEach((l) => {
      try {
        l(msg);
      } catch (e) {
        console.error('🔥 Sync listener error:', e);
      }
    });
  }

  private _setStatus(status: SyncStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => {
      try {
        l(status, 1); // clientsCount غير متوفر في Firebase (مجرد تقدير)
      } catch (e) {}
    });
  }
}

// ═══ Singleton ═══
export const firebaseSyncManager = new FirebaseSyncManager();
export default firebaseSyncManager;
