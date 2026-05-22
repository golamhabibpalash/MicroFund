# Unity MicroFund — Server Implementation Guide

## Architecture Overview

```
Internet → Nginx (HTTPS, ports 80/443)
              ├── / → Angular SPA (static files, /var/www/unitymicrofund/web)
              ├── /api/ → Reverse proxy → .NET API (localhost:5248)
              ├── /swagger → Reverse proxy → .NET API
              └── /chat → WebSocket proxy → SignalR Hub (localhost:5248)

.NET API → Systemd Service (unitymicrofund-api)
              → MariaDB (Docker container, port 3306)
```

**Notable**: Only MariaDB runs in Docker. The API and Angular app are deployed natively.

---

## Docker — MariaDB

### Root `docker-compose.yml`
```yaml
services:
  mariadb:
    image: mariadb:latest
    container_name: unitymicrofund-db
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: "123AsD,./"
      MARIADB_DATABASE: microfundDb
      MARIADB_USER: microfund
      MARIADB_PASSWORD: "123AsD,./"
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
```

**Commands:**
```bash
# Start MariaDB
docker compose up -d

# Stop MariaDB
docker compose down

# View logs
docker compose logs -f mariadb

# Connect directly
docker compose exec mariadb mariadb -u root -p microfundDb

# Backup database
docker compose exec mariadb mysqldump -u root -p microfundDb > backup.sql

# Restore database
docker compose exec -T mariadb mariadb -u root -p microfundDb < backup.sql
```

---

## Production Server Directory Structure

```
/var/www/unitymicrofund/
├── repo/                              # Git repository (cloned)
│   ├── UnityMicroFund/
│   │   ├── UnityMicroFund.API/        # .NET source
│   │   └── unitymicrofund_web/        # Angular source
│   └── deploy.sh                      # Deployment script
├── api/                               # Published .NET API binaries
│   ├── UnityMicroFund.API.dll
│   ├── appsettings.json               # Dev defaults
│   ├── appsettings.Production.json    # Overrides (chmod 600)
│   ├── tessdata/                      # Tesseract OCR training data
│   └── logs/                          # API log output
├── web/                               # Built Angular SPA (static files)
│   ├── index.html
│   ├── main-*.js
│   ├── polyfills-*.js
│   └── assets/
└── uploads/
    └── receipts/                      # Payment receipt images
```

---

## Systemd Service — `unitymicrofund-api`

**Unit file**: `/etc/systemd/system/unitymicrofund-api.service`

```ini
[Unit]
Description=Unity MicroFund API (.NET 10)
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
WorkingDirectory=/var/www/unitymicrofund/api
ExecStart=/usr/bin/dotnet UnityMicroFund.API.dll
Restart=always
RestartSec=10
User=unitymicrofund
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5248

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
sudo systemctl status unitymicrofund-api    # Service status
sudo systemctl restart unitymicrofund-api   # Restart service
sudo systemctl stop unitymicrofund-api      # Stop service
sudo systemctl start unitymicrofund-api     # Start service
sudo journalctl -fu unitymicrofund-api      # Live logs
sudo journalctl -u unitymicrofund-api -n 100 --no-pager  # Recent logs
```

---

## Nginx Configuration

**File**: `/etc/nginx/sites-available/app.unitymicrofund.com`

Serves Angular static files and reverse-proxies API, Swagger, SignalR, and assets.

| Location | Target | Purpose |
|----------|--------|---------|
| `/` | Angular SPA | Static files with SPA fallback |
| `/api/` | `http://127.0.0.1:5248/api/` | REST API (timeout: 120s) |
| `/swagger` | `http://127.0.0.1:5248/swagger` | API documentation |
| `/chat` | `http://127.0.0.1:5248/chat` | SignalR WebSocket (timeout: 3600s) |
| `/assets/paymentReceipt/` | `http://127.0.0.1:5248/assets/paymentReceipt/` | Receipt images |

**Commands:**
```bash
sudo nginx -t                          # Test configuration
sudo systemctl reload nginx            # Reload configuration
sudo systemctl restart nginx           # Restart Nginx
sudo systemctl status nginx            # Check status
```

---

## Deployment Script — `deploy.sh`

**File**: `deploy.sh` (in repo root)

One-command deployment script for Ubuntu 22.04+ that performs 10 steps:

| Step | Description |
|------|-------------|
| 1. System Update | apt-get upgrade, installs dependencies (tesseract-ocr, git, ufw, build-essential) |
| 2. MariaDB | Creates database, user, grants permissions |
| 3. .NET 10 SDK | Installs from Microsoft package repository |
| 4. Node.js 22 + Angular CLI | Installs Node.js, `npm install -g @angular/cli` |
| 5. Source Code | `git clone` (or pull) into `/var/www/unitymicrofund/repo` |
| 6. Angular Build | Creates `environment.prod.ts`, runs `ng build`, copies dist |
| 7. .NET API Publish | `dotnet publish --runtime linux-x64`, writes `appsettings.Production.json` |
| 8. Systemd Service | Creates `unitymicrofund` user, writes service unit, starts service |
| 9. Nginx | Installs/configures nginx, enables site |
| 10. Firewall & SSL | Configures UFW, obtains Let's Encrypt SSL certificate |

**Usage:**
```bash
# First-time deployment
# 1. Edit deploy.sh — fill in CONFIGURATION section (domain, git repo, secrets)
# 2. Upload script to server
sudo bash deploy.sh

# Re-deployment (after code push) — just re-run the same script
sudo bash deploy.sh
```

---

## Post-Deployment Management — `umf` CLI

**File**: `umf.sh` (install: `sudo bash umf.sh install`)

Once installed, use the `umf` command:

```bash
# Configuration
sudo umf email-password <app-password>   # Update SMTP/Gmail password
sudo umf email-username <email>          # Update SMTP username/from address
sudo umf db-password <password>          # Update database password
sudo umf jwt-secret <secret>            # Update JWT signing key (min 32 chars)

# Service management
sudo umf restart                         # Restart API service
sudo umf status                          # Show service status
sudo umf logs                            # Tail live logs
sudo umf logs-error                      # Show recent errors

# Diagnostics
sudo umf show-config                     # Print config (passwords masked)
```

**Config file read**: `/var/www/unitymicrofund/api/appsettings.Production.json` (chmod 600, root only)

---

## Security

| Layer | Implementation |
|-------|---------------|
| **Database** | MariaDB in Docker, port 3306 (internal only), dedicated user with limited grants |
| **API config** | `appsettings.Production.json` — chmod 600, readable only by root |
| **API runtime** | Runs as `unitymicrofund` (no-login system user) with `ProtectSystem=strict`, `PrivateTmp=true` |
| **SSL/TLS** | Let's Encrypt via Certbot, auto-renewal, HTTP→HTTPS redirect |
| **Firewall** | UFW — only SSH (22), HTTP (80), HTTPS (443) allowed |
| **Nginx** | Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`), dotfiles denied |
| **JWT** | 48-byte random secret, 60-min expiry, 7-day refresh tokens |

---

## Environment Configuration

### Angular (`environment.prod.ts` — generated by deploy.sh)
```ts
export const environment = {
  production: true,
  apiUrl: '/api',         // Proxied by Nginx to localhost:5248
  googleClientId: '',      // Set before deployment
  facebookAppId: ''        // Set before deployment
};
```

### .NET API (`appsettings.Production.json` — generated by deploy.sh)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=127.0.0.1;Port=3306;Database=microfundDb;..."
  },
  "Jwt": { "Secret": "...", "Issuer": "UnityMicroFund", "ExpiryMinutes": 60 },
  "Google": { "ClientId": "...", "ClientSecret": "..." },
  "Email": { "Host": "smtp.gmail.com", "Port": 587, "Username": "...", "Password": "...", "From": "..." },
  "Logging": { "LogLevel": { "Default": "Warning", "Microsoft.AspNetCore": "Warning" } }
}
```

---

## Maintenance Cheat Sheet

```bash
# System updates
sudo apt-get update && sudo apt-get upgrade -y

# Re-deploy latest code
sudo bash /var/www/unitymicrofund/repo/deploy.sh

# Database backup
docker compose exec mariadb mysqldump -u root -p microfundDb > /root/backup-$(date +%F).sql

# Restore database
docker compose exec -T mariadb mariadb -u root -p microfundDb < backup.sql

# Check API health
curl -sf http://localhost:5248/api/health

# View API errors
sudo journalctl -u unitymicrofund-api -n 50 --no-pager | grep -E "fail|error|Error|Exception"

# Test SSL renewal
sudo certbot renew --dry-run

# View disk/storage
df -h /var/www/unitymicrofund
docker system df

# Reset database (data migration)
docker compose down -v && docker compose up -d
cd /var/www/unitymicrofund/api && sudo -u unitymicrofund dotnet UnityMicroFund.API.dll
```
