import pytest

from app.utils.money import derive_money_totals, format_money_php, parse_money_php


@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, 0.0),
        ("", 0.0),
        ("PHP 1,234.50", 1234.5),
        ("php 500", 500.0),
        ("−100", -100.0),
        ("-250.00", -250.0),
        ("not a number", 0.0),
    ],
)
def test_parse_money_php(raw, expected):
    assert parse_money_php(raw) == expected


def test_format_money_php():
    assert format_money_php(1234.5) == "1,234.50"
    assert format_money_php("bad") == "0.00"


def test_derive_money_totals():
    totals = derive_money_totals(
        {
            "adultBaseFare": "PHP 10,000",
            "adultOtherCharges": "500",
            "roomRate": "3,000",
            "roomTaxes": "300",
            "supplements": [
                {"amount": "200"},
                {"amount": "PHP 100"},
            ],
            "savings": "1,000",
        }
    )
    assert totals["adult_total_fare_fmt"] == "10,500.00"
    assert totals["total_room_rate_fmt"] == "3,300.00"
    assert totals["supplements_sum_fmt"] == "300.00"
    assert totals["original_total_fmt"] == "14,100.00"
    assert totals["savings_fmt"] == "1,000.00"
    assert totals["total_due_fmt"] == "13,100.00"


def test_derive_money_totals_due_never_negative():
    totals = derive_money_totals(
        {
            "adultBaseFare": "100",
            "savings": "500",
        }
    )
    assert totals["total_due_fmt"] == "0.00"
