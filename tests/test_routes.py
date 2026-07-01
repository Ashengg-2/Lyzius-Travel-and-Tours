import json
import re

from app.models.database import db
from app.models.itinerary import Itinerary


def test_index_redirects_to_itineraries(client):
    response = client.get("/")
    assert response.status_code == 302
    assert "/itineraries/" in response.headers["Location"]


def test_list_itineraries_empty(client):
    response = client.get("/itineraries/")
    assert response.status_code == 200
    assert b"Itineraries" in response.data or b"itinerar" in response.data.lower()


def test_create_itinerary_via_new(client):
    response = client.post("/itineraries/new", follow_redirects=False)
    assert response.status_code == 302
    location = response.headers["Location"]
    match = re.search(r"/itineraries/([0-9a-f-]{36})", location)
    assert match is not None

    itinerary_id = match.group(1)
    with client.application.app_context():
        it = db.session.get(Itinerary, itinerary_id)
        assert it is not None
        assert it.status == "draft"


def test_edit_itinerary_page(client):
    with client.application.app_context():
        it = Itinerary.create_blank(title="Test trip")
        db.session.add(it)
        db.session.commit()
        itinerary_id = it.id

    response = client.get(f"/itineraries/{itinerary_id}")
    assert response.status_code == 200
    assert b"Test trip" in response.data


def test_delete_itinerary(client):
    with client.application.app_context():
        it = Itinerary.create_blank()
        db.session.add(it)
        db.session.commit()
        itinerary_id = it.id

    response = client.post(
        f"/itineraries/{itinerary_id}/delete",
        follow_redirects=True,
    )
    assert response.status_code == 200

    with client.application.app_context():
        assert db.session.get(Itinerary, itinerary_id) is None


def test_patch_itinerary_api(client):
    with client.application.app_context():
        it = Itinerary.create_blank()
        db.session.add(it)
        db.session.commit()
        itinerary_id = it.id

    payload = {
        "title": "Osaka package",
        "status": "ready",
        "form": {
            "passengers": [
                {
                    "honorific": "MR.",
                    "firstName": "Ken",
                    "lastName": "Tan",
                }
            ],
            "outbound": {"route": "MNL → Osaka", "depDate": "2026-09-01"},
            "returnFlight": {"arrDate": "2026-09-08"},
            "adultBaseFare": "PHP 12,000",
        },
    }
    response = client.patch(
        f"/api/itineraries/{itinerary_id}",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["title"] == "Osaka package"
    assert data["status"] == "ready"
    assert data["client"] == "MR. Ken Tan"
    assert data["destination"] == "Osaka"
    assert data["form"]["totalDue"] == "12,000.00"


def test_patch_accounting_api(client):
    payload = {
        "clientName": "Lyzius Client",
        "payables": [{"description": "Hotel", "amount": "2,000"}],
        "receivables": [{"description": "Client payment", "amount": "5,000"}],
    }
    response = client.patch(
        "/api/accounting",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["clientName"] == "Lyzius Client"
    assert data["totals"]["net_fmt"] == "3,000.00"


def test_itinerary_preview_returns_html(client):
    with client.application.app_context():
        it = Itinerary.create_blank()
        db.session.add(it)
        db.session.commit()
        itinerary_id = it.id

    response = client.post(f"/api/itineraries/{itinerary_id}/preview")
    assert response.status_code == 200
    assert b"pdf-page" in response.data
