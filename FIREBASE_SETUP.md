# 🔥 إعداد Firebase - دليل سريع (10 دقائق)

## 🎯 الهدف

تفعيل التزامن التلقائي بين كل الأجهزة بدون سيرفر محلي. كل جهاز يثبّت التطبيق ويشتغل تلقائياً.

---

## 📋 الخطوات

### 1️⃣ أنشئ مشروع Firebase

1. اذهب إلى: **https://console.firebase.google.com/**
2. اضغط **Create a project** أو **Add project**
3. اسم المشروع: `sea-pos` (أو أي اسم)
4. اضغط **Continue**
5. اختر: Google Analytics (اختياري - يمكنك تعطيله)
6. اضغط **Create project**

### 2️⃣ أضف Web App

1. في صفحة المشروع، اضغط أيقونة **`</>`** (Web)
2. App nickname: `Sea POS Web`
3. ✅ **Setup Firebase Hosting** (غير ضروري)
4. اضغط **Register app**
5. ستظهر لك `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "sea-pos-xxxxx.firebaseapp.com",
  projectId: "sea-pos-xxxxx",
  storageBucket: "sea-pos-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:..."
};
```

6. **انسخ هذه القيم** - سنحتاجها لاحقاً

### 3️⃣ فعّل Firestore Database

1. في القائمة الجانبية: **Firestore Database**
2. اضغط **Create database**
3. اختر **Start in production mode**
4. اختر الموقع: `eur3` أو `us-central` (الأقرب لك)
5. اضغط **Enable**

### 4️⃣ فعّل Anonymous Auth (مهم)

1. في القائمة الجانبية: **Authentication**
2. اضغط **Get started**
3. في تبويب **Sign-in method**:
4. فعّل **Anonymous** → **Enable** → **Save**

### 5️⃣ أضف قواعد Firestore (Security Rules)

1. في **Firestore Database** → تبويب **Rules**
2. استبدل المحتوى بـ:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sea_pos/{document} {
      allow read, write: if request.auth != null || true;
    }
  }
}
```

3. اضغط **Publish**

### 6️⃣ أضف GitHub Secrets (مهم للنشر التلقائي)

لأن ملف `.env` لا يُرفع على GitHub (محمي بـ `.gitignore`):

1. اذهب إلى: **https://github.com/ahmed1p7/-Piccalo/settings/secrets/actions**
2. اضغط **New repository secret** وأضف 6 أسرار:

| الاسم | القيمة |
|---|---|
| `VITE_FIREBASE_API_KEY` | (API Key من Firebase) |
| `VITE_FIREBASE_AUTH_DOMAIN` | (Auth Domain) |
| `VITE_FIREBASE_PROJECT_ID` | (Project ID) |
| `VITE_FIREBASE_STORAGE_BUCKET` | (Storage Bucket) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (Sender ID) |
| `VITE_FIREBASE_APP_ID` | (App ID) |

### 7️⃣ للتشغيل المحلي (اختياري)

```bash
# نسخ .env.example لـ .env
cp .env.example .env

# تحرير .env وضع قيم Firebase
nano .env

# تثبيت dependencies
npm install --legacy-peer-deps

# تشغيل التطبيق
npm run dev
```

---

## ✅ بعد الإعداد

- 🎉 كل جهاز يثبّت التطبيق ويعمل تلقائياً
- 🔄 التزامن فوري بين كل الأجهزة
- 🌐 يعمل من أي مكان (Wi-Fi أو بيانات الهاتف)
- 💾 بيانات آمنة على Google Firebase
- 🆓 مجاني حتى 50,000 طلب شهرياً

## 📊 رسوم Firebase (مجاني للـ 99% من المطاعم)

| الميزة | الحد المجاني | يكفي لـ |
|---|---|---|
| القراءة | 50,000/يوم | ~200 جهاز |
| الكتابة | 20,000/يوم | ~200 جهاز |
| التخزين | 1 GB | آلاف السجلات |
| الشبكة | 10 GB/شهر | آلاف التزامنات |

**للمطعم العادي: لن تدفع شيئاً!**

## ❓ أسئلة شائعة

**س: هل أحتاج بطاقة ائتمان؟**
ج: لا! الباقة المجانية لا تتطلب بطاقة.

**س: هل بياناتي آمنة؟**
ج: نعم، Firebase يستخدم تشفير end-to-end وقواعد أمان قابلة للتخصيص.

**س: ماذا لو تجاوزت الحد المجاني؟**
ج: سيتوقف التزامن مؤقتاً. يمكنك الترقية لـ Blaze plan ($0.03/100k قراءة).

**س: هل يعمل بدون إنترنت؟**
ج: نعم! Firestore يدعم offline mode - يحفظ التغييرات محلياً ويزامن عند عودة الإنترنت.

---

## 📞 الدعم

لو واجهت أي مشكلة:
1. تأكد أن Anonymous Auth مفعّل
2. تأكد أن Firestore Rules صحيحة
3. تأكد أن GitHub Secrets مضبوطة
4. راجع logs في Console المتصفح (F12)
