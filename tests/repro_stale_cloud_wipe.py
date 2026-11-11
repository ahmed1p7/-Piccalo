"""
🧪 RIPRODUZIONE 2: il cloud "stale" cancella gli account locali.

Simula il caso reale:
  - cloud = [vecchio account predefinito Admin/5555]  (stato "seeded" di un
    dispositivo vecchio, come nella produzione reale)
  - dispositivo A (amministratore) = [admin_reale, mario] con base VUOTA
    (non ha mai sincronizzato: la base non contiene gli utenti)

Atteso se il merge applica "delete wins" senza controllare l'età del remoto:
  → sul dispositivo A gli account reali spariscono e resta solo Admin/5555
  → l'impiegato "mario" non può più entrare ("account non esistente")
"""
import json
import urllib.request

from playwright.sync_api import sync_playwright

HOST = "http://127.0.0.1:9000"
NS = "?ns=demo-sea-pos-default-rtdb"
BASE = "http://127.0.0.1:4176/"
CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome"

OLD_ADMIN = {
    "id": "user_admin", "username": "Admin", "displayName": "Admin (Proprietario)",
    "pin": "5555", "role": "admin", "avatarColor": "bg-cyan-600",
    "permissions": {"canAccessCassa": True, "canAccessMagazzino": True, "canAccessBar": True,
                    "canAccessCucina": True, "canAccessTavoli": True, "canManageBackup": True,
                    "canManageUsers": True, "canViewReports": True},
}

REAL_ADMIN = dict(OLD_ADMIN, id="user_1757000000000", username="titolare",
                   displayName="Titolare (Malih)", pin="1234")
MARIO = {
    "id": "user_1757000000001", "username": "mario", "displayName": "Mario Rossi",
    "pin": "1111", "role": "cameriere", "avatarColor": "bg-emerald-600",
    "permissions": {"canAccessCassa": True, "canAccessMagazzino": False, "canAccessBar": False,
                    "canAccessCucina": False, "canAccessTavoli": True, "canManageBackup": False,
                    "canManageUsers": False, "canViewReports": False},
}

INIT_SCRIPT = """
(() => {
  const real = %s;
  const mario = %s;
  localStorage.setItem('ristorante_pos_users_v1', JSON.stringify([real, mario]));
  localStorage.setItem('ristorante_pos_inventory_v1', '[]');
  localStorage.setItem('ristorante_pos_tables_v1', '[]');
  localStorage.setItem('ristorante_pos_receipts_v1', '[]');
  localStorage.setItem('ristorante_pos_profile_v1', JSON.stringify({name:'Sea'}));
  // base VUOTA: il dispositivo non ha mai sincronizzato (base degli utenti assente)
  localStorage.setItem('sea_pos_sync_base_v1', JSON.stringify({
    updatedAt: Date.now(),
    collections: { inventory: [], tables: [], receipts: [], profile: {name:'Sea'} }
  }));
  localStorage.setItem('sea_pos_sync_dirty_v1', '[]');
})()
""" % (json.dumps(REAL_ADMIN), json.dumps(MARIO))


def put(path, data):
    req = urllib.request.Request(f"{HOST}{path}.json{NS}",
                                 data=json.dumps(data).encode(), method="PUT")
    urllib.request.urlopen(req, timeout=10)


def get(path):
    with urllib.request.urlopen(f"{HOST}{path}.json{NS}", timeout=10) as r:
        return json.loads(r.read().decode())


def main():
    # cloud = stato "seeded" vecchio (come la produzione reale)
    put("/sea_pos/shared_state/collections", {
        "users": {"data": [OLD_ADMIN], "updatedAt": 1794397475314, "deviceId": "vecchio"},
        "profile": {"data": {"name": "Sea"}, "updatedAt": 1794397475314, "deviceId": "vecchio"},
    })
    print("🧹 cloud = [Admin/5555 vecchio]  |  dispositivo A = [titolare, mario]\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.add_init_script(INIT_SCRIPT)
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(9000)

        local = page.evaluate(
            "() => JSON.parse(localStorage.getItem('ristorante_pos_users_v1') || '[]')")
        print("=== UTENTI DOPO LA SINCRONIZZAZIONE sul dispositivo A ===")
        print(json.dumps([{k: u.get(k) for k in ("id", "username", "pin", "role")} for u in local],
                         indent=2, ensure_ascii=False))

        cloud = get("/sea_pos/shared_state/collections/users")
        print("\n=== UTENTI NEL CLOUD ===")
        print(json.dumps([{k: u.get(k) for k in ("id", "username", "pin")} for u in cloud["data"]],
                         indent=2, ensure_ascii=False))

        usernames = [u.get("username") for u in local]
        print("\n>>> mario c'è ancora sul dispositivo A?", "mario" in usernames)
        print(">>> titolare c'è ancora sul dispositivo A?", "titolare" in usernames)
        browser.close()


main()
