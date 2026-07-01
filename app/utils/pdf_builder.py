"""Build PDF page contexts for itinerary Jinja templates."""

from __future__ import annotations

import math

from app.utils.dates import format_date_disp
from app.utils.itinerary_data import passenger_display_line
from app.utils.money import derive_money_totals

PASSENGERS_PER_PAGE = 2
PDF_PAGE_W = 595
PDF_PAGE_H = 842


def chunk_passengers(passengers: list, size: int) -> list[list]:
    pax = passengers if passengers else [{"id": "blank"}]
    chunks = []
    for i in range(0, max(len(pax), 1), size):
        chunks.append(pax[i : i + size])
    if not chunks:
        chunks = [pax[:1]]
    return chunks


def build_itinerary_pdf_pages(form: dict) -> list[dict]:
    form = dict(form)
    money = derive_money_totals(form)
    hide_pricing = bool(form.get("hidePricingOnPdf"))
    pax_chunks = chunk_passengers(form.get("passengers") or [], PASSENGERS_PER_PAGE)
    page_total = 1 + len(pax_chunks) + 1
    pages: list[dict] = []

    pages.append(
        {
            "kind": "booking",
            "page_index": 0,
            "page_total": page_total,
            "form": form,
            "money": money,
            "hide_pricing": hide_pricing,
            "format_date": format_date_disp,
            "passenger_line": passenger_display_line,
        }
    )

    for idx, chunk in enumerate(pax_chunks):
        pages.append(
            {
                "kind": "passengers",
                "page_index": 1 + idx,
                "page_total": page_total,
                "chunk": chunk,
                "chunk_offset": idx * PASSENGERS_PER_PAGE,
                "passenger_count": len(form.get("passengers") or []),
                "form": form,
                "format_date": format_date_disp,
                "passenger_line": passenger_display_line,
            }
        )

    pages.append(
        {
            "kind": "final",
            "page_index": page_total - 1,
            "page_total": page_total,
            "form": form,
            "money": money,
            "hide_pricing": hide_pricing,
            "format_date": format_date_disp,
            "passenger_line": passenger_display_line,
        }
    )
    return pages


def build_accounting_pdf_pages(snapshot: dict) -> list[dict]:
    from datetime import datetime

    from app.utils.accounting_data import accounting_totals

    totals = accounting_totals(snapshot)
    date_line = datetime.now().strftime("%b %d, %Y, %I:%M %p")
    client = (snapshot.get("clientName") or "").strip()
    banner = f"Accounting — {client}" if client else "Accounting summary"

    def non_empty(rows: list) -> list:
        out = []
        for r in rows or []:
            blob = f"{r.get('description','')}\t{r.get('counterparty','')}\t{r.get('amount','')}".strip()
            if blob:
                out.append(r)
        return out

    pay_rows = non_empty(snapshot.get("payables"))
    rec_rows = non_empty(snapshot.get("receivables"))

    # Simple pagination: first page gets header + client + totals + start of ledgers
    PAGE_BODY_H = PDF_PAGE_H - 72
    H = {
        "banner": 42,
        "continuation": 26,
        "client": 128,
        "snapshot": 86,
        "section": 30,
        "row": 22,
    }

    units: list[dict] = [
        {"type": "banner", "title": banner, "date_line": date_line},
        {"type": "client", "snapshot": snapshot},
        {"type": "snapshot", "totals": totals},
    ]
    if pay_rows:
        units.append({"type": "section", "label": "Payables", "tint": "rose"})
        units.extend({"type": "row", "row": r, "ledger": "payable"} for r in pay_rows)
    else:
        units.append({"type": "section", "label": "Payables — no lines", "tint": "rose"})
    if rec_rows:
        units.append({"type": "section", "label": "Receivables", "tint": "emerald"})
        units.extend({"type": "row", "row": r, "ledger": "receivable"} for r in rec_rows)
    else:
        units.append({"type": "section", "label": "Receivables — no lines", "tint": "emerald"})

    pages_out: list[dict] = []
    bucket: list[dict] = []
    used = 0

    def flush():
        nonlocal bucket, used
        if bucket:
            pages_out.append({"units": bucket})
            bucket = []
            used = 0

    for unit in units:
        h = H.get(unit["type"], 20)
        if pages_out and not bucket:
            bucket.append({"type": "continuation"})
            used += H["continuation"]
        if used + h > PAGE_BODY_H and bucket:
            flush()
            bucket.append({"type": "continuation"})
            used = H["continuation"]
        bucket.append(unit)
        used += h
    flush()

    return pages_out or [{"units": [{"type": "banner", "title": banner, "date_line": date_line}]}]
