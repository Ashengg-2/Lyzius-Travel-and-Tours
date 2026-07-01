from flask import Blueprint, jsonify, render_template, request

from app.models.accounting import ensure_accounting_row
from app.models.database import db
from app.models.itinerary import Itinerary
from app.utils.accounting_data import accounting_totals, normalize_snapshot
from app.utils.itinerary_data import apply_computed_money_fields, normalize_form
from app.utils.pdf_builder import build_accounting_pdf_pages, build_itinerary_pdf_pages

bp = Blueprint("api", __name__, url_prefix="/api")


@bp.route("/itineraries/<itinerary_id>", methods=["PATCH"])
def patch_itinerary(itinerary_id: str):
    it = Itinerary.query.get_or_404(itinerary_id)
    payload = request.get_json(silent=True) or {}

    if "title" in payload and isinstance(payload["title"], str):
        it.title = payload["title"]
    if "status" in payload and payload["status"] in ("draft", "ready"):
        it.status = payload["status"]
    if "form" in payload and isinstance(payload["form"], dict):
        form = apply_computed_money_fields(normalize_form(payload["form"]))
        it.apply_form(form)

    it.touch()
    db.session.commit()
    return jsonify(it.to_dict())


@bp.route("/itineraries/<itinerary_id>/preview", methods=["POST"])
def itinerary_preview(itinerary_id: str):
    it = Itinerary.query.get_or_404(itinerary_id)
    payload = request.get_json(silent=True) or {}
    form = it.form
    if isinstance(payload.get("form"), dict):
        form = apply_computed_money_fields(normalize_form(payload["form"]))
    pages = build_itinerary_pdf_pages(form)
    html = render_template(
        "pdf/itinerary_document.html",
        pages=pages,
        export_marker=False,
    )
    return html


@bp.route("/itineraries/<itinerary_id>/export-html", methods=["POST"])
def itinerary_export_html(itinerary_id: str):
    it = Itinerary.query.get_or_404(itinerary_id)
    payload = request.get_json(silent=True) or {}
    form = it.form
    if isinstance(payload.get("form"), dict):
        form = apply_computed_money_fields(normalize_form(payload["form"]))
    pages = build_itinerary_pdf_pages(form)
    html = render_template(
        "pdf/itinerary_document.html",
        pages=pages,
        export_marker=True,
    )
    return html


@bp.route("/accounting", methods=["PATCH"])
def patch_accounting():
    row = ensure_accounting_row()
    payload = request.get_json(silent=True) or {}
    row.snapshot = normalize_snapshot(payload)
    db.session.commit()
    totals = accounting_totals(row.snapshot)
    return jsonify({**row.snapshot, "totals": totals})


@bp.route("/accounting/export-html", methods=["POST"])
def accounting_export_html():
    row = ensure_accounting_row()
    payload = request.get_json(silent=True) or {}
    snapshot = normalize_snapshot(payload) if payload else row.snapshot
    pages = build_accounting_pdf_pages(snapshot)
    return render_template(
        "pdf/accounting_document.html",
        pages=pages,
        export_marker=True,
    )
