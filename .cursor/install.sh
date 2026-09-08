#!/usr/bin/env bash
# Idempotent setup for FinFlow, run after the repo is checked out.
# Installs PostgreSQL (so the environment is self-contained on the default base
# image), refreshes JS dependencies, generates the Prisma client, and ensures a
# local .env exists. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- PostgreSQL (system package) -------------------------------------------
# Install only if the server binaries are not already present so repeated runs
# are fast no-ops.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "Installing PostgreSQL..."
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql postgresql-contrib
fi

# --- JavaScript dependencies -----------------------------------------------
# next-auth declares nodemailer 7 as an optional peer while this project pins
# nodemailer 6 (email is a placeholder here), so install with legacy peer deps.
# postinstall runs `prisma generate`.
npm ci --legacy-peer-deps

# --- Local environment variables -------------------------------------------
# Non-secret values for a throwaway local Postgres instance; real deployments
# override them.
if [ ! -f .env ]; then
  SECRET="$(openssl rand -base64 32)"
  cat > .env <<EOF
DATABASE_URL="postgresql://finflow:finflow@localhost:5432/finflow?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${SECRET}"
EOF
  echo "Created .env with a generated NEXTAUTH_SECRET."
fi

echo "install.sh complete."
