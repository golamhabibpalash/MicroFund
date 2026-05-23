#!/bin/bash
# =============================================================================
# Unity MicroFund — Lightweight Update Script
# Runs on the server to pull latest code and rebuild.
# Triggered automatically by GitHub Actions on every push to main.
#
# PREREQUISITES (one-time, done by deploy.sh):
#   - /root/.unitymicrofund  — server secrets file (see below)
#   - /var/www/unitymicrofund/repo — cloned repository
#   - unitymicrofund-api systemd service set up
#
# /root/.unitymicrofund format:
#   GOOGLE_CLIENT_ID="..."
#   GOOGLE_CLIENT_SECRET="..."
#   JWT_SECRET="..."
#   DB_NAME="microfundDb"
#   DB_USER="microfund"
#   DB_PASS="..."
#   EMAIL_HOST="smtp.gmail.com"
#   EMAIL_PORT="587"
#   EMAIL_USERNAME="..."
#   EMAIL_PASSWORD="..."
#   EMAIL_FROM="..."
#   DOMAIN="app.unitymicrofund.com"
# =============================================================================

set -euo pipefail

SECRETS_FILE="/root/.unitymicrofund"
[[ -f "$SECRETS_FILE" ]] || { echo "ERROR: $SECRETS_FILE not found. Run deploy.sh first."; exit 1; }
# shellcheck source=/dev/null
source "$SECRETS_FILE"

APP_DIR="/var/www/unitymicrofund"
REPO_DIR="${APP_DIR}/repo"
API_DIR="${APP_DIR}/api"
WEB_DIR="${APP_DIR}/web"
UPLOADS_DIR="${APP_DIR}/uploads/receipts"
SERVICE_NAME="unitymicrofund-api"
SERVICE_USER="unitymicrofund"
MAINTENANCE_FLAG="${APP_DIR}/.maintenance"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

log()  { echo "[$(date +%T)] ✓  $*"; }
info() { echo "[$(date +%T)] →  $*"; }

# Always remove maintenance flag on exit (success or failure)
trap 'rm -f "${MAINTENANCE_FLAG}"; nginx -s reload 2>/dev/null || true' EXIT

# =============================================================================
# 1. Pull latest code
# =============================================================================

info "Pulling latest code..."
git config --global --add safe.directory "${REPO_DIR}" 2>/dev/null || true
git -C "${REPO_DIR}" fetch --all -q
git -C "${REPO_DIR}" reset --hard "origin/main" -q
git -C "${REPO_DIR}" clean -fd -q
log "Code updated to $(git -C "${REPO_DIR}" rev-parse --short HEAD)"

# =============================================================================
# 2. Maintenance mode — enable
# =============================================================================

# Copy latest maintenance page from repo
cp "${REPO_DIR}/maintenance.html" "${APP_DIR}/maintenance.html"

# Patch Nginx config to support maintenance mode (one-time, idempotent)
if [[ -f "${NGINX_CONF}" ]] && ! grep -q '\.maintenance' "${NGINX_CONF}"; then
    info "Adding maintenance mode support to Nginx config..."
    python3 - "${NGINX_CONF}" <<'PYSCRIPT'
import re, sys

with open(sys.argv[1]) as f:
    conf = f.read()

# Insert maintenance check into "location / {" block
conf = re.sub(
    r'(location / \{)',
    r'\1\n        if (-f /var/www/unitymicrofund/.maintenance) { return 503; }',
    conf
)

# Append error_page + @maintenance location before the final closing brace
maintenance_block = (
    '\n    error_page 503 @maintenance;\n'
    '    location @maintenance {\n'
    '        root /var/www/unitymicrofund;\n'
    '        try_files /maintenance.html =503;\n'
    '        internal;\n'
    '    }\n'
)
conf = re.sub(r'\n\}(\s*)$', maintenance_block + r'\n}\1', conf)

with open(sys.argv[1], 'w') as f:
    f.write(conf)

print("Nginx config patched with maintenance mode support")
PYSCRIPT
    nginx -t && nginx -s reload
    log "Nginx config updated"
fi

# Enable maintenance page
touch "${MAINTENANCE_FLAG}"
nginx -s reload
log "Maintenance mode ON — site shows maintenance page"

# =============================================================================
# 3. Build Angular
# =============================================================================

info "Building Angular..."
WEB_SRC="${REPO_DIR}/UnityMicroFund/unitymicrofund_web"
ENV_DIR="${WEB_SRC}/src/environments"
mkdir -p "${ENV_DIR}"

cat > "${ENV_DIR}/environment.prod.ts" <<ENVTS
export const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId: '${GOOGLE_CLIENT_ID}',
  facebookAppId: ''
};
ENVTS

cd "${WEB_SRC}"
npm install --prefer-offline --silent 2>&1 | tail -3
ng build --configuration production

ANGULAR_DIST="${WEB_SRC}/dist/unitymicrofund_web/browser"
[[ ! -d "${ANGULAR_DIST}" ]] && { echo "ERROR: Angular build output not found"; exit 1; }

mkdir -p "${WEB_DIR}"
rsync -a --delete "${ANGULAR_DIST}/" "${WEB_DIR}/"
log "Angular built → ${WEB_DIR}"

# =============================================================================
# 4. Publish .NET API
# =============================================================================

info "Publishing .NET API..."
API_SRC_DIR="${REPO_DIR}/UnityMicroFund/UnityMicroFund.API"
API_SRC="${API_SRC_DIR}/UnityMicroFund.API.csproj"

rm -rf "${API_SRC_DIR}/obj" "${API_SRC_DIR}/bin" "${API_DIR}"
mkdir -p "${API_DIR}"
dotnet restore "${API_SRC}" --verbosity quiet
dotnet publish "${API_SRC}" \
    --configuration Release \
    --output "${API_DIR}" \
    --no-self-contained \
    --runtime linux-x64 \
    --verbosity minimal

[[ ! -f "${API_DIR}/UnityMicroFund.API.dll" ]] && { echo "ERROR: API publish failed"; exit 1; }

[[ -d "${API_SRC_DIR}/tessdata" ]] && cp -r "${API_SRC_DIR}/tessdata" "${API_DIR}/tessdata"
mkdir -p "${UPLOADS_DIR}" "${API_DIR}/logs"

cat > "${API_DIR}/appsettings.Production.json" <<APPSETTINGS
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=127.0.0.1;Port=3306;Database=${DB_NAME};User=${DB_USER};Password=${DB_PASS};SslMode=none;Protocol=TCP;AllowUserVariables=True;UseAffectedRows=False"
  },
  "Jwt": {
    "Secret": "${JWT_SECRET}",
    "Issuer": "UnityMicroFund",
    "Audience": "UnityMicroFund",
    "ExpiryMinutes": 60,
    "RefreshTokenValidityDays": 7
  },
  "Google": {
    "ClientId": "${GOOGLE_CLIENT_ID}",
    "ClientSecret": "${GOOGLE_CLIENT_SECRET}",
    "RedirectUri": "https://${DOMAIN}/api/auth/google-callback"
  },
  "Email": {
    "Host": "${EMAIL_HOST}",
    "Port": "${EMAIL_PORT}",
    "Username": "${EMAIL_USERNAME}",
    "Password": "${EMAIL_PASSWORD}",
    "From": "${EMAIL_FROM}",
    "FromName": "UnityMicroFund",
    "UseSsl": "true"
  },
  "AdminUser": {
    "Email": "admin@unitymicrofund.com"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  }
}
APPSETTINGS
chmod 600 "${API_DIR}/appsettings.Production.json"
log "API published → ${API_DIR}"

# =============================================================================
# 5. Fix permissions and restart service
# =============================================================================

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"
chmod -R 755 "${WEB_DIR}"
chmod 750 "${API_DIR}"
chmod 700 "${UPLOADS_DIR}"
chown "${SERVICE_USER}:${SERVICE_USER}" "${API_DIR}/logs"
# Keep maintenance.html readable by nginx
chmod 644 "${APP_DIR}/maintenance.html"

systemctl restart "${SERVICE_NAME}"
log "Service '${SERVICE_NAME}' restarted"

# =============================================================================
# 6. Maintenance mode — disable (trap also handles this on failure)
# =============================================================================

rm -f "${MAINTENANCE_FLAG}"
nginx -s reload
log "Maintenance mode OFF — site is live"

echo ""
echo "========================================"
echo "  Deployment complete!"
echo "========================================"
