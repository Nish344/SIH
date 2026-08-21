# SIH 2026 Problem Statement Scraper & Explorer

An automated data pipeline, validator, and interactive web dashboard for exploring and analyzing **Smart India Hackathon (SIH) 2026** problem statements in real time.

Repository: `git@github.com:nikhil-r0/SIH-scraper.git`

---

## Features

- **Automated Data Scraping**: Scrapes problem statements, category, organization, theme, capacity fill ratio, HTML description, YouTube links, and dataset URLs directly from the official SIH portal.
- **Data Validation & History Tracking**: Validates payload schema and maintains historical snapshots (`data/snapshots/` and `data/latest.json`).
- **Interactive Web Dashboard**: Glassmorphism UI for filtering, searching, and visualizing problem statements.
- **Minute Submissions Control**: Filter by exact submission counts (`0`, `1-50`, `51-200`, `200+`), min/max numerical inputs, or capacity fill percentage sliders.
- **Organization & Theme Multi-Select**: Real-time searchable checkbox lists with live statement counts.
- **Grid & Table Views**: View statements as rich cards or compact table rows with detailed modal views.
- **Live Sync Button**: Re-scrape live data directly from the web interface.

---

## Quick Start & Run Instructions

### 1. Clone Repository
```bash
git clone git@github.com:nikhil-r0/SIH-scraper.git
cd SIH-scraper
```

### 2. Create & Activate Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run Scraper Pipeline
To fetch live SIH problem statements and update local snapshots:
```bash
python scrape.py
```

### 5. Run Automated Tests
```bash
pytest
```
*or:*
```bash
python -m pytest
```

### 6. Launch Web Frontend & Dashboard
```bash
python app.py
```
Open your browser and navigate to:
**`http://127.0.0.1:5000`**

---

## Project Structure

```text
SIH-scraper/
├── app.py                # Flask web server & REST API (/api/records, /api/stats, /api/scrape)
├── scrape.py             # CLI entrypoint for running the scraper
├── requirements.txt      # Python dependencies (requests, beautifulsoup4, pytest, flask)
├── sih_scraper/          # Core scraper python package
│   ├── fetch.py          # HTTP fetcher with user-agent & retry logic
│   ├── parse.py          # BeautifulSoup4 HTML parser for table & modal details
│   ├── pipeline.py       # Orchestration pipeline
│   ├── history.py        # Snapshot loader & delta computer
│   ├── validate.py       # Schema & data validator
│   └── write.py          # JSON serializer
├── static/               # Web frontend assets
│   ├── index.html        # Dashboard HTML interface
│   ├── styles.css        # Modern glassmorphism CSS design system
│   └── app.js            # Vanilla JS frontend application
├── data/                 # Scraped data storage
│   ├── latest.json       # Latest dataset snapshot
│   └── snapshots/        # Historical snapshots
└── tests/                # Pytest unit tests suite
```

---

## License

MIT License
