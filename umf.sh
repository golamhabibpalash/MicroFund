#!/bin/bash
# =============================================================================
# umf — Unity MicroFund Management CLI
# Install: sudo bash umf.sh install
# Usage:   umf <command> [value]
# =============================================================================

SETTINGS="/var/www/unitymicrofund/api/appsettings.Production.json"
SERVICE="unitymicrofund-api"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
err()  { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }

require_root() { [[ $EUID -ne 0 ]] && err "Run as root: sudo umf $*"; }
require_jq()   { command -v jq &>/dev/null || err "jq is not installed. Run: sudo apt-get install -y jq"; }
require_file() { [[ -f "$SETTINGS" ]] || err "Config not found: $SETTINGS"; }

update_setting() {
    local jq_filter="$1"
    local tmp
    tmp=$(mktemp)
    jq "$jq_filter" "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    chmod 600 "$SETTINGS"
}

restart_service() {
    systemctl restart "$SERVICE"
    sleep 2
    if systemctl is-active --quiet "$SERVICE"; then
        ok "Service restarted successfully"
    else
        warn "Service may not have started — check: journalctl -u $SERVICE -n 20"
    fi
}

# =============================================================================
# COMMANDS
# =============================================================================

cmd_help() {
    echo ""
    echo -e "${BOLD}umf — Unity MicroFund Management CLI${NC}"
    echo ""
    echo "Usage: umf <command> [value]"
    echo ""
    echo "Config commands:"
    echo "  email-password <password>   Set Gmail App Password"
    echo "  email-username <email>      Set SMTP username/from address"
    echo "  db-password <password>      Set database password"
    echo "  jwt-secret <secret>         Set JWT secret key"
    echo ""
    echo "Service commands:"
    echo "  restart                     Restart the API service"
    echo "  status                      Show service status"
    echo "  logs                        Tail live logs"
    echo "  logs-error                  Show only errors from last 100 lines"
    echo ""
    echo "Config commands:"
    echo "  show-config                 Print current config (passwords masked)"
    echo ""
}

cmd_email_password() {
    local pass="$1"
    [[ -z "$pass" ]] && err "Usage: umf email-password <app-password>"
    require_root
    require_jq
    require_file
    update_setting ".Email.Password = \"$pass\""
    ok "Email password updated"
    restart_service
}

cmd_email_username() {
    local email="$1"
    [[ -z "$email" ]] && err "Usage: umf email-username <email>"
    require_root
    require_jq
    require_file
    update_setting ".Email.Username = \"$email\" | .Email.From = \"$email\""
    ok "Email username/from updated to $email"
    restart_service
}

cmd_db_password() {
    local pass="$1"
    [[ -z "$pass" ]] && err "Usage: umf db-password <password>"
    require_root
    require_jq
    require_file
    local current_conn
    current_conn=$(jq -r '.ConnectionStrings.DefaultConnection' "$SETTINGS")
    local new_conn
    new_conn=$(echo "$current_conn" | sed "s/Password=[^;]*/Password=$pass/")
    update_setting ".ConnectionStrings.DefaultConnection = \"$new_conn\""
    ok "Database password updated"
    restart_service
}

cmd_jwt_secret() {
    local secret="$1"
    [[ -z "$secret" ]] && err "Usage: umf jwt-secret <secret>  (min 32 chars)"
    [[ ${#secret} -lt 32 ]] && err "JWT secret must be at least 32 characters"
    require_root
    require_jq
    require_file
    update_setting ".Jwt.Secret = \"$secret\""
    ok "JWT secret updated"
    restart_service
}

cmd_restart() {
    require_root
    restart_service
}

cmd_status() {
    systemctl status "$SERVICE" --no-pager -l
}

cmd_logs() {
    journalctl -u "$SERVICE" -f
}

cmd_logs_error() {
    journalctl -u "$SERVICE" -n 100 --no-pager | grep -E "fail:|error:|Error|Exception" | head -30
}

cmd_show_config() {
    require_root
    require_jq
    require_file
    jq '
        .ConnectionStrings.DefaultConnection = (.ConnectionStrings.DefaultConnection | gsub("Password=[^;]+"; "Password=****")) |
        .Email.Password = "****" |
        .Jwt.Secret = "****"
    ' "$SETTINGS"
}

# =============================================================================
# INSTALL
# =============================================================================

if [[ "${1:-}" == "install" ]]; then
    [[ $EUID -ne 0 ]] && err "Run as root: sudo bash umf.sh install"
    apt-get install -y -qq jq
    cp "$0" /usr/local/bin/umf
    chmod +x /usr/local/bin/umf
    echo -e "${GREEN}✓ umf installed. Try: umf help${NC}"
    exit 0
fi

# =============================================================================
# DISPATCH
# =============================================================================

case "${1:-help}" in
    email-password)  cmd_email_password  "${2:-}" ;;
    email-username)  cmd_email_username  "${2:-}" ;;
    db-password)     cmd_db_password     "${2:-}" ;;
    jwt-secret)      cmd_jwt_secret      "${2:-}" ;;
    restart)         cmd_restart ;;
    status)          cmd_status ;;
    logs)            cmd_logs ;;
    logs-error)      cmd_logs_error ;;
    show-config)     cmd_show_config ;;
    help|--help|-h)  cmd_help ;;
    *)               err "Unknown command '${1}'. Run: umf help" ;;
esac
