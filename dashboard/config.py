from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class Settings:
    password: str
    session_secret: str
    data_path: Path
    cookie_name: str = "sih_session"
    session_max_age_s: int = 60 * 60 * 24 * 7

def load_settings() -> Settings:
    password = os.environ.get("SIH_DASHBOARD_PASSWORD", "")
    secret = os.environ.get("SIH_SESSION_SECRET", "")
    if not password or not secret:
        raise RuntimeError("SIH_DASHBOARD_PASSWORD and SIH_SESSION_SECRET are required")
    data_path = Path(os.environ.get("SIH_DATA_PATH", "data/latest.json"))
    return Settings(password=password, session_secret=secret, data_path=data_path)
