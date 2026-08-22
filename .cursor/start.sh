#!/usr/bin/env bash
# Per-boot reconciliation: ensure PostgreSQL is running before agents/servers use it.
# Must tolerate restarts and return once the service is ready.
set -euo pipefail

PG_VERSION=16

sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    echo "PostgreSQL is ready."
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time." >&2
exit 1
