# AGENTS.md

Unity MicroFund: ASP.NET Core API (`.NET 10`, Pomelo EF Core → **MariaDB**) at `UnityMicroFund/UnityMicroFund.API/`, and Angular 21 frontend at `UnityMicroFund/unitymicrofund_web/`. Detailed architecture, coding standards, and naming conventions live in `CLAUDE.md`, `CODING_STANDARDS_API.md`, and `CODING_STANDARDS_WEB.md` — read those for conventions. This file only covers things you'd otherwise miss.

## Local setup gotchas (read first)

- **`appsettings.json` is gitignored.** Only `appsettings.Development.json` and `appsettings.template.json` are committed (the template explains every secret's purpose). A fresh clone has **no** `appsettings.json`, so `dotnet run` fails until you `cp appsettings.template.json appsettings.json` and fill in DB/JWT/Google/Email values. Same story for `appsettings.Production.json` (not committed — created on the server by `update.sh`).
- **`unitymicrofund_web/src/assets/config/app-config.json` is gitignored** (runtime Google/Facebook OAuth client IDs). It must exist locally or Google-login clients fail to construct. It's absent in a fresh clone.
- **Root `docker-compose.yml` is stale (PostgreSQL). Use `mariadb/docker-compose.yml`** for the actual database.
- EF migrations auto-run on API startup via `db.Database.MigrateAsync()`.

## Commands

```bash
cd mariadb && docker compose up -d            # start MariaDB

cd UnityMicroFund/UnityMicroFund.API
dotnet build
dotnet run                                    # http://localhost:5248
dotnet ef migrations add <Name> && dotnet ef database update

cd UnityMicroFund/unitymicrofund_web
npm install
npm start                                     # :4200, proxies /api → :5248
npm run build
npx vitest run --reporter=verbose <path-to-spec>   # single test
```

- `npm test` runs the Angular `@angular/build:unit-test` builder, which is **vitest** under the hood; the single-test command above also works.
- `proxy.conf.json` forwards `/api` and `/assets/{member,organization,investment}` → the API at `:5248`. Note `/assets/paymentReceipt` and `/assets/member` served via API (see CLAUDE.md static-files note).

## Deploy / operational flow

- **Push to `main`** → `.github/workflows/deploy.yml` → runs `update.sh` on the server.
- **Push to `uat`** → `.github/workflows/deploy-uat.yml` → runs `update-uat.sh` on the server (`/var/www/unitymicrofund-uat`).
- Server CLI: `umf.sh` (email-password, db-password, jwt-secret, restart, logs, etc.). Ctrl-F in the helpers under `update.sh` / `update-uat.sh` / `deploy.sh` rather than re-deriving server layout.
- Secrets never live in the repo: server config is built from `server-secrets` (placeholder tracked as `server-secrets.example`). Google OAuth requires the frontend `app-config.json googleClientId` to match the API `Google:ClientId` and an authorized JS origin in Google Cloud Console.

## Codebase notes that differ from defaults

- Controllers must be thin; business logic in Services; always define `IXxxService` and register `Scoped` in `Program.cs`. Pass `cancellationToken` in service methods; use `AsNoTracking()` on reads.
- Frontend is **mixed**: standalone components (~33) and NgModules (~18) both exist. `CODING_STANDARDS_WEB.md` and new code prefer `standalone: true`, but don't assume — check the surrounding feature (`angular.json` schematics still default to `standalone: false`).
- Tesseract (OCR) native libs resolve from `/opt/homebrew/lib` on macOS.
