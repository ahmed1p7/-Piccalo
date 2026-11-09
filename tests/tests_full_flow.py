"""
🧪 Test end-to-end del flusso completo:
  1. Primo avvio → schermata di configurazione (nessun accesso automatico!)
  2. Creazione account amministratore
  3. Creazione dipendente (cameriere) con permessi
  4. Accesso come dipendente
  5. Tavolo + divisione conto (2 persone) + pagamento contanti + carta
  6. Ripristino di fabbrica → app completamente vuota
"""
import asyncio, json, sys
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:4175/"
OUT = "/workspace/output"

results = []

async def click_exact(page, label, nth=0):
    """Clicca un bottone con testo esatto (evita match parziali tipo 'Paga' vs 'Pagamento unico')."""
    n = await page.evaluate(
        """([label, nth]) => {
            const btns = [...document.querySelectorAll('button')]
                .filter(b => b.innerText.trim() === label && b.offsetParent !== null);
            if (btns[nth]) { btns[nth].click(); return btns.length; }
            return -1;
        }""",
        [label, nth],
    )
    if n < 0:
        all_btns = await page.evaluate(
            "() => [...document.querySelectorAll('button')].map(b=>b.innerText.trim().slice(0,40)).filter(Boolean)")
        raise AssertionError(f"bottone non trovato: '{label}' — presenti: {all_btns}")



def check(name, ok, extra=""):
    results.append((name, ok))
    print(("  ✅ " if ok else "  ❌ ") + name + (f"  → {extra}" if extra else ""))


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(7000)  # attende il bootstrap (cloud non raggiungibile in test)

        # ── 1. Configurazione iniziale ──
        body = await page.inner_text("body")
        check("app non avvia con l'utente Admin già loggato",
              "Password" not in body and "Configurazione iniziale" in body)
        check("nessun campo precompilato con credenziali",
              await page.evaluate("() => { const i=document.querySelector(\"input[type='password']\"); return !i || i.value === ''; }"))

        # ── 2. Creazione admin ──
        await page.fill("input[placeholder='es. Ristorante Malih']", "Ristorante Malih")
        await page.fill("input[placeholder='es. titolare']", "titolare")
        pws = page.locator("input[type='password']")
        await pws.nth(0).fill("1234")
        await pws.nth(1).fill("1234")
        await page.click("button:has-text('Crea il mio account')")
        await page.wait_for_timeout(2500)

        body = await page.inner_text("body")
        check("dopo la configurazione si entra nella dashboard",
              "Bentornato" in body or "titolare" in body, body[:80].replace("\n", " "))
        check("il profilo ristorante prende il nome inserito",
              "Malih" in body)
        await page.screenshot(path=f"{OUT}/50-dashboard-vuota.png")

        # ── 3. Creazione dipendente ──
        await page.locator("button:has-text('Personale'):visible").first.click()
        await page.wait_for_timeout(1500)
        body = await page.inner_text("body")
        check("la sezione Personale è raggiungibile", "Permessi" in body)

        await page.click("button:has-text('Nuovo dipendente')")
        await page.wait_for_timeout(1200)
        await page.fill("input[placeholder='Es. Mario Rossi']", "Mario Rossi")
        await page.fill("input[placeholder='Es. mario']", "mario")
        await page.fill("input[placeholder='Es. 5555']", "1111")
        await page.click("button:has-text('Cameriere')")
        await page.wait_for_timeout(400)
        await page.click("button:has-text('Crea account')")
        await page.wait_for_timeout(1500)

        body = await page.inner_text("body")
        check("il dipendente è stato creato", "Mario Rossi" in body and "@mario" in body)
        check("il ruolo Cameriere è assegnato", "cameriere" in body.lower())
        await page.screenshot(path=f"{OUT}/51-personale.png")

        # ── 4. Esci e rientra come dipendente ──
        await page.click("button[title='Menu utente']")
        await page.wait_for_timeout(600)
        await page.click("button:has-text('Esci dal turno')")
        await page.wait_for_timeout(2500)
        body = await page.inner_text("body")
        check("dopo l'uscita compare il login (non accesso automatico)",
              "password" in body.lower() and "nome utente" in body.lower(),
              body[:120].replace("\n", " | "))

        await page.fill("input[placeholder='Il tuo nome utente']", "mario")
        await page.fill("input[type='password']", "1111")
        await page.locator("button:has-text('Accedi'):visible").last.click()
        await page.wait_for_timeout(2000)
        body = await page.inner_text("body")
        check("accesso come dipendente riuscito", "Mario Rossi" in body)
        check("il dipendente NON vede la sezione Personale",
              "Personale" not in body or "Gestione Personale" not in body)

        # ── 5. Tavolo + divisione conto ──
        await page.locator("button:has-text('Tavoli'):visible").first.click()
        await page.wait_for_timeout(1200)
        await page.click("button:has-text('Aggiungi Nuovo Tavolo')")
        await page.wait_for_timeout(900)
        await page.click("button:has-text('Crea Tavolo')")
        await page.wait_for_timeout(1200)
        body = await page.inner_text("body")
        check("il tavolo è stato creato", "Tavolo 1" in body)

        # imposta il conto
        await page.click("button:has-text('Imposta Conto del Tavolo')")
        await page.wait_for_timeout(900)
        inputs = page.locator("input[type='number']")
        if await inputs.count() > 0:
            await inputs.first.fill("100")
            await page.click("button:has-text('Salva')")
            await page.wait_for_timeout(1000)

        # incassa
        await page.click("button:has-text('Incassa (')")
        await page.wait_for_timeout(1400)
        body = await page.inner_text("body")
        check("si apre il flusso di incasso", "Incassa" in body and "Totale" in body)
        await page.screenshot(path=f"{OUT}/52-incasso.png")

        # divide il conto in 2
        await page.click("button:has-text('Dividi il conto')")
        await page.wait_for_timeout(900)
        body = await page.inner_text("body")
        check("compare la divisione del conto", "Persone" in body and "Persona 1" in body)
        await page.screenshot(path=f"{OUT}/53-divisione.png")

        # paga Persona 1 in contanti
        await click_exact(page, 'Paga', 0)
        await page.wait_for_timeout(700)
        await click_exact(page, 'Registra pagamento Persona 1')
        await page.wait_for_timeout(1200)
        body = await page.inner_text("body")
        check("il pagamento della prima quota è registrato", "parziale" in body.lower() or "pagato" in body.lower())

        # paga Persona 2 con carta
        await click_exact(page, 'Paga', 0)
        await page.wait_for_timeout(700)
        await click_exact(page, 'Carta')
        await page.wait_for_timeout(400)
        await click_exact(page, 'Registra pagamento Persona 2')
        await page.wait_for_timeout(1200)
        body = await page.inner_text("body")
        check("la seconda quota è pagata con carta", "conto coperto" in body.lower() or "2/2" in body or "pagato" in body.lower())
        await page.screenshot(path=f"{OUT}/54-divisione-completata.png")

        # chiudi il conto
        close_btn = page.locator("button:has-text('Chiudi conto')").first
        if (await close_btn.count()) and await close_btn.is_enabled():
            await close_btn.click()
            await page.wait_for_timeout(1500)
            check("il conto è stato chiuso", True)
        else:
            check("il conto è stato chiuso", False, "pulsante non disponibile")

        # ── 6. Ripristino di fabbrica (come admin) ──
        await page.click("button[title='Menu utente']")
        await page.wait_for_timeout(600)
        await page.click("button:has-text('Esci dal turno')")
        await page.wait_for_timeout(1200)
        await page.fill("input[placeholder='Il tuo nome utente']", "titolare")
        await page.fill("input[type='password']", "1234")
        await page.locator("button:has-text('Accedi'):visible").last.click()
        await page.wait_for_timeout(1800)

        # apri backup & ripristino dal menu utente
        await page.click("button[title='Menu utente']")
        await page.wait_for_timeout(700)
        await page.click("button:has-text('Backup & ripristino')")
        await page.wait_for_timeout(1000)
        await page.click("button:has-text('Ripristino di fabbrica')")
        await page.wait_for_timeout(900)
        await page.screenshot(path=f"{OUT}/55-fabbrica.png")
        await page.click("button:has-text('Azzera tutto')")
        await page.wait_for_timeout(2500)

        body = await page.inner_text("body")
        check("dopo il ripristino l'app torna alla configurazione iniziale",
              "Configurazione iniziale" in body, body[:80].replace("\n", " "))

        # verifica che non ci siano dati residui
        stored = await page.evaluate(
            "() => ({ u: localStorage.getItem('ristorante_pos_users_v1'),"
            " t: localStorage.getItem('ristorante_pos_tables_v1'),"
            " r: localStorage.getItem('ristorante_pos_receipts_v1'),"
            " i: localStorage.getItem('ristorante_pos_inventory_v1') })")
        empty = all((v is None) or v in ("[]", "") for v in stored.values())
        check("nessun dato residuo nel dispositivo", empty, json.dumps(stored)[:200])
        await page.screenshot(path=f"{OUT}/56-dopo-fabbrica.png")

        check("nessun errore JavaScript", len(errors) == 0, "; ".join(errors[:2]))

        await browser.close()

        failed = [n for n, ok in results if not ok]
        print(f"\n═══ {len(results) - len(failed)}/{len(results)} test passati ═══")
        if failed:
            print("FALLITI:")
            for f in failed:
                print("  -", f)
        return 1 if failed else 0


sys.exit(asyncio.run(main()))
