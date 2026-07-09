# run_app.py

import os
import sys
import shutil
import threading
import time
import webbrowser
from pathlib import Path

import django
from waitress import serve

# ---------------------------------------------------------------------
# Configure application
# ---------------------------------------------------------------------
BASE_DIR = Path(sys._MEIPASS) if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nawab_pos.settings")
django.setup()

from django.conf import settings
from django.core.management import call_command

# ---------------------------------------------------------------------
# Database paths
# ---------------------------------------------------------------------
bundled_db = BASE_DIR / "db.sqlite3"
target_db = Path(settings.DATABASES["default"]["NAME"])

print("=" * 65)
print("                 Nawab POS Starting...")
print("=" * 65)

# ---------------------------------------------------------------------
# First run — copy seed database if none exists yet
# ---------------------------------------------------------------------
if not target_db.exists():
    if bundled_db.exists():
        shutil.copy(bundled_db, target_db)
        print(f"[INFO] Seed database copied to:")
        print(f"       {target_db}")
    else:
        print("[WARNING] Bundled database not found.")

# ---------------------------------------------------------------------
# License status (informational only — actual blocking happens in
# pos.middleware.LicenseMiddleware, which redirects every request to
# the license page when the license is invalid/expired)
# ---------------------------------------------------------------------
from pos.licensing import check_license

license_valid, error, payload = check_license()

print("-" * 65)
if license_valid:
    print("[INFO] License Status      : VALID")
else:
    print(f"[WARNING] License Status   : INVALID / EXPIRED ({error})")
    print("[INFO] The app will only show the License Activation page")
    print("[INFO] until a valid license is entered.")
print("-" * 65)

# ---------------------------------------------------------------------
# Run migrations — always, regardless of license status, so the
# license activation page itself (and its DB-backed session/csrf use)
# works correctly even before a license is active.
# ---------------------------------------------------------------------
print("[INFO] Checking database migrations...")
call_command("migrate", interactive=False, run_syncdb=True)
print("[INFO] Database is up to date.")
print("-" * 65)


def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8000")


if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()

    from nawab_pos.wsgi import application

    print("[INFO] Web Server          : RUNNING")
    print("[INFO] URL                 : http://127.0.0.1:8000")
    print("[INFO] Press Ctrl+C to stop the application.")
    print("=" * 65)

    serve(
        application,
        host="127.0.0.1",
        port=8000,
    )