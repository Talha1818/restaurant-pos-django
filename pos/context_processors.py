from pos.licensing import check_license, days_remaining

def license_context(request):
    try:
        valid, error, payload = check_license()
        days = days_remaining(payload)
        return {
            'license_valid': valid,
            'license_days_left': days,
        }
    except Exception:
        return {'license_valid': False, 'license_days_left': None}