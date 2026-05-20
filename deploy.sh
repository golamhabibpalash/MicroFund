#!/bin/bash
# =============================================================================
# Unity MicroFund — VPS Deployment Script
# Ubuntu 22.04+ | MariaDB | .NET 10 | Angular 21 | Nginx | Let's Encrypt SSL
# =============================================================================
#
# BEFORE RUNNING:
#   1. Fill in every value in the CONFIGURATION section below
#   2. Point your domain DNS A record (and www) to this server's IP
#      and wait for DNS propagation before running (required for SSL)
#   3. Upload this script to the server, then run:
#        chmod +x deploy.sh && sudo bash deploy.sh
#
# Re-running this script later performs a code update (git pull + rebuild).
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION — fill in before running
# =============================================================================

GIT_REPO="https://github.com/golamhabibpalash/MicroFund.git"           # e.g. "https://github.com/youruser/yourrepo.git"
GIT_BRANCH="main"

DOMAIN="app.unitymicrofund.com"             # e.g. "microfund.example.com"
DOMAIN_WWW=""               # leave blank for subdomains (e.g. app.domain.com has no www)
LETSENCRYPT_EMAIL="unitymicrofund@gmail.com"  # notifications from Let's Encrypt

# Database
DB_NAME="microfundDb"
DB_USER="microfund"
DB_PASS="123AsD,./"            # leave blank to auto-generate a strong password
DB_ROOT_CURRENT_PASS=""        # existing MariaDB root password (required if MariaDB already has one)

# JWT  (leave blank to auto-generate a 48-byte random secret)
JWT_SECRET="MkUghuX/jZ4R3w550wVUjlOEhKayirv1WLk1VGcBWTGMhVwp5corMNWzSS0RWlty"
JWT_ISSUER="UnityMicroFund"
JWT_AUDIENCE="UnityMicroFund"
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_DAYS=7

# Google OAuth (optional — leave blank if not used)
GOOGLE_CLIENT_ID=""                              # replace with your Google OAuth Client ID
GOOGLE_CLIENT_SECRET=""                          # replace with your Google OAuth Client Secret

# Email / SMTP (optional — leave blank to skip)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USERNAME="unitymicrofund@gmail.com"
EMAIL_PASSWORD=""                                 # replace with your SMTP password
EMAIL_FROM="unitymicrofund@gmail.com"

# =============================================================================
# INTERNAL CONSTANTS — no need to change
# =============================================================================

API_PORT=5248
APP_DIR="/var/www/unitymicrofund"
REPO_DIR="${APP_DIR}/repo"
API_DIR="${APP_DIR}/api"
WEB_DIR="${APP_DIR}/web"
UPLOADS_DIR="${APP_DIR}/uploads/receipts"
SERVICE_NAME="unitymicrofund-api"
SERVICE_USER="unitymicrofund"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
CREDS_FILE="/root/.unitymicrofund-credentials"

# =============================================================================
# HELPERS
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[$(date +%T)] ✓  $*${NC}"; }
warn()    { echo -e "${YELLOW}[$(date +%T)] ⚠  $*${NC}"; }
info()    { echo -e "${BLUE}[$(date +%T)] →  $*${NC}"; }
error()   { echo -e "${RED}[$(date +%T)] ✗  $*${NC}" >&2; exit 1; }
section() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $*${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# PREFLIGHT CHECKS
# =============================================================================

section "Preflight Checks"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash $0"
[[ -z "$GIT_REPO"           ]] && error "GIT_REPO is not set"
[[ -z "$DOMAIN"             ]] && error "DOMAIN is not set"
[[ -z "$LETSENCRYPT_EMAIL"  ]] && error "LETSENCRYPT_EMAIL is not set"

# Auto-generate secrets if not provided
[[ -z "$DB_PASS"    ]] && DB_PASS="$(openssl rand -base64 24)"
[[ -z "$JWT_SECRET" ]] && JWT_SECRET="$(openssl rand -base64 48)"

# Build certbot domain flags
CERTBOT_DOMAINS="-d ${DOMAIN}"
[[ -n "$DOMAIN_WWW" ]] && CERTBOT_DOMAINS="${CERTBOT_DOMAINS} -d ${DOMAIN_WWW}"

log "Configuration valid"
echo ""
echo "  Domain   : ${DOMAIN}"
echo "  Git repo : ${GIT_REPO}"
echo "  App root : ${APP_DIR}"
echo "  API port : ${API_PORT} (internal, not exposed)"
echo ""

# =============================================================================
# 1. SYSTEM UPDATE & CORE PACKAGES
# =============================================================================

section "1 / 10 — System Update & Core Packages"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget gnupg2 lsb-release apt-transport-https ca-certificates \
    software-properties-common git ufw openssl rsync \
    tesseract-ocr tesseract-ocr-eng \
    build-essential

log "System packages ready"

# =============================================================================
# 2. MARIADB
# =============================================================================

section "2 / 10 — MariaDB"

# Check if native MariaDB service is running (not Docker-based)
if ! systemctl is-active --quiet mariadb 2>/dev/null; then
    info "Installing mariadb-client (server is in Docker)..."
    apt-get install -y -qq mariadb-client
    log "MariaDB client installed"
else
    log "Native MariaDB service active"
fi

# Try three connection methods in order:
# 1. Socket auth (works on fresh install where root has no password)
# 2. Socket with password (native MariaDB with root password set)
# 3. TCP with password (MariaDB in Docker with port 3306 mapped)
info "Connecting to MariaDB..."
if mariadb -u root -e "SELECT 1;" &>/dev/null 2>&1; then
    MYSQL_CMD="mariadb -u root"
    log "Connected via socket (no password)"
elif [[ -n "$DB_ROOT_CURRENT_PASS" ]] && \
     mariadb -u root -p"${DB_ROOT_CURRENT_PASS}" -e "SELECT 1;" &>/dev/null 2>&1; then
    MYSQL_CMD="mariadb -u root -p${DB_ROOT_CURRENT_PASS}"
    log "Connected via socket with password"
elif [[ -n "$DB_ROOT_CURRENT_PASS" ]] && \
     mariadb -u root -h 127.0.0.1 -P 3306 -p"${DB_ROOT_CURRENT_PASS}" -e "SELECT 1;" &>/dev/null 2>&1; then
    MYSQL_CMD="mariadb -u root -h 127.0.0.1 -P 3306 -p${DB_ROOT_CURRENT_PASS}"
    log "Connected via TCP with password"
else
    error "Cannot connect to MariaDB. Set DB_ROOT_CURRENT_PASS to your root password and retry."
fi

info "Creating database and user..."
${MYSQL_CMD} <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';

FLUSH PRIVILEGES;
SQL

log "Database '${DB_NAME}' and user '${DB_USER}' ready"

# =============================================================================
# 3. .NET 10
# =============================================================================

section "3 / 10 — .NET 10 SDK"

if ! dotnet --list-sdks 2>/dev/null | grep -q "^10\."; then
    info "Installing .NET 10 SDK..."
    wget -q "https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb" \
        -O /tmp/microsoft-prod.deb
    dpkg -i /tmp/microsoft-prod.deb
    rm /tmp/microsoft-prod.deb
    apt-get update -qq
    apt-get install -y -qq dotnet-sdk-10.0
    log ".NET $(dotnet --version) installed"
else
    log ".NET 10 already installed — $(dotnet --version)"
fi

# =============================================================================
# 4. NODE.JS 22
# =============================================================================

section "4 / 10 — Node.js 22 & Angular CLI"

if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(parseInt(process.version.slice(1)))')" -lt 20 ]] 2>/dev/null; then
    info "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    apt-get install -y -qq nodejs
    log "Node.js $(node -v) installed"
else
    log "Node.js $(node -v) already installed"
fi

npm install -g @angular/cli --silent --prefer-offline 2>/dev/null || true
log "Angular CLI ready — $(ng version 2>/dev/null | grep 'Angular CLI' | head -1 || echo 'installed')"

# =============================================================================
# 5. SOURCE CODE
# =============================================================================

section "5 / 10 — Source Code"

mkdir -p "${APP_DIR}"

if [[ -d "${REPO_DIR}/.git" ]]; then
    warn "Repository exists — pulling latest ${GIT_BRANCH}..."
    git config --global --add safe.directory "${REPO_DIR}" 2>/dev/null || true
    git -C "${REPO_DIR}" fetch --all -q
    git -C "${REPO_DIR}" reset --hard "origin/${GIT_BRANCH}" -q
    git -C "${REPO_DIR}" clean -fd -q
    log "Repository updated to $(git -C "${REPO_DIR}" rev-parse --short HEAD)"
else
    info "Cloning ${GIT_REPO}..."
    git clone --branch "${GIT_BRANCH}" --depth 1 "${GIT_REPO}" "${REPO_DIR}"
    log "Repository cloned ($(git -C "${REPO_DIR}" rev-parse --short HEAD))"
fi

# =============================================================================
# 6. BUILD ANGULAR WEB APP
# =============================================================================

section "6 / 10 — Angular Build"

WEB_SRC="${REPO_DIR}/UnityMicroFund/unitymicrofund_web"
ANGULAR_JSON="${WEB_SRC}/angular.json"

# Ensure a production environment file exists with the correct API URL.
# The source tree has only environment.ts (dev); we create environment.prod.ts
# and wire it up via fileReplacements in angular.json so `ng build` uses /api.
ENV_DIR="${WEB_SRC}/src/environments"
mkdir -p "${ENV_DIR}"

cat > "${ENV_DIR}/environment.prod.ts" <<'ENVTS'
export const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId: ''
};
ENVTS

# Inject fileReplacements into the production config if not already there
python3 - "${ANGULAR_JSON}" <<'PYSCRIPT'
import json, sys
path = sys.argv[1]
with open(path) as f:
    cfg = json.load(f)
proj = cfg["projects"]["unitymicrofund_web"]["architect"]["build"]
prod = proj.setdefault("configurations", {}).setdefault("production", {})
replacement = {
    "replace": "src/environments/environment.ts",
    "with":    "src/environments/environment.prod.ts"
}
replacements = prod.setdefault("fileReplacements", [])
if not any(r.get("with") == replacement["with"] for r in replacements):
    replacements.append(replacement)
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
print("angular.json updated with production fileReplacement")
PYSCRIPT

info "Installing npm dependencies..."
cd "${WEB_SRC}"
npm install --prefer-offline 2>&1 | tail -5

info "Building Angular production bundle..."
ng build --configuration production

# Angular 17+ default output: dist/<project>/browser/
ANGULAR_DIST="${WEB_SRC}/dist/unitymicrofund_web/browser"
[[ ! -d "${ANGULAR_DIST}" ]] && error "Angular build output not found at ${ANGULAR_DIST}"

mkdir -p "${WEB_DIR}"
rsync -a --delete "${ANGULAR_DIST}/" "${WEB_DIR}/"
log "Angular app built → ${WEB_DIR}"

# =============================================================================
# 7. PUBLISH .NET API
# =============================================================================

section "7 / 10 — .NET API Publish"

API_SRC_DIR="${REPO_DIR}/UnityMicroFund/UnityMicroFund.API"
API_SRC="${API_SRC_DIR}/UnityMicroFund.API.csproj"

info "Restoring packages..."
# Clean stale build artifacts to avoid cache conflicts
rm -rf "${API_SRC_DIR}/obj" "${API_SRC_DIR}/bin"
chown -R root:root "${API_SRC_DIR}"
dotnet restore "${API_SRC}" -q

info "Publishing release build..."
dotnet publish "${API_SRC}" \
    --configuration Release \
    --output "${API_DIR}" \
    --no-self-contained \
    --runtime linux-x64 \
    -q

# Copy Tesseract training data if present in source
if [[ -d "${API_SRC_DIR}/tessdata" ]]; then
    cp -r "${API_SRC_DIR}/tessdata" "${API_DIR}/tessdata"
    log "Tesseract tessdata copied"
fi

# Create uploads directory the API expects (relative to API content root)
mkdir -p "${UPLOADS_DIR}"

# Write production appsettings — overrides the dev defaults at runtime.
# This file is NOT committed to the repo; it is generated here on the server.
cat > "${API_DIR}/appsettings.Production.json" <<APPSETTINGS
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=127.0.0.1;Port=3306;Database=${DB_NAME};User=${DB_USER};Password=${DB_PASS};SslMode=none;Protocol=TCP;AllowUserVariables=True;UseAffectedRows=False"
  },
  "Jwt": {
    "Secret": "${JWT_SECRET}",
    "Issuer": "${JWT_ISSUER}",
    "Audience": "${JWT_AUDIENCE}",
    "ExpiryMinutes": ${JWT_EXPIRY_MINUTES},
    "RefreshTokenValidityDays": ${JWT_REFRESH_DAYS}
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
log "Production appsettings written (chmod 600)"

# =============================================================================
# 8. SERVICE USER & PERMISSIONS
# =============================================================================

section "8 / 10 — System Service"

# Dedicated service user (no login shell)
if ! id "${SERVICE_USER}" &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
    log "Service user '${SERVICE_USER}' created"
fi

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"
chmod -R 755 "${WEB_DIR}"
chmod 750 "${API_DIR}"
chmod 700 "${UPLOADS_DIR}"

# Systemd service unit
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE
[Unit]
Description=Unity MicroFund API (.NET 10)
Documentation=https://${DOMAIN}/swagger
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
WorkingDirectory=${API_DIR}
ExecStart=/usr/bin/dotnet ${API_DIR}/UnityMicroFund.API.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=${SERVICE_NAME}
User=${SERVICE_USER}
Group=${SERVICE_USER}

# Environment
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:${API_PORT}
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${UPLOADS_DIR}
ReadWritePaths=${API_DIR}/logs

[Install]
WantedBy=multi-user.target
SERVICE

# Create logs dir for the API
mkdir -p "${API_DIR}/logs"
chown "${SERVICE_USER}:${SERVICE_USER}" "${API_DIR}/logs"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

# Restart cleanly (handles first install and updates)
systemctl restart "${SERVICE_NAME}"
log "Systemd service '${SERVICE_NAME}' started"

# Wait for the API to be accepting connections (up to 60 s)
info "Waiting for API to become ready..."
API_READY=false
for i in {1..30}; do
    if curl -sf "http://localhost:${API_PORT}/swagger/index.html" &>/dev/null || \
       curl -sf "http://localhost:${API_PORT}/api/health"          &>/dev/null || \
       curl -o /dev/null -sf "http://localhost:${API_PORT}/"       &>/dev/null; then
        API_READY=true
        break
    fi
    sleep 2
done

if [[ "$API_READY" == "true" ]]; then
    log "API is responding on port ${API_PORT}"
else
    warn "API did not respond in 60 s — check logs: journalctl -u ${SERVICE_NAME} -n 50"
fi

# =============================================================================
# 9. NGINX
# =============================================================================

section "9 / 10 — Nginx"

if ! command -v nginx &>/dev/null; then
    apt-get install -y -qq nginx
    log "Nginx installed"
fi

rm -f /etc/nginx/sites-enabled/default

cat > "${NGINX_CONF}" <<NGINX
# Unity MicroFund — ${DOMAIN}
# Nginx serves Angular static files and reverse-proxies the .NET API.

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${DOMAIN_WWW};

    # Angular static app
    root ${WEB_DIR};
    index index.html;

    # Security headers (Certbot will keep these after SSL upgrade)
    add_header X-Content-Type-Options  "nosniff"                       always;
    add_header X-Frame-Options         "SAMEORIGIN"                    always;
    add_header X-XSS-Protection        "1; mode=block"                 always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;

    # ── Angular SPA ─────────────────────────────────────────────────────────
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Long-lived cache for hashed static assets
    location ~* \.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # ── .NET API ─────────────────────────────────────────────────────────────
    location /api/ {
        proxy_pass          http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version  1.1;
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_read_timeout  120s;
        proxy_send_timeout  120s;
        client_max_body_size 20M;
    }

    # ── Swagger UI ───────────────────────────────────────────────────────────
    location /swagger {
        proxy_pass          http://127.0.0.1:${API_PORT}/swagger;
        proxy_http_version  1.1;
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
    }

    # ── SignalR Chat Hub (WebSocket) ─────────────────────────────────────────
    location /chat {
        proxy_pass          http://127.0.0.1:${API_PORT}/chat;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade           \$http_upgrade;
        proxy_set_header    Connection        "Upgrade";
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
    }

    # ── Uploaded payment receipts ─────────────────────────────────────────────
    location /assets/paymentReceipt/ {
        proxy_pass http://127.0.0.1:${API_PORT}/assets/paymentReceipt/;
        proxy_set_header Host \$host;
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
    }
}
NGINX

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"

nginx -t
systemctl enable --now nginx
systemctl reload nginx
log "Nginx configured for ${DOMAIN}"

# =============================================================================
# 10. FIREWALL & SSL
# =============================================================================

section "10 / 10 — UFW Firewall & Let's Encrypt SSL"

# Add rules unconditionally (safe whether UFW is active or not)
ufw allow OpenSSH      >/dev/null
ufw allow 'Nginx Full' >/dev/null

# Only enable UFW if it is not already active — avoids interrupting
# existing rules that protect other apps running on this server
if ufw status | grep -q "Status: active"; then
    log "UFW already active — rules added without reset"
else
    ufw --force enable >/dev/null
    log "UFW enabled"
fi
log "UFW firewall: SSH + HTTP/HTTPS allowed"

# Install Certbot via snap (most reliable on Ubuntu)
if ! command -v certbot &>/dev/null; then
    info "Installing Certbot..."
    snap install --classic certbot 2>/dev/null || apt-get install -y -qq certbot python3-certbot-nginx
    ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
fi

info "Requesting Let's Encrypt certificate..."
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "${LETSENCRYPT_EMAIL}" \
    ${CERTBOT_DOMAINS} \
    --redirect \
    --keep-until-expiring

log "SSL certificate issued for ${DOMAIN}"

# Ensure auto-renewal timer is active
systemctl enable --now snap.certbot.renew.timer 2>/dev/null || \
    systemctl enable --now certbot.timer           2>/dev/null || true
log "SSL auto-renewal enabled"

# =============================================================================
# SAVE CREDENTIALS (readable only by root)
# =============================================================================

cat > "${CREDS_FILE}" <<CREDS
# Unity MicroFund — Deployment Credentials
# Generated : $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# Server    : $(hostname -f)
# KEEP THIS FILE SECURE

DOMAIN=${DOMAIN}
GIT_REPO=${GIT_REPO}
GIT_BRANCH=${GIT_BRANCH}

DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_ROOT_PASS=${DB_ROOT_PASS}

JWT_SECRET=${JWT_SECRET}
CREDS
chmod 600 "${CREDS_FILE}"

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║    Unity MicroFund deployed successfully!            ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Web App  → ${BOLD}https://${DOMAIN}${NC}"
echo -e "  Swagger  → ${BOLD}https://${DOMAIN}/swagger${NC}"
echo ""
echo -e "${YELLOW}  Credentials saved to: ${CREDS_FILE}${NC}"
echo ""
echo "  Useful commands:"
echo "    systemctl status  ${SERVICE_NAME}        # API health"
echo "    journalctl -fu    ${SERVICE_NAME}        # API live logs"
echo "    systemctl restart ${SERVICE_NAME}        # restart API"
echo "    systemctl reload  nginx                  # reload Nginx config"
echo "    certbot renew --dry-run                  # test SSL renewal"
echo ""
echo "  To redeploy after a code push, just run this script again."
echo ""
