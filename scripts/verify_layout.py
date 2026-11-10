"""Verifica layout: desktop (sidebar) + mobile (safe area come nel plugin Capacitor)."""
import json
import os
from playwright.sync_api import sync_playwright

OUT = "/workspace/output/shots"
os.makedirs(OUT, exist_ok=True)
CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"
URL = "http://127.0.0.1:4173/"

SAFE_AREA_SCRIPT = """
document.documentElement.style.setProperty('--safe-area-inset-bottom', '48px');
document.documentElement.style.setProperty('--safe-area-inset-top', '28px');
"""


def setup_app(page):
    page.goto(URL, wait_until="networkidle")
    try:
        skip = page.get_by_text("Continua senza sincronizzazione")
        skip.wait_for(timeout=9000)
        skip.click()
    except Exception:
        pass
    page.wait_for_timeout(1200)

    inputs = page.locator("input")
    n = inputs.count()
    if n >= 4:  # nome ristorante, utente, password, ripeti password
        inputs.nth(0).fill("Ristorante Malih")
        inputs.nth(1).fill("titolare")
        inputs.nth(2).fill("Malih2026")
        inputs.nth(3).fill("Malih2026")
        page.get_by_role("button", name="Crea il mio account").click()
        page.wait_for_timeout(3000)
    elif n >= 2:  # solo login
        inputs.nth(0).fill("titolare")
        inputs.nth(1).fill("Malih2026")
        page.locator("button").last.click()
        page.wait_for_timeout(2500)

    # se compare il login, entra
    for label in ("Entra", "Accedi", "Accedere"):
        btn = page.get_by_role("button", name=label).first
        if btn.count():
            btn.click()
            page.wait_for_timeout(2000)
            break


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])

    # ── DESKTOP ──
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    setup_app(page)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{OUT}/70-desktop-home.png")
    aside = page.locator("aside").count()
    print("sidebar presente:", aside > 0)
    ctx.close()

    # ── MOBILE con safe area ──
    ctx2 = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=2,
    )
    page2 = ctx2.new_page()
    setup_app(page2)
    page2.wait_for_timeout(1000)
    # il plugin Capacitor inietta le variabili a runtime: stesso comportamento
    page2.evaluate(SAFE_AREA_SCRIPT)
    page2.wait_for_timeout(600)
    page2.screenshot(path=f"{OUT}/71-mobile-safearea.png")

    geo = page2.evaluate(
        """() => {
        const navs = Array.from(document.querySelectorAll('nav'));
        const nav = navs.find(n => getComputedStyle(n).position === 'fixed');
        if (!nav) return { error: 'nessuna barra inferiore fissa trovata' };
        const r = nav.getBoundingClientRect();
        const inner = nav.firstElementChild.getBoundingClientRect();
        return {
          navTop: Math.round(r.top),
          navBottom: Math.round(r.bottom),
          innerBottom: Math.round(inner.bottom),
          viewportH: window.innerHeight,
          safeVar: getComputedStyle(document.documentElement).getPropertyValue('--sea-safe-b'),
        };
      }"""
    )
    print("safe-area geo:", json.dumps(geo))
    ctx2.close()
    browser.close()
