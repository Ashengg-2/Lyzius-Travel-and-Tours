"""Itinerary form defaults, normalization, and derived list fields."""

from __future__ import annotations

import copy
import uuid
from typing import Any

from app.utils.dates import format_date_disp

BLANK_FLIGHT = {
    "route": "",
    "airline": "",
    "flightNo": "",
    "depAirport": "",
    "depTerminal": "",
    "depDate": "",
    "depTime": "",
    "arrAirport": "",
    "arrTerminal": "",
    "arrDate": "",
    "arrTime": "",
    "duration": "",
    "baggage": "",
}


def blank_passenger() -> dict:
    return {
        "id": new_passenger_id(),
        "honorific": "MR.",
        "firstName": "",
        "lastName": "",
        "passengerType": "Adult",
        "birthdate": "",
        "nationality": "",
        "passportNo": "",
        "passportExpiry": "",
        "issuingCountry": "",
        "dateIssued": "",
    }


def new_passenger_id() -> str:
    return str(uuid.uuid4())


def blank_form() -> dict:
    return {
        "agencyName": "Lyzius Travel & Tours",
        "agencyTagline": "Curated Travel Experiences",
        "agencyFooter": (
            "This booking confirmation is prepared exclusively for the named passenger."
        ),
        "page1Heading": "Flight Details",
        "outbound": copy.deepcopy(BLANK_FLIGHT),
        "returnFlight": copy.deepcopy(BLANK_FLIGHT),
        "hotelName": "",
        "hotelAddress": "",
        "hotelPhone": "",
        "checkIn": "",
        "checkOut": "",
        "roomDesc": "",
        "inclusions": "",
        "supplements": [],
        "cancellationRows": [],
        "noShow": "",
        "ratesConditions": "",
        "contactName": "",
        "contactPhone": "",
        "contactEmail": "",
        "passengers": [],
        "adultBaseFare": "",
        "adultOtherCharges": "",
        "adultTotalFare": "",
        "roomRate": "",
        "roomTaxes": "",
        "totalRoomRate": "",
        "originalTotal": "",
        "savings": "",
        "totalDue": "",
        "internalNotes": "",
        "hidePricingOnPdf": False,
    }


def _str_field(raw: Any, fallback: str = "") -> str:
    return raw if isinstance(raw, str) else fallback


def _coerce_bool(raw: Any, fallback: bool) -> bool:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        s = raw.strip().lower()
        if s in ("1", "true", "yes", "on"):
            return True
        if s in ("0", "false", "no", "off"):
            return False
    return fallback


def _coerce_flight(raw: Any) -> dict:
    base = copy.deepcopy(BLANK_FLIGHT)
    if not isinstance(raw, dict):
        return base
    for key in base:
        val = raw.get(key)
        if isinstance(val, str):
            base[key] = val
    return base


def _coerce_sup_row(raw: Any) -> dict | None:
    if not isinstance(raw, dict):
        return None
    rid = _str_field(raw.get("id")) or f"{uuid.uuid4()}"
    return {
        "id": rid,
        "desc": _str_field(raw.get("desc")),
        "amount": _str_field(raw.get("amount")),
        "chargeType": _str_field(raw.get("chargeType"), "Pay at hotel"),
    }


def _coerce_can_row(raw: Any) -> dict | None:
    if not isinstance(raw, dict):
        return None
    rid = _str_field(raw.get("id")) or f"{uuid.uuid4()}"
    return {
        "id": rid,
        "rule": _str_field(raw.get("rule")),
        "charge": _str_field(raw.get("charge")),
    }


def _coerce_passenger(raw: Any) -> dict:
    r = raw if isinstance(raw, dict) else {}
    pid = _str_field(r.get("id")).strip() or new_passenger_id()
    return {
        "id": pid,
        "honorific": _str_field(r.get("honorific"), "MR.") or "MR.",
        "firstName": _str_field(r.get("firstName")),
        "lastName": _str_field(r.get("lastName")),
        "passengerType": _str_field(r.get("passengerType"), "Adult") or "Adult",
        "birthdate": _str_field(r.get("birthdate")),
        "nationality": _str_field(r.get("nationality")),
        "passportNo": _str_field(r.get("passportNo")),
        "passportExpiry": _str_field(r.get("passportExpiry")),
        "issuingCountry": _str_field(r.get("issuingCountry")),
        "dateIssued": _str_field(r.get("dateIssued")),
    }


def normalize_form(raw: Any) -> dict:
    base = blank_form()
    p = raw if isinstance(raw, dict) else {}

    passengers = []
    if isinstance(p.get("passengers"), list) and p["passengers"]:
        passengers = [_coerce_passenger(x) for x in p["passengers"]]
    else:
        passengers = [_coerce_passenger(p)]

    supplements = [
        row
        for row in (_coerce_sup_row(x) for x in (p.get("supplements") or []))
        if row
    ]
    cancellation_rows = [
        row
        for row in (_coerce_can_row(x) for x in (p.get("cancellationRows") or []))
        if row
    ]

    return {
        **base,
        "agencyName": _str_field(p.get("agencyName"), base["agencyName"]),
        "agencyTagline": _str_field(p.get("agencyTagline"), base["agencyTagline"]),
        "agencyFooter": _str_field(p.get("agencyFooter"), base["agencyFooter"]),
        "page1Heading": _str_field(p.get("page1Heading"), base["page1Heading"]),
        "outbound": _coerce_flight(p.get("outbound")),
        "returnFlight": _coerce_flight(p.get("returnFlight")),
        "hotelName": _str_field(p.get("hotelName")),
        "hotelAddress": _str_field(p.get("hotelAddress")),
        "hotelPhone": _str_field(p.get("hotelPhone")),
        "checkIn": _str_field(p.get("checkIn")),
        "checkOut": _str_field(p.get("checkOut")),
        "roomDesc": _str_field(p.get("roomDesc")),
        "inclusions": _str_field(p.get("inclusions")),
        "supplements": supplements,
        "cancellationRows": cancellation_rows,
        "noShow": _str_field(p.get("noShow")),
        "ratesConditions": _str_field(p.get("ratesConditions")),
        "contactName": _str_field(p.get("contactName")),
        "contactPhone": _str_field(p.get("contactPhone")),
        "contactEmail": _str_field(p.get("contactEmail")),
        "passengers": passengers,
        "adultBaseFare": _str_field(p.get("adultBaseFare")),
        "adultOtherCharges": _str_field(p.get("adultOtherCharges")),
        "adultTotalFare": _str_field(p.get("adultTotalFare")),
        "roomRate": _str_field(p.get("roomRate")),
        "roomTaxes": _str_field(p.get("roomTaxes")),
        "totalRoomRate": _str_field(p.get("totalRoomRate")),
        "originalTotal": _str_field(p.get("originalTotal")),
        "savings": _str_field(p.get("savings")),
        "totalDue": _str_field(p.get("totalDue")),
        "internalNotes": _str_field(p.get("internalNotes")),
        "hidePricingOnPdf": _coerce_bool(
            p.get("hidePricingOnPdf"), base["hidePricingOnPdf"]
        ),
    }


def passenger_display_line(p: dict) -> str:
    fn = p.get("firstName", "").strip()
    ln = p.get("lastName", "").strip()
    honor = (p.get("honorific") or "MR.").strip().rstrip() or "MR."
    if not fn and not ln:
        return ""
    parts = [honor, fn, ln]
    return " ".join(x for x in parts if x)


def passenger_search_blob(form: dict) -> str:
    chunks = []
    for p in form.get("passengers") or []:
        chunks.append(
            " ".join(
                filter(
                    None,
                    [
                        p.get("honorific"),
                        p.get("firstName"),
                        p.get("lastName"),
                        p.get("passengerType"),
                        p.get("nationality"),
                        p.get("passportNo"),
                        p.get("issuingCountry"),
                        format_date_disp(p.get("birthdate", "")),
                        format_date_disp(p.get("passportExpiry", "")),
                        format_date_disp(p.get("dateIssued", "")),
                    ],
                )
            ).lower()
        )
    return "|".join(chunks)


def derive_client(form: dict) -> str:
    lines = [
        passenger_display_line(p).strip()
        for p in form.get("passengers") or []
        if passenger_display_line(p).strip()
    ]
    if not lines:
        return ""
    if len(lines) == 1:
        return lines[0]
    return f"{lines[0]} +{len(lines) - 1}"


def derive_destination(form: dict) -> str:
    route = (form.get("outbound") or {}).get("route", "").strip()
    seps = ["→", "\u2192", "->", "–", "—"]
    for sep in seps:
        idx = route.find(sep)
        if idx != -1:
            after = route[idx + len(sep) :].strip()
            if after:
                import re

                cleaned = re.sub(r"\([^)]*\)", "", after).strip()
                return cleaned or after
    return form.get("hotelName", "").strip()


def derive_travel_window(form: dict) -> tuple[str, str]:
    outbound = form.get("outbound") or {}
    ret = form.get("returnFlight") or {}
    start_raw = outbound.get("depDate", "").strip()
    end_raw = ret.get("arrDate", "").strip() or ret.get("depDate", "").strip()
    start_fmt = format_date_disp(start_raw) or start_raw
    end_fmt = format_date_disp(end_raw) or end_raw
    return start_fmt, end_fmt or start_fmt


def derive_list_slice(form: dict) -> dict:
    start, end = derive_travel_window(form)
    return {
        "client": derive_client(form),
        "destination": derive_destination(form),
        "travel_start": start,
        "travel_end": end,
    }


def apply_computed_money_fields(form: dict) -> dict:
    from app.utils.money import derive_money_totals

    totals = derive_money_totals(form)
    out = copy.deepcopy(form)
    out["adultTotalFare"] = totals["adult_total_fare_fmt"]
    out["totalRoomRate"] = totals["total_room_rate_fmt"]
    out["originalTotal"] = totals["original_total_fmt"]
    out["totalDue"] = totals["total_due_fmt"]
    return out
