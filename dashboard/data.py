from __future__ import annotations
import json
from pathlib import Path

def load_payload(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(str(path))
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("invalid json") from exc
    if not isinstance(data, dict) or "records" not in data or "scraped_at" not in data:
        raise ValueError("invalid payload shape")
    return data
