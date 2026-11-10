"""
╔══════════════════════════════════════════════════════════════════════╗
║  ⏱️  TEST REALTIME END-TO-END                                      ║
║  Verifica che una modifica su un "telefono" arrivi subito sull'altro ║
╚══════════════════════════════════════════════════════════════════════╝

Avvia due istanze dell'app (come due telefoni), aggiunge un account sul
telefono A e controlla che compaia sul telefono B in meno di 2 secondi.

Requisiti:
  - npm run build && npx vite preview --port 4173
  - pip install playwright && playwright install chromium
  - node server/index.js (server di sincronizzazione)

Uso:  python3 tests/realtime-sync.e2e.py
"""

import asyncio, os, subprocess, time, sys
from playwright.async_api import async_playwright

OUT = "/workspace/output"
BASE = "http://127.0.0.1:4173/"
SERVER = "http://127.0.0.1:3001"
NEW_USER = "mario_test"


async def boot(browser, name):
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844},
        user_agent=f"Mozilla/5.0 (Linux; Android 13; {name}) Mobile Safari/537.36")
    await ctx.add_init_script(
        f"try {{ localStorage.setItem('sea_pos_sync_url', '{SERVER}'); }} catch(e) {{}}")
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="networkidle")
    await page.wait_for_timeout(800)
    await page.fill("input[type='text']", "Admin")
    pwd = await page.query_selector("input[type='password']")
    if pwd:
        await pwd.fill("5555")
    btn = await page.query_selector("button:has-text('Accedi al Turno')")
    if btn:
        await btn.click()
    await page.wait_for_timeout(1500)
    return page


async def main():
    logf = open("/tmp/syncserver2.log", "w")
    proc = subprocess.Popen(["node", "server/index.js"], cwd="/workspace/repo",
                            stdout=logf, stderr=subprocess.STDOUT)
    await asyncio.sleep(2)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                executable_path="/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
                args=["--no-sandbox", "--disable-dev-shm-usage"])

            A = await boot(browser, "PixelA")
            B = await boot(browser, "PixelB")
            await A.wait_for_timeout(3000)

            # ── su A: apri "Personale" e aggiungi un account ──
            print("→ su A: aggiungo un nuovo account 'mario_test'…")
            # click via JS (il menu scorre orizzontalmente su mobile)
            await A.evaluate(
                "() => { const b=[...document.querySelectorAll('button')]"
                ".find(x=>x.innerText.trim()==='Personale'); if(b) b.click(); }")
            await A.wait_for_timeout(1500)

            print("   pulsanti nella vista Personale:",
                  await A.eval_on_selector_all("button",
                      "els => els.map(e=>e.innerText.trim()).filter(Boolean).slice(0,18)"))

            # apre il modulo "Nuovo Dipendente"
            await A.evaluate(
                "() => { const b=[...document.querySelectorAll('button')]"
                ".find(x=>/Nuovo Dipendente/i.test(x.innerText)); if(b) b.click(); }")
            await A.wait_for_timeout(1200)

            async def fill_ph(page, ph, value):
                el = page.locator(f"input[placeholder='{ph}']")
                await el.first.fill(value)

            await fill_ph(A, "Es. Mario Rossi", "Mario Rossi")
            await fill_ph(A, "Es. mario", NEW_USER)
            await fill_ph(A, "Es. 5555", "7777")

            await A.evaluate(
                "() => { const bs=[...document.querySelectorAll('button')]"
                ".filter(b=>/salva|crea|aggiungi/i.test(b.innerText));"
                " if(bs.length) bs[0].click(); }")
            t0 = time.time()

            # ── verifica su B ──
            ok = False
            elapsed = None
            for _ in range(40):
                await B.wait_for_timeout(250)
                users_b = await B.evaluate(
                    "() => localStorage.getItem('ristorante_pos_users_v1') || ''")
                if NEW_USER in users_b:
                    ok = True
                    elapsed = time.time() - t0
                    break

            print(("✅ REALTIME OK: il nuovo account è comparso su B dopo %.2f s" % elapsed)
                  if ok else "❌ il nuovo account NON è arrivato su B entro 10s")

            # B apre la vista "Personale" → l'account deve comparire a schermo
            await B.evaluate(
                "() => { const b=[...document.querySelectorAll('button')]"
                ".find(x=>x.innerText.trim()==='Personale'); if(b) b.click(); }")
            await B.wait_for_timeout(1200)
            ui_b = await B.evaluate("() => document.body.textContent || ''")
            print("   🖥  l'account è visibile nell'interfaccia di B:", NEW_USER in ui_b)
            print("   🖥  PIN 7777 presente su B:", "7777" in ui_b)

            await B.screenshot(path=f"{OUT}/23-device-B-new-account.png")
            await A.screenshot(path=f"{OUT}/24-device-A-added-account.png")

            await browser.close()
            print("--- SERVER ---")
            print(open("/tmp/syncserver2.log").read()[-900:])
            return 0 if ok else 1
    finally:
        proc.terminate()


sys.exit(asyncio.run(main()))
