"""Philippine-peso amount parsing and itinerary fare totals."""

from __future__ import annotations

import re
from typing import TypedDict


def parse_money_php(value: str | None) -> float:
    if value is None:
        return 0.0
    s = str(value)
    s = re.sub(r"PHP", "", s, flags=re.IGNORECASE)
    s = s.replace(",", "").replace(" ", "")
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    s = s.strip()
    neg = s.startswith("-")
    s = re.sub(r"[^\d.\-]", "", s)
    try:
        n = float(s)
    except ValueError:
        return 0.0
    if not (n == n):  # NaN
        return 0.0
    return -abs(n) if neg else n


def format_money_php(amount: float) -> str:
    try:
        a = float(amount)
    except (TypeError, ValueError):
        a = 0.0
    if a != a:
        a = 0.0
    return f"{a:,.2f}"


class MoneyTotals(TypedDict):
    adult_base_fare_fmt: str
    adult_other_charges_fmt: str
    adult_total_fare_fmt: str
    room_rate_fmt: str
    room_taxes_fmt: str
    total_room_rate_fmt: str
    supplements_sum_fmt: str
    original_total_fmt: str
    savings_fmt: str
    total_due_fmt: str


def derive_money_totals(data: dict) -> MoneyTotals:
    base = parse_money_php(data.get("adultBaseFare", ""))
    other = parse_money_php(data.get("adultOtherCharges", ""))
    adult_total = base + other

    room = parse_money_php(data.get("roomRate", ""))
    tax = parse_money_php(data.get("roomTaxes", ""))
    room_total = room + tax

    sup = 0.0
    for row in data.get("supplements") or []:
        sup += parse_money_php(row.get("amount", ""))

    original = adult_total + room_total + sup
    savings_raw = abs(parse_money_php(data.get("savings", "")))
    due = max(0.0, original - savings_raw)

    return MoneyTotals(
        adult_base_fare_fmt=format_money_php(base),
        adult_other_charges_fmt=format_money_php(other),
        adult_total_fare_fmt=format_money_php(adult_total),
        room_rate_fmt=format_money_php(room),
        room_taxes_fmt=format_money_php(tax),
        total_room_rate_fmt=format_money_php(room_total),
        supplements_sum_fmt=format_money_php(sup),
        original_total_fmt=format_money_php(original),
        savings_fmt=format_money_php(savings_raw),
        total_due_fmt=format_money_php(due),
    )
