# SIH PS Dashboard — Operator Runbook

Private-team dashboard for browsing SIH 2026 problem statements. Runs on a laptop: cron scrapes every 6 hours; ngrok exposes the app over HTTPS.

## Prerequisites

- Python 3 with a project virtualenv at `.venv/`
- Node.js/npm for the SPA build
- [ngrok](https://ngrok.com/) (free tier is fine for team use)

## 1. Environment variables

Create a `.env` file in the repo root (gitignored) **or** export before starting the dashboard:

```bash
export SIH_DASHBOARD_PASSWORD='your-team-shared-password'
export SIH_SESSION_SECRET='a-long-random-string-at-least-32-characters'
```

| Variable | Purpose |
|----------|---------|
| `SIH_DASHBOARD_PASSWORD` | Shared login password for the team |
| `SIH_SESSION_SECRET` | HMAC key for signed session cookies; use a cryptographically random value |

Generate a session secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Both variables are **required** at startup; the app exits with an error if either is missing.

## 2. Install dependencies

From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd web && npm install && cd ..
```

## 3. Start the dashboard

`scripts/run-dashboard.sh` builds the SPA and starts uvicorn on **`127.0.0.1:8000`** (localhost only).

**Important:** the script does not activate `.venv` or load env vars. Do both before running:

```bash
cd /home/loki/projects/SIH
source .venv/bin/activate
export SIH_DASHBOARD_PASSWORD='…'
export SIH_SESSION_SECRET='…'
./scripts/run-dashboard.sh
```

Alternatively, source a `.env` file if you keep one:

```bash
set -a && source .env && set +a
./scripts/run-dashboard.sh
```

Verify locally:

```bash
curl -s http://127.0.0.1:8000/api/health
# {"ok":true}
```

Open `http://127.0.0.1:8000` in a browser, log in, and confirm the dashboard loads.

## 4. Expose via ngrok

In a **second terminal** (leave the dashboard running):

```bash
ngrok http 8000
```

Copy the **HTTPS** forwarding URL (e.g. `https://abc123.ngrok-free.app`).

- Share the ngrok URL **and** the dashboard password only with trusted team members.
- Do not commit or post either value publicly.
- Session cookies use `Secure` when the request arrives over HTTPS (ngrok).

## 5. Optional ngrok hardening

These are operator choices, not required for v1:

- **IP allowlist** — ngrok dashboard → your tunnel → Restrict IPs to team/office ranges.
- **OAuth / SSO** — ngrok can require Google/GitHub login before reaching the tunnel (adds a layer before the app password).

The app password remains the primary access control either way.

## 6. Scrape cron (every 6 hours)

The scraper runs independently of the web UI. It writes `data/latest.json` and snapshots under `data/snapshots/`.

Create the log directory once:

```bash
mkdir -p /home/loki/projects/SIH/logs
```

Add to crontab (`crontab -e`):

```cron
0 */6 * * * cd /home/loki/projects/SIH && /home/loki/projects/SIH/.venv/bin/python scrape.py >> /home/loki/projects/SIH/logs/scrape.log 2>&1
```

Adjust paths if the repo or venv live elsewhere. Use the venv Python so scraper deps match `requirements.txt`.

Manual test:

```bash
cd /home/loki/projects/SIH
.venv/bin/python scrape.py
```

Check `logs/scrape.log` after the first scheduled run.

## 7. Verify data refresh

After cron (or a manual scrape):

1. Log in to the dashboard (local or ngrok URL).
2. Check the header **“Last scraped”** timestamp — it reflects `scraped_at` from `data/latest.json`.
3. Refresh the page; the time should match the latest cron run (within a few minutes of `:00` on 6-hour boundaries).

If stale, inspect `logs/scrape.log` and confirm `data/latest.json` was updated:

```bash
grep scraped_at data/latest.json | head -1
```

## 8. Security reminders

| Topic | Notes |
|-------|-------|
| Password ≠ DoS protection | A shared password stops casual browsing; it does **not** stop determined abuse or volumetric attacks. |
| Rate limits | App enforces ~60 req/min globally and ~5 req/min on `POST /login` (HTTP 429). This blunts brute-force and casual flooding but is not enterprise DDoS mitigation. |
| Bind localhost | uvicorn listens on `127.0.0.1:8000` only; ngrok is the sole public ingress. Do not bind `0.0.0.0` without additional firewalling. |
| No scrape trigger | There is **no** HTTP endpoint to trigger a scrape. Scraping happens only via cron or running `scrape.py` on the host. |
| Secrets | Never commit `.env`, passwords, or ngrok authtokens. `.env` and `logs/` are gitignored. |

## Quick reference

```bash
# Terminal 1 — dashboard
source .venv/bin/activate && set -a && source .env && set +a && ./scripts/run-dashboard.sh

# Terminal 2 — tunnel
ngrok http 8000

# One-off scrape
.venv/bin/python scrape.py

# Tail scrape logs
tail -f logs/scrape.log
```
