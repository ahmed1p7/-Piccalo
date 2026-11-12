# 🌊 Sea POS 1.6.0 — protezione dei dati, divisione del conto, nuovo design

**Data:** 2026-11-12 · **Versione:** 1.6.0 (versionCode 10600) · **Firma:** la stessa di sempre → l'aggiornamento si installa sopra l'app esistente senza perdere dati

---

## 🔴 1. Perdita dati agli aggiornamenti — CAUSA RADICE trovata e risolta

### La causa vera
Tutti i ristoranti che usavano l'app scrivevano nello **stesso percorso cloud**
(`sea_pos/shared_state`). Il merge, quando lo stato locale coincideva con la
base, **adottava il cloud** → il vecchio seed demo (Admin/5555, 21 articoli,
Tavolo 1..4) e i dati di altri ristoranti entravano nel dispositivo.
In più, nel merge un **valore vuoto** (es. il profilo di un dispositivo
appena installato) **cancellava** il valore pieno dell'altro dispositivo
(per questo il profilo del ristorante si svuotava).

### Le correzioni
| Area | Prima | Ora |
|---|---|---|
| Percorso cloud | `sea_pos/shared_state` (globale) | `sea_pos/v2/restaurants/<rid>` (**uno per ristorante**) + indice `sea_pos/v2/index` |
| Identità | nessuna | `rid` **stabile** derivato dal nome → due telefoni dello stesso ristorante si agganciano da soli |
| Adozione cloud | il cloud vinceva sempre | il cloud **non può** sostituire dati locali reali; il remoto più vecchio non cancella nulla |
| Dati demo | tornavano sempre | **quarantena**: vengono ignorati (e c'è un pulsante per ripulirli) |
| Valori vuoti | cancellavano i campi pieni | **mai**: un vuoto non sovrascrive un valore reale |
| Account demo | restavano (Admin/5555!) | rimossi automaticamente, **mai l'ultimo admin** (no blocco) |
| Backup locale | nessuno | snapshot con checksum, ripristino con un pulsante |
| Profilo | si svuotava | protetto dal merge + backup |

### Nuove impostazioni: «🛡️ Protezione dei dati»
- Spazio cloud del ristorante (identificatore `r_…`)
- Data dell'ultima copia di sicurezza locale
- **Salva copia locale** / **Ripristina dalla copia**
- **Invia tutto al cloud** (ripara un cloud sporco da un dispositivo con i dati)
- **Pulisci dati demo**

### Test: `tests/tests_sync_isolation.py` → **18/18** ✅
Verifica automatica che: il ristorante ha un percorso dedicato, il vecchio
percorso globale non viene usato, dopo un "aggiornamento" (reload) i dati
restano, i dati demo nell'altro ristorante **non** invadono il dispositivo,
un nuovo telefono si aggancia da solo, e due ristoranti restano separati.

---

## 🧾 2. Divisione del conto — 4 funzionalità richieste

1. **Totale da dividere** → scrivi l'importo, l'app lo distribuisce
2. **Stato di pagamento** → ogni persona verde «✓ Pagato» + «Restano da incassare»
3. **Metodo per persona** → Contanti / Carta su ogni quota
4. **Paga per conto di più persone** → selezione multipla, un solo pagamento,
   campo «contante ricevuto» e **resto calcolato con precisione**

Test: `tests/tests_split_bill.py` → **16/16** ✅ (resto 100 − 60 = 40 € verificato)

---

## 🎨 3. Nuovo design

- **Tavoli** — griglia di card, filchi con contatori, statistiche, azioni rapide
- **Magazzino** — ricerca/filtri sticky, statistiche, quantità −1/+1 in linea,
  storico movimenti, inventario fisico

---

## ✅ Test (tutti verdi)

| Test | Esito |
|---|---|
| `npm test` (merge) | 38/38 ✅ |
| `npm run test:cassa` | 44/44 ✅ |
| `tests/data-protection.test.ts` (nuovo) | 27/27 ✅ |
| `tests/realtime-db.test.ts` | 5/5 ✅ |
| `tests/tests_full_flow.py` | 19/19 ✅ |
| `tests/tests_adoption.py` | 6/6 ✅ |
| `tests/tests_cassa_flow.py` | 30/30 ✅ |
| `tests/tests_smoke_all_screens.py` | 15/15 ✅ |
| `tests/tests_sync_isolation.py` (nuovo) | 18/18 ✅ |
| `tests/tests_split_bill.py` (nuovo) | 16/16 ✅ |

---

## 🔐 Nota di sicurezza
Nella cloud attuale l'**unico amministratore** è ancora l'account demo
`Admin / 5555` (password pubblica). Dopo l'aggiornamento:
1. entra con Admin/5555 → «Personale» → promuovi il tuo account a Amministratore
2. «Impostazioni → Cambia password» → cambia la password di Admin
3. «Personale» → elimina l'account demo
La 1.6.0 mostra un avviso rosso in Impostazioni finché non è fatto.

---

## 📲 Aggiornamento
1. Aggiorna **tutti** i dispositivi a 1.6.0
2. Impostazioni → 🛡️ Protezione dei dati → **Invia tutto al cloud**
3. Verifica che lo "Spazio cloud" sia uguale su tutti i dispositivi
