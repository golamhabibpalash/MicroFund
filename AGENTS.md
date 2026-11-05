# AGENTS.md

Unity MicroFund: ASP.NET Core Web API (.NET 10, Pomelo EF Core → MariaDB) at `UnityMicroFund/UnityMicroFund.API/`, Angular 21 SPA at `UnityMicroFund/unitymicrofund_web/`. `CLAUDE.md` is largely accurate; the root `README.md` is stale (PostgreSQL, port 5000, Flutter) — ignore it. Deeper conventions: `UnityMicroFund/CODING_STANDARDS_API.md` and `CODING_STANDARDS_WEB.md`.

## Commands

```bash
cd mariadb && docker compose up -d                 # MariaDB (persistent volume, db microfundDb)

cd UnityMicroFund/UnityMicroFund.API
dotnet run                                          # :5248, Swagger at /swagger
dotnet ef migrations add <Name> && dotnet ef database update

cd UnityMicroFund/unitymicrofund_web
npm install
npm start                                           # :4200, proxies to :5248
npm run build
npm test -- --watch=false                           # ng test defaults to watch mode in a TTY
npx ng test --watch=false --include=src/app/core/services/token.spec.ts   # single file
```

- Do not run `npm`/`npx` from the repo root: there is no root `package.json` and the root `package-lock.json` is a stray file, not a workspace.
- Single-test runs still compile the whole spec/app tree, so an unrelated broken spec blocks them.
- No backend test project exists. No lint/format npm script is configured; Prettier is available (`npx prettier`).
- `Areas/Logging` uses CQRS handlers (`ICommandHandler<,>`, `IQueryHandler<,>`, `ILogManager`) instead of a plain service.

## First-run setup (fresh clone)

- `appsettings.json` is gitignored. Copy `appsettings.template.json` → `appsettings.json` and fill DB/JWT/Google/Email; startup throws without `Jwt:Secret`. `appsettings.Development.json` only contains logging. `appsettings.Production.json` is generated on the server, never committed.
- `src/assets/config/app-config.json` is gitignored. It is optional: `AppConfigService` falls back to `environment.googleClientId` if the file is missing. Copy `app-config.example.json` to override locally.
- Use `mariadb/docker-compose.yml`; the root `docker-compose.yml` is a separate container/volume and not the one to run.
- Migrations auto-apply on API startup. Startup also runs `WalletService.BackfillDepositsAsync()` and `VersioningService.SeedAsync()`.
- OCR uses Tesseract 5; on macOS native libs are loaded from `/opt/homebrew/lib` (hardcoded in `Program.cs`).

## API architecture

- Feature code lives in `Areas/<Feature>/` with `Controllers/`, `Services/`, `DTOs/` (`Models/`, `Interfaces/` where used). Areas: `Accounts`, `Audit`, `Auth`, `CashOut`, `Chat`, `Contributions`, `Dashboard`, `Investments`, `Logging`, `Members`, `OCR`, `Profile`, `Settings`, `Tasks`, `Transactions`, `Versioning`.
- Controllers stay thin; business logic goes in services. Define `IXxxService` and register it `Scoped` in `Program.cs` — including for any new area.
- DTOs are `record`, EF entities are `class`; use `AsNoTracking()` on reads and pass `CancellationToken`.
- Auth policy/permission constants live in `Infrastructure/Authorization/Policies.cs` (`AdminPolicy`, `ManagerPolicy`, `MemberPolicy`, `AdminOrManagerPolicy`).
- SignalR hub at `/chat`; JWT is passed as `?access_token=` for hub connections.
- User-visible changes should add an entry to the hard-coded `ReleaseHistory` array in `Areas/Versioning/Services/VersioningService.cs` (seeded idempotently on startup, shown in the footer version badge).
- Uploads: `/assets/member`, `/assets/organization`, `/assets/investment` → `UnityMicroFund/uploads/*`; payment receipts are served from the web app's `src/assets/paymentReceipt`. `Program.cs` wires the static-file routes; `proxy.conf.json` forwards only the first three.

## Angular architecture

- Hybrid NgModule + standalone: `AppModule` bootstraps `App` (`standalone: false`), feature `*Module`s exist, but most components are `standalone: true`. `angular.json` schematics still default to `standalone: false`; follow the feature you are editing and pass `--standalone` when generating a standalone component.
- Feature folders live under `src/app/<feature>/`; shared code is in `core/` (guards, interceptors, services), `shared/`, `layout/`.
- Reactive forms via `FormBuilder`; call `form.markAllAsTouched()` before surfacing errors. Unsubscribe with `takeUntil(this.destroy$)`; use `OnPush` for display components.
- JWT comes from `localStorage` via `AuthInterceptor`; concurrent 401s are coalesced into one refresh. `AuthGuard` also attempts a refresh before logging the user out.
- Dev calls `environment.apiUrl` (`http://localhost:5248/api`) directly; `proxy.conf.json` only proxies `/api` and `/assets/{member,organization,investment}`. Production uses `/api`.
- `AppConfigService` loads runtime `assets/config/app-config.json` (Google/Facebook IDs) with an `environment.ts` fallback.

## Deploy (do not break)

- Push to `main` → `.github/workflows/deploy.yml` → SSH runs `update.sh` on production. Push to `uat` → `deploy-uat.yml` SCPs the branch and runs `update-uat.sh` (UAT API on :5249).
- Server-only secrets live in `/root/.unitymicrofund` and `/root/.unitymicrofund-uat` (format: `server-secrets.example`). Deploy scripts regenerate `appsettings.Production.json` and `src/environments/environment.prod.ts` at build time, so the tracked `environment.prod.ts` is not the source of truth.
- `update.sh` runs `git reset --hard origin/main` and `git clean -fd`; untracked files in the server repo are deleted.
- `umf.sh` (install with `sudo bash umf.sh install`) is the server CLI for email/DB/JWT config, restart, status, and logs.
- Google login requires the same client ID in the frontend config/env and API `Google:ClientId`, plus an authorized JavaScript origin in Google Cloud Console.
