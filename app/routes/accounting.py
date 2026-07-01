from flask import Blueprint, render_template, request

from app.config import Config
from app.models.accounting import ensure_accounting_row
from app.models.database import db
from app.utils.accounting_data import accounting_totals, normalize_snapshot

bp = Blueprint("accounting", __name__, url_prefix="/accounting")


@bp.route("/")
def accounting_home():
    row = ensure_accounting_row()
    snapshot = row.snapshot
    totals = accounting_totals(snapshot)
    return render_template(
        "accounting/index.html",
        snapshot=snapshot,
        totals=totals,
        brand_name=Config.BRAND_NAME,
        workspace="accounting",
    )


@bp.route("/reset", methods=["POST"])
def reset_accounting():
    from app.utils.accounting_data import blank_snapshot

    row = ensure_accounting_row()
    row.snapshot = blank_snapshot()
    db.session.commit()
    return accounting_home()
