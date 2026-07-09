from django.shortcuts import redirect
from django.urls import reverse

from .licensing import check_license, days_remaining

EXEMPT_PREFIXES = ("/license", "/static", "/media")


class LicenseMiddleware:
    """Blocks the whole app (except the license activation page and static
    files) until a valid, unexpired, correctly-activated license is present."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(EXEMPT_PREFIXES):
            return self.get_response(request)

        valid, error, payload = check_license()
        if not valid:
            return redirect(reverse("pos:license_page"))

        # expose remaining days so base.html can show a renewal reminder banner
        request.license_days_left = days_remaining(payload)
        return self.get_response(request)
