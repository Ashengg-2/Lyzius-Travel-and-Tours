from datetime import date

import pytest

from app.utils.dates import format_date_disp, iso_to_local_date


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("2026-07-01", date(2026, 7, 1)),
        ("2026-13-01", None),
        ("2026-02-30", None),
        ("not-iso", None),
    ],
)
def test_iso_to_local_date(raw, expected):
    assert iso_to_local_date(raw) == expected


def test_format_date_disp_iso():
    assert format_date_disp("2026-07-01") == "1 Jul 2026"


def test_format_date_disp_passthrough():
    assert format_date_disp("1 Jul 2026") == "1 Jul 2026"
    assert format_date_disp("") == ""
