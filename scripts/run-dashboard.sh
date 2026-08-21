#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web" && npm run build
cd "$ROOT"
exec python -m dashboard
