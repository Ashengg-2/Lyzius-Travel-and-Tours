import json
import uuid
from datetime import datetime, timezone

from app.models.database import db
from app.utils.itinerary_data import blank_form, derive_list_slice, normalize_form


class Itinerary(db.Model):
    __tablename__ = "itineraries"

    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(255), nullable=False, default="Untitled itinerary")
    client = db.Column(db.String(255), nullable=False, default="")
    destination = db.Column(db.String(255), nullable=False, default="")
    travel_start = db.Column(db.String(64), nullable=False, default="")
    travel_end = db.Column(db.String(64), nullable=False, default="")
    status = db.Column(db.String(16), nullable=False, default="draft")
    last_updated = db.Column(db.String(64), nullable=False, default="")
    form_json = db.Column(db.Text, nullable=False, default="{}")

    @staticmethod
    def new_id() -> str:
        return str(uuid.uuid4())

    @property
    def form(self) -> dict:
        try:
            return normalize_form(json.loads(self.form_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return blank_form()

    @form.setter
    def form(self, value: dict) -> None:
        self.form_json = json.dumps(normalize_form(value))

    def apply_form(self, form: dict) -> None:
        self.form = form
        derived = derive_list_slice(form)
        self.client = derived["client"]
        self.destination = derived["destination"]
        self.travel_start = derived["travel_start"]
        self.travel_end = derived["travel_end"]

    def touch(self) -> None:
        self.last_updated = datetime.now(timezone.utc).strftime(
            "%b %d, %Y, %I:%M %p"
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "client": self.client,
            "destination": self.destination,
            "travelStart": self.travel_start,
            "travelEnd": self.travel_end,
            "status": self.status,
            "lastUpdated": self.last_updated,
            "form": self.form,
        }

    @classmethod
    def create_blank(cls, title: str | None = None) -> "Itinerary":
        form = blank_form()
        if not form.get("passengers"):
            from app.utils.itinerary_data import blank_passenger

            form["passengers"] = [blank_passenger()]
        derived = derive_list_slice(form)
        now = datetime.now(timezone.utc).strftime("%b %d, %Y, %I:%M %p")
        it = cls(
            id=cls.new_id(),
            title=title or "Untitled itinerary",
            client=derived["client"],
            destination=derived["destination"],
            travel_start=derived["travel_start"],
            travel_end=derived["travel_end"],
            status="draft",
            last_updated=now,
        )
        it.form = form
        return it
