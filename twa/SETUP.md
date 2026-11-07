# 📱 دليل إنشاء APK لتطبيق Sea POS

## 🎯 الهدف

تحويل تطبيق الويب (PWA) إلى ملف APK يثبّته المستخدمون على هواتفهم Android، مع تحديث تلقائي عند تحديث الكود على GitHub.

---

## ✨ ما تم إعداده

1. ✅ **PWA Manifest** كامل (`public/manifest.json`)
2. ✅ **Service Worker** للعمل offline
3. ✅ **أيقونات PNG** بمقاسات مختلفة (192px, 512px, 1024px)
4. ✅ **GitHub Actions workflow** لبناء APK تلقائياً
5. ✅ **نظام تحديث تلقائي** يفحص GitHub كل 5 دقائق
6. ✅ **إشعار تحديث** للمستخدم عند توفر نسخة جديدة

---

## 🚀 طريقتان للحصول على APK

### الطريقة 1: GitHub Actions (تلقائي - موصى به)

عند كل push على `main`، GitHub Actions يبني APK تلقائياً.

#### الخطوة 1: إضافة Secrets على GitHub

اذهب إلى: `https://github.com/ahmed1p7/-Piccalo/settings/secrets/actions`

أضف هذه الـ Secrets:

| الاسم | القيمة |
|---|---|
| `ANDROID_KEYSTORE_PASSWORD` | كلمة مرور keystore (مثلاً: `sea_pos_2024`) |
| `ANDROID_KEY_ALIAS_PASSWORD` | كلمة مرور alias (نفس القيمة عادةً) |
| `ANDROID_KEY_ALIAS` | `sea_pos_key` |

#### الخطوة 2: توليد Keystore (مرة واحدة)

```bash
keytool -genkey -v -keystore android.keystore -alias sea_pos_key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Sea POS, OU=Mobile, O=Sea Ristorante, L=Napoli, S=NA, C=IT" \
  -storepass sea_pos_2024 -keypass sea_pos_2024
```

ارفع ملف `android.keystore` إلى GitHub كـ Secret (base64):

```bash
base64 android.keystore > keystore_base64.txt
# انسخ المحتوى وأضفه كـ Secret:
# ANDROID_KEYSTORE_BASE64
```

#### الخطوة 3: تفعيل GitHub Pages

1. اذهب إلى: `https://github.com/ahmed1p7/-Piccalo/settings/pages`
2. Source: **GitHub Actions**
3. سيتم نشر التطبيق على: `https://ahmed1p7.github.io/-Piccalo/`

#### الخطوة 4: ربط التطبيق بالنطاق

عدّل `twa/twa-config.json` (سأنشئه الآن):

```json
{
  "packageId": "com.sea.pos",
  "host": "ahmed1p7.github.io",
  "name": "Sea POS",
  "themeColor": "#070c18",
  "navigationColor": "#070c18",
  "backgroundColor": "#070c18",
  "startUrl": "/-Piccalo/",
  "iconUrl": "/-Piccalo/icon-512.png"
}
```

#### الخطوة 5: تحديث الـ workflow (لو ضروري)

عدّل `.github/workflows/build-apk.yml` إذا احتجت تغيير اسم الحزمة أو الـ URL.

#### الخطوة 6: احصل على APK

1. اذهب إلى: `https://github.com/ahmed1p7/-Piccalo/actions`
2. اضغط على آخر **Build APK** workflow
3. تنزل "Artifacts" → `sea-pos-apk`
4. سيحمل ملف APK

---

### الطريقة 2: Bubblewrap محلياً (يدوي)

لو تريد بناء APK على جهازك:

#### المتطلبات

- Node.js 18+
- Java JDK 17+
- Android SDK

#### التثبيت

```bash
# 1) تثبيت Bubblewrap
npm install -g @bubblewrap/cli

# 2) بناء الواجهة الأمامية
npm install
npm run build

# 3) معاينة البناء محلياً
npm run preview
# سيعمل على http://localhost:4173

# 4) Initialize TWA (استخدم عنوان النشر الفعلي)
bubblewrap init \
  --manifest="https://ahmed1p7.github.io/-Piccalo/manifest.json" \
  --directory="./twa-build" \
  --applicationName="Sea POS" \
  --packageId="com.sea.pos"

# 5) Build APK
cd twa-build
bubblewrap build

# 6) APK سيكون في:
# ./twa-build/app-release-signed.apk
```

---

## 🔄 نظام التحديث التلقائي

### كيف يعمل:

1. عند تحديث الكود على GitHub، تحدث الـ PWA (لأنها تُحمّل من الإنترنت)
2. الـ Service Worker يفحص التحديثات في الخلفية
3. عند توفر نسخة جديدة:
   - يظهر إشعار في أعلى الشاشة: "Aggiornamento Disponibile!"
   - يعرض آخر commit ورقم الإصدار
4. المستخدم يضغط "Aggiorna ora"
5. التطبيق يحدّث نفسه ويعيد التحميل

### الفحص التلقائي:

- يفحص GitHub كل **5 دقائق**
- يفحص آخر `commit` على `main`
- لو اختلف عن آخر commit معروف → تحديث متوفر

### الإعدادات:

- يمكن تغيير فترة الفحص في `src/utils/UpdateManager.ts`:
  ```typescript
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;  // 5 دقائق
  ```
- يمكن تغيير المستودع:
  ```typescript
  const GITHUB_REPO = 'ahmed1p7/-Piccalo';
  ```

---

## 📱 تثبيت APK على الهاتف

### على أي هاتف Android:

1. انسخ ملف APK على الهاتف
2. افتح مدير الملفات
3. اضغط على ملف APK
4. اسمح "التثبيت من مصادر غير معروفة"
5. اضغط "تثبيت"

### التوقيع (Signing)

لو تريد نشر التطبيق على Play Store:

```bash
# توليد keystore
keytool -genkey -v -keystore sea-pos.keystore \
  -alias sea_pos_key -keyalg RSA -keysize 2048 -validity 10000

# بناء APK موقّع
bubblewrap build --sign
```

---

## 🔗 روابط مهمة

| الرابط | الوصف |
|---|---|
| `https://github.com/ahmed1p7/-Piccalo/settings/secrets/actions` | GitHub Secrets |
| `https://github.com/ahmed1p7/-Piccalo/settings/pages` | GitHub Pages |
| `https://github.com/ahmed1p7/-Piccalo/actions` | Actions (تنزيل APK) |
| `https://ahmed1p7.github.io/-Piccalo/` | التطبيق المنشور |

---

## ⚠️ ملاحظات مهمة

### حول APK و PWA:

- APK الذي نولّده هو **TWA (Trusted Web Activity)**
- يفتح التطبيق داخل Chrome (ولكن يبدو كـ app native)
- التحديثات تتم تلقائياً (لأن التطبيق يحمّل من الإنترنت)
- لا حاجة لإعادة نشر APK عند كل تحديث

### حول GitHub Pages:

- التطبيق يجب أن يكون منشوراً على GitHub Pages أو أي استضافة عامة
- TWA يحتاج URL HTTPS (GitHub Pages يوفره مجاناً)

### حول التحديثات:

- المستخدم يحتاج إنترنت للتحديث
- التحديث في الخلفية (لا يوقف الاستخدام)
- بعد التحديث، يكفي إعادة فتح التطبيق

### قيود TWA:

- يحتاج Android 6+ (API 23)
- يستخدم Chrome CANARY (مدمج مع النظام)
- لا يدعم iOS (للـ iOS استخدم Capacitor أو Safari)

---

## 🎯 ملخص سريع

```bash
# 1) رفع الكود على GitHub
git add -A && git commit -m "feature" && git push origin main

# 2) GitHub Actions يبني APK تلقائياً
# (راجع: github.com/ahmed1p7/-Piccalo/actions)

# 3) تنزيل APK من Artifacts

# 4) تثبيت على الهاتف

# 5) التحديثات تصل المستخدم تلقائياً عند فتح التطبيق
```

---

## 📞 الدعم

لو واجهت أي مشكلة:
1. راجع logs في `https://github.com/ahmed1p7/-Piccalo/actions`
2. تحقق من Secrets على GitHub
3. تأكد أن GitHub Pages مفعّل

---

✅ **تم! التطبيق جاهز للنشر كـ APK مع تحديثات تلقائية.**
