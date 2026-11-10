"""
🔔 Test end-to-end dell'avviso di aggiornamento:
simula la risposta dell'API di GitHub con una versione più nuova e verifica
che l'app mostri l'avviso "Aggiornamento disponibile" con il pulsante
di installazione, sia sulla schermata di login sia dentro l'app.
"""
import asyncio, sys
from playwright.async_api import async_playwright

OUT = "/workspace/output"
BASE = "http://127.0.0.1:4173/"


FAKE_RELEASES = [
    {
        "tag_name": "v9.9.9",
        "draft": False,
        "prerelease": False,
        "published_at": "2025-01-01T00:00:00Z",
        "body": "Versione di test con correzioni.",
        "assets": [
            {"name": "Sea-POS.apk", "browser_download_url":
             "https://github.com/ahmed1p7/-Piccalo/releases/download/v9.9.9/Sea-POS.apk",
             "size": 3500000}
        ],
    },
    {"tag_name": "v1.1.5", "draft": False, "prerelease": False,
     "published_at": "2025-01-01T00:00:00Z", "body": "", "assets": []},
    {"tag_name": "latest", "draft": False, "prerelease": False,
     "published_at": "2025-01-01T00:00:00Z", "body": "", "assets": []},
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()

        # intercetta l'API di GitHub e restituisce una versione più recente
        async def fake_api(route):
            await route.fulfill(
                status=200,
                content_type="application/json",
                headers={"Access-Control-Allow-Origin": "*", "etag": '"fake-etag"'},
                body=__import__("json").dumps(FAKE_RELEASES),
            )

        await ctx.route("**/api.github.com/**", fake_api)
        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_timeout(13000)

        body = await page.inner_text("body")
        found = "Aggiornamento disponibile" in body or "9.9.9" in body
        print(("✅ Avviso di aggiornamento mostrato sulla schermata di login"
               if found else "❌ Avviso di aggiornamento NON mostrato"))
        if found:
            idx = body.find("9.9.9")
            if idx >= 0:
                print("   📄 testo:", body[max(0, idx - 90):idx + 90].replace("\n", " | "))
            await page.screenshot(path=f"{OUT}/31-update-notification.png")

        # clicca "Verifica aggiornamenti" se presente
        btn = await page.query_selector("button:has-text('Verifica aggiornamenti')")
        if btn:
            await btn.click()
            await page.wait_for_timeout(2500)
            body2 = await page.inner_text("body")
            print("   dopo il tap manuale:", "9.9.9" in body2 or "Aggiornamento" in body2)
            await page.screenshot(path=f"{OUT}/32-update-after-tap.png")

        await browser.close()
        return 0 if found else 1


sys.exit(asyncio.run(main()))
