import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _counts_from_snapshot(snapshot: dict | None) -> dict[str, int]:
    if snapshot is None:
        return {}
    return {
        record["ps_number"]: record["idea_count"]
        for record in snapshot.get("records", [])
        if "ps_number" in record and "idea_count" in record
    }


def _latest_at_least(snapshots: list[dict], now: datetime, hours: int) -> dict | None:
    cutoff = now - timedelta(hours=hours)
    eligible = [
        snapshot
        for snapshot in snapshots
        if _parse_ts(snapshot["scraped_at"]) <= cutoff
    ]
    if not eligible:
        return None
    return max(eligible, key=lambda s: _parse_ts(s["scraped_at"]))


def compute_deltas(records: list[dict], snapshots: list[dict], now: datetime) -> list[dict]:
    counts_1d = _counts_from_snapshot(_latest_at_least(snapshots, now, 20))
    counts_3d = _counts_from_snapshot(_latest_at_least(snapshots, now, 68))
    out = []
    for record in records:
        updated = dict(record)
        ps_number = updated["ps_number"]
        idea_count = updated["idea_count"]
        updated["delta_1d"] = (
            idea_count - counts_1d[ps_number] if ps_number in counts_1d else None
        )
        updated["delta_3d"] = (
            idea_count - counts_3d[ps_number] if ps_number in counts_3d else None
        )
        out.append(updated)
    return out


def rank_records(records: list[dict]) -> list[dict]:
    def key(record: dict):
        delta = record.get("delta_1d")
        heat_key = (1, 0) if delta is None else (0, delta)
        return (record["idea_count"], heat_key, record["ps_number"])

    return sorted(records, key=key)


def load_snapshots(data_dir: Path) -> list[dict]:
    snapshot_dir = Path(data_dir) / "snapshots"
    if not snapshot_dir.is_dir():
        return []
    payloads = []
    for path in sorted(snapshot_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            payloads.append(json.load(handle))
    payloads.sort(key=lambda payload: payload["scraped_at"])
    return payloads
