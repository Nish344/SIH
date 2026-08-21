import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from dashboard.app import create_app
from dashboard.config import Settings

@pytest.fixture
def data_file(tmp_path: Path) -> Path:
    payload = {
        "source_url": "https://www.sih.gov.in/sih2026PS",
        "scraped_at": "2026-08-21T15:50:24Z",
        "page_ps_count": 1,
        "records": [{"ps_number": "SIH26001", "title": "Test", "delta_1d": None}],
    }
    path = tmp_path / "latest.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path

@pytest.fixture
def client(data_file: Path):
    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=data_file,
    )
    app = create_app(settings)
    return TestClient(app)

def test_health_ok(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

def test_api_ps_requires_auth(client: TestClient):
    r = client.get("/api/ps")
    assert r.status_code == 401

def test_login_and_api_ps(client: TestClient):
    bad = client.post("/login", json={"password": "nope"})
    assert bad.status_code == 401
    ok = client.post("/login", json={"password": "team-pw"})
    assert ok.status_code == 204
    r = client.get("/api/ps")
    assert r.status_code == 200
    body = r.json()
    assert body["page_ps_count"] == 1
    assert body["scraped_at"] == "2026-08-21T15:50:24Z"
    assert body["records"][0]["ps_number"] == "SIH26001"

def test_logout_blocks_api(client: TestClient):
    client.post("/login", json={"password": "team-pw"})
    client.post("/logout")
    assert client.get("/api/ps").status_code == 401

def test_missing_json_returns_503(tmp_path: Path):
    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=tmp_path / "missing.json",
    )
    client = TestClient(create_app(settings))
    client.post("/login", json={"password": "team-pw"})
    r = client.get("/api/ps")
    assert r.status_code == 503
