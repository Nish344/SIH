import sys
from datetime import datetime, timezone
from pathlib import Path

from sih_scraper.fetch import FetchError, fetch_page
from sih_scraper.history import load_snapshots
from sih_scraper.pipeline import build_payload
from sih_scraper.validate import ValidationError
from sih_scraper.write import write_payload


def main() -> None:
    data_dir = Path("data")
    try:
        html = fetch_page()
    except FetchError as exc:
        print(f"fetch failed: HTTP {exc.status} {exc.url}", file=sys.stderr)
        sys.exit(1)
    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        snapshots = load_snapshots(data_dir)
        payload = build_payload(html, scraped_at, snapshots)
        write_payload(payload, data_dir)
    except ValidationError as exc:
        print(
            f"validation failed: rule {exc.rule} bad_rows={exc.bad_rows} {exc}",
            file=sys.stderr,
        )
        sys.exit(2)
    records = payload["records"]
    software = sum(1 for record in records if record["category"] == "Software")
    hardware = sum(1 for record in records if record["category"] == "Hardware")
    ideas = [record["idea_count"] for record in records]
    print(
        f"records={len(records)} software={software} hardware={hardware} "
        f"ideas min={min(ideas)} max={max(ideas)} sum={sum(ideas)}"
    )


if __name__ == "__main__":
    main()
