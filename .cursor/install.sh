#!/usr/bin/env bash
# Idempotent bootstrap for the Voyage development environment.
# Prepares PostgreSQL (port 5433, user/db "voyage" + "voyage_test") and installs
# the backend and frontend dependencies.
set -euo pipefail

PG_VERSION=16
PG_PORT=5433
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

echo "==> Ensuring PostgreSQL ${PG_VERSION} is installed"
if ! command -v psql >/dev/null 2>&1 || [ ! -d "/etc/postgresql/${PG_VERSION}" ]; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    "postgresql-${PG_VERSION}" "postgresql-client-${PG_VERSION}"
fi

echo "==> Configuring PostgreSQL to listen on port ${PG_PORT}"
sudo sed -i "s/^#\?port = .*/port = ${PG_PORT}/" "${PG_CONF}"

echo "==> Starting the PostgreSQL cluster"
sudo pg_ctlcluster "${PG_VERSION}" main start 2>/dev/null || \
  sudo pg_ctlcluster "${PG_VERSION}" main restart
# Wait until the server accepts connections.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -p "${PG_PORT}" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "==> Ensuring the voyage role and databases exist"
sudo -u postgres psql -p "${PG_PORT}" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'voyage') THEN
    CREATE ROLE voyage LOGIN PASSWORD 'voyage' CREATEDB SUPERUSER;
  END IF;
END $$;
SQL
sudo -u postgres psql -p "${PG_PORT}" -tc "SELECT 1 FROM pg_database WHERE datname='voyage'" \
  | grep -q 1 || sudo -u postgres createdb -p "${PG_PORT}" -O voyage voyage
sudo -u postgres psql -p "${PG_PORT}" -tc "SELECT 1 FROM pg_database WHERE datname='voyage_test'" \
  | grep -q 1 || sudo -u postgres createdb -p "${PG_PORT}" -O voyage voyage_test

# The backend and tests run TypeScript sources directly (e.g. `node src/index.ts`).
# Enable type stripping so this works on Node versions before 22.18, and keep the
# output quiet. Newer Node still accepts the flag.
NODE_OPTS_LINE='export NODE_OPTIONS="--experimental-strip-types --disable-warning=ExperimentalWarning"'
if ! grep -qF "$NODE_OPTS_LINE" "${HOME}/.bashrc" 2>/dev/null; then
  echo "$NODE_OPTS_LINE" >> "${HOME}/.bashrc"
fi

echo "==> Installing backend dependencies"
(cd "$(dirname "$0")/../be" && npm install)

echo "==> Installing frontend dependencies"
(cd "$(dirname "$0")/../fe" && npm install)

echo "==> Voyage environment ready"
