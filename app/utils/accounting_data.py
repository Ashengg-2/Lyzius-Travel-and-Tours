"""Accounting ledger defaults and normalization."""

from __future__ import annotations

import uuid
from typing import Any

from app.utils.money import format_money_php, parse_money_php


def blank_line() -> dict:
    return {
        "id": f"acct_{uuid.uuid4().hex[:12]}",
        "description": "",
        "counterparty": "",
        "amount": "",
    }


def blank_snapshot() -> dict:
    return {
        "clientName": "",
        "clientCompany": "",
        "clientEmail": "",
        "clientPhone": "",
        "clientNotes": "",
        "payables": [],
        "receivables": [],
    }


def _coerce_line(raw: Any) -> dict:
    o = raw if isinstance(raw, dict) else {}
    rid = o.get("id") if isinstance(o.get("id"), str) else blank_line()["id"]
    counterparty = o.get("counterparty")
    if not isinstance(counterparty, str):
        counterparty = o.get("vendor") if isinstance(o.get("vendor"), str) else ""
    return {
        "id": rid,
        "description": o.get("description", "") if isinstance(o.get("description"), str) else "",
        "counterparty": counterparty,
        "amount": o.get("amount", "") if isinstance(o.get("amount"), str) else "",
    }


def normalize_snapshot(raw: Any) -> dict:
    base = blank_snapshot()
    p = raw if isinstance(raw, dict) else {}
    payables = [_coerce_line(x) for x in (p.get("payables") or [])]
    receivables = [_coerce_line(x) for x in (p.get("receivables") or [])]
    return {
        "clientName": p.get("clientName", "") if isinstance(p.get("clientName"), str) else "",
        "clientCompany": p.get("clientCompany", "") if isinstance(p.get("clientCompany"), str) else "",
        "clientEmail": p.get("clientEmail", "") if isinstance(p.get("clientEmail"), str) else "",
        "clientPhone": p.get("clientPhone", "") if isinstance(p.get("clientPhone"), str) else "",
        "clientNotes": p.get("clientNotes", "") if isinstance(p.get("clientNotes"), str) else "",
        "payables": payables or base["payables"],
        "receivables": receivables or base["receivables"],
    }


def accounting_totals(snapshot: dict) -> dict:
    pay = 0.0
    rec = 0.0
    for row in snapshot.get("payables") or []:
        pay += abs(parse_money_php(row.get("amount", "")))
    for row in snapshot.get("receivables") or []:
        rec += abs(parse_money_php(row.get("amount", "")))
    net = rec - pay
    return {
        "payable_sum": pay,
        "receivable_sum": rec,
        "net": net,
        "payable_sum_fmt": format_money_php(pay),
        "receivable_sum_fmt": format_money_php(rec),
        "net_fmt": format_money_php(net),
    }
