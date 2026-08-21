from datetime import datetime, timezone

from sih_scraper.history import compute_deltas, rank_records

NOW = datetime(2026, 8, 23, 16, 0, tzinfo=timezone.utc)


def _rec(ps, count, delta=None):
    return {
        "ps_number": ps,
        "idea_count": count,
        "delta_1d": delta,
        "delta_3d": None,
    }


def test_delta_1d_uses_latest_snapshot_at_least_20h_old():
    current = [_rec("SIH26001", 40), _rec("SIH26002", 5)]
    snapshots = [
        {
            "scraped_at": "2026-08-22T15:00:00Z",
            "records": [
                {"ps_number": "SIH26001", "idea_count": 10},
                {"ps_number": "SIH26002", "idea_count": 5},
            ],
        }
    ]
    out = {r["ps_number"]: r for r in compute_deltas(current, snapshots, NOW)}
    assert out["SIH26001"]["delta_1d"] == 30
    assert out["SIH26002"]["delta_1d"] == 0
    assert out["SIH26001"]["delta_3d"] is None


def test_delta_null_when_no_old_enough_snapshot():
    current = [_rec("SIH26001", 3)]
    snapshots = [
        {
            "scraped_at": "2026-08-23T10:00:00Z",
            "records": [{"ps_number": "SIH26001", "idea_count": 1}],
        }
    ]
    out = compute_deltas(current, snapshots, NOW)
    assert out[0]["delta_1d"] is None


def test_delta_3d_uses_snapshot_at_least_68h_old():
    current = [_rec("SIH26001", 50)]
    snapshots = [
        {
            "scraped_at": "2026-08-20T16:00:00Z",
            "records": [{"ps_number": "SIH26001", "idea_count": 12}],
        },
        {
            "scraped_at": "2026-08-22T15:00:00Z",
            "records": [{"ps_number": "SIH26001", "idea_count": 20}],
        },
    ]
    out = compute_deltas(current, snapshots, NOW)
    assert out[0]["delta_1d"] == 30
    assert out[0]["delta_3d"] == 38


def test_rank_least_count_then_least_heat_null_last():
    records = [
        _rec("SIH26003", 10, 8),
        _rec("SIH26001", 10, None),
        _rec("SIH26002", 10, 1),
        _rec("SIH26004", 0, None),
    ]
    ranked = rank_records(records)
    assert [r["ps_number"] for r in ranked] == [
        "SIH26004",
        "SIH26002",
        "SIH26003",
        "SIH26001",
    ]
