#!/usr/bin/env bash
# Idempotent dependency install for FinFlow, run after the repo is checked out.
# System packages (PostgreSQL) come from the base snapshot; this only refreshes
# JS dependencies, generates the Prisma client, and ensures a local .env exists.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# next-auth declares nodemailer 7 as an optional peer while this project pins
# nodemailer 6 (email is a placeholder here), so install with legacy peer deps.
# postinstall runs `prisma generate`.
npm ci --legacy-peer-deps

# Local development environment variables. These are non-secret values for a
# throwaway local Postgres instance; real deployments override them.
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
