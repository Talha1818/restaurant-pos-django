# Nawab Restaurant POS — Django

A full point-of-sale system for Nawab Restaurant: menu & order management,
tables, inventory, staff, reports, and a license-locked standalone Windows
`.exe` build.

---

## 1. Development setup (Windows / Mac / Linux)

### 1.1 Install Python
Download from https://python.org (3.10+ recommended)

### 1.2 Install dependencies
```
pip install -r requirements.txt
```

### 1.3 Run migrations
```
python manage.py migrate
```

### 1.4 Load seed data (menu, tables, staff, admin user)
```
python manage.py seed
```

### 1.5 Start the server
```
python manage.py runserver
```

### 1.6 Open in browser
http://127.0.0.1:8000/

> In development (`DEBUG` on / no frozen `.exe`), the license check still
> applies — see **Section 3** if you land on the activation page.

---

## 2. Login & pages

**Default login**
- Username: `admin`
- Password: `xxx`

Create more users any time with `python manage.py createsuperuser`, or via
Django admin at `/admin/`.

| Page | URL |
|---|---|
| POS | `/` |
| Saved Orders | `/orders/` |
| Tables | `/tables/` |
| Admin — Menu items | `/admin-panel/items/` |
| Admin — Categories | `/admin-panel/categories/` |
| Admin — Inventory | `/admin-panel/inventory/` |
| Admin — Staff | `/admin-panel/staff/` |
| Reports | `/reports/` |
| Settings | `/settings/` |
| License activation | `/license/` |
| Django admin | `/admin/` |

**Features**
- Separate page per module: POS, Saved Orders, Tables, Admin, Reports, Settings
- Full POS with menu, order management, recipe-based auto stock deduction
- Order type per order (Walk in / Delivery / Takeaway), editable on saved orders too
- Cashier name printed on every receipt; per-order "extra amount" never leaks onto the printed receipt
- Item & category images (uploaded, shown on the POS cards) with emoji fallback
- SQLite database (no extra setup needed)
- 5 color themes (Classic, Ocean, Forest, Royal, Crimson)
- Table management (auto-synced with pending orders)
- Inventory: add custom ingredients, edit, delete, set stock, low-stock alerts
- Categories & menu items: add, edit, delete, per-item recipe editor
- Staff: add, edit, delete, per-staff Admin flag
- Reports: Today / Week / Month / Custom range — sales trend, top dishes, payment split, recent orders
- Settings: restaurant info, tax rate, table count, toggles
- Saved orders: full receipt view, edit, mark done, delete, export to Excel/CSV

---

## 3. Licensing & activation

The app is locked behind a license key so it only runs for a paying,
activated customer — this applies both in development and in the packaged
`.exe`.

**How it works**
- Every request is checked by `pos/middleware.py` (`LicenseMiddleware`). If
  there's no valid license, every page redirects to `/license/` — nothing
  else in the app is reachable (static files are still served so the
  activation page itself renders correctly).
- A license key is a signed, base64 string (`payload.signature`) containing
  the client name, an `id`, an `issued` date, and an `expires` date (UTC).
  It's signed with RSA-2048 (PSS/SHA-256); only the **public** key
  (`pos/public_key.pem`) ships with the app, so a key can only be created by
  whoever holds the private key (you, the developer) — customers can never
  forge or extend one themselves.
- The first time a valid key is entered on `/license/`, the app "locks" to
  that machine (`activation.lock` stores a hash of the machine's hostname +
  network ID). If the same `license.key` file is copied to a different PC,
  it's rejected with *"activated on a different computer"* — one license =
  one machine.
- `check_license()` (`pos/licensing.py`) also rejects the key once
  `expires` has passed, so a license simply stops working after its date
  without needing any phone-home/internet check.

**Where the license files live**
| File | Purpose | Location |
|---|---|---|
| `pos/public_key.pem` | Public key, ships with the app, verifies keys | inside the app/exe |
| `license.key` | The customer's activated key | `%LOCALAPPDATA%\NawabPOS\license.key` (packaged `.exe`) or project root (dev) |
| `activation.lock` | Hash locking the key to one machine | same folder as `license.key` |

**Issuing a new license (developer-only)**
This repo intentionally does **not** include the private key or a
`generate_license.py` script — keep those on your own machine only, never
inside a build you hand to a client. To issue a key you sign a JSON payload
like:
```json
{"client": "nawab", "id": "nawab-2026", "issued": "2026-07-07T16:55:45", "expires": "2026-07-22T16:55:45", "alg": "RSA2048"}
```
with your private key, base64-encode the payload and signature, and join
them with a `.` — that string is the `license.key` you send the customer to
paste into the `/license/` activation page.

**If a customer needs to move to a new PC**
Delete `activation.lock` next to their `license.key` (or generate them a new
key) — the next activation will re-lock to the new machine.

---

## 4. Build a standalone Windows `.exe`

This packages the whole app (Django + database + static files + license
check) into a single `NawabPOS.exe` that anyone can double-click to run —
no Python install needed on the target machine.

### 4.1 Install the extra build tools
```
pip install -r requirements.txt
```
This includes `waitress` (production server), `whitenoise` (serves static
files without a separate web server), `pyinstaller` (packages everything
into one `.exe`), `Pillow` (image handling) and `cryptography` (license
signature verification).

### 4.2 Collect static files
```
python manage.py collectstatic --noinput
```
This copies all CSS/JS/images into a single `staticfiles` folder, which
WhiteNoise serves from inside the `.exe`.

> **Re-run this every time you change anything under `static/`** — the
> `.exe` only ever picks up whatever is in `staticfiles` at build time, not
> your live source files. Skipping this step is the most common reason a
> CSS/JS fix "doesn't show up" after rebuilding.

### 4.3 Build the `.exe`
```
python -m PyInstaller --onefile --name NawabPOS --add-data "templates;templates" --add-data "staticfiles;staticfiles" --add-data "pos/public_key.pem;pos" --hidden-import whitenoise --hidden-import whitenoise.middleware --hidden-import PIL --hidden-import PIL.Image --hidden-import PIL.JpegImagePlugin --hidden-import PIL.PngImagePlugin --hidden-import PIL.WebPImagePlugin --hidden-import PIL.BmpImagePlugin --hidden-import PIL.GifImagePlugin --hidden-import cryptography --hidden-import cryptography.hazmat --hidden-import cryptography.hazmat.primitives --hidden-import cryptography.hazmat.primitives.asymmetric --hidden-import cryptography.hazmat.primitives.asymmetric.rsa --hidden-import cryptography.hazmat.primitives.asymmetric.padding --hidden-import cryptography.hazmat.primitives.hashes --hidden-import cryptography.hazmat.primitives.serialization --hidden-import cryptography.hazmat.backends --hidden-import cryptography.hazmat.backends.openssl --hidden-import cryptography.hazmat.backends.openssl.backend --hidden-import django.contrib.admin --hidden-import django.contrib.auth --hidden-import django.contrib.contenttypes --hidden-import django.contrib.sessions --hidden-import django.contrib.messages --hidden-import django.contrib.staticfiles --hidden-import waitress --hidden-import whitenoise.responders --hidden-import whitenoise.storage run_app.py
```

- `--onefile` bundles everything into one executable.
- `--add-data` embeds the templates, static files, a starter database, and
  the license public key inside the `.exe`.
- `--hidden-import` flags make sure PyInstaller includes packages it can't
  always auto-detect (WhiteNoise, Pillow, cryptography, Django contrib apps).
- `run_app.py` is the entry point — on launch it copies the seed database on
  first run, checks the license, runs any pending migrations, starts the
  Waitress server, and opens the default browser to `http://127.0.0.1:8000`.

### 4.4 (Optional) Clean up build artifacts
PyInstaller leaves behind a `build/` folder and `.spec` file once done —
safe to delete:
```
Remove-Item -Recurse -Force build, dist
```
*(Note: this also deletes `dist`, which contains your finished `.exe` — only
run this **before** a fresh rebuild, not after, or re-run step 4.3 to
regenerate it.)*

### 4.5 Run it
The finished executable is in the `dist` folder:
```
dist\NawabPOS.exe
```
Double-clicking it will:
1. Copy the seed database to `%LOCALAPPDATA%\NawabPOS\` on first run only
2. Check the license (shows the activation page if missing/expired/wrong machine)
3. Run any pending database migrations automatically
4. Start the app on `http://127.0.0.1:8000`
5. Open that address in the default browser
6. Keep running in the console window until closed

**Sharing the app:** copy `dist\NawabPOS.exe` to the customer's PC — it runs
standalone, no Python or Django installation required there. Send them their
`license.key` separately (see Section 3) to paste into the activation page
on first launch.

**Re-building after making changes:** repeat steps 4.2–4.3 (collectstatic,
then PyInstaller) any time you edit templates, static files, or Python code,
so the `.exe` picks up the latest version.
