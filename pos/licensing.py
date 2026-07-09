"""
pos/licensing.py — License verification using RSA public key.
Only the public key is embedded here — no private key ever touches client machines.

All expiry comparisons happen in UTC — this matches generate_license.py,
which always stores 'expires' as UTC internally (even though you enter
Pakistan time there). This makes verification correct regardless of what
local timezone this computer is set to; only the system clock's actual
accuracy matters, not its timezone setting.

No database/media locking — the LicenseMiddleware (pos/middleware.py) is
what actually blocks app usage by redirecting every request to the
license page whenever check_license() fails. That's the only enforcement
point; this module just answers "is it valid right now?".
"""
import base64
import hashlib
import json
import platform
import uuid
from datetime import datetime
from pathlib import Path

from django.conf import settings

# ── Public key path (bundled with the app) ──────────────────────────
PUBLIC_KEY_PATH = Path(__file__).resolve().parent / "public_key.pem"

LICENSE_FILE = settings.DATA_DIR / "license.key"
LOCK_FILE = settings.DATA_DIR / "activation.lock"


def _load_public_key():
    from cryptography.hazmat.primitives import serialization
    with open(PUBLIC_KEY_PATH, "rb") as f:
        return serialization.load_pem_public_key(f.read())


def get_machine_id():
    raw = f"{platform.node()}-{uuid.getnode()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _verify_signature(license_str):
    """Verify RSA-PSS signature. Falls back to legacy HMAC check for old keys."""
    try:
        payload_b64, sig_b64 = license_str.strip().split(".")
    except ValueError:
        return None, "Malformed license key"

    try:
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
    except Exception:
        return None, "Malformed license key"

    alg = payload.get("alg", "HMAC")  # legacy keys have no alg field

    if alg == "RSA2048":
        try:
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.exceptions import InvalidSignature

            public_key = _load_public_key()
            signature = base64.urlsafe_b64decode(sig_b64.encode())
            public_key.verify(
                signature,
                payload_b64.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )
            return payload, None
        except InvalidSignature:
            return None, "Invalid license signature"
        except Exception as e:
            return None, f"Verification error: {e}"
    else:
        import hmac as hmac_mod
        SECRET_KEY = b"CHANGE-THIS-TO-YOUR-OWN-LONG-RANDOM-SECRET-STRING-2026"
        expected = hmac_mod.new(SECRET_KEY, payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac_mod.compare_digest(sig_b64, expected):
            return None, "Invalid license signature"
        return payload, None


def _parse_expiry_utc(payload):
    """'expires' is always a naive UTC timestamp written by
    generate_license.py (e.g. '2026-07-08T21:50:00') — never a local time."""
    raw = payload["expires"]
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return datetime.fromisoformat(raw + "T23:59:59")


def check_license():
    if not LICENSE_FILE.exists():
        return False, "No license installed on this computer.", None

    payload, error = _verify_signature(LICENSE_FILE.read_text())
    if error:
        return False, error, None

    try:
        expires_utc = _parse_expiry_utc(payload)
    except Exception:
        return False, "Malformed license key", payload

    if datetime.utcnow() > expires_utc:
        return False, "License expired.", payload

    if LOCK_FILE.exists():
        if LOCK_FILE.read_text().strip() != get_machine_id():
            return False, "This license is activated on a different computer. Contact support.", payload

    return True, None, payload


def save_license(license_str):
    payload, error = _verify_signature(license_str)
    if error:
        return False, error

    try:
        expires_utc = _parse_expiry_utc(payload)
    except Exception:
        return False, "Malformed license key"

    if datetime.utcnow() > expires_utc:
        return False, "This license has already expired."

    current_machine = get_machine_id()
    if LOCK_FILE.exists():
        locked_id = LOCK_FILE.read_text().strip()
        if locked_id != current_machine:
            return False, "This license is already activated on a different computer. Contact support."
    else:
        LOCK_FILE.write_text(current_machine)

    LICENSE_FILE.write_text(license_str.strip())
    return True, payload


def days_remaining(payload):
    if not payload or not payload.get("expires"):
        return None
    try:
        delta = _parse_expiry_utc(payload) - datetime.utcnow()
        total_seconds = delta.total_seconds()
        if total_seconds <= 0:
            return 0
        return int(total_seconds // 86400)
    except Exception:
        return None