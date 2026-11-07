# 🌊 Sea POS

Sistema gestionale per ristorante con **sincronizzazione cloud tra più telefoni/tablet** e **APK Android installabile**.

> ✅ Stessa app su cassa, cucina, bar e magazzino — i dati si aggiornano da soli.

---

## ✨ Caratteristiche

- 📱 **APK Android installabile** (firmato, si aggiorna senza perdere i dati)
- 🌐 **PWA** — si installa anche dal browser (Aggiungi alla schermata Home)
- ☁️ **Sync cloud multi-dispositivo** — N telefoni, N account, un unico codice
- 🔀 **Merge intelligente** — due telefoni che lavorano in parallelo non si sovrascrivono
- 📡 **Sync LAN (Wi-Fi)** — alternativa gratuita senza cloud
- 💳 **Cassa** — pagamenti contanti/carta/misto + divisione conto
- 🍽️ **Tavoli** — gestione tavoli con conti separati
- 📦 **Magazzino** — inventario materie prime e prodotti
- 👨‍🍳 **Cucina** — vista cucina per chef
- 📊 **Report** — report giornalieri + stampa ricevute
- 👥 **Utenti** — gestione utenti con permessi (solo Admin)
- 💾 **Backup** — export/import JSON

---

## 📲 Installare l'app sul telefono

### Opzione 1 — APK Android (consigliata)

1. Apri la pagina **Releases** del repository:
   <https://github.com/ahmed1p7/-Piccalo/releases>
2. Scarica `Sea-POS.apk`
3. Trasferisci il file sul telefono (USB, WhatsApp, Drive…)
4. Aprilo → Android chiederà "Installa app sconosciute" → **Consenti** → **Installa**

> **Aggiornamenti futuri:** installa sempre l'APK firmato con la chiave di questo
> repository: l'app si aggiorna **sopra** quella già installata, senza disinstallare
> e quindi senza perdere i dati.

Se non ci sono ancora release, l'APK si scarica anche dagli **Actions**:
<https://github.com/ahmed1p7/-Piccalo/actions> → ultimo run "Build APK" → *Artifacts* → `Sea-POS-APK`.

### Opzione 2 — PWA dal browser (zero installazione)

1. Apri <https://ahmed1p7.github.io/-Piccalo/> dal telefono
2. **Android/Chrome:** menu ⋮ → *Aggiungi a schermata Home*
3. **iPhone/Safari:** Condividi → *Aggiungi alla Home*

---

## 📲📲 Usare l'app su più telefoni (sync multi-dispositivo)

Il trucco è un **codice di sincronizzazione**: lo incolli una volta sola su ogni
telefono e da quel momento i dispositivi parlano tra loro tramite il cloud.

### Passo 1 — Collega il primo telefono

1. Apri l'app → icona **Sync** (↻ in alto a destra)
2. Incolla il **codice di sincronizzazione** nel campo e tocca **Collega questo dispositivo**
3. Dai un nome al dispositivo (es. *Cassa*, *Cucina*, *Bar*) → **Salva nome dispositivo**

> Il codice si ottiene dalla configurazione Firebase (vedi [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)).
> Se il codice è già compilato dentro l'APK (build con i secrets GitHub), l'app si
> collega da sola appena aperta.

### Passo 2 — Aggiungi gli altri telefoni

1. Sul primo telefono: icona **Sync** → **Copia** (il codice è negli appunti)
2. Incolla il codice su ciascun altro telefono → **Collega questo dispositivo**
3. Fine: cassa, tavoli, magazzino e scontrini sono sincronizzati ovunque

### Come funziona il merge (niente dati persi)

Ogni dispositivo manda **solo la parte che ha modificato** e il cloud fa un merge
a 3 vie (`base` = ultimo stato condiviso, `local`, `remote`):

| Situazione | Risultato |
|---|---|
| Telefono A registra uno scontrino, B no | entrambi gli scontrini restano |
| A scarica 3 kg di farina, B carica 5 kg | quantità = base − 3 + 5 |
| A cambia l'importo del tavolo, B lo stato di un piatto | entrambe le modifiche restano |
| Stessa modifica identica sui due telefoni | viene contata **una volta sola** |

La logica è in [`src/sync/merge.ts`](src/sync/merge.ts) ed è coperta dai test:

```bash
npm test
```

---

## 📡 Alternativa gratuita: sync LAN (Wi-Fi)

Nessun account cloud, ma serve un PC sulla stessa rete del ristorante:

```bash
npm install
npm run server
```

Il server mostra l'IP locale (es. `192.168.1.100`). Sui telefoni:
**Sync → Rete locale (Wi-Fi)** → inserisci `http://192.168.1.100:3001` → **Collega**.

> La modalità cloud è consigliata: funziona anche fuori dal ristorante (rete mobile).

---

## 🔐 Credenziali default

```
Username: Admin
PIN: 5555
```

⚠️ Cambia il PIN dopo il primo accesso (icona chiave in alto).

---

## 🛠️ Sviluppo

```bash
npm install          # installa le dipendenze
npm run dev          # frontend su http://localhost:3000
npm run server       # sync server LAN su porta 3001
npm start            # entrambi insieme
npm run build        # build di produzione (dist/)
npm run lint         # controllo TypeScript
npm test             # test del motore di merge
```

### Build dell'APK in locale

Il progetto Android è committato in `android/` (Capacitor 8):

```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Serve **JDK 21** e **Android SDK 36**.

La firma usa `android/keystore.properties` + `android/app/sea-pos.keystore`
(committati di proposito, così ogni build produce un APK aggiornabile su
quello già installato). Per un uso commerciale conviene generare una chiave
propria:

```bash
keytool -genkeypair -v -keystore android/app/sea-pos.keystore \
  -alias seapos -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass <password> -keypass <password> \
  -dname "CN=<Ristorante>, OU=Mobile, O=<Ristorante>, C=IT"
```

e aggiornare `android/keystore.properties`.

---

## 🚀 CI/CD

| Workflow | Cosa fa |
|---|---|
| `.github/workflows/build-apk.yml` | builda l'APK firmato ad ogni push su `main` e pubblica una **Release** quando si crea un tag `v*` |
| `.github/workflows/deploy-pages.yml` | pubblica la PWA su GitHub Pages |

Pubblicare una nuova versione:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

→ l'APK viene compilato e pubblicato nella pagina Releases.

Configurazione Firebase opzionale (per compilare il codice dentro l'APK) nei
**GitHub Secrets**:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## 🏗️ Architettura

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Telefono │   │ Telefono │   │  Tablet  │
│  Cassa   │   │ Cucina   │   │   Bar    │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     └──────────────┴──────────────┘
                    │  Firebase (cloud)
            ┌───────▼────────┐
            │ shared_state   │  ← merge 3 vie, una collezione per volta
            └────────────────┘
```

- **Firebase Firestore** — stato condiviso (una collezione per tipo di dato)
- **Merge 3 vie** — nessuna modifica va persa quando due dispositivi lavorano insieme
- **Service Worker** — network-first: ogni telefono riceve subito l'ultima versione
- **localStorage** — cache offline su ogni dispositivo
- **LAN (Express + ws)** — alternativa senza cloud

---

## 📝 Licenza

MIT License - Libero uso commerciale
