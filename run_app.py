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

BASE_DIR = Path(sys._MEIPASS) if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nawab_pos.settings')
django.setup()

from django.conf import settings
from django.core.management import call_command

bundled_db = BASE_DIR / 'db.sqlite3'
target_db = settings.DATABASES['default']['NAME']
if not target_db.exists() and bundled_db.exists():
    shutil.copy(bundled_db, target_db)
    print(f'First run: copied seed database to {target_db}')

call_command('migrate', interactive=False, run_syncdb=True)


def open_browser():
    time.sleep(1.5)
    webbrowser.open('http://127.0.0.1:8000')


if __name__ == '__main__':
    threading.Thread(target=open_browser, daemon=True).start()
    from nawab_pos.wsgi import application
    print('Nawab POS is running at http://127.0.0.1:8000  (close this window to stop)')
    serve(application, host='127.0.0.1', port=8000)