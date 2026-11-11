"""
🧪 RIPRODUZIONE: l'admin crea un dipendente ma il dipendente non riesce a entrare.

Simula lo stato reale del ristorante:
  - cloud già popolato (utenti = vecchio account predefinito Admin/5555)
  - dispositivo con localStorage "vecchio" (stessi utenti)
  - l'admin crea un dipendente → deve finire nel cloud

Verifica: utenti nel cloud, utenti in locale, log di sincronizzazione.
"""
import json
import urllib.request

from playwright.sync_api import sync_playwright

HOST = "http://127.0.0.1:9000"
NS = "?ns=demo-sea-pos-default-rtdb"
BASE = "http://127.0.0.1:4176/"
CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"

OLD_ADMIN = {
    "id": "user_admin",
    "username": "Admin",
    "displayName": "Admin (Proprietario)",
    "pin": "5555",
    "role": "admin",
    "avatarColor": "bg-cyan-600",
    "permissions": {
        "canAccessCassa": True,
        "canAccessMagazzino": True,
        "canAccessBar": True,
        "canAccessCucina": True,
        "canAccessTavoli": True,
        "canManageBackup": True,
        "canManageUsers": True,
        "canViewReports": True,
    },
}

INIT_SCRIPT = """
(() => {
  const admin = %s;
  localStorage.setItem('ristorante_pos_users_v1', JSON.stringify([admin]));
  localStorage.setItem('ristorante_pos_inventory_v1', '[]');
  localStorage.setItem('ristorante_pos_tables_v1', '[]');
  localStorage.setItem('ristorante_pos_receipts_v1', '[]');
  localStorage.setItem('ristorante_pos_profile_v1', JSON.stringify({name:'Sea', tableCount:8}));
  localStorage.setItem('sea_pos_sync_base_v1', JSON.stringify({
    updatedAt: Date.now(),
    collections: { users: [admin], inventory: [], tables: [], receipts: [], profile: {name:'Sea'} }
  }));
  localStorage.setItem('sea_pos_sync_dirty_v1', '[]');
})()
""" % json.dumps(OLD_ADMIN)


def put(path, data):
    req = urllib.request.Request(
        f"{HOST}{path}.json{NS}", data=json.dumps(data).encode(), method="PUT")
    urllib.request.urlopen(req, timeout=10)


def get(path):
    with urllib.request.urlopen(f"{HOST}{path}.json{NS}", timeout=10) as r:
        return json.loads(r.read().decode())


def seed_cloud():
    put("/sea_pos/shared_state/collections", {
        "users": {"data": [OLD_ADMIN], "updatedAt": 1794397475314, "deviceId": "vecchio"},
        "tables": {"data": [], "updatedAt": 1794397475314, "deviceId": "vecchio"},
        "inventory": {"data": [], "updatedAt": 1794397475314, "deviceId": "vecchio"},
        "profile": {"data": {"name": "Sea", "tableCount": 8},
                    "updatedAt": 1794397475314, "deviceId": "vecchio"},
    })


def main():
    seed_cloud()
    print("🧹 cloud popolato con lo stato reale (Admin/5555 vecchio)\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        logs = []
        page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))

        page.add_init_script(INIT_SCRIPT)
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(8000)

        body = page.inner_text("body")
        print("schermata iniziale:", body[:100].replace("\n", " | "))

        if "PUNTO CASSA" in body.upper():
            page.fill("input[placeholder='Il tuo nome utente']", "Admin")
            page.fill("input[type='password']", "5555")
            page.click("button:has-text('Accedi')")
            page.wait_for_timeout(2500)
            print("login Admin riuscito:", "Bentornato" in page.inner_text("body"))

        page.locator("button:has-text('Personale'):visible").first.click()
        page.wait_for_timeout(1200)
        page.click("button:has-text('Nuovo dipendente')")
        page.wait_for_timeout(1000)
        page.fill("input[placeholder='Es. Mario Rossi']", "Mario Rossi")
        page.fill("input[placeholder='Es. mario']", "mario")
        page.fill("input[placeholder='Es. 5555']", "1111")
        page.click("button:has-text('Cameriere')")
        page.wait_for_timeout(400)
        page.click("button:has-text('Crea account')")
        page.wait_for_timeout(4000)

        body = page.inner_text("body")
        print("dipendente creato nella UI:", "Mario Rossi" in body and "@mario" in body)

        cloud = get("/sea_pos/shared_state/collections/users")
        print("\n=== CLOUD users ===")
        print(json.dumps(cloud, indent=2, ensure_ascii=False)[:800])

        local = page.evaluate(
            "() => JSON.parse(localStorage.getItem('ristorante_pos_users_v1') || '[]')")
        print("\n=== LOCALE users (dispositivo A) ===")
        print(json.dumps([{k: u.get(k) for k in ("id", "username", "pin", "role")} for u in local],
                         indent=2, ensure_ascii=False))

        base = page.evaluate(
            "() => JSON.parse(localStorage.getItem('sea_pos_sync_base_v1') || '{}')")
        print("\n=== BASE users (ultimo stato sincronizzato) ===")
        print(json.dumps(base.get("collections", {}).get("users"), ensure_ascii=False)[:400])

        print("\n=== log di sincronizzazione ===")
        for line in logs:
            low = line.lower()
            if any(k in low for k in ("sync", "realtime", "seed", "push", "merge", "permission")):
                print("  ", line[:200])

        browser.close()


main()
