from app.utils.itinerary_data import (
    derive_client,
    derive_destination,
    derive_list_slice,
    derive_travel_window,
    normalize_form,
    passenger_search_blob,
)


def test_normalize_form_rejects_non_dict():
    form = normalize_form("not a dict")
    assert isinstance(form["passengers"], list)
    assert len(form["passengers"]) == 1


def test_normalize_form_legacy_single_passenger():
    form = normalize_form(
        {
            "firstName": "Juan",
            "lastName": "Dela Cruz",
            "honorific": "MR.",
        }
    )
    assert form["passengers"][0]["firstName"] == "Juan"
    assert form["passengers"][0]["lastName"] == "Dela Cruz"


def test_normalize_form_coerces_supplements():
    form = normalize_form(
        {
            "passengers": [{"firstName": "A", "lastName": "B"}],
            "supplements": [{"desc": "Breakfast", "amount": "500"}],
            "hidePricingOnPdf": "true",
        }
    )
    assert form["supplements"][0]["desc"] == "Breakfast"
    assert form["hidePricingOnPdf"] is True


def test_derive_client_single_and_multiple():
    single = {"passengers": [{"honorific": "MR.", "firstName": "Ana", "lastName": "Lopez"}]}
    multi = {
        "passengers": [
            {"honorific": "MR.", "firstName": "Ana", "lastName": "Lopez"},
            {"honorific": "MS.", "firstName": "Bea", "lastName": "Cruz"},
        ]
    }
    assert derive_client(single) == "MR. Ana Lopez"
    assert derive_client(multi) == "MR. Ana Lopez +1"
    assert derive_client({"passengers": []}) == ""


def test_derive_destination_from_route():
    form = {"outbound": {"route": "MNL → Tokyo (NRT)"}, "hotelName": "Fallback Hotel"}
    assert derive_destination(form) == "Tokyo"


def test_derive_destination_falls_back_to_hotel():
    form = {"outbound": {"route": ""}, "hotelName": "Shinjuku Inn"}
    assert derive_destination(form) == "Shinjuku Inn"


def test_derive_travel_window():
    form = {
        "outbound": {"depDate": "2026-08-01"},
        "returnFlight": {"arrDate": "2026-08-10"},
    }
    start, end = derive_travel_window(form)
    assert start == "1 Aug 2026"
    assert end == "10 Aug 2026"


def test_derive_list_slice():
    form = {
        "passengers": [{"honorific": "MR.", "firstName": "Ken", "lastName": "Tan"}],
        "outbound": {"route": "MNL → Osaka", "depDate": "2026-09-01"},
        "returnFlight": {"arrDate": "2026-09-08"},
    }
    row = derive_list_slice(form)
    assert row["client"] == "MR. Ken Tan"
    assert row["destination"] == "Osaka"
    assert row["travel_start"] == "1 Sep 2026"
    assert row["travel_end"] == "8 Sep 2026"


def test_passenger_search_blob_includes_names():
    form = {
        "passengers": [
            {
                "honorific": "MR.",
                "firstName": "Ken",
                "lastName": "Tan",
                "passportNo": "P123",
                "birthdate": "1990-01-15",
            }
        ]
    }
    blob = passenger_search_blob(form)
    assert "ken" in blob
    assert "tan" in blob
    assert "p123" in blob
