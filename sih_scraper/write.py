import json
from datetime import datetime
from pathlib import Path


def snapshot_filename(scraped_at: str) -> str:
    parsed = datetime.fromisoformat(scraped_at.replace("Z", "+00:00"))
    return parsed.strftime("%Y-%m-%dT%H%MZ") + ".json"


def write_payload(payload: dict, data_dir: Path) -> Path:
    data_dir = Path(data_dir)
    snapshot_dir = data_dir / "snapshots"
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path = snapshot_dir / snapshot_filename(payload["scraped_at"])
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    snapshot_path.write_text(text, encoding="utf-8")
    (data_dir / "latest.json").write_text(text, encoding="utf-8")
    return snapshot_path
