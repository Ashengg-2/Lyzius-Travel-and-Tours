import json

from app.models.database import db
from app.utils.accounting_data import blank_snapshot, normalize_snapshot


class AccountingRecord(db.Model):
    """Singleton accounting ledger stored as JSON."""

    __tablename__ = "accounting_records"

    id = db.Column(db.Integer, primary_key=True, default=1)
    snapshot_json = db.Column(db.Text, nullable=False, default="{}")

    @property
    def snapshot(self) -> dict:
        try:
            return normalize_snapshot(json.loads(self.snapshot_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return blank_snapshot()

    @snapshot.setter
    def snapshot(self, value: dict) -> None:
        self.snapshot_json = json.dumps(normalize_snapshot(value))

    def to_dict(self) -> dict:
        return self.snapshot


def ensure_accounting_row() -> AccountingRecord:
    row = db.session.get(AccountingRecord, 1)
    if row is None:
        row = AccountingRecord(id=1)
        row.snapshot = blank_snapshot()
        db.session.add(row)
        db.session.commit()
    return row
