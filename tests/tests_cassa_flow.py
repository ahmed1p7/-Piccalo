"""
🧪 Test completo della CASSA (Punto Cassa)

Copre:
  1. Apertura cassa + nessun errore JS
  2. Vendita rapida con importo manuale → incasso contanti → scontrino
  3. Aggiunta prodotto rapido → incasso carta
  4. Divisione del conto in 2 → saldo quote → chiusura
  5. Verifica che lo scontrino finisca nei dati (report)
  6. Segnalazione di ogni errore JavaScript
"""
import json
import sys
import urllib.request

from playwright.sync_api import sync_playwright

HOST = "http://127.0.0.1:9000"
NS = "?ns=demo-sea-pos-default-rtdb"
BASE = "http://127.0.0.1:4176/"
OUT = "/workspace/output/shots"
CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"

results = []


def check(name, ok, extra=""):
    results.append((name, ok))
    print(("  ✅ " if ok else "  ❌ ") + name + (f"  → {extra}" if extra else ""))


def put(path, data):
    req = urllib.request.Request(f"{HOST}{path}.json{NS}",
                                 data=json.dumps(data).encode(), method="PUT")
    urllib.request.urlopen(req, timeout=10)


def get(path):
    with urllib.request.urlopen(f"{HOST}{path}.json{NS}", timeout=10) as r:
        return json.loads(r.read().decode())


def click_text(page, text, nth=0):
    """Clicca un bottone con testo esatto e visibile."""
    ok = page.evaluate(
        """([label, nth]) => {
            const btns = [...document.querySelectorAll('button')]
                .filter(b => b.innerText.trim().includes(label) && b.offsetParent !== null
                             && !b.disabled);
            if (btns[nth]) { btns[nth].click(); return true; }
            return false;
        }""",
        [text, nth],
    )
    if not ok:
        btns = page.evaluate(
            "() => [...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null)"
            ".map(b=>b.innerText.trim().slice(0,32)).filter(Boolean)")
        raise AssertionError(f"bottone non trovato: '{text}' — presenti: {btns}")
    page.wait_for_timeout(700)


def wipe_emulator():
    """Svuota l'emulatore Realtime Database (dati di test precedenti)."""
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:9000/sea_pos.json?ns=demo-sea-pos-default-rtdb",
            data=b"null", method="PUT",
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception as e:
        print(f"  (avviso: emulatore non raggiungibile: {e})")



def restaurant_path():
    """Percorso cloud del ristorante (v2, con fallback al percorso legacy)."""
    idx = get("/sea_pos/v2/index") or {}
    for rid in idx.keys():
        return f"/sea_pos/v2/restaurants/{rid}/collections"
    return "/sea_pos/shared_state/collections"

def main():
    wipe_emulator()
    print("🧹 cloud svuotato\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        logs = []
        page.on("console", lambda m: logs.append(f"{m.type}: {m.text[:200]}"))

        # ── setup ──
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(8000)
        page.fill("input[placeholder='es. Ristorante Malih']", "Ristorante Malih")
        page.fill("input[placeholder='es. titolare']", "titolare")
        pws = page.locator("input[type='password']")
        pws.nth(0).fill("1234")
        pws.nth(1).fill("1234")
        page.click("button:has-text('Crea il mio account')")
        page.wait_for_timeout(3000)

        # ── 1) apri la cassa ──
        click_text(page, "Cassa")
        body = page.inner_text("body")
        check("la cassa si apre", "Punto Cassa" in body)
        check("nessun errore JS all'apertura", not errors, errors[:1])

        # ── 2) vendita rapida con importo manuale ──
        manual = page.locator("input").filter(has_text="").all()
        # trova il campo importo manuale (placeholder con "Totale" o label)
        # il campo importo manuale è quello con la classe text-3xl (il più grande)
        total_field = page.locator("input[class*='text-3xl']").first
        total_field.fill("30")
        total_field.dispatch_event("input")
        page.wait_for_timeout(600)
        body = page.inner_text("body")
        check("il totale manuale viene accettato", "30" in body)

        # clicca "Incassa"
        click_text(page, "Incassa")
        page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("si apre il modale di incasso", "Incassa" in body and ("Contanti" in body or "Carta" in body))
        page.screenshot(path=f"{OUT}/80-cassa-modale.png")

        # paga in contanti con 50€ (manca? no: 50 > 30 → resto 20)
        amount_input = page.locator("input[type='number']").last
        amount_input.fill("50")
        page.wait_for_timeout(500)
        body = page.inner_text("body")
        check("il resto viene calcolato (20€)", "20" in body, body[:0])
        page.screenshot(path=f"{OUT}/81-cassa-resto.png")

        # conferma
        # clicca DENTRO la modale (portal) per non prendere il bottone
        # "Incassa" della schermata che resta dietro
        clicked = page.evaluate(
            """() => {
                const modal = [...document.querySelectorAll('div')]
                    .filter(d => d.className.includes('fixed') && d.className.includes('inset-0'))
                    .pop();
                if (!modal) return null;
                const btns = [...modal.querySelectorAll('button')]
                    .filter(b => b.offsetParent !== null && !b.disabled);
                const t = btns.find(b => /registra pagamento|chiudi conto|incassa/i.test(b.innerText));
                if (t) { t.click(); return t.innerText.trim(); }
                return null;
            }""")
        page.wait_for_timeout(2500)
        check("il pagamento viene confermato", clicked is not None, str(clicked))
        body = page.inner_text("body")
        check("dopo il pagamento compare l'avviso di conto chiuso",
              "Conto Chiuso" in body or "chiuso" in body.lower())
        page.screenshot(path=f"{OUT}/82-cassa-ok.png")

        # ── 3) lo scontrino è stato salvato? (aspetta la push al cloud) ──
        rdata = []
        for _ in range(20):
            receipts = get(f"{restaurant_path()}/receipts") or {}
            rdata = receipts.get("data") or []
            if rdata:
                break
            page.wait_for_timeout(500)
        check("lo scontrino è stato scritto nel cloud", len(rdata) >= 1, f"{len(rdata)} scontrini")
        if rdata:
            r = rdata[-1]
            check("l'importo cash è corretto (30€)", abs(float(r.get("cashAmount", 0)) - 30) < 0.01,
                  f"cash={r.get('cashAmount')} card={r.get('cardAmount')} totale={r.get('totalAmount')}")
            check("il resto (20€) è registrato", abs(float(r.get("changeGiven", 0)) - 20) < 0.01,
                  f"change={r.get('changeGiven')}")


        # ── 5) pulsante "Stampa Ultimo" dopo la vendita ──
        body = page.inner_text("body")
        check("compare il pulsante 'Stampa Ultimo'", "Stampa Ultimo" in body)

        # ── 6) vendita rapida con PRODOTTO (le voci finiscono sulla ricevuta) ──
        #     il prodotto è nel magazzino (sincronizzato dal cloud)
        put(f"{restaurant_path()}/inventory", {
            "data": [{
                "id": "prod_caffe", "name": "Caffe", "type": "prodotto",
                "category": "bevande", "currentQuantity": 50, "minThreshold": 5,
                "unit": "pz", "sellPrice": 1.5, "supplier": "Torrefazione",
                "lastUpdated": "2026-01-01T00:00:00.000Z",
            }],
            "updatedAt": 1700000000000, "deviceId": "test",
        })
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(7000)
        # login di nuovo se necessario
        if "PUNTO CASSA" in page.inner_text("body").upper():
            page.fill("input[placeholder='Il tuo nome utente']", "titolare")
            page.fill("input[type='password']", "1234")
            page.click("button:has-text('Accedi')")
            page.wait_for_timeout(2500)
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Cassa'&&x.offsetParent); b&&b.click(); }""")
        page.wait_for_timeout(1200)

        # clicca il prodotto rapido "Caffe"
        added = page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x =>
                x.innerText.includes('Caffe') && x.offsetParent !== null);
            if (b) { b.click(); return true; }
            return false;
        }""")
        check("il prodotto rapido è visibile e cliccabile", added)
        page.wait_for_timeout(900)
        body = page.inner_text("body")
        check("la voce del conto compare", "Caffe" in body)

        # paga con carta
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Incassa')&&x.offsetParent&&!x.disabled); b&&b.click(); }""")
        page.wait_for_timeout(1200)
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /^carta$/i.test(x.innerText.trim()) && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(500)
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /registra pagamento/i.test(x.innerText) && x.offsetParent && !x.disabled);
            if (b) b.click();
        }""")
        page.wait_for_timeout(3500)

        rdata2 = []
        for _ in range(20):
            receipts = get(f"{restaurant_path()}/receipts") or {}
            rdata2 = receipts.get("data") or []
            if len(rdata2) >= 2:
                break
            page.wait_for_timeout(500)
        check("il secondo scontrino (prodotto) è stato scritto", len(rdata2) >= 2, f"{len(rdata2)} scontrini")
        if len(rdata2) >= 2:
            r2 = rdata2[0]  # nel cloud: prima la più recente (nuovo ordinamento)
            names = [i.get("name") for i in (r2.get("items") or [])]
            check("la ricevuta elenca il prodotto venduto", "Caffe" in names, str(names))
            check("il totale del prodotto è 1,50 €", abs(float(r2.get("totalAmount", 0)) - 1.5) < 0.01,
                  str(r2.get("totalAmount")))
            check("il pagamento è con carta", float(r2.get("cardAmount", 0)) > 0, str(r2.get("cardAmount")))

        # ── 7) tavolo: pagamento parziale + chiusura con "Chiudi conto" ──
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Tavoli'&&x.offsetParent); b&&b.click(); }""")
        page.wait_for_timeout(1500)
        # crea un tavolo con importo 40
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /Nuovo Tavolo/i.test(x.innerText) && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(1000)
        page.fill("input[placeholder='Es. Tavolo 9, Giardino 1, Terrazza...']", "Tavolo Test")
        page.fill("input[placeholder='0.00']", "40")
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /Crea tavolo/i.test(x.innerText) && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(2000)
        body = page.inner_text("body")
        check("il tavolo è stato creato", "Tavolo Test" in body, body[:0])

        # vai in cassa, seleziona il tavolo, paga 40 in contanti
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Cassa'&&x.offsetParent); b&&b.click(); }""")
        page.wait_for_timeout(1200)
        sel = page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Tavolo Test') && x.offsetParent);
            if (b) { b.click(); return true; }
            return false;
        }""")
        check("il tavolo è selezionabile in cassa", sel)
        page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("il totale del tavolo è 40 €", "40" in body)

        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Incassa')&&x.offsetParent&&!x.disabled); b&&b.click(); }""")
        page.wait_for_timeout(1200)
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /registra pagamento/i.test(x.innerText) && x.offsetParent && !x.disabled);
            if (b) b.click();
        }""")
        page.wait_for_timeout(2500)
        body = page.inner_text("body")
        print("   MODAL-TAIL:", body[-420:].replace(chr(10), " | "))
        check("dopo il pagamento del tavolo compare 'Chiudi conto'", "Chiudi conto" in body)
        closed = page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /chiudi conto/i.test(x.innerText) && x.offsetParent && !x.disabled);
            if (b) { b.click(); return b.innerText.trim(); }
            return null;
        }""")
        check("il conto del tavolo si chiude", closed is not None, str(closed))
        page.wait_for_timeout(2500)


        # ── 8)Divisione del conto su un tavolo ──
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Tavoli'&&x.offsetParent); b&&b.click(); }""")
        page.wait_for_timeout(1500)
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /Nuovo Tavolo/i.test(x.innerText) && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(900)
        page.fill("input[placeholder='Es. Tavolo 9, Giardino 1, Terrazza...']", "Tavolo Split")
        page.fill("input[placeholder='0.00']", "60")
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /Crea tavolo/i.test(x.innerText) && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(1800)

        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Cassa'&&x.offsetParent); b&&b.click(); }""")
        page.wait_for_timeout(1200)
        page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Tavolo Split') && x.offsetParent);
            if (b) b.click();
        }""")
        page.wait_for_timeout(1200)
        page.evaluate("""() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Incassa')&&x.offsetParent&&!x.disabled); b&&b.click(); }""")
        page.wait_for_timeout(1300)

        # scegli "Dividi il conto"
        split_clicked = page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /Dividi il conto/i.test(x.innerText) && x.offsetParent);
            if (b) { b.click(); return true; }
            return false;
        }""")
        check("il bottone 'Dividi il conto' è disponibile", split_clicked)
        page.wait_for_timeout(900)
        body = page.inner_text("body")
        check("le quote vengono calcolate (2 persone)", "Persona 1" in body and "Persona 2" in body)

        # paga la quota 1 (contanti) e la quota 2 (carta)
        for idx, meth in enumerate(["contanti", "carta"]):
            # dopo il primo pagamento il bottone sparisce (diventa ✓):
            #     clicca sempre il PRIMO "Paga" disponibile
            page.evaluate("""() => {
                const quota = [...document.querySelectorAll('button')].filter(x => x.innerText.trim() === 'Paga' && x.offsetParent);
                if (quota[0]) quota[0].click();
            }""")
            page.wait_for_timeout(700)
            if meth == "carta":
                page.evaluate("""() => {
                    const b = [...document.querySelectorAll('button')].find(x => /Carta POS/i.test(x.innerText) && x.offsetParent);
                    if (b) b.click();
                }""")
                page.wait_for_timeout(500)
            page.evaluate("""() => {
                const b = [...document.querySelectorAll('button')].find(x => /registra pagamento/i.test(x.innerText) && x.offsetParent && !x.disabled);
                if (b) b.click();
            }""")
            page.wait_for_timeout(1800)

        body = page.inner_text("body")
        check("le quote saldate sono segnate", "pagato" in body.lower())
        closed = page.evaluate("""() => {
            const b = [...document.querySelectorAll('button')].find(x => /chiudi conto/i.test(x.innerText) && x.offsetParent && !x.disabled);
            if (b) { b.click(); return b.innerText.trim(); }
            return null;
        }""")
        check("il conto diviso si chiude", closed is not None, str(closed))
        page.wait_for_timeout(2500)

        # la ricevuta deve avere i dettagli delle quote
        rdata3 = []
        for _ in range(20):
            receipts = get(f"{restaurant_path()}/receipts") or {}
            rdata3 = receipts.get("data") or []
            if len(rdata3) >= 3:
                break
            page.wait_for_timeout(500)
        check("lo scontrino del conto diviso è stato scritto", len(rdata3) >= 3, f"{len(rdata3)} scontrini")
        if rdata3:
            r3 = rdata3[0]
            check("la ricevuta ha i dettagli della divisione",
                  bool(r3.get("splitDetails")) and len(r3.get("splitDetails") or []) == 2,
                  str(r3.get("splitDetails"))[:120])
            check("il totale del conto diviso è 60 €", abs(float(r3.get("totalAmount", 0)) - 60) < 0.01,
                  str(r3.get("totalAmount")))

        check("nessun errore JavaScript durante l'intero flusso", not errors, "; ".join(errors[:2]))

        print("\n=== log errori console ===")
        for line in logs[:10]:
            print("  ", line[:180])

        browser.close()

    ok = sum(1 for _, o in results if o)
    print(f"\n═══ {ok}/{len(results)} test passati ═══\n")
    if ok != len(results):
        sys.exit(1)


main()
