"""
☁️ Test: ADOZIONE AUTOMATICA — un telefono nuovo si collega da solo al
ristorante e riceve utenti, tavoli e magazzino senza nessuna operazione.

Requisiti:
  1) emulatore Realtime Database attivo:
     npx firebase emulators:start --only database --project demo-sea-pos
  2) build con la config dell'emulatore:
     VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=demo-sea-pos.firebaseapp.com \
     VITE_FIREBASE_PROJECT_ID=demo-sea-pos VITE_FIREBASE_APP_ID=1:123:web:abc \
     VITE_FIREBASE_DATABASE_URL="http://127.0.0.1:9000?ns=demo-sea-pos" npm run build
  3) app servita su http://127.0.0.1:4176/
"""
import asyncio, sys, urllib.request
from playwright.async_api import async_playwright

# svuota il database dell'emulatore prima di iniziare
try:
    req = urllib.request.Request(
        "http://127.0.0.1:9000/.json?ns=demo-sea-pos-default-rtdb", method="DELETE")
    urllib.request.urlopen(req, timeout=10)
    print("🧹 database emulatore svuotato")
except Exception as e:
    print("⚠️ impossibile svuotare l'emulatore:", e)

BASE = "http://127.0.0.1:4176/"
OUT = "/workspace/output"

results = []


def check(name, ok, extra=""):
    results.append((name, ok))
    print(("  ✅ " if ok else "  ❌ ") + name + (f"  → {extra}" if extra else ""))


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"])

        # ══ TELEFONO A: primo avvio, crea il ristorante ══
        ctxA = await browser.new_context(viewport={"width": 390, "height": 844})
        A = await ctxA.new_page()
        A.on("console", lambda m: print(f"[A:{m.type[:1]}]", m.text[:170]))
        await A.goto(BASE, wait_until="networkidle")
        await A.wait_for_timeout(7000)

        bodyA = await A.inner_text("body")
        check("A: parte dalla configurazione iniziale", "Configurazione iniziale" in bodyA)

        await A.fill("input[placeholder='es. Ristorante Malih']", "Ristorante Malih")
        await A.fill("input[placeholder='es. titolare']", "titolare")
        pws = A.locator("input[type='password']")
        await pws.nth(0).fill("1234")
        await pws.nth(1).fill("1234")
        await A.click("button:has-text('Crea il mio account')")
        await A.wait_for_timeout(2500)

        # A crea un tavolo
        await A.locator("button:has-text('Tavoli'):visible").first.click()
        await A.wait_for_timeout(1200)
        await A.click("button:has-text('Aggiungi Nuovo Tavolo')")
        await A.wait_for_timeout(800)
        await A.click("button:has-text('Crea Tavolo')")
        await A.wait_for_timeout(2000)

        # A crea un dipendente
        await A.locator("button:has-text('Personale'):visible").first.click()
        await A.wait_for_timeout(1200)
        await A.click("button:has-text('Nuovo dipendente')")
        await A.wait_for_timeout(900)
        await A.fill("input[placeholder='Es. Mario Rossi']", "Mario Rossi")
        await A.fill("input[placeholder='Es. mario']", "mario")
        await A.fill("input[placeholder='Es. 5555']", "1111")
        await A.click("button:has-text('Crea account')")
        await A.wait_for_timeout(2500)

        print("   A: dati creati, inizio la sincronizzazione…")
        await A.wait_for_timeout(3000)

        # ══ TELEFONO B: nuovo dispositivo, nessuna operazione ══
        ctxB = await browser.new_context(viewport={"width": 390, "height": 844})
        B = await ctxB.new_page()
        B.on("console", lambda m: print(f"[B:{m.type[:1]}]", m.text[:170]))
        await B.goto(BASE, wait_until="networkidle")
        await B.wait_for_timeout(9000)

        bodyB = await B.inner_text("body")
        check(
            "B: NON chiede la configurazione (ha adottato il ristorante)",
            "Configurazione iniziale" not in bodyB,
            bodyB[:90].replace("\n", " | "),
        )
        check("B: mostra la schermata di login", "password" in bodyB.lower())

        # B fa login con l'account creato su A
        await B.fill("input[placeholder='Il tuo nome utente']", "mario")
        await B.fill("input[type='password']", "1111")
        await B.locator("button:has-text('Accedi'):visible").last.click()
        await B.wait_for_timeout(2500)

        bodyB = await B.inner_text("body")
        check("B: entra col dipendente creato su A", "Mario Rossi" in bodyB)

        # B vede il tavolo creato su A
        await B.locator("button:has-text('Tavoli'):visible").first.click()
        await B.wait_for_timeout(1800)
        bodyB = await B.inner_text("body")
        check("B: vede il tavolo creato su A", "Tavolo 1" in bodyB)
        await B.screenshot(path=f"{OUT}/60-adozione-telefono-B.png")

        # ══ B (admin) per il test del magazzino: il cameriere non ha i permessi ══
        await B.click("button[title='Menu utente']")
        await B.wait_for_timeout(600)
        await B.click("button:visible:has-text('Esci dal turno')")
        await B.wait_for_timeout(1500)
        await B.fill("input[placeholder='Il tuo nome utente']", "titolare")
        await B.fill("input[type='password']", "1234")
        await B.locator("button:has-text('Accedi'):visible").last.click()
        await B.wait_for_timeout(2000)

        # ══ A modifica → B riceve in tempo reale ══
        await A.locator("button:has-text('Magazzino'):visible").first.click()
        await A.wait_for_timeout(1000)
        await A.click("button:has-text('Nuovo Articolo')")
        await A.wait_for_timeout(1200)
        await A.fill(
            "input[placeholder*='Farina Caputo']",
            "Farina Tipo 00")
        nums = A.locator("input[type='number']")
        if await nums.count() > 0:
            await nums.first.fill("25")
        await A.evaluate(
            "() => { const bs=[...document.querySelectorAll('button')]"
            ".filter(b=>/salva|registra|aggiungi/i.test(b.innerText));"
            " if(bs.length) bs[bs.length-1].click(); }")
        await A.wait_for_timeout(3500)

        await B.locator("button:has-text('Magazzino'):visible").first.click()
        await B.wait_for_timeout(2500)
        bodyB = await B.inner_text("body")
        check("B: riceve in tempo reale il nuovo articolo di A",
              "Farina" in bodyB, bodyB[:120].replace("\n", " | "))
        await B.screenshot(path=f"{OUT}/61-sync-tempo-reale.png")

        await browser.close()

        failed = [n for n, ok in results if not ok]
        print(f"\n═══ {len(results) - len(failed)}/{len(results)} test passati ═══")
        for f in failed:
            print("  -", f)
        return 1 if failed else 0


sys.exit(asyncio.run(main()))
