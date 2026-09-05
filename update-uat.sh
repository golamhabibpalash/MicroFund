#!/bin/bash
# =============================================================================
# Unity MicroFund — UAT/Dev Update Script
# Pulls latest code and rebuilds the UAT instance only.
# Triggered by GitHub Actions on every push to the `uat` branch.
#
# This is the UAT counterpart to update.sh (which targets production).
#
# PREREQUISITES (one-time, already done during UAT setup):
#   - /var/www/unitymicrofund-uat/repo — cloned repository (branch: uat)
#   - unitymicrofund-uat-api systemd service set up (port 5249)
#   - MariaDB database `unitymicrofund_uat`, user `umf_uat`
#
# /root/.unitymicrofund-uat format (server-only secrets, NOT in git):
#   DB_NAME="unitymicrofund_uat"
#   DB_USER="umf_uat"
#   DB_PASS="..."
#   JWT_SECRET="..."
#   DOMAIN="dev.unitymicrofund.com"
#   GOOGLE_CLIENT_ID=""
#   GOOGLE_CLIENT_SECRET=""
#   EMAIL_HOST="smtp.gmail.com"
#   EMAIL_PORT="587"
#   EMAIL_USERNAME="uat-disabled@unitymicrofund.com"
#   EMAIL_PASSWORD=""
#   EMAIL_FROM="uat-disabled@unitymicrofund.com"
# =============================================================================

set -euo pipefail

SECRETS_FILE="/root/.unitymicrofund-uat"
[[ -f "$SECRETS_FILE" ]] || { echo "ERROR: $SECRETS_FILE not found. Create it first (see header)."; exit 1; }
# shellcheck source=/dev/null
source "$SECRETS_FILE"

# Normalize optional values so `set -u` cannot crash mid-deploy.
EMAIL_HOST="${EMAIL_HOST:-}";       EMAIL_PORT="${EMAIL_PORT:-}"
EMAIL_USERNAME="${EMAIL_USERNAME:-}"; EMAIL_PASSWORD="${EMAIL_PASSWORD:-}"
EMAIL_FROM="${EMAIL_FROM:-}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

# Validate critical config BEFORE any destructive step.
__missing=""
for __v in DOMAIN DB_NAME DB_USER DB_PASS JWT_SECRET; do
    [[ -z "${!__v:-}" ]] && __missing="${__missing} ${__v}"
done
if [[ -n "${__missing}" ]]; then
    echo "ERROR: missing/empty required config in ${SECRETS_FILE}:${__missing}"
    echo "Aborting BEFORE any change — the current UAT site is left untouched."
    exit 1
fi

APP_DIR="/var/www/unitymicrofund-uat"
REPO_DIR="${APP_DIR}/repo"
API_DIR="${APP_DIR}/api"
WEB_DIR="${APP_DIR}/web"
UPLOADS_DIR="${APP_DIR}/uploads"
SERVICE_NAME="unitymicrofund-uat-api"
SERVICE_USER="unitymicrofund-uat"
API_PORT="5249"
MAINTENANCE_FLAG="${APP_DIR}/.maintenance"

log()  { echo "[$(date +%T)] ✓  $*"; }
info() { echo "[$(date +%T)] →  $*"; }

# Always remove maintenance flag on exit (success or failure)
trap 'rm -f "${MAINTENANCE_FLAG}"; nginx -s reload 2>/dev/null || true' EXIT

# =============================================================================
# 1. Code source
#    The GitHub Actions workflow (deploy-uat.yml) uploads the `uat` branch
#    source via SCP into ${REPO_DIR}. This script does NOT git-fetch here,
#    because the repo is private and the server has no GitHub credentials.
# =============================================================================
info "Building from uploaded source at ${REPO_DIR}"
if [[ ! -f "${REPO_DIR}/UnityMicroFund/UnityMicroFund.API/UnityMicroFund.API.csproj" ]]; then
    echo "ERROR: source not found at ${REPO_DIR}/UnityMicroFund/... Are any files uploaded?"
    exit 1
fi
log "Source tree present"

# =============================================================================
# 2. Maintenance mode — enable
# =============================================================================
cp "${REPO_DIR}/maintenance.html" "${APP_DIR}/maintenance.html" 2>/dev/null || true
touch "${MAINTENANCE_FLAG}"
nginx -s reload
log "UAT maintenance ON"

# =============================================================================
# 3. Build Angular
# =============================================================================
info "Building UAT Angular..."
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
log "UAT Angular built → ${WEB_DIR}"

# =============================================================================
# 4. Publish .NET API
# =============================================================================
info "Publishing UAT .NET API..."
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
mkdir -p "${UPLOADS_DIR}/receipts" "${UPLOADS_DIR}/member" "${UPLOADS_DIR}/organization" "${UPLOADS_DIR}/investment" "${API_DIR}/logs"

cat > "${API_DIR}/appsettings.Production.json" <<APPSETTINGS
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=127.0.0.1;Port=3306;Database=${DB_NAME};User=${DB_USER};Password=${DB_PASS};SslMode=none;Protocol=TCP;AllowUserVariables=True;UseAffectedRows=False"
  },
  "Jwt": {
    "Secret": "${JWT_SECRET}",
    "Issuer": "UnityMicroFund-UAT",
    "Audience": "UnityMicroFund-UAT",
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
    "FromName": "UnityMicroFund UAT",
    "UseSsl": "true"
  },
  "AdminUser": {
    "Email": "admin@unitymicrofund.com"
  },
  "Uploads": {
    "MemberImagesPath": "${APP_DIR}/uploads/member",
    "OrganizationPath": "${APP_DIR}/uploads/organization"
  },
  "Cors": {
    "AllowedOrigins": ["https://${DOMAIN}", "http://${DOMAIN}"]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  }
}
APPSETTINGS
chmod 600 "${API_DIR}/appsettings.Production.json"
log "UAT API published → ${API_DIR}"

# =============================================================================
# 5. Fix permissions and restart UAT service
# =============================================================================
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"
chmod -R 755 "${WEB_DIR}"
chmod 750 "${API_DIR}"
chmod 700 "${UPLOADS_DIR}/receipts"
chown "${SERVICE_USER}:${SERVICE_USER}" "${API_DIR}/logs"
chmod 644 "${APP_DIR}/maintenance.html" 2>/dev/null || true

systemctl restart "${SERVICE_NAME}"
log "UAT service '${SERVICE_NAME}' restarted"

# =============================================================================
# 6. Maintenance mode — disable (trap also handles on failure)
# =============================================================================
rm -f "${MAINTENANCE_FLAG}"
nginx -s reload
log "UAT maintenance OFF — UAT is live"

echo ""
echo "========================================"
echo "  UAT deployment complete!"
echo "  https://${DOMAIN}"
echo "========================================"
