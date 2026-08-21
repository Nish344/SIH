import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from sih_scraper.fetch import FetchError, fetch_page
from sih_scraper.history import load_snapshots
from sih_scraper.pipeline import build_payload
from sih_scraper.validate import ValidationError
from sih_scraper.write import write_payload

app = Flask(__name__, static_folder="static", static_url_path="")
DATA_DIR = Path("data")
LATEST_JSON = DATA_DIR / "latest.json"


def get_latest_data():
    if not LATEST_JSON.exists():
        return {"records": [], "scraped_at": None, "page_ps_count": 0}
    with open(LATEST_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/records", methods=["GET"])
def api_records():
    data = get_latest_data()
    records = data.get("records", [])

    search = request.args.get("search", "").strip().lower()
    categories = request.args.getlist("category") or ([request.args.get("category")] if request.args.get("category") else [])
    themes = request.args.getlist("theme") or ([request.args.get("theme")] if request.args.get("theme") else [])
    organizations = request.args.getlist("organization") or ([request.args.get("organization")] if request.args.get("organization") else [])

    min_ideas = request.args.get("min_ideas", type=int)
    max_ideas = request.args.get("max_ideas", type=int)
    min_fill = request.args.get("min_fill", type=float)
    max_fill = request.args.get("max_fill", type=float)

    sort_by = request.args.get("sort_by", "serial")
    order = request.args.get("order", "asc")

    categories = [c for c in categories if c]
    themes = [t for t in themes if t]
    organizations = [o for o in organizations if o]

    filtered = []
    for r in records:
        if categories and r.get("category") not in categories:
            continue
        if themes and r.get("theme") not in themes:
            continue
        if organizations and r.get("organization") not in organizations:
            continue

        idea_cnt = r.get("idea_count") if r.get("idea_count") is not None else 0
        if min_ideas is not None and idea_cnt < min_ideas:
            continue
        if max_ideas is not None and idea_cnt > max_ideas:
            continue

        fill_pct = (r.get("fill_ratio") * 100) if r.get("fill_ratio") is not None else 0.0
        if min_fill is not None and fill_pct < min_fill:
            continue
        if max_fill is not None and fill_pct > max_fill:
            continue

        if search:
            searchable_text = f"{r.get('title', '')} {r.get('ps_number', '')} {r.get('organization', '')} {r.get('description_text', '')} {r.get('theme', '')} {r.get('department', '')}".lower()
            if search not in searchable_text:
                continue

        filtered.append(r)

    # Sorting
    reverse = (order == "desc")
    if sort_by in ["serial", "idea_count", "idea_cap", "fill_ratio"]:
        filtered.sort(key=lambda x: (x.get(sort_by) if x.get(sort_by) is not None else -1), reverse=reverse)
    elif sort_by in ["title", "organization", "category", "theme", "ps_number", "deadline"]:
        filtered.sort(key=lambda x: (str(x.get(sort_by) or "").lower()), reverse=reverse)

    return jsonify({
        "total": len(filtered),
        "all_total": len(records),
        "scraped_at": data.get("scraped_at"),
        "records": filtered,
    })


@app.route("/api/stats", methods=["GET"])
def api_stats():
    data = get_latest_data()
    records = data.get("records", [])

    categories = {}
    themes = {}
    organizations = {}
    idea_counts = []
    total_ideas = 0
    total_cap = 0
    fill_ratios = []

    for r in records:
        cat = r.get("category", "Unknown")
        categories[cat] = categories.get(cat, 0) + 1

        thm = r.get("theme", "Uncategorized")
        themes[thm] = themes.get(thm, 0) + 1

        org = r.get("organization", "Unknown")
        organizations[org] = organizations.get(org, 0) + 1

        ic = r.get("idea_count") if r.get("idea_count") is not None else 0
        cap = r.get("idea_cap") if r.get("idea_cap") is not None else 0
        total_ideas += ic
        total_cap += cap
        idea_counts.append(ic)

        if r.get("fill_ratio") is not None:
            fill_ratios.append(r["fill_ratio"])

    avg_fill_ratio = (sum(fill_ratios) / len(fill_ratios)) if fill_ratios else 0.0
    max_idea_val = max(idea_counts) if idea_counts else 500
    min_idea_val = min(idea_counts) if idea_counts else 0

    sorted_orgs = dict(sorted(organizations.items(), key=lambda x: x[1], reverse=True))
    sorted_themes = dict(sorted(themes.items(), key=lambda x: x[1], reverse=True))

    return jsonify({
        "total_ps": len(records),
        "scraped_at": data.get("scraped_at"),
        "total_ideas": total_ideas,
        "total_cap": total_cap,
        "avg_fill_ratio": round(avg_fill_ratio, 4),
        "min_ideas": min_idea_val,
        "max_ideas": max_idea_val,
        "categories": categories,
        "themes": sorted_themes,
        "organizations": sorted_orgs,
    })


@app.route("/api/scrape", methods=["POST"])
def api_scrape():
    try:
        html = fetch_page()
        scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        snapshots = load_snapshots(DATA_DIR)
        payload = build_payload(html, scraped_at, snapshots)
        write_payload(payload, DATA_DIR)
        return jsonify({"success": True, "message": "Scrape completed successfully", "ps_count": payload["page_ps_count"]})
    except FetchError as exc:
        return jsonify({"success": False, "error": f"Fetch failed: HTTP {exc.status} {exc.url}"}), 502
    except ValidationError as exc:
        return jsonify({"success": False, "error": f"Validation failed: rule {exc.rule}"}), 422
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
