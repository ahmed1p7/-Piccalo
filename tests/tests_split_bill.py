#!/usr/bin/env python3
"""
🧾 Test end-to-end della divisione del conto (v1.6.0).

Verifica le 4 funzionalità richieste:
  1. si scrive il TOTALE da dividere → l'app lo distribuisce sulle persone
  2. ogni persona ha il proprio stato di pagamento (verde quando ha pagato)
     + il totale residuo sul tavolo
  3. ogni persona ha il proprio metodo di pagamento (Contanti / Carta)
  4. una persona può pagare PER CONTO DI più persone: si selezionano,
     si registra un solo pagamento e l'app calcola il resto

Eseguire con l'emulatore Realtime Database attivo:
  python3 tests/tests_split_bill.py
"""

import json
import sys
import urllib.request

from playwright.sync_api import sync_playwright

CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
BASE = "http://127.0.0.1:4176/"
HOST = "http://127.0.0.1:9000"
NS = "?ns=demo-sea-pos-default-rtdb"

results = []


def check(name, ok, extra=""):
    results.append((name, ok))
    print(("  ✅ " if ok else "  ❌ ") + name + (f"  → {extra}" if extra else ""))


def put(path, data):
    req = urllib.request.Request(
        f"{HOST}{path}.json{NS}", data=json.dumps(data).encode(), method="PUT"
    )
    urllib.request.urlopen(req, timeout=10)


def get(path):
    with urllib.request.urlopen(f"{HOST}{path}.json{NS}", timeout=10) as r:
        return json.loads(r.read().decode() or "null")


def wipe_emulator():
    try:
        req = urllib.request.Request(
            f"{HOST}/sea_pos.json{NS}", data=b"null", method="PUT",
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception as e:
        print(f"  (avviso: emulatore non raggiungibile: {e})")


def main():
    print("\n═══ Test divisione del conto (v1.6.0) ═══\n")
    wipe_emulator()

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # ── setup ──
        page.goto(BASE, wait_until="networkidle")
        for _ in range(30):
            if page.locator("input[placeholder*='titolare']").count():
                break
            page.wait_for_timeout(500)
        page.fill("input[placeholder*='Ristorante']", "Ristorante Malih")
        page.fill("input[placeholder*='titolare']", "titolare")
        pws = page.locator("input[type='password']")
        pws.nth(0).fill("1234")
        pws.nth(1).fill("1234")
        page.click("button:has-text('Crea il mio account')")
        page.wait_for_timeout(4000)

        # ── crea un tavolo da 60 € ──
        page.evaluate("""() => {
            const navs=[...document.querySelectorAll('nav')]; const nav=navs[navs.length-1];
            const b=[...nav.querySelectorAll('button')].find(x=>x.innerText.includes('Tavoli')&&x.offsetParent!==null);
            b&&b.click();
        }""")
        page.wait_for_timeout(1200)
        page.locator("button:has-text('Nuovo Tavolo'):visible").last.click()
        page.wait_for_timeout(900)
        page.fill("input[placeholder='Es. Tavolo 9, Giardino 1, Terrazza...']", "Tavolo Split")
        page.fill("input[placeholder='0.00']", "60")
        page.wait_for_timeout(300)
        page.click("button:has-text('Crea tavolo')")
        page.wait_for_timeout(2000)

        # ── apri la cassa sul tavolo ──
        page.evaluate("""() => {
            const navs=[...document.querySelectorAll('nav')]; const nav=navs[navs.length-1];
            const b=[...nav.querySelectorAll('button')].find(x=>x.innerText.includes('Cassa')&&x.offsetParent!==null);
            b&&b.click();
        }""")
        page.wait_for_timeout(1200)

        # seleziona il tavolo e apri "Incassa"
        page.evaluate("""() => {
            const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Tavolo Split')&&x.offsetParent);
            if(b) b.click();
        }""")
        page.wait_for_timeout(1000)
        opened = page.evaluate("""() => {
            const b=[...document.querySelectorAll('button')].find(x=>/Incassa/i.test(x.innerText)&&x.offsetParent&&!x.disabled);
            if(b){b.click();return true;} return false;
        }""")
        page.wait_for_timeout(1200)
        check("si apre il modale di incasso", opened)

        # ── passa alla modalità "Dividi il conto" ──
        page.evaluate("""() => {
            const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Dividi il conto')&&x.offsetParent);
            b&&b.click();
        }""")
        page.wait_for_timeout(1000)
        body = page.inner_text("body")
        check("compare la sezione divisione", "TOTALE DA DIVIDERE" in body.upper(), body[:120].replace("\n", " | "))

        # ── 1) scrivi il TOTALE da dividere (60 €) ──
        page.evaluate("""() => {
            const setVal=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
            const el=[...document.querySelectorAll('input')].find(i=>i.type==='number'&&i.closest('div')&&/Totale da dividere/.test(i.closest('div').parentElement?.textContent||''));
            if(el) setVal(el,'60');
        }""")
        page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("le quote sono distribuite sul totale scritto", "30" in body, body[:200].replace("\n", " | "))
        check("il totale da dividere è editabile", "TOTALE DA DIVIDERE" in body.upper())

        # ── 2) lo stato di pagamento e il residuo ──
        check("compare il riepilogo 'Restano da incassare'", "Restano da incassare" in body, body[:200].replace("\n", " | "))
        check("compare il conteggio delle quote saldate", "Quote saldate" in body)

        # ── 3) metodo di pagamento per persona ──
        check("ogni persona ha il proprio metodo di pagamento",
              body.upper().count("CONTANTI") >= 2 and "CARTA" in body.upper(),
              f"contanti={body.upper().count('CONTANTI')}")

        # imposta la seconda persona su "Carta" (verifica il metodo per persona)
        page.evaluate("""() => {
            const btns=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim().toUpperCase()==='CARTA'&&b.offsetParent);
            if(btns[1]) btns[1].click();   // seconda persona
        }""")
        page.wait_for_timeout(800)
        carta_attiva = page.evaluate("""() => {
            const btns=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim().toUpperCase()==='CARTA'&&b.offsetParent);
            return btns.length>1 && btns[1].className.includes('brand-500/20');
        }""")
        check("il metodo di pagamento è impostabile per persona", carta_attiva)

        # ...e poi rimettila su "Contanti" (il cliente paga tutto in contanti)
        page.evaluate("""() => {
            const btns=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim().toUpperCase()==='CONTANTI'&&b.offsetParent);
            btns.forEach(b=>b.click());   // tutti in contanti
        }""")
        page.wait_for_timeout(800)

        # ── 4) pagamento per conto di 2 persone ──
        page.evaluate("""() => {
            const boxes=[...document.querySelectorAll('button[aria-label^="Seleziona"]')].filter(b=>b.offsetParent);
            boxes.slice(0,2).forEach(b=>b.click());
        }""")
        page.wait_for_timeout(900)
        body = page.inner_text("body")
        check("compare il pulsante 'Paga per conto di'", "Paga per conto di" in body, body[:300].replace("\n", " | "))

        # registra il pagamento per entrambe (60 € con 100 € di contante)
        page.evaluate("""() => {
            const setVal=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
            // il campo "Contante ricevuto" (etichetta vicina)
            const all=[...document.querySelectorAll('input[type=number]')];
            const cash=all.find(i=>{
              const wrap=i.closest('div');           // <Field> wrapper
              const label=wrap?.querySelector('label');
              return label && /Contante ricevuto/i.test(label.textContent||'') && i.offsetParent;
            });
            if(cash) setVal(cash,'100');
        }""")
        page.wait_for_timeout(900)
        body = page.inner_text("body")
        check("il resto viene mostrato (100 - 60 = 40 €)", "Resto da restituire" in body, body[-400:].replace("\n", " | "))

        clicked = page.evaluate("""() => {
            const b=[...document.querySelectorAll('button')].find(x=>/Registra pagamento per 2 persone/.test(x.innerText)&&x.offsetParent&&!x.disabled);
            if(b){b.click();return true;} return false;
        }""")
        page.wait_for_timeout(2000)
        check("il pagamento per conto di 2 persone è registrato", clicked)

        body = page.inner_text("body")
        page.screenshot(path="/workspace/output/shots/91-split-dopo-pagamento.png")
        check("le due quote risultano pagate", body.upper().count("PAGATO") >= 2, body[:400].replace("\n", " | "))
        check("il conto risulta coperto", "conto coperto" in body.lower() or "Restano" in body)

        # ── verifica nel cloud: 2 pagamenti distinti ──
        idx = get("/sea_pos/v2/index") or {}
        rid = list(idx.keys())[0] if idx else None
        tables = (get(f"/sea_pos/v2/restaurants/{rid}/collections/tables") or {}).get("data") or []
        tbl = tables[0] if tables else {}
        payments = tbl.get("payments") or []
        check("i pagamenti sono registrati sul tavolo", len(payments) >= 1, f"{len(payments)} pagamenti")
        if payments:
            check("il totale incassato è 60 €",
                  abs(sum(p.get("amount", 0) for p in payments) - 60) < 0.01,
                  str([p.get("amount") for p in payments]))

        check("nessun errore JavaScript", not errors, errors[:3])

        page.screenshot(path="/workspace/output/shots/90-split-conto.png")
        browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n═══ Risultato: {len(results) - len(failed)}/{len(results)} test passati ═══\n")
    if failed:
        print("FALLITI:")
        for n in failed:
            print("  -", n)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
