# SIH 2026 Problem Statement Scraper

Date: 2026-08-21

## Goal

Build a 100% accurate scraper of https://www.sih.gov.in/sih2026PS that writes JSON. One team uses it to rank all 226 problem statements by competition (idea count) and hotness (count change between our snapshots), then manually researches a shortlist.

No frontend. Category, theme, organization, and software/hardware stay as fields so the team can filter in the JSON.

## Source of truth

The live HTML catalogue at `https://www.sih.gov.in/sih2026PS` (www required; bare `sih.gov.in` is blocked by Azure WAF).

The page is server-rendered. Every listing row and its detail modal is in the HTML. Do not use the Excel download (it currently still points at the 2024 file). Do not use a headless browser unless HTML fetch starts returning non-200 or incomplete markup.

Fetch with a real browser User-Agent, `Accept: text/html`, and `Referer: https://www.sih.gov.in/`.

## What we extract

One record per problem statement, from the listing table plus its modal.

From the listing row:

| Field | Portal column | Example |
| --- | --- | --- |
| `serial` | S.No. | 1 |
| `organization` | Organization | Ministry of Development of North Eastern Region (MDoNER) |
| `title` | Problem Statement Title | AI-Based early warning and landslide Risk Monitoring System in NER |
| `category` | Category | Software or Hardware |
| `ps_number` | PS Number | SIH26001 |
| `idea_count` | Submitted Idea(s) Count, left of `/` | 0 |
| `idea_cap` | Submitted Idea(s) Count, right of `/` | 500 |
| `theme` | Theme | Disaster Management |
| `deadline` | Deadline for Idea Submission | 20 September 2026 |

From the modal (id `ViewProblemStatement26001` for PS 26001):

| Field | Portal label | Notes |
| --- | --- | --- |
| `ps_id` | Problem Statement ID | `26001` (numeric string, no `SIH` prefix) |
| `description_html` | Description | Inner HTML, not rewritten |
| `description_text` | Description | Tag-stripped text for searching; not a summary |
| `department` | Department | |
| `youtube_url` | Youtube Link | Empty string if the href is blank |
| `dataset_url` | Dataset Link | Empty string if missing |
| `contact` | Contact info | Empty string if the href is blank |

Derived at scrape time, never invented from the description:

| Field | Meaning |
| --- | --- |
| `scraped_at` | ISO-8601 UTC timestamp of this run |
| `delta_1d` | `idea_count` minus the latest snapshot at least 20 hours earlier, else `null` |
| `delta_3d` | `idea_count` minus the latest snapshot at least 68 hours earlier, else `null` |
| `fill_ratio` | `idea_count / idea_cap` |

Hotness is `delta_1d` / `delta_3d`. The portal has no history; we only get these after a second (and fourth) successful run.

## JSON layout

```text
data/
  latest.json
  snapshots/YYYY-MM-DDTHHMMZ.json
```

`latest.json` and each snapshot share this shape:

```json
{
  "source_url": "https://www.sih.gov.in/sih2026PS",
  "scraped_at": "2026-08-21T16:00:00Z",
  "page_ps_count": 226,
  "records": [ { "...one PS..." } ]
}
```

Each record uses the fields above. `records` is sorted by:

1. `idea_count` ascending (least competition first)
2. `delta_1d` ascending, `null` last (least hot first; unknown heat does not beat known-cold)
3. `ps_number` ascending (stable)

No separate ranked file. The array order is the ranking. Filters are just fields.

Overwrite `latest.json` only after validation passes. Always write a new snapshot file on a successful run; never mutate an old snapshot.

## Accuracy gate

Fail with a non-zero exit and do not write `latest.json` if any of these fail:

1. HTTP status is not 200, or body is shorter than 100 KB.
2. Unique `ps_number` values matching `SIH26\\d{3}` do not equal the number of listing rows parsed.
3. `page_ps_count` from the parsed table does not equal `len(records)`.
4. Any record is missing `ps_number`, `title`, `organization`, `category`, `theme`, `deadline`, `idea_count`, `idea_cap`, or `description_text`.
5. `idea_count` / `idea_cap` does not parse from a cell matching `^\\d+/\\d+$`.
6. `category` is not exactly `Software` or `Hardware`.
7. Modal `ps_id` does not equal the digits of `ps_number` (e.g. `26001` vs `SIH26001`).
8. Duplicate `ps_number`.

Print a one-line summary on success: record count, software/hardware split, idea-count min/max/sum.

## Components

- `scrape.py` — fetch, parse, validate, write JSON. One command, no flags required.
- `requirements.txt` — `requests`, `beautifulsoup4`.
- Optional later: Playwright fetch path behind an explicit flag, only if HTML fetch is blocked.

Parser targets:

- Listing table `#dataTablePS tbody > tr` (top-level rows, not modal tables).
- Idea count from the listing row cells, not from modal text.
- Description from that row’s modal body.

## Error handling

- Network/WAF errors: exit 1 with the status code and URL used.
- Parse/validation errors: exit 2 with the first failing rule and a count of bad rows.
- Do not write partial `latest.json`. A snapshot may only be written for a fully valid parse.

## Testing

- Fixture: save one real HTML dump as `tests/fixtures/sih2026ps.sample.html` (redact nothing; it is public).
- Unit test: parse the fixture, expect 226 unique `ps_number`s, 172 Software, 54 Hardware, all idea counts `0/500` as of 2026-08-21 capture, `SIH26001` title and description contain “landslide”.
- If the live page adds/removes PS, the fixture test stays pinned; the live run’s accuracy gate uses whatever count the page currently has.

## Out of scope

- Frontend / dashboard
- AI ranking of “winnability” or demo-ability
- Excel export
- Auto-assigning PS to team members
- Committing snapshots on a schedule (run locally whenever you want a new reading)
