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
