from app.utils.accounting_data import accounting_totals, normalize_snapshot


def test_normalize_snapshot_maps_legacy_vendor_field():
    snapshot = normalize_snapshot(
        {
            "clientName": "Acme Corp",
            "payables": [{"vendor": "Airline Co", "amount": "PHP 1,000"}],
        }
    )
    assert snapshot["clientName"] == "Acme Corp"
    assert snapshot["payables"][0]["counterparty"] == "Airline Co"


def test_accounting_totals():
    snapshot = {
        "payables": [{"amount": "1,000"}, {"amount": "500"}],
        "receivables": [{"amount": "3,000"}],
    }
    totals = accounting_totals(snapshot)
    assert totals["payable_sum"] == 1500.0
    assert totals["receivable_sum"] == 3000.0
    assert totals["net"] == 1500.0
    assert totals["net_fmt"] == "1,500.00"
