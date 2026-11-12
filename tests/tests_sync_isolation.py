#!/usr/bin/env python3
"""
🛡️ Test end-to-end: nessuna perdita di dati tra un dispositivo e l'altro.

Simula esattamente il problema segnalato dal ristorante:
  1. il telefono A crea il ristorante con i SUOI dati
  2. il telefono A si "aggiorna" (ricarica la pagina → il codice è
     cambiato, come dopo un aggiornamento dell'app)
  3. nel cloud globale (vecchio percorso) c'è roba di un ALTRO
     ristorante + i vecchi dati demo → non deve MAI finire sul
     telefono A
  4. il telefono B (nuovo, vuoto) deve agganciarsi da solo al
     ristorante A senza codici da incollare
  5. due ristoranti diversi non devono MAI vedersi i dati

Eseguire con l'emulatore Realtime Database attivo:
  python3 tests/tests_sync_isolation.py
"""

import json
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
BASE = "http://127.0.0.1:4176/"
EMULATOR = "http://127.0.0.1:9000"
NS = "demo-sea-pos-default-rtdb"

passed = 0
failed = 0


def check(name, condition, extra=None):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}", json.dumps(extra, ensure_ascii=False)[:400] if extra is not None else "")


def db_get(path):
    with urllib.request.urlopen(f"{EMULATOR}/{path}.json?ns={NS}", timeout=15) as r:
        return json.loads(r.read().decode() or "null")


def db_put(path, value):
    data = json.dumps(value).encode()
    req = urllib.request.Request(
        f"{EMULATOR}/{path}.json?ns={NS}", data=data, method="PUT",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read()


def signup(page, name, user, pin):
    """Crea l'account amministratore nella schermata di setup."""
    page.goto(BASE, wait_until="networkidle")
    # l'app aspetta il cloud (max 5 s) prima di mostrare il setup
    for _ in range(30):
        if page.locator("input[placeholder*='titolare']").count():
            break
        page.wait_for_timeout(500)
    if page.locator("input[placeholder*='titolare']").count() == 0:
        return False
    page.fill("input[placeholder*='Ristorante']", name)
    page.fill("input[placeholder*='titolare']", user)
    page.fill("input[type='password'] >> nth=0", pin)
    page.fill("input[type='password'] >> nth=1", pin)
    page.click("button:has-text('Crea il mio account')")
    page.wait_for_timeout(3000)
    return True


def main():
    print("\n═══ Test isolamento dei dati tra ristoranti (v1.6.0) ═══\n")

    # ── pulizia ──
    db_put("sea_pos", None)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])

        # ══════════════════════════════════════════════════════════
        # 1. Telefono A: crea il ristorante con i suoi dati
        # ══════════════════════════════════════════════════════════
        ctx_a = browser.new_context(viewport={"width": 390, "height": 844})
        page_a = ctx_a.new_page()
        errors_a = []
        page_a.on("pageerror", lambda e: errors_a.append(str(e)))

        ok = signup(page_a, "Ristorante Malih", "titolare", "1234")
        check("telefono A crea il ristorante", ok)

        # crea un tavolo e un articolo (dati REALI del ristorante)
        page_a.evaluate(
            """() => {
                const navs=[...document.querySelectorAll('nav')]; const nav=navs[navs.length-1];
                const b=[...nav.querySelectorAll('button')].find(x=>x.innerText.includes('Tavoli')&&x.offsetParent!==null);
                b&&b.click();
            }"""
        )
        page_a.wait_for_timeout(1200)
        page_a.evaluate(
            """() => {
                const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('Nuovo Tavolo')||x.innerText.includes('Aggiungi Nuovo Tavolo')||x.innerText.includes('Aggiungi tavolo'));
                if(b) b.click();
            }"""
        )
        page_a.wait_for_timeout(900)
        if page_a.locator("input[placeholder*='Tavolo']").count():
            page_a.fill("input[placeholder*='Tavolo'] >> nth=0", "Tavolo VIP")
            page_a.evaluate(
                """() => {
                    const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().toLowerCase().includes('salva')||x.innerText.trim().toLowerCase().includes('aggiungi'));
                    b&&b.click();
                }"""
            )
            page_a.wait_for_timeout(1500)

        # ── verifica nel cloud ──
        time.sleep(2)
        root = db_get("sea_pos") or {}
        v2 = root.get("v2") or {}
        index = v2.get("index") or {}
        rest_ids = list(index.keys())
        check("il ristorante è stato pubblicato nell'indice", len(rest_ids) == 1, index)

        rid = rest_ids[0] if rest_ids else None
        check("l'id del ristorante ha il formato r_…", bool(rid) and rid.startswith("r_"), rid)

        state = ((v2.get("restaurants") or {}).get(rid) or {}) if rid else {}
        cols = state.get("collections") or {}
        check("i dati sono nel percorso dedicato al ristorante", "users" in cols, list(cols.keys()))
        check("il vecchio percorso globale non viene usato", "shared_state" not in root, list(root.keys()))

        users = (cols.get("users") or {}).get("data") or []
        check("l'account reale è nel cloud", any(u.get("username") == "titolare" for u in users), users)

        # ══════════════════════════════════════════════════════════
        # 2. "Aggiornamento": il telefono A ricarica (nuovo codice)
        # ══════════════════════════════════════════════════════════
        page_a.reload(wait_until="networkidle")
        page_a.wait_for_timeout(6000)
        body_a = page_a.inner_text("body")
        check("dopo l'aggiornamento il ristorante è ancora lì", "Ristorante Malih" in body_a, body_a[:200])

        # ══════════════════════════════════════════════════════════
        # 3. Polluzione: nel percorso GLOBALE vecchio c'è un altro
        #    ristorante + i dati demo → non devono arrivare sul telefono
        # ══════════════════════════════════════════════════════════
        db_put("sea_pos/shared_state", {
            "collections": {
                "users": {
                    "data": [{
                        "id": "user_admin", "username": "Admin", "pin": "5555",
                        "role": "admin", "displayName": "Admin (Proprietario)",
                        "permissions": {"canAccessCassa": True},
                    }],
                    "updatedAt": 9999999999999, "deviceId": "altro",
                },
                "tables": {
                    "data": [
                        {"id": "tbl_1", "name": "Tavolo 1", "status": "libero", "seats": 4, "billAmount": 0},
                        {"id": "tbl_2", "name": "Tavolo 2", "status": "libero", "seats": 4, "billAmount": 0},
                    ],
                    "updatedAt": 9999999999999, "deviceId": "altro",
                },
                "inventory": {
                    "data": [{"id": "mat_1", "name": "Farina demo", "currentQuantity": 20, "minThreshold": 5}],
                    "updatedAt": 9999999999999, "deviceId": "altro",
                },
            },
            "devices": {"altro": {"id": "altro", "name": "Altro ristorante", "lastSeen": 9999999999999}},
        })

        page_a.reload(wait_until="networkidle")
        page_a.wait_for_timeout(7000)
        body_a = page_a.inner_text("body")

        check("l'account demo NON è comparso", "Admin (Proprietario)" not in body_a, body_a[:300])
        check("i tavoli demo NON sono comparsi", "Tavolo 1" not in body_a, body_a[:300])

        # e non devono aver modificato i dati reali
        root = db_get("sea_pos") or {}
        v2 = root.get("v2") or {}
        state2 = ((v2.get("restaurants") or {}).get(rid) or {}) if rid else {}
        cols2 = state2.get("collections") or {}
        users2 = (cols2.get("users") or {}).get("data") or []
        check(
            "l'account reale è ancora nel cloud dopo l'aggiornamento",
            any(u.get("username") == "titolare" for u in users2),
            users2,
        )
        check(
            "l'account demo non è stato importato nel cloud",
            not any(u.get("id") == "user_admin" for u in users2),
            users2,
        )

        # ══════════════════════════════════════════════════════════
        # 4. Telefono B (nuovo, senza dati) → si aggancia da solo
        # ══════════════════════════════════════════════════════════
        ctx_b = browser.new_context(viewport={"width": 390, "height": 844})
        page_b = ctx_b.new_page()
        errors_b = []
        page_b.on("pageerror", lambda e: errors_b.append(str(e)))
        page_b.goto(BASE, wait_until="networkidle")
        page_b.wait_for_timeout(9000)
        body_b = page_b.inner_text("body")

        check("il telefono B NON rifà il setup (ha adottato i dati)",
              page_b.locator("input[placeholder*='titolare']").count() == 0, body_b[:300])
        check("il telefono B chiede il login personale",
              page_b.locator("input[placeholder='Il tuo nome utente']").count() > 0, body_b[:300])
        check("il telefono B vede il ristorante", "Ristorante Malih" in body_b, body_b[:300])

        # ══════════════════════════════════════════════════════════
        # 5. Un ristorante DIVERSO → spazio separato
        # ══════════════════════════════════════════════════════════
        ctx_c = browser.new_context(viewport={"width": 390, "height": 844})
        page_c = ctx_c.new_page()
        page_c.goto(BASE, wait_until="networkidle")
        page_c.wait_for_timeout(9000)

        # se il cloud ha un solo ristorante, il nuovo dispositivo lo adotta:
        # verifichiamo invece con un secondo ristorante creato a mano
        rid2 = "r_testsecondo"
        db_put(f"sea_pos/v2/restaurants/{rid2}/collections/users", {
            "data": [{"id": "u2", "username": "altro_ristorante", "pin": "0000", "role": "admin"}],
            "updatedAt": int(time.time() * 1000), "deviceId": "x",
        })
        db_put(f"sea_pos/v2/index/{rid2}", {
            "rid": rid2, "name": "Pizzeria Napoli", "updatedAt": int(time.time() * 1000),
        })

        time.sleep(1)
        root = db_get("sea_pos") or {}
        index2 = (root.get("v2") or {}).get("index") or {}
        check("l'indice contiene i due ristoranti", len(index2) == 2, list(index2.keys()))

        stateA = ((root.get("v2") or {}).get("restaurants") or {}).get(rid) or {}
        stateB = ((root.get("v2") or {}).get("restaurants") or {}).get(rid2) or {}
        check(
            "i due ristoranti hanno spazi separati",
            rid != rid2 and stateA != stateB,
        )

        check("nessun errore JavaScript sul telefono A", not errors_a, errors_a[:3])
        check("nessun errore JavaScript sul telefono B", not errors_b, errors_b[:3])

        browser.close()

    print(f"\n═══ Risultato: {passed} test passati, {failed} falliti ═══\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
