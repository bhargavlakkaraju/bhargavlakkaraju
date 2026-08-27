#!/usr/bin/env bash
# Per-boot startup for FinFlow: bring up PostgreSQL, ensure the app database
# exists and matches the Prisma schema, and seed demo data once. Must tolerate
# being run on every boot, so every step is idempotent.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PG_VERSION="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $1}')"
PG_VERSION="${PG_VERSION:-16}"

# Start the cluster if it is not already online.
if ! sudo pg_lsclusters -h 2>/dev/null | grep -q online; then
  sudo pg_ctlcluster "$PG_VERSION" main start || true
fi

# Wait for PostgreSQL to accept connections.
for _ in $(seq 1 30); do
  if pg_isready -q -h localhost -p 5432; then break; fi
  sleep 1
done

# Ensure the application role and database exist.
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='finflow'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE finflow LOGIN PASSWORD 'finflow';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='finflow'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE finflow OWNER finflow;"

# Ensure local env vars exist (install.sh normally creates these).
if [ ! -f .env ]; then
  SECRET="$(openssl rand -base64 32)"
  cat > .env <<EOF
DATABASE_URL="postgresql://finflow:finflow@localhost:5432/finflow?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${SECRET}"
EOF
fi

# Export the variables so tools that do not auto-load .env (the tsx seed script's
# PrismaClient) can see DATABASE_URL. The Prisma CLI loads .env on its own, but
# `npm run db:seed` does not.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# Sync the schema to the database (idempotent).
npx prisma db push --skip-generate

# Seed demo data only when the database is empty.
USER_COUNT="$(PGPASSWORD=finflow psql -h localhost -U finflow -d finflow -tAc 'SELECT count(*) FROM "User"' 2>/dev/null | tr -d '[:space:]' || echo 0)"
if [ "${USER_COUNT:-0}" = "0" ]; then
  echo "Seeding demo data..."
  npm run db:seed
else
  echo "Database already has ${USER_COUNT} user(s); skipping seed."
fi

echo "start.sh complete."
