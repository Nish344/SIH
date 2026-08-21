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

def _authed_client(data_path: Path) -> TestClient:
    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=data_path,
    )
    client = TestClient(create_app(settings))
    client.post("/login", json={"password": "team-pw"})
    return client


def test_missing_json_returns_503(tmp_path: Path):
    client = _authed_client(tmp_path / "missing.json")
    r = client.get("/api/ps")
    assert r.status_code == 503
    assert r.json() == {"detail": "scrape_data_unavailable"}


def test_invalid_json_returns_503(tmp_path: Path):
    bad_file = tmp_path / "bad.json"
    bad_file.write_text("{not valid json", encoding="utf-8")
    client = _authed_client(bad_file)
    r = client.get("/api/ps")
    assert r.status_code == 503
    assert r.json() == {"detail": "scrape_data_unavailable"}


def test_bad_payload_shape_returns_503(tmp_path: Path):
    bad_file = tmp_path / "bad.json"
    bad_file.write_text(json.dumps({"records": []}), encoding="utf-8")
    client = _authed_client(bad_file)
    r = client.get("/api/ps")
    assert r.status_code == 503
    assert r.json() == {"detail": "scrape_data_unavailable"}


def test_login_rejects_oversized_content_length(client: TestClient):
    r = client.post(
        "/login",
        content='{"password":"team-pw"}',
        headers={"content-length": "2048", "content-type": "application/json"},
    )
    assert r.status_code == 413


def test_login_rejects_oversized_body_without_content_length(client: TestClient):
    oversized = b'{"password":"' + b"x" * 1024 + b'"}'
    r = client.post(
        "/login",
        content=oversized,
        headers={"content-type": "application/json"},
    )
    assert r.status_code == 413


def test_login_rate_limit_uses_x_forwarded_for(data_file: Path):
    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=data_file,
    )
    client = TestClient(create_app(settings))
    headers = {"X-Forwarded-For": "203.0.113.50"}
    for _ in range(5):
        assert (
            client.post("/login", json={"password": "nope"}, headers=headers).status_code
            == 401
        )
    assert (
        client.post("/login", json={"password": "nope"}, headers=headers).status_code
        == 429
    )


def test_spa_blocks_path_traversal(data_file: Path):
    repo_root = Path(__file__).resolve().parent.parent
    requirements = repo_root / "requirements.txt"
    assert requirements.is_file()
    secret_marker = requirements.read_text(encoding="utf-8")[:80]

    dist = repo_root / "web" / "dist"
    dist.mkdir(parents=True, exist_ok=True)
    index = dist / "index.html"
    index.write_text("<html><body>spa-index</body></html>", encoding="utf-8")

    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=data_file,
    )
    client = TestClient(create_app(settings))

    for path in ("/../requirements.txt", "/..%2frequirements.txt", "/%2e%2e/requirements.txt"):
        r = client.get(path)
        assert secret_marker not in r.text
        assert "spa-index" in r.text
        assert r.status_code == 200


def test_login_rejects_malformed_content_length(client: TestClient):
    r = client.post(
        "/login",
        content='{"password":"team-pw"}',
        headers={"content-length": "not-a-number", "content-type": "application/json"},
    )
    assert r.status_code == 400
    assert r.json() == {"detail": "invalid content-length"}


def test_login_rejects_non_dict_json_body(client: TestClient):
    r = client.post(
        "/login",
        content='["not","a","dict"]',
        headers={"content-type": "application/json"},
    )
    assert r.status_code == 400
    assert r.json() == {"detail": "invalid request body"}


def test_login_rate_limit_smoke(data_file: Path):
    settings = Settings(
        password="team-pw",
        session_secret="test-secret-key-32chars-minimum!!",
        data_path=data_file,
    )
    client = TestClient(create_app(settings))
    for _ in range(5):
        assert client.post("/login", json={"password": "nope"}).status_code == 401
    assert client.post("/login", json={"password": "nope"}).status_code == 429
