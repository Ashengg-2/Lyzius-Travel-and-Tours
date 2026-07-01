from flask import Blueprint, flash, redirect, render_template, request, url_for

from app.config import Config
from app.models.database import db
from app.models.itinerary import Itinerary
from app.utils.itinerary_data import (
    apply_computed_money_fields,
    blank_form,
    blank_passenger,
    derive_list_slice,
    passenger_search_blob,
)

bp = Blueprint("itineraries", __name__, url_prefix="/itineraries")


def _create_itinerary_and_redirect():
    """Create a blank itinerary and open the editor."""
    it = Itinerary.create_blank()
    if not it.form.get("passengers"):
        it.form = {**it.form, "passengers": [blank_passenger()]}
    db.session.add(it)
    db.session.commit()
    return redirect(url_for("itineraries.edit_itinerary", itinerary_id=it.id))


@bp.route("/", methods=["GET", "POST"])
def list_itineraries():
    if request.method == "POST":
        return _create_itinerary_and_redirect()

    q = request.args.get("q", "").strip().lower()
    status_filter = request.args.get("status", "all")
    rows = Itinerary.query.order_by(Itinerary.last_updated.desc()).all()

    filtered = []
    for it in rows:
        if status_filter != "all" and it.status != status_filter:
            continue
        if q:
            blob = " ".join(
                [
                    (it.client or "").lower(),
                    (it.destination or "").lower(),
                    (it.title or "").lower(),
                    (it.travel_start or "").lower(),
                    passenger_search_blob(it.form),
                ]
            )
            if q not in blob:
                continue
        filtered.append(it)

    return render_template(
        "itineraries/list.html",
        itineraries=filtered,
        search=q,
        status_filter=status_filter,
        brand_name=Config.BRAND_NAME,
        workspace="itineraries",
    )


@bp.route("/new", methods=["GET", "POST"])
def create_itinerary():
    return _create_itinerary_and_redirect()


@bp.route("/<itinerary_id>")
def edit_itinerary(itinerary_id: str):
    it = Itinerary.query.get_or_404(itinerary_id)
    form = apply_computed_money_fields(it.form)
    return render_template(
        "itineraries/editor.html",
        itinerary=it,
        form=form,
        brand_name=Config.BRAND_NAME,
        workspace="itineraries",
    )


@bp.route("/<itinerary_id>/duplicate", methods=["POST"])
def duplicate_itinerary(itinerary_id: str):
    src = Itinerary.query.get_or_404(itinerary_id)
    copy = Itinerary.create_blank(title=f"{src.title} (copy)")
    copy.form = src.form
    copy.apply_form(copy.form)
    copy.status = "draft"
    copy.touch()
    db.session.add(copy)
    db.session.commit()
    return redirect(url_for("itineraries.edit_itinerary", itinerary_id=copy.id))


@bp.route("/<itinerary_id>/delete", methods=["POST"])
def delete_itinerary(itinerary_id: str):
    it = Itinerary.query.get_or_404(itinerary_id)
    db.session.delete(it)
    db.session.commit()
    flash("Itinerary deleted.", "success")
    return redirect(url_for("itineraries.list_itineraries"))
