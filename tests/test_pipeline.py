from pathlib import Path

from sih_scraper.fetch import SOURCE_URL, FetchError, fetch_page
from sih_scraper.pipeline import build_payload
from sih_scraper.write import snapshot_filename, write_payload

FIXTURE = Path(__file__).parent / "fixtures" / "sih2026ps.sample.html"


def test_build_payload_from_fixture_validates_and_counts():
    html = FIXTURE.read_text(encoding="utf-8")
    payload = build_payload(html, "2026-08-21T16:00:00Z", snapshots=[])
    assert payload["source_url"] == SOURCE_URL
    assert payload["page_ps_count"] == 226
    assert len(payload["records"]) == 226
    counts = [r["idea_count"] for r in payload["records"]]
    assert counts == sorted(counts)
    numbers = [r["ps_number"] for r in payload["records"]]
    assert numbers == sorted(numbers)


def test_snapshot_filename():
    assert snapshot_filename("2026-08-21T16:00:00Z") == "2026-08-21T1600Z.json"


def test_write_payload_writes_snapshot_and_latest(tmp_path):
    payload = {
        "source_url": SOURCE_URL,
        "scraped_at": "2026-08-21T16:00:00Z",
        "page_ps_count": 1,
        "records": [{"ps_number": "SIH26001", "idea_count": 0}],
    }
    path = write_payload(payload, tmp_path)
    assert path.name == "2026-08-21T1600Z.json"
    assert (tmp_path / "latest.json").is_file()
    assert path.is_file()
    assert path.parent == tmp_path / "snapshots"


def test_fetch_page_raises_on_short_body():
    class Fake:
        status_code = 200
        content = b"tiny"
        text = "tiny"

        def get(self, url, headers=None, timeout=None):
            return self

    try:
        fetch_page(session=Fake())
        raise AssertionError("expected FetchError")
    except FetchError as e:
        assert e.status == 200
        assert SOURCE_URL in e.url


def test_fetch_page_raises_on_forbidden():
    class Fake:
        status_code = 403
        content = b"x" * 200_000
        text = "forbidden"

        def get(self, url, headers=None, timeout=None):
            return self

    try:
        fetch_page(session=Fake())
        raise AssertionError("expected FetchError")
    except FetchError as e:
        assert e.status == 403
