# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unity MicroFund is a microfund management platform with two applications:

- **`UnityMicroFund/UnityMicroFund.API/`** — ASP.NET Core Web API (.NET 10, MySQL/MariaDB via Pomelo EF Core)
- **`UnityMicroFund/unitymicrofund_web/`** — Angular 21 frontend (Angular Material, SignalR, Chart.js)

> Note: The root `docker-compose.yml` references PostgreSQL but is outdated. The actual database is **MariaDB** — use `mariadb/docker-compose.yml`.

## Development Commands

### Database (MariaDB)
```bash
cd mariadb && docker compose up -d
```

### API
```bash
cd UnityMicroFund/UnityMicroFund.API
dotnet restore
dotnet run                        # Runs on http://localhost:5248
dotnet build
```

### EF Core Migrations
```bash
cd UnityMicroFund/UnityMicroFund.API
dotnet ef migrations add <MigrationName>
dotnet ef database update
```
Migrations run automatically on startup via `db.Database.MigrateAsync()`.

### Angular Web App
```bash
cd UnityMicroFund/unitymicrofund_web
npm install
npm start         # Runs on http://localhost:4200 with proxy to API at :5248
npm run build
npm test          # Runs vitest
```

### Run a single test
```bash
cd UnityMicroFund/unitymicrofund_web
npx vitest run --reporter=verbose <path-to-spec-file>
```

## Architecture

### API — Feature-based Areas

All feature code lives in `Areas/<FeatureName>/` with subdirectories: `Controllers/`, `Services/`, `DTOs/`, `Models/`, `Interfaces/`. Cross-cutting concerns go in `Infrastructure/` (logging, exception handling, middleware, email).

Active features: `Auth`, `Members`, `Contributions`, `Investments`, `Transactions`, `Accounts`, `Dashboard`, `Settings`, `Chat`, `OCR`, `Profile`, `Audit`, `Tasks`

**Key rules:**
- Controllers are thin — all business logic belongs in Services
- Always define a service interface (`IXxxService`) and register it as `Scoped` in `Program.cs`
- Use `record` types for DTOs, `class` for EF entities
- Use `AsNoTracking()` for read-only queries; always pass `cancellationToken` in service methods

**Real-time:** SignalR hub at `/chat` (`Areas/Chat/Hubs/ChatHub`). JWT is passed via query string `access_token` for SignalR connections.

**OCR:** Tesseract 5 is used for receipt scanning. On macOS, native libs are resolved from `/opt/homebrew/lib`.

**Static files:** Payment receipt images are served from `unitymicrofund_web/src/assets/paymentReceipt/` at `/assets/paymentReceipt`.

### Angular Web App — Feature-based components

```
src/app/
├── core/          # Guards, interceptors, singleton services, models
├── shared/        # Reusable components, pipes
├── layout/        # Shell/layout components
└── <feature>/     # auth, dashboard, investors, investments, payments,
                   # accounts, chat, reports, settings, user-management,
                   # profile, logs
```

**Key rules:**
- Use standalone components (not NgModules)
- Use reactive forms with `FormBuilder`; call `form.markAllAsTouched()` before showing validation errors
- Use `takeUntil(this.destroy$)` pattern to clean up subscriptions in `ngOnDestroy`
- `OnPush` change detection for pure/display components
- Routes are lazy-loaded
- API base URL comes from `environment.apiUrl` (proxied to `http://localhost:5248` in dev via `proxy.conf.json`)
- Auth JWT token is attached via `AuthInterceptor` from `localStorage`

### Data Flow

```
Angular Component
  → calls Service (HttpClient)
  → proxy.conf.json forwards /api → localhost:5248
  → API Controller (thin)
  → Service (business logic)
  → AppDbContext (EF Core → MariaDB)
```

## Configuration

### API (`appsettings.json`)
- `ConnectionStrings:DefaultConnection` — MariaDB connection string
- `Jwt:Secret`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryMinutes`
- `Google:ClientId`, `Google:ClientSecret` — Google OAuth
- `Email:*` — SMTP via Gmail/MailKit

### Angular (`environment.ts`)
- `apiUrl: 'http://localhost:5000/api'` in the environment file, but `proxy.conf.json` routes `/api` → `http://localhost:5248` so the actual target is the API port.

## Coding Standards

Full standards are documented in:
- `UnityMicroFund/CODING_STANDARDS_API.md` (C#/.NET)
- `UnityMicroFund/CODING_STANDARDS_WEB.md` (Angular/TypeScript)

### Naming quick-reference

| Artifact | Convention |
|---|---|
| C# controller | `[Feature]Controller` |
| C# service interface | `I[Feature]Service` |
| C# DTO | `[Feature][Action]Dto` |
| C# private field | `_camelCase` |
| Angular component file | `feature.component.ts` |
| Angular service file | `feature.service.ts` |
| Angular model file | `feature.model.ts` |

### Import order — C#
System → Microsoft → Project (alphabetical within groups)

### Import order — TypeScript
Angular → RxJS → Third-party → Project → Relative
