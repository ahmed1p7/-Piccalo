"""
☁️ Test end-to-end della CLOUDSYNC (Realtime Database) con l'emulatore:
due istanze dell'app → un nuovo account su A deve comparire subito su B.

Prerequisiti:
  1) npm run build con le variabili dell'emulatore (vedi run-e2e.sh)
  2) npx firebase emulators:start --only database --project demo-sea-pos
  3) npx vite preview --port 4173
"""
import asyncio, os, sys, time
from playwright.async_api import async_playwright

OUT = "/workspace/output"
BASE = "http://127.0.0.1:4173/"
NEW_USER = "cloud_test_user"


async def boot(browser, name):
    ctx = await browser.new_context(
        viewport={"width": 390, "height": 844},
        user_agent=f"Mozilla/5.0 (Linux; Android 13; {name}) Mobile Safari/537.36")
    page = await ctx.new_page()
    page.on("pageerror", lambda e: print(f"[{name}] PAGEERROR:", e))
    page.on("console", lambda m: print(f"[{name}] {m.type}: {m.text[:220]}") if m.type in ("error", "warning") else None)
    await page.goto(BASE, wait_until="networkidle")
    await page.wait_for_timeout(1000)
    await page.fill("input[type='text']", "Admin")
    pwd = await page.query_selector("input[type='password']")
    if pwd:
        await pwd.fill("5555")
    btn = await page.query_selector("button:has-text('Accedi al Turno')")
    if btn:
        await btn.click()
    await page.wait_for_timeout(2500)
    return page


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"])

        print("→ avvio due dispositivi…")
        A = await boot(browser, "PixelA")
        B = await boot(browser, "PixelB")
        await A.wait_for_timeout(3000)

        # controlla che la connessione cloud sia attiva
        body_a = await A.inner_text("body")
        print("   A connesso al cloud:", "Sync ON" in body_a)

        # ── Aggiunge un account su A ──
        print(f"→ su A aggiungo l'account '{NEW_USER}'…")
        await A.evaluate(
            "() => { const b=[...document.querySelectorAll('button')]"
            ".find(x=>x.innerText.trim()==='Personale'); if(b) b.click(); }")
        await A.wait_for_timeout(1200)
        await A.evaluate(
            "() => { const b=[...document.querySelectorAll('button')]"
            ".find(x=>/Nuovo Dipendente/i.test(x.innerText)); if(b) b.click(); }")
        await A.wait_for_timeout(1000)
        for ph, val in [("Es. Mario Rossi", "Mario Rossi"),
                        ("Es. mario", NEW_USER),
                        ("Es. 5555", "7777")]:
            await A.locator(f"input[placeholder='{ph}']").first.fill(val)
        await A.evaluate(
            "() => { const bs=[...document.querySelectorAll('button')]"
            ".filter(b=>/salva|crea|aggiungi/i.test(b.innerText));"
            " if(bs.length) bs[0].click(); }")
        t0 = time.time()

        # ── Verifica su B ──
        ok = False
        elapsed = 0
        for _ in range(60):
            await B.wait_for_timeout(250)
            users_b = await B.evaluate(
                "() => localStorage.getItem('ristorante_pos_users_v1') || ''")
            if NEW_USER in users_b:
                ok = True
                elapsed = time.time() - t0
                break

        print(("✅ CLOUDSYNC OK: il nuovo account è arrivato su B dopo %.2f s" % elapsed)
              if ok else "❌ il nuovo account NON è arrivato su B entro 15s")

        if ok:
            await B.evaluate(
                "() => { const b=[...document.querySelectorAll('button')]"
                ".find(x=>x.innerText.trim()==='Personale'); if(b) b.click(); }")
            await B.wait_for_timeout(1000)
            ui_b = await B.evaluate("() => document.body.textContent || ''")
            print("   🖥  visibile nell'interfaccia di B:", NEW_USER in ui_b)
            await B.screenshot(path=f"{OUT}/30-cloud-B-received.png")

        await browser.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
