# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unity MicroFund is a microfund management platform with two applications:

- **`UnityMicroFund/UnityMicroFund.API/`** — ASP.NET Core Web API (.NET 10, MariaDB via Pomelo EF Core)
- **`UnityMicroFund/unitymicrofund_web/`** — Angular 21 frontend (Angular Material, SignalR, Chart.js/ng2-charts, ngx-toastr, jsPDF)

The root `README.md` is stale (mentions PostgreSQL, port 5000, a Flutter app, and a `UnityMicroFund.Web` folder). Trust this file and the code instead.

## Development Commands

### Database (MariaDB)
```bash
cd mariadb && docker compose up -d     # preferred: persistent volume, db "microfundDb" on :3306
```
The root `docker-compose.yml` is also MariaDB but uses a different container name/user; use `mariadb/`.

### API
```bash
cd UnityMicroFund/UnityMicroFund.API
dotnet restore
dotnet run                        # http://localhost:5248, Swagger at /swagger
dotnet build
```
There is no backend test project.

### EF Core Migrations
```bash
cd UnityMicroFund/UnityMicroFund.API
dotnet ef migrations add <MigrationName>
dotnet ef database update
```
Migrations run automatically on startup via `db.Database.MigrateAsync()` in `Program.cs`. Startup also calls `VersioningService.SeedAsync()` (see Versioning below).

### Angular Web App
```bash
cd UnityMicroFund/unitymicrofund_web
npm install
npm start         # ng serve --proxy-config proxy.conf.json → http://localhost:4200
npm run build
npm test          # ng test → @angular/build:unit-test builder (vitest)
npx ng test --watch=false --include=src/app/core/services/token.spec.ts   # single test
```
Prettier is configured (`.prettierrc`) but there is no lint/format script.

## Local Setup Gotchas

- **`appsettings.json` is gitignored.** A fresh clone only has `appsettings.Development.json` and `appsettings.template.json`; copy the template to `appsettings.json` and fill in values before `dotnet run`.
- **`src/assets/config/app-config.json` is gitignored** (runtime Google/Facebook OAuth client IDs, read by `AppConfigService`). Copy from `app-config.example.json`. Google login requires its `googleClientId` to match the API's `Google:ClientId`.
- OCR uses Tesseract 5; on macOS native `.dylib`s are loaded from `/opt/homebrew/lib` (hardcoded in `Program.cs`). Language data is in `tessdata/`.

## Architecture

### API — Feature-based Areas

Feature code lives in `Areas/<Feature>/` with `Controllers/`, `Services/`, `DTOs/` (plus `Models/`, `Interfaces/` where used). Areas: `Accounts`, `Audit`, `Auth`, `CashOut`, `Chat`, `Contributions`, `Dashboard`, `Investments`, `Logging`, `Members`, `OCR`, `Profile`, `Settings`, `Tasks`, `Transactions`, `Versioning`. Shared code: `Data/AppDbContext.cs`, `Infrastructure/` (Authorization, Configuration, Email, Sms, ExceptionHandling, Logging, Middleware, Helpers).

**Key rules:**
- Controllers are thin — all business logic belongs in Services
- Always define a service interface (`IXxxService`) and register it as `Scoped` in `Program.cs`
- Use `record` types for DTOs, `class` for EF entities
- Use `AsNoTracking()` for read-only queries; always pass `cancellationToken` in service methods

**Authorization:** policy names and permission constants live in `Infrastructure/Authorization/Policies.cs` (`AdminPolicy`, `ManagerPolicy`, `MemberPolicy`, `AdminOrManagerPolicy`).

**Logging area** uses a small command/query-handler pattern (`ICommandHandler<,>`, `IQueryHandler<,>`, `ILogManager`) rather than a plain service.

**Real-time:** SignalR hub at `/chat` (`Areas/Chat/Hubs/ChatHub`). JWT is passed via query string `access_token` for SignalR connections.

**Versioning:** the app's release history is a hard-coded `ReleaseHistory` array in `Areas/Versioning/Services/VersioningService.cs`, idempotently seeded to the DB on startup and shown as a footer version badge. When shipping a user-visible change, add an entry there.

**Static files / uploads** (configured in `Program.cs`):
- `/assets/member`, `/assets/organization`, `/assets/investment` → `Uploads:*Path` config, defaulting to `UnityMicroFund/uploads/<kind>/`
- `/assets/paymentReceipt` (and `/uploads/receipts/<file>`) → `unitymicrofund_web/src/assets/paymentReceipt/`
- `/assets` → the built Angular `dist/.../browser/assets` if present

### Angular Web App

```
src/app/
├── core/          # core-module, guards, interceptors, singleton services, models
├── shared/        # reusable components, pipes
├── layout/        # admin-layout / user-layout shells
└── <feature>/     # auth, dashboard, investors, investments, payments, accounts,
                   # cashout, wallet, chat, reports, settings, user-management, profile, logs
```

**Hybrid NgModule + standalone:** the app bootstraps through `AppModule` (`app-module.ts`, `app-routing-module.ts`), and several features have their own `*-module.ts` / `*-routing-module.ts` (16 modules). Most individual components are `standalone: true`. `angular.json` schematics still default to `standalone: false`, so pass `--standalone` when generating, and follow the pattern of the feature you're editing.

**Key rules:**
- Reactive forms with `FormBuilder`; call `form.markAllAsTouched()` before showing validation errors
- `takeUntil(this.destroy$)` to clean up subscriptions in `ngOnDestroy`
- `OnPush` change detection for pure/display components
- Routes are lazy-loaded
- JWT is attached by `AuthInterceptor` from `localStorage`; `AuthGuard` checks the stored token expiry

**API URL:** `environment.ts` sets `apiUrl: 'http://localhost:5248/api'` (calls the API directly in dev); `environment.prod.ts` uses `/api`. `proxy.conf.json` forwards `/api` and `/assets/{member,organization,investment}` → `:5248`.

### Data Flow

```
Angular Component → Service (HttpClient, environment.apiUrl)
  → API Controller (thin) → Service (business logic)
  → AppDbContext (EF Core → MariaDB)
```

## Deployment (don't break this)

- **Push to `main` deploys to production** (`.github/workflows/deploy.yml` → SSH → `update.sh` on the server).
- **Push to `uat`** deploys to UAT (`deploy-uat.yml` → `update-uat.sh`, `/var/www/unitymicrofund-uat`).
- Production secrets are not in git. The server scripts (`deploy.sh`, `update.sh`) build `appsettings.Production.json` and `environment.prod.ts` from a server-side secrets file (format in `server-secrets.example`).
- `umf.sh` is the server management CLI (`sudo bash umf.sh install`; then `umf email-password`, `umf restart`, `umf logs`, etc.).

## Coding Standards

Full standards: `UnityMicroFund/CODING_STANDARDS_API.md` (C#/.NET) and `UnityMicroFund/CODING_STANDARDS_WEB.md` (Angular/TypeScript).

| Artifact | Convention |
|---|---|
| C# controller | `[Feature]Controller` |
| C# service interface | `I[Feature]Service` |
| C# DTO | `[Feature][Action]Dto` |
| C# private field | `_camelCase` |
| Angular component file | `feature.component.ts` |
| Angular service file | `feature.service.ts` |
| Angular model file | `feature.model.ts` |

Import order: C# System → Microsoft → Project; TypeScript Angular → RxJS → Third-party → Project → Relative (alphabetical within groups).
