# Nawab Restaurant POS — Django

## Setup (Windows / Mac / Linux)

### 1. Install Python
Download from https://python.org (3.10+ recommended)

### 2. Install Django
pip install django

### 3. Run migrations
cd nawab_pos
python manage.py migrate

### 4. Load seed data (menu, tables, staff, admin user)
python manage.py seed

### 5. Start the server
python manage.py runserver

### 6. Open in browser
http://127.0.0.1:8000/

## Login
- Username: `admin`
- Password: `nawab1234`

## Features
- Separate page per module: POS, Saved Orders, Tables, Admin (Menu items / Categories / Inventory / Staff), Reports, Settings
- Full POS with menu, order management, recipe-based auto stock deduction
- SQLite database (no extra setup needed)
- Login/logout
- 5 color themes (Classic, Ocean, Forest, Royal, Crimson)
- Table management (auto-synced with pending orders)
- Inventory: add custom ingredients, edit, delete, add/set stock, low-stock alerts
- Categories: add, edit, delete
- Menu items: add, edit, delete, and per-item recipe editor (which raw ingredients + how much each item consumes)
- Staff: add, edit, delete, and an **Admin** flag per staff member (marks who has admin panel access)
- Reports: Today / Week / Month / Custom date range — sales trend chart, top dishes, payment method split, recent orders
- Settings: restaurant info, tax rate, number of tables, toggles
- Saved orders with full receipt view, mark done, delete

## Pages
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
| Django admin | `/admin/` |

## Create more users
python manage.py createsuperuser
Or via Django admin: http://127.0.0.1:8000/admin/

## Build a standalone Windows .exe

This packages the whole app (Django + database + static files) into a single `NawabPOS.exe` that anyone can double-click to run — no Python install needed on the target machine.

### 1. Install the extra build tools
pip install -r requirements.txt
This includes `waitress` (production server), `whitenoise` (serves static files without a separate web server), and `pyinstaller` (packages everything into one .exe).

### 2. Collect static files
python manage.py collectstatic --noinput
This copies all CSS/JS/images into a single `staticfiles` folder, which WhiteNoise serves from inside the .exe.

### 3. Build the .exe
python -m PyInstaller --onefile --name NawabPOS --add-data "templates;templates" --add-data "staticfiles;staticfiles" --add-data "db.sqlite3;." --hidden-import whitenoise --hidden-import whitenoise.middleware run_app.py
- `--onefile` bundles everything into one executable
- `--add-data` embeds the templates, static files, and a starter database inside the .exe
- `--hidden-import` flags make sure PyInstaller includes WhiteNoise (it isn't always auto-detected)
- `run_app.py` is the entry point — it runs migrations automatically on first launch, starts the Waitress server, and opens your browser to `http://127.0.0.1:8000`

### 4. (Optional) Clean up build artifacts
PyInstaller leaves behind a `build/` folder and `.spec` file once done — safe to delete:
Remove-Item -Recurse -Force build, dist
*(Note: this also deletes `dist`, which contains your finished .exe — only run this **before** a fresh rebuild, not after, or re-run step 3 to regenerate it.)*

### 5. Run it
The finished executable is in the `dist` folder:
dist\NawabPOS.exe
Double-clicking it will:
1. Run any pending database migrations automatically
2. Start the app on `http://127.0.0.1:8000`
3. Open that address in your default browser
4. Keep running in the console window until you close it

**Sharing the app:** just copy `dist\NawabPOS.exe` to another Windows PC — it runs standalone, no Python or Django installation required there.

**Re-building after making changes:** repeat steps 2–3 (collectstatic, then PyInstaller) any time you edit templates, static files, or Python code, so the .exe picks up the latest version.