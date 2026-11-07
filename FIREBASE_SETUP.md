# 🔥 Configurazione Firebase (5 minuti)

Serve per sincronizzare **più telefoni** tramite il cloud.
È gratuito (piano "Spark" / Blaze) e non richiede carta di credito.

---

## 1️⃣ Crea il progetto Firebase

1. Apri <https://console.firebase.google.com/> e accedi con Google
2. Clicca **"Aggiungi progetto"** → nome (es. `sea-pos`) → **Continua**
   - (opzionale) attiva Google Analytics → **Continua** → **Crea progetto**

---

## 2️⃣ Crea il database Firestore

1. Menu ☰ → **Build** → **Firestore Database** → **Crea database**
2. Scegli la **modalità test** (testo) — per la produzione vedi le regole sotto
3. Conferma la regione (europe-west1 va bene)

---

## 3️⃣ Attiva l'accesso anonimo

1. Menu ☰ → **Build** → **Authentication** → **Inizia**
2. Scheda **Sign-in method** → **Anonimo** → **Abilita** → **Salva**

---

## 4️⃣ Copia la configurazione Web

1. Menu ☰ → **Impostazioni progetto** (icona ingranaggio) → **Generali**
2. Scorri fino a **"Le tue app"** → icona `</>` (**Web app**)
3. Registra l'app (es. `Sea POS`) → **Continua** → **Continua** (non serve Firebase Hosting)
4. Copia il blocco `firebaseConfig`

---

## 5️⃣ Genera il codice di sincronizzazione

Incolla la config JSON in un file, es. `firebase-config.json`:

```json
{
  "apiKey": "AIza...",
  "authDomain": "sea-pos.firebaseapp.com",
  "projectId": "sea-pos-xxxxx",
  "storageBucket": "sea-pos-xxxxx.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:xxxx"
}
```

Poi:

```bash
node scripts/make-sync-code.mjs firebase-config.json
```

Il comando stampa il **codice di sincronizzazione** (base64).

---

## 6️⃣ Collega i telefoni

1. Installa l'APK su **tutti** i telefoni
2. Su ciascun telefono: icona **Sync** → incolla il codice → **Collega questo dispositivo**
3. Dai un nome a ogni dispositivo (Cassa, Cucina, Bar, Magazzino…)

Fatto: da questo momento i dati si sincronizzano tra tutti i telefoni.

> 💡 Non serve ricostruire l'APK: il codice viene salvato sul telefono.
> Se invece vuoi il codice *dentro* l'APK (nessun setup sui telefoni), imposta i
> GitHub Secrets `VITE_FIREBASE_*` — vedi il README.

---

## 🔒 Regole Firestore consigliate

In **Firestore → Regole**, incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sea_pos/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> ⚠️ Queste regole sono "aprirte": chiunque abbia il codice può leggere/scrivere.
> Per un ristorante chiuso va bene, ma se i dati sono sensibili usa Firebase
> Authentication con email/password e regole restrittive.

---

## 🧪 Verifica rapida

1. Telefono A: registra uno scontrino
2. Telefono B (stesso codice): deve comparire entro 1-2 secondi
3. Telefono B: scarica 1 kg dal magazzino → la quantità deve cambiare anche su A
