from datetime import datetime

from sih_scraper.fetch import SOURCE_URL
from sih_scraper.history import compute_deltas, rank_records
from sih_scraper.parse import parse_html
from sih_scraper.validate import validate_payload


def build_payload(html: str, scraped_at: str, snapshots: list[dict]) -> dict:
    records = parse_html(html, scraped_at)
    now = datetime.fromisoformat(scraped_at.replace("Z", "+00:00"))
    records = compute_deltas(records, snapshots, now)
    records = rank_records(records)
    payload = {
        "source_url": SOURCE_URL,
        "scraped_at": scraped_at,
        "page_ps_count": len(records),
        "records": records,
    }
    validate_payload(payload)
    return payload
