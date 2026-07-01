"""Date display helpers for itinerary forms and PDF output."""

from __future__ import annotations

import re
from datetime import date

ISO_DATE_RX = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")


def iso_to_local_date(raw: str) -> date | None:
    iso = raw.strip()
    m = ISO_DATE_RX.match(iso)
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if mo < 1 or mo > 12 or d < 1 or d > 31:
        return None
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def format_date_disp(raw: str) -> str:
    if not raw or not raw.strip():
        return ""
    dt = iso_to_local_date(raw)
    if dt is None:
        return raw
    # Cross-platform: avoid %-d (not supported on Windows).
    day = dt.day
    return f"{day} {dt.strftime('%b %Y')}"
