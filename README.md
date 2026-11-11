# 🌊 Sea POS

Sistema gestionale per ristorante con **sincronizzazione cloud tra più telefoni/tablet** e **APK Android installabile**.

> ✅ Stessa app su cassa, cucina, bar e magazzino — i dati si aggiornano da soli.

---

## ✨ Caratteristiche

- 📱 **APK Android installabile** (firmato, si aggiorna senza perdere i dati)
- 🌐 **PWA** — si installa anche dal browser (Aggiungi alla schermata Home)
- 🖥️ **Uso da computer** — barra laterale fissa + scorciatoie da tastiera
  (F1–F7 per cambiare schermata), installabile come app su Windows/Mac/Linux
- 🎨 **Charcoal Minimal** — palette unica (carbone + ambra) su tutte le schermate
- 📐 **Safe area Android** — i pulsanti non finiscono più sotto la barra di
  navigazione del sistema
- ☁️ **Sync cloud multi-dispositivo** — N telefoni, N account, un unico codice
- 🔀 **Merge intelligente** — due telefoni che lavorano in parallelo non si sovrascrivono
  (e i dati locali **non vengono mai sostituiti** da uno stato cloud più vecchio)
- 📡 **Sync LAN (Wi-Fi)** — alternativa gratuita senza cloud
- 💳 **Cassa** — pagamenti contanti/carta, **divisione del conto** (quote uguali o
  percentuali) e **pagamenti multipli** sullo stesso tavolo
- 🔐 **Accesso individuale** — nessun accesso automatico: ogni dipendente entra
  con le sue credenziali
- 🧹 **Zero dati** — avvio pulito e "Ripristino di fabbrica" che cancella tutto
  senza ricreare dati d'esempio
- ⚙️ **Impostazioni** — dati del ristorante (escono sulla ricevuta), Wi-Fi,
  sincronizzazione e manutenzione
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

## 🖥️ Usare l'app da computer

L'app è la stessa: si apre nel browser del computer e si installa come
programma a finestra propria (gratis, nessun costo di licenza).

1. Apri <https://ahmed1p7.github.io/-Piccalo/> da Chrome, Edge o Safari
2. Installa l'app:
   - **Chrome/Edge (Windows, Linux):** icona 🖥️ nella barra degli indirizzi →
     *Installa Sea POS*
   - **Chrome/Edge (macOS):** menu ⋮ → *Condividi e installa…*
   - **Safari (macOS):** File → *Aggiungi al Dock…*
3. Si apre in una finestra separata, con icona nel menu Start / Dock /
   Applications — si comporta come un programma normale

**Cosa cambia su schermo largo (≥ 1024 px):**

- **Barra laterale fissa** a sinistra con le sezioni, lo stato della
  sincronizzazione e l'uscita dal turno (al posto della barra inferiore)
- **Titoli di sezione** più grandi e griglie a 4 colonne per tavoli e magazzino
- **Scorciatoie da tastiera** per il cassiere:

  | Tasto | Sezione | Tasto | Sezione |
  |---|---|---|---|
  | `F1` | Home | `F5` | Cucina |
  | `F2` | Tavoli | `F6` | Report |
  | `F3` | Cassa | `F7` | Personale |
  | `F4` | Magazzino | `Esc` | chiude la finestra |

  Su portatelli dove i tasti F sono combinati con `Fn`, si può usare
  `Alt` + numero (`Alt+1`, `Alt+2`, …).

> 💡 Il computer deve essere connesso a internet come i telefoni: la
> sincronizzazione cloud funziona identica.

---

## ⏱️ Sincronizzazione in tempo reale

Come WhatsApp: **quello che fai su un telefono compare subito sugli altri**.

| Cosa fai sul telefono A | Cosa vede il telefono B |
|---|---|
| Aggiungi un account | L'account (con il suo PIN) compare in **~0,3 s** |
| Modifichi l'importo di un tavolo | Il tavolo si aggiorna in tempo reale |
| Scarichi dal magazzino | La quantità si aggiorna su tutti i dispositivi |
| Registri uno scontrino | Lo scontrino compare in cassa |
| Elimini un account | Sparisce anche dagli altri dispositivi |

Misurato con il test end-to-end `tests/realtime-sync.e2e.py` (due istanze
dell'app + server di sincronizzazione): **0,27 s** dalla modifica alla
comparsa sull'altro dispositivo.

> La sincronizzazione avviene **mentre l'app è aperta**: non serve toccare
> nessun pulsante, non serve ricaricare la pagina.

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
2. Su ciascun altro telefono: **schermata di login → "Collega un nuovo dispositivo"**
   (oppure icona **Sync** dopo il login) → incolla il codice → **Collega questo dispositivo**
3. Fine: cassa, tavoli, magazzino e scontrini sono sincronizzati ovunque

> 💡 Il pulsante "Collega un nuovo dispositivo" è **prima del login**: un telefono
> nuovo si collega al ristorante anche se non conosce il PIN.

### Passo 3 — Trasferisci tutto al telefono nuovo (opzionale ma consigliato)

Sul telefono **vecchio**: icona **Sync** → **Invia tutto** (manda utenti, tavoli,
magazzino e scontrini al cloud).
Sul telefono **nuovo**: dopo aver incollato il codice → **Ripristina dal cloud**.

In alternativa i dati arrivano da soli: il nuovo telefono scarica tutto al primo
collegamento (utenti compresi, con i loro PIN).

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

## 🧾 La cassa in pratica

1. Scegli il **tavolo** in alto (o **Rapido Banco** per una vendita al banco)
   oppure scrivi l'importo a mano
2. Aggiungi i prodotti: **Prodotti Rapidi** (dal magazzino), i pulsanti
   **+5 / +10 / +20 / +50 €** e la voce del conto (con − / + / cestino)
3. Imposta **sconto** e **coperti**
4. **Incassa** → si apre la finestra di pagamento:
   - **Contanti**: scrivi quanto hai ricevuto → calcola il **resto**
     (pulsante **Esatto** e scorciatoie per le banconote)
   - **Carta**: pagamento al POS
   - **Dividi il conto**: quote uguali o percentuali, e pagamenti multipli
     sullo stesso tavolo finché il saldo è a zero
5. **Registra pagamento** → conferma **Conto Chiuso con Successo!** e il
   pulsante **Stampa Ultimo** per lo scontrino

> 🔧 Fixed in 1.5.0: the payment form didn't show at all in quick sales, the
> success message never appeared, quick-sale receipts were wrong and the
> quick-products panel was missing.

---

## 🛡️ Protezione degli account (fix 1.4.0)

Un bug delle versioni 1.3.x faceva **svanire gli account dei dipendenti**:
se un dispositivo non aveva ancora uno stato di base (base vuota) e
riceveva uno stato cloud vecchio o parziale, i dati locali venivano
**sostituiti** invece che uniti. I dipendenti non riuscivano più a entrare.

Oggi:

- i dati locali **non vengono mai sovrascritti**: si fa *union* con il cloud
- uno stato cloud **più vecchio** del nostro stato noto **non può cancellare**
  nulla (un telefono vecchio non può più svuotare il ristorante)
- il merge **non può lasciare il ristorante senza un account admin**
- il login distingue fra *«Nome utente inesistente»* e *«Password non corretta»*

> 🔎 Il problema è stato verificato direttamente sul database di produzione:
> la collezione `users` conteneva solo il vecchio account predefinito
> `Admin/5555` mentre il resto dei dati era aggiornato.

### Recupero dei dati (se ti è già successo)

1. Aggiorna **tutti** i dispositivi alla 1.4.0
2. Il modo più pulito: sul telefono del titolare → *Backup & ripristino →
   Ripristino di fabbrica* e spunta **«Cancella anche i dati nel cloud»**
   → riparti da zero (la 1.4.0 non contiene dati d'esempio)
3. Oppure: apri l'app su un telefono che ha ancora i tuoi account → vengono
   riuniti e ripropagati a tutti i dispositivi

---

## 🔄 Aggiornamenti dell'app (in-app)

Ogni volta che il repository GitHub viene aggiornato, il CI ricostruisce l'APK e
pubblica un **rilascio con numero di versione** (es. `v1.1.5`) con `Sea-POS.apk`
+ `version.json`, più il rilascio **latest** come indirizzo stabile.

L'app interroga l'**API di GitHub** (che invia le intestazioni CORS, a differenza
del link diretto all'asset) e sceglie il rilascio con la versione più alta.
Il controllo avviene **ogni 3 minuti** e all'avvio (dopo 8 secondi): se trova
una versione più recente di quella installata compare l'avviso
**"Aggiornamento disponibile"** con un pulsante **"Installa ora"** → l'app scarica
l'APK e apre l'installatore di Android. Poiché l'APK è firmato con la stessa
chiave, si installa **sopra** quello già presente: **nessun dato perso**.

> ⚠️ Nota tecnica: le richieste usano `ETag`/`If-None-Match`, così le risposte
> `304` non consumano il rate limit dell'API di GitHub.

- 📲 Notifica anche nella schermata di login (senza essere collegati)
- 🔎 Controllo manuale: **Verifica aggiornamenti** (login) o nelle impostazioni
- 🌐 Sul browser (PWA) il pulsante ricarica la pagina con la nuova versione

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

## 🔐 Primo avvio e accessi

L'app **non contiene più account predefiniti** (niente `Admin/5555` pubblico) e
**non accede da solo**: all'avvio compare la schermata di configurazione dove
il titolare crea il proprio account amministratore.

| | |
|---|---|
| Configurazione | nome ristorante + nome utente + password |
| Dipendenti | **Personale → Nuovo dipendente** (ruolo + permessi) |
| Accesso | ogni dispositivo chiede le credenziali, niente sessione ripristinata |
| Ripristino di fabbrica | **Utente ⚙ → Backup → Ripristino di fabbrica** → azzera tutto |

Dopo l'azzeramento l'app resta **completamente vuota** (zero utenti, zero
tavoli, zero magazzino, zero scontrini) e torna alla configurazione iniziale.

---

## 💳 Dividere il conto e pagamenti multipli

Dal pulsante **Incassa** (cassa o card del tavolo):

- **Pagamento unico** — contanti (con calcolo del resto) o carta
- **Dividi il conto** — N persone, quote uguali o percentuali personalizzate;
  ogni quota si paga con il metodo che si vuole
- **Pagamenti multipli** — più incassi sullo stesso tavolo (carta + contanti),
  il saldo residuo resta visibile finché non è a zero, poi **Chiudi conto**

I calcoli sono in [`src/utils/cassa.ts`](src/utils/cassa.ts) e coperti dai test
(`npm run test:cassa`).

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
# 1. aggiorna la versione in package.json
npm version 1.1.6 --no-git-tag-version

# 2. commit + push → il CI ricostruisce l'APK e pubblica il rilascio
#    versionato (v1.1.6) + il rilascio "latest"
git commit -am "release: v1.1.6" && git push origin main

# 3. (opzionale) tag → crea una pagina Releases con la versione
git tag v1.1.6 && git push origin v1.1.6
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
