"""Screenshot del pannello d'errore di sincronizzazione (regole RTDB chiuse)."""
import os
from playwright.sync_api import sync_playwright

OUT = "/workspace/output/shots"
os.makedirs(OUT, exist_ok=True)
CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page = ctx.new_page()
    # build di produzione: punta al RTDB reale (regole chiuse -> Permission denied)
    page.goto("http://127.0.0.1:4173/", wait_until="networkidle")
    page.wait_for_timeout(6000)
    txt = page.inner_text("body")
    print("schermata:", txt.strip()[:220].replace("\n", " | "))
    page.screenshot(path=f"{OUT}/72-errore-sync.png")
    browser.close()
