import os
import pytest
from dashboard.auth import (
    create_session_token,
    verify_password,
    verify_session_token,
)
from dashboard.config import load_settings


def test_verify_password_accepts_match():
    assert verify_password("team-secret", "team-secret") is True


def test_verify_password_rejects_mismatch():
    assert verify_password("wrong", "team-secret") is False


def test_session_token_roundtrip(monkeypatch):
    token = create_session_token("test-secret-key-32chars-minimum!!", 3600)
    assert verify_session_token(token, "test-secret-key-32chars-minimum!!", 3600) is True
    assert verify_session_token(token, "other-secret-key-32chars-minimum!", 3600) is False


def test_load_settings_requires_env(monkeypatch, tmp_path):
    monkeypatch.delenv("SIH_DASHBOARD_PASSWORD", raising=False)
    monkeypatch.delenv("SIH_SESSION_SECRET", raising=False)
    with pytest.raises(RuntimeError):
        load_settings()


def test_load_settings_ok(monkeypatch, tmp_path):
    monkeypatch.setenv("SIH_DASHBOARD_PASSWORD", "pw")
    monkeypatch.setenv("SIH_SESSION_SECRET", "secret-value")
    monkeypatch.setenv("SIH_DATA_PATH", str(tmp_path / "latest.json"))
    s = load_settings()
    assert s.password == "pw"
    assert s.session_secret == "secret-value"
