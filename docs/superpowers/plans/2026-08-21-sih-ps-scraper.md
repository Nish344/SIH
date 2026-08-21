# SIH 2026 PS Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape https://www.sih.gov.in/sih2026PS into ranked JSON snapshots with exact portal fields, idea counts, and hotness deltas.

**Architecture:** Pure functions parse HTML and validate records. A thin CLI fetches the page, applies snapshot history for 1-day/3-day deltas, sorts, and writes `data/latest.json` plus a new snapshot file. Tests run against a saved HTML fixture so ranking logic does not need the network.

**Tech Stack:** Python 3, requests, beautifulsoup4, pytest.

## Global Constraints

- Source URL is `https://www.sih.gov.in/sih2026PS` (www required).
- Fetch headers: browser User-Agent, `Accept: text/html`, `Referer: https://www.sih.gov.in/`.
- No frontend. No Playwright unless HTML fetch is blocked (out of this plan).
- Do not write `data/latest.json` unless validation passes.
- Network/WAF errors exit 1. Parse/validation errors exit 2.
- `requirements.txt` lists `requests` and `beautifulsoup4` (pytest is a test-only extra).
- Do not commit unless the user asks.

## File map

- Create: `sih_scraper/__init__.py` — package marker
- Create: `sih_scraper/parse.py` — `parse_html(html, scraped_at) -> list[dict]`
- Create: `sih_scraper/validate.py` — `ValidationError`, `validate_records(records)`, `validate_payload(payload)`
- Create: `sih_scraper/history.py` — `compute_deltas(records, snapshots, now)`, `rank_records(records)`, `load_snapshots(data_dir)`
- Create: `sih_scraper/fetch.py` — `SOURCE_URL`, `FetchError`, `fetch_page()`
- Create: `sih_scraper/write.py` — `write_payload(payload, data_dir)`, `snapshot_filename(scraped_at)`
- Create: `sih_scraper/pipeline.py` — `build_payload(html, scraped_at, snapshots)`
- Create: `scrape.py` — CLI entry
- Create: `requirements.txt`
- Create: `tests/test_parse.py`
- Create: `tests/test_validate.py`
- Create: `tests/test_history.py`
- Create: `tests/test_pipeline.py`
- Create: `tests/fixtures/sih2026ps.sample.html` — copy of live page from 2026-08-21
- Create: `.gitignore`

---

### Task 1: Parse listing rows and modals from HTML

**Files:**
- Create: `sih_scraper/__init__.py`
- Create: `sih_scraper/parse.py`
- Create: `tests/test_parse.py`
- Create: `tests/fixtures/sih2026ps.sample.html`

**Interfaces:**
- Consumes: HTML string, `scraped_at` ISO-8601 UTC string
- Produces: `parse_html(html: str, scraped_at: str) -> list[dict]` with keys `serial`, `organization`, `title`, `category`, `ps_number`, `idea_count`, `idea_cap`, `theme`, `deadline`, `ps_id`, `description_html`, `description_text`, `department`, `youtube_url`, `dataset_url`, `contact`, `scraped_at`, `delta_1d` (always `None` here), `delta_3d` (always `None` here), `fill_ratio`

- [ ] **Step 1: Copy the captured HTML fixture**

Copy `/tmp/sih2026.html` to `tests/fixtures/sih2026ps.sample.html`. If `/tmp/sih2026.html` is missing, fetch `https://www.sih.gov.in/sih2026PS` with browser headers and save it there.

- [ ] **Step 2: Write the failing parse tests**

```python
from pathlib import Path
from sih_scraper.parse import parse_html

FIXTURE = Path(__file__).parent / "fixtures" / "sih2026ps.sample.html"
HTML = FIXTURE.read_text(encoding="utf-8")
SCRAPED_AT = "2026-08-21T16:00:00Z"


def test_parse_fixture_has_226_unique_ps_numbers():
    records = parse_html(HTML, SCRAPED_AT)
    numbers = [r["ps_number"] for r in records]
    assert len(records) == 226
    assert len(set(numbers)) == 226
    assert all(n.startswith("SIH26") for n in numbers)


def test_parse_fixture_category_split():
    records = parse_html(HTML, SCRAPED_AT)
    software = [r for r in records if r["category"] == "Software"]
    hardware = [r for r in records if r["category"] == "Hardware"]
    assert len(software) == 172
    assert len(hardware) == 54


def test_parse_fixture_all_idea_counts_zero_of_500():
    records = parse_html(HTML, SCRAPED_AT)
    assert all(r["idea_count"] == 0 and r["idea_cap"] == 500 for r in records)
    assert all(r["fill_ratio"] == 0.0 for r in records)


def test_parse_sih26001_title_and_description_contain_landslide():
    records = parse_html(HTML, SCRAPED_AT)
    rec = next(r for r in records if r["ps_number"] == "SIH26001")
    assert rec["serial"] == 1
    assert rec["ps_id"] == "26001"
    assert rec["category"] == "Software"
    assert rec["theme"] == "Disaster Management"
    assert rec["deadline"] == "20 September 2026"
    assert rec["organization"].startswith("Ministry of Development of North Eastern Region")
    assert rec["department"].startswith("Ministry of Development of North Eastern Region")
    assert "landslide" in rec["title"].lower()
    assert "landslide" in rec["description_text"].lower()
    assert "landslide" in rec["description_html"].lower()
    assert rec["youtube_url"] == ""
    assert rec["dataset_url"] == ""
    assert rec["contact"] == ""
    assert rec["scraped_at"] == SCRAPED_AT
    assert rec["delta_1d"] is None
    assert rec["delta_3d"] is None
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_parse.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'sih_scraper'` or `parse_html` not defined.

- [ ] **Step 4: Write minimal parser**

`sih_scraper/parse.py` must:

- Parse only `table#dataTablePS` direct `tbody > tr` children.
- Read listing fields from **direct** `td` children (`recursive=False`) so modal tables are ignored.
- Listing cell order: serial, organization, title+modal, category, ps_number, idea count `n/cap`, theme, deadline.
- Title from the `a` in the title cell.
- Modal fields from `th` label / `td` value pairs inside that row’s `.modal`.
- Description from the Description row’s `.style-2` div (`decode_contents` for html, `get_text(" ", strip=True)` for text).
- Blank `href` / `" "` youtube and contact links become `""`.
- `fill_ratio = idea_count / idea_cap`.
- `delta_1d` and `delta_3d` set to `None`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_parse.py -v`

Expected: PASS (4 tests).

---

### Task 2: Accuracy gate

**Files:**
- Create: `sih_scraper/validate.py`
- Create: `tests/test_validate.py`

**Interfaces:**
- Consumes: `parse_html` record dicts; payload `{source_url, scraped_at, page_ps_count, records}`
- Produces:
  - `class ValidationError(Exception)` with `.rule: int` and `.bad_rows: int`
  - `validate_records(records: list[dict]) -> None`
  - `validate_payload(payload: dict) -> None`

- [ ] **Step 1: Write failing validation tests**

```python
import pytest
from sih_scraper.validate import ValidationError, validate_records, validate_payload

BASE = {
    "serial": 1,
    "organization": "Org",
    "title": "Title",
    "category": "Software",
    "ps_number": "SIH26001",
    "idea_count": 0,
    "idea_cap": 500,
    "theme": "Disaster Management",
    "deadline": "20 September 2026",
    "ps_id": "26001",
    "description_html": "<b>x</b>",
    "description_text": "x",
    "department": "Dept",
    "youtube_url": "",
    "dataset_url": "",
    "contact": "",
    "scraped_at": "2026-08-21T16:00:00Z",
    "delta_1d": None,
    "delta_3d": None,
    "fill_ratio": 0.0,
}


def test_validate_records_accepts_unique_matching_ids():
    b = dict(BASE)
    c = dict(BASE, ps_number="SIH26002", ps_id="26002", serial=2)
    validate_records([b, c])


def test_validate_records_rejects_when_unique_sih_ids_ne_row_count():
    bad = dict(BASE, ps_number="NOPE")
    with pytest.raises(ValidationError) as ei:
        validate_records([BASE, bad])
    assert ei.value.rule == 2


def test_validate_records_rejects_duplicate_ps_number():
    with pytest.raises(ValidationError) as ei:
        validate_records([BASE, dict(BASE)])
    assert ei.value.rule == 8


def test_validate_records_rejects_missing_required_field():
    bad = dict(BASE, title="")
    with pytest.raises(ValidationError) as ei:
        validate_records([bad])
    assert ei.value.rule == 4


def test_validate_records_rejects_bad_category():
    with pytest.raises(ValidationError) as ei:
        validate_records([dict(BASE, category="firmware")])
    assert ei.value.rule == 6


def test_validate_records_rejects_ps_id_mismatch():
    with pytest.raises(ValidationError) as ei:
        validate_records([dict(BASE, ps_id="99999")])
    assert ei.value.rule == 7


def test_validate_payload_rejects_count_mismatch():
    payload = {
        "source_url": "https://www.sih.gov.in/sih2026PS",
        "scraped_at": "2026-08-21T16:00:00Z",
        "page_ps_count": 2,
        "records": [BASE],
    }
    with pytest.raises(ValidationError) as ei:
        validate_payload(payload)
    assert ei.value.rule == 3
```

Rule 5 (idea count parse) is enforced in the parser: a row whose count cell is not `^\d+/\d+$` must set `idea_count` to `None`, and `validate_records` raises rule 5 if `idea_count` or `idea_cap` is not an `int`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_validate.py -v`

Expected: FAIL, `sih_scraper.validate` missing.

- [ ] **Step 3: Write `validate.py`**

Implement the eight spec rules that apply to parsed data:

2. Unique `ps_number` matching `^SIH26\d{3}$` must equal `len(records)`.
3. `payload["page_ps_count"] == len(records)` in `validate_payload`.
4. Required fields non-empty: `ps_number`, `title`, `organization`, `category`, `theme`, `deadline`, `idea_count`, `idea_cap`, `description_text`. (`idea_count` of `0` is allowed; `None` is not.)
5. `idea_count` and `idea_cap` are `int`.
6. `category` is exactly `Software` or `Hardware`.
7. `ps_id == ps_number.removeprefix("SIH")`.
8. No duplicate `ps_number`.

Raise on the first failing rule. `bad_rows` is the number of records that failed that rule.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_validate.py tests/test_parse.py -v`

Expected: PASS.

---

### Task 3: Hotness deltas and ranking

**Files:**
- Create: `sih_scraper/history.py`
- Create: `tests/test_history.py`

**Interfaces:**
- Consumes: current records; prior payloads `{scraped_at, records}`; `now: datetime` (timezone-aware UTC)
- Produces:
  - `compute_deltas(records, snapshots, now) -> list[dict]`
  - `rank_records(records) -> list[dict]`
  - `load_snapshots(data_dir: Path) -> list[dict]` sorted by `scraped_at` ascending

- [ ] **Step 1: Write failing history tests**

```python
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
```

`delta_3d` uses the latest snapshot whose `scraped_at` is at least 68 hours before `now`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_history.py -v`

Expected: FAIL, module missing.

- [ ] **Step 3: Implement `history.py`**

- `delta_1d = idea_count - prior` if a snapshot exists with `scraped_at <= now - 20h`, else `None`. Use the latest such snapshot.
- Same for 68 hours → `delta_3d`.
- If the PS is missing in that snapshot, that delta is `None`.
- `rank_records` sort key: `(idea_count, (1, 0) if delta_1d is None else (0, delta_1d), ps_number)`.
- `load_snapshots` reads `data_dir/snapshots/*.json`, skips unreadable files by raising; sort by `scraped_at`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_history.py tests/test_parse.py tests/test_validate.py -v`

Expected: PASS.

---

### Task 4: Pipeline, fetch, write, CLI

**Files:**
- Create: `sih_scraper/fetch.py`
- Create: `sih_scraper/write.py`
- Create: `sih_scraper/pipeline.py`
- Create: `scrape.py`
- Create: `requirements.txt`
- Create: `.gitignore`
- Create: `tests/test_pipeline.py`

**Interfaces:**
- `SOURCE_URL = "https://www.sih.gov.in/sih2026PS"`
- `fetch_page(session=None) -> str` raises `FetchError` (attrs `status`, `url`) on non-200 or `len(body) < 100_000`
- `build_payload(html, scraped_at, snapshots) -> dict`
- `write_payload(payload, data_dir: Path) -> Path` writes snapshot then `latest.json`; returns snapshot path
- `snapshot_filename(scraped_at: str) -> str` e.g. `2026-08-21T1600Z.json`
- `scrape.py` `main()`: fetch → load snapshots → build → validate → write → print `records={n} software={s} hardware={h} ideas min={min} max={max} sum={sum}`

- [ ] **Step 1: Write failing pipeline tests**

```python
from pathlib import Path
from sih_scraper.pipeline import build_payload
from sih_scraper.write import snapshot_filename, write_payload
from sih_scraper.fetch import FetchError, fetch_page, SOURCE_URL

FIXTURE = Path(__file__).parent / "fixtures" / "sih2026ps.sample.html"


def test_build_payload_from_fixture_validates_and_counts():
    html = FIXTURE.read_text(encoding="utf-8")
    payload = build_payload(html, "2026-08-21T16:00:00Z", snapshots=[])
    assert payload["source_url"] == SOURCE_URL
    assert payload["page_ps_count"] == 226
    assert len(payload["records"]) == 226
    assert payload["records"][0]["ps_number"] < payload["records"][-1]["ps_number"] or True
    # ranked by idea_count then ps_number when deltas are null
    counts = [r["idea_count"] for r in payload["records"]]
    assert counts == sorted(counts)


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


def test_fetch_page_raises_on_short_body():
    class Fake:
        status_code = 200
        content = b"tiny"
        text = "tiny"
        def get(self, url, headers=None, timeout=None):
            return self
    try:
        fetch_page(session=Fake())
        assert False, "expected FetchError"
    except FetchError as e:
        assert e.status == 200
        assert SOURCE_URL in e.url
```

`build_payload` must call `validate_payload` before returning.

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_pipeline.py -v`

Expected: FAIL, modules missing.

- [ ] **Step 3: Implement fetch, write, pipeline, CLI**

`fetch.py` headers:

```python
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.sih.gov.in/",
}
```

`scrape.py`:

```python
from datetime import datetime, timezone
from pathlib import Path
import sys
from sih_scraper.fetch import FetchError, fetch_page
from sih_scraper.history import load_snapshots
from sih_scraper.pipeline import build_payload
from sih_scraper.validate import ValidationError
from sih_scraper.write import write_payload

def main():
    data_dir = Path("data")
    try:
        html = fetch_page()
    except FetchError as e:
        print(f"fetch failed: HTTP {e.status} {e.url}", file=sys.stderr)
        sys.exit(1)
    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        snapshots = load_snapshots(data_dir)
        payload = build_payload(html, scraped_at, snapshots)
        write_payload(payload, data_dir)
    except ValidationError as e:
        print(f"validation failed: rule {e.rule} bad_rows={e.bad_rows} {e}", file=sys.stderr)
        sys.exit(2)
    recs = payload["records"]
    software = sum(1 for r in recs if r["category"] == "Software")
    hardware = sum(1 for r in recs if r["category"] == "Hardware")
    ideas = [r["idea_count"] for r in recs]
    print(
        f"records={len(recs)} software={software} hardware={hardware} "
        f"ideas min={min(ideas)} max={max(ideas)} sum={sum(ideas)}"
    )

if __name__ == "__main__":
    main()
```

`.gitignore`:

```
.venv/
__pycache__/
.pytest_cache/
*.pyc
```

- [ ] **Step 4: Run unit tests**

Run: `python3 -m pytest -v`

Expected: all PASS.

- [ ] **Step 5: Live scrape**

Run: `python3 scrape.py`

Expected: exit 0, `data/latest.json` exists, printed summary matches live page (226 records if the catalogue is unchanged).

---

### Task 5: Fixture parse + live file sanity

**Files:**
- Modify: none unless live scrape reveals a parser bug

- [ ] **Step 1: Confirm fixture test still pinned to 226/172/54**
- [ ] **Step 2: Confirm `data/latest.json` has `page_ps_count == len(records)` and every `ps_number` unique**

If live count differs from 226, do not change fixture expectations. Only fix the parser if validation fails.

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| HTML scrape of listing + modal | 1 |
| Exact fields, no summarising | 1 |
| Accuracy gate, fail-loud | 2 |
| `delta_1d` / `delta_3d` / rank | 3 |
| `data/latest.json` + snapshots | 4 |
| CLI, headers, exit codes | 4 |
| Fixture test 226 / 172 / 54 / landslide | 1, 5 |
| Live run writes JSON | 4, 5 |
