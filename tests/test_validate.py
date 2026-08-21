import pytest

from sih_scraper.validate import ValidationError, validate_payload, validate_records

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


def test_validate_records_rejects_non_int_idea_count():
    with pytest.raises(ValidationError) as ei:
        validate_records([dict(BASE, idea_count=None)])
    assert ei.value.rule == 5


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
