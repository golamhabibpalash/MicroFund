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

# Normalize optional values so `set -u` cannot crash mid-deploy if a key is
# absent from the secrets file.
EMAIL_HOST="${EMAIL_HOST:-}";       EMAIL_PORT="${EMAIL_PORT:-}"
EMAIL_USERNAME="${EMAIL_USERNAME:-}"; EMAIL_PASSWORD="${EMAIL_PASSWORD:-}"
EMAIL_FROM="${EMAIL_FROM:-}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

# Validate critical config BEFORE any destructive step (no maintenance mode,
# no rm, no rebuild). If the secrets file is incomplete, abort cleanly so the
# CURRENT live site keeps running instead of shipping a broken build — this is
# what prevents "Google sign-in is not configured" from recurring after a deploy.
__missing=""
for __v in DOMAIN DB_NAME DB_USER DB_PASS JWT_SECRET GOOGLE_CLIENT_ID; do
    [[ -z "${!__v:-}" ]] && __missing="${__missing} ${__v}"
done
if [[ -n "${__missing}" ]]; then
    echo "ERROR: missing/empty required config in ${SECRETS_FILE}:${__missing}"
    echo "Aborting BEFORE any change — the current live site is left untouched."
    echo "Fix the value(s), then re-run: sudo bash ${BASH_SOURCE[0]}"
    exit 1
fi

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

# Patch Nginx config — ensure correct maintenance mode support (idempotent)
# Runs whenever the new-style block is absent (handles first install and
# servers that still have the old @maintenance named-location approach).
if [[ -f "${NGINX_CONF}" ]] && ! grep -q 'location = /maintenance.html' "${NGINX_CONF}"; then
    info "Patching Nginx config for maintenance mode..."
    python3 - "${NGINX_CONF}" <<'PYSCRIPT'
import re, sys

with open(sys.argv[1]) as f:
    conf = f.read()

# Remove old-style @maintenance named location blocks (if present)
conf = re.sub(
    r'\n[ \t]*error_page 503 @maintenance;[ \t]*'
    r'\n[ \t]*location @maintenance \{[^}]*\}',
    '',
    conf,
    flags=re.DOTALL
)
# Remove old-style if-check (may have been inserted by a previous patch)
conf = re.sub(
    r'\n[ \t]*if \(-f /var/www/unitymicrofund/\.maintenance\) \{ return 503; \}',
    '',
    conf
)

# Insert correct maintenance block before "location / {"
maintenance_block = (
    '    error_page 503 /maintenance.html;\n'
    '    location = /maintenance.html {\n'
    '        root /var/www/unitymicrofund;\n'
    '        add_header Cache-Control "no-cache" always;\n'
    '    }\n\n'
)
maintenance_if = (
    '        if (-f /var/www/unitymicrofund/.maintenance) { return 503; }\n'
)

conf = conf.replace('    location / {', maintenance_block + '    location / {', 1)
conf = conf.replace('    location / {\n', '    location / {\n' + maintenance_if, 1)

with open(sys.argv[1], 'w') as f:
    f.write(conf)

print("Nginx config updated with correct maintenance mode support")
PYSCRIPT
    nginx -t && nginx -s reload
    log "Nginx config patched"
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
  "Uploads": {
    "MemberImagesPath": "/var/www/unitymicrofund/uploads/member",
    "OrganizationPath": "/var/www/unitymicrofund/uploads/organization"
  },
  "Cors": {
    "AllowedOrigins": ["https://${DOMAIN}", "http://${DOMAIN}"]
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

# Ensure upload subdirectories exist
mkdir -p "${APP_DIR}/uploads/member" "${APP_DIR}/uploads/organization"

# Ensure systemd ReadWritePaths covers the whole uploads dir (not just receipts)
SVCFILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [[ -f "${SVCFILE}" ]] && grep -q 'ReadWritePaths=.*uploads/receipts' "${SVCFILE}"; then
    sed -i 's|ReadWritePaths=.*/uploads/receipts|ReadWritePaths=/var/www/unitymicrofund/uploads|' "${SVCFILE}"
    systemctl daemon-reload
    log "Systemd service ReadWritePaths updated to cover full uploads directory"
fi

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
