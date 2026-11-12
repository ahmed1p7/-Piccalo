"""
🧪 Smoke test TUTTO il ristorante: visita ogni schermata, clicca i controlli
principali e riporta ogni errore JavaScript o crash.

Copre: Home, Tavoli, Cassa, Magazzino, Cucina, Report, Personale, Impostazioni,
menu utente, modali (backup, wifi, sync, cambio password).
"""
import json
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


def click_nav(page, label):
    """Clicca la voce nella barra di navigazione inferiore (mobile)."""
    found = page.evaluate(
        """(label) => {
            const navs = [...document.querySelectorAll('nav')];
            let b = null;
            for (const nav of navs.reverse()) {
                b = [...nav.querySelectorAll('button')]
                    .find(x => x.innerText.includes(label) && x.offsetParent !== null);
                if (b) break;
            }
            if (!b) return null;
            const txt = b.innerText.trim().split('\\n').join('/');
            b.click();
            return txt;
        }""",
        label,
    )
    page.wait_for_timeout(1100)
    return found


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


def main():
    # dati iniziali: un tavolo, un prodotto, un articolo di magazzino
    put("/sea_pos/shared_state/collections", {
        "inventory": {"data": [{
            "id": "prod_caffe", "name": "Caffe", "type": "prodotto", "category": "bevande",
            "currentQuantity": 50, "minThreshold": 5, "unit": "pz", "sellPrice": 1.5,
            "supplier": "T", "lastUpdated": "2026-01-01T00:00:00.000Z",
        }, {
            "id": "mat_farina", "name": "Farina", "type": "materiale", "category": "cibo",
            "currentQuantity": 20, "minThreshold": 5, "unit": "kg", "supplier": "M",
            "lastUpdated": "2026-01-01T00:00:00.000Z",
        }], "updatedAt": 1700000000000, "deviceId": "test"},
        "tables": {"data": [{
            "id": "tbl_1", "name": "Tavolo 1", "number": 1, "seats": 4,
            "status": "occupato", "billAmount": 25, "coversCount": 2,
            "currentOrderItems": [], "notes": "", "createdAt": "2026-01-01T00:00:00.000Z",
        }], "updatedAt": 1700000000000, "deviceId": "test"},
    })

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(8000)

        # setup
        if page.locator("input[placeholder='es. Ristorante Malih']").count() > 0:
            page.fill("input[placeholder='es. Ristorante Malih']", "Ristorante Malih")
            page.fill("input[placeholder='es. titolare']", "titolare")
            pws = page.locator("input[type='password']")
            pws.nth(0).fill("1234")
            pws.nth(1).fill("1234")
            page.click("button:has-text('Crea il mio account')")
            page.wait_for_timeout(3000)
        else:
            page.fill("input[placeholder='Il tuo nome utente']", "titolare")
            page.fill("input[type='password']", "1234")
            page.click("button:has-text('Accedi')")
            page.wait_for_timeout(2500)

        check("login/setup riuscito", "Bentornato" in page.inner_text("body"))

        # ── ogni schermata ──
        for label, marker in [
            ("Home", "Pannello di controllo"),
            ("Tavoli", "TAVOLI"),
            ("Cassa", "Punto Cassa"),
            ("Magazzino", "Magazzino"),
            ("Cucina", "Cucina"),
            ("Report", "Report"),
            ("Personale", "Permessi"),
        ]:
            before = len(errors)
            nav_hit = click_nav(page, label)
            body = page.inner_text("body")
            ok = marker.lower() in body.lower()
            if not ok:
                print(f"      ↳ nav: {nav_hit}")
                print(f"      ↳ body: {body[:160].replace(chr(10), ' | ')}")
            check(f"schermata '{label}' si apre", ok and len(errors) == before,
                  f"errori: {errors[before:][:1]}")

        # ── Impostazioni (dal menu utente) ──
        page.evaluate("""() => { const b=document.querySelector("button[title='Menu utente']"); b&&b.click(); }""")
        page.wait_for_timeout(700)
        page.evaluate("""() => {
            const b=[...document.querySelectorAll('button')].find(x=>/Impostazioni/i.test(x.innerText)&&x.offsetParent);
            b&&b.click();
        }""")
        page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("le Impostazioni si aprono", "Impostazioni" in body or "Ristorante" in body, body[:60])
        check("nessun errore in Impostazioni", not errors, str(errors[:1]))

        # ── modali dal menu utente ──
        for label, marker in [
            ("Backup & ripristino", "Backup"),
            ("Rete locale Wi-Fi", "Wi-Fi"),
            ("Cambia password", "password"),
        ]:
            page.evaluate("""() => { const b=document.querySelector("button[title='Menu utente']"); b&&b.click(); }""")
            page.wait_for_timeout(700)
            n_before = len(errors)
            page.evaluate("""(label) => {
                const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().toLowerCase().includes(label.toLowerCase())&&x.offsetParent);
                b&&b.click();
            }""", label)
            page.wait_for_timeout(1100)
            body = page.inner_text("body")
            ok = marker.lower() in body.lower()
            check(f"modale '{label}' si apre", ok and len(errors) == n_before,
                  f"errori: {errors[n_before:][:1]}")
            page.keyboard.press("Escape")
            page.wait_for_timeout(600)

        # ── finestra di sincronizzazione ──
        page.evaluate("""() => { const b=document.querySelector("button[title^='Sincronizzazione']"); b&&b.click(); }""")
        page.wait_for_timeout(1100)
        body = page.inner_text("body")
        check("la finestra di sincronizzazione si apre", "Sincronizzazione" in body or "cloud" in body.lower())
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        check("nessun errore JavaScript in tutta l'app", not errors, "; ".join(errors[:3]))
        page.screenshot(path=f"{OUT}/83-smoke-tutte-schermate.png")

        browser.close()

    ok = sum(1 for _, o in results if o)
    print(f"\n═══ {ok}/{len(results)} test passati ═══\n")


main()
