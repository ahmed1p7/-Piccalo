# 🌊 Sea POS

Sistema gestionale per ristorante con **sincronizzazione Wi-Fi** tra dispositivi.

## ✨ Caratteristiche

- 📱 **PWA** - Installabile come app su telefono/tablet
- 🌐 **Sync Wi-Fi** - Sincronizzazione reale tra dispositivi sulla stessa rete
- 💳 **Cassa** - Pagamenti contanti/carta/misto + divisione conto
- 🍽️ **Tavoli** - Gestione tavoli con conti separati
- 📦 **Magazzino** - Inventario materie prime e prodotti
- 👨‍🍳 **Cucina** - Vista cucina per chef
- 📊 **Report** - Report giornalieri + stamp ricevute
- 👥 **Utenti** - Gestione utenti con permessi (solo Admin)
- 💾 **Backup** - Export/Import JSON

## 🚀 Avvio Rapido

### 1️⃣ Installazione dipendenze

```bash
npm install
```

### 2️⃣ Modalità Single Device (senza sync)

```bash
npm run dev
```

Apri: `http://localhost:3000`

### 3️⃣ Modalità Multi-Device con Sync Wi-Fi

#### Sul dispositivo principale (es. tablet cassa):

```bash
npm run server
```

Il server mostrerà qualcosa come:
```
═══════════════════════════════════════════════════════
  🌊 Sea POS - Sync Server v1.0.0
═══════════════════════════════════════════════════════
  📍 Local IP:    192.168.1.100
  🚀 HTTP:        http://192.168.1.100:3001
  📡 WebSocket:   ws://192.168.1.100:3001/ws
═══════════════════════════════════════════════════════
```

#### Sull'app principale (stesso dispositivo):

```bash
npm run dev
```

#### Su altri dispositivi (tablet/telefono sulla stessa rete Wi-Fi):

1. Apri il browser
2. Vai su: `http://192.168.1.100:3000` (IP del dispositivo principale)
3. Clicca sull'icona **Sync** in alto a destra
4. Inserisci: `http://192.168.1.100:3001`
5. Clicca **Connetti al Server**

🎉 Ora tutti i dispositivi sono sincronizzati in tempo reale!

## 📱 Installazione come App (PWA)

### Android (Chrome):
1. Apri l'app nel browser
2. Menu ⋮ → **Aggiungi a schermata Home**
3. Si installa come app nativa

### iOS (Safari):
1. Apri l'app in Safari
2. Pulsante Condividi → **Aggiungi a Home**

### Desktop (Chrome/Edge):
1. Apri l'app
2. Icona installa → nella barra indirizzi

## 🔐 Credenziali Default

```
Username: Admin
PIN: 5555
```

⚠️ **Importante**: Cambia il PIN dopo il primo accesso tramite l'icona chiave in alto.

## 🏗️ Architettura

```
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   Tablet 1      │ ←──────────────→ │   Sync Server   │
│   (Cassa)       │                   │   (Express+WS)  │
└─────────────────┘                   └─────────────────┘
        ↑                                       ↑
        │           Wi-Fi LAN                   │
        ↓                                       ↓
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   Tablet 2      │ ←──────────────→ │   Tablet 3      │
│   (Cucina)      │                   │   (Sala)        │
└─────────────────┘                   └─────────────────┘
```

- **Sync Server** (porta 3001): gestisce WebSocket + stato condiviso
- **Vite Dev Server** (porta 3000): serve l'app React
- **WebSocket**: sincronizzazione in tempo reale
- **localStorage**: cache offline su ogni dispositivo

## 📋 Comandi Disponibili

```bash
npm run dev       # Solo frontend (single device)
npm run server    # Solo sync server
npm start         # Frontend + Server insieme
npm run build     # Build per produzione
npm run lint      # Controllo TypeScript
```

## 🔧 Configurazione

### Cambiare dati ristorante
Modifica `src/data/initialData.ts`:
```typescript
export const INITIAL_PROFILE = {
  name: 'Sea',
  subTitle: 'Ristorante & Bistrot',
  address: '...',
  pIva: '...',
  phone: '...',
  ...
};
```

### Cambiare porta sync server
```bash
SYNC_PORT=4000 npm run server
```

## 🛠️ Tecnologie

- ⚛️ React 19 + TypeScript
- ⚡ Vite 8
- 🎨 Tailwind CSS 4 + lucide-react
- 📡 Express + ws (WebSocket)
- 📱 PWA + Service Worker
- 💾 localStorage + WebSocket sync

## 📝 Licenza

MIT License - Libero uso commerciale

---

🌊 **Buon lavoro con Sea POS!**
