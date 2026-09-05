# AGENTS.md

Unity MicroFund: ASP.NET Core Web API (.NET 10, MariaDB via Pomelo EF Core) + Angular frontend.

## Layout & run commands

```
root
├── UnityMicroFund/UnityMicroFund.API/   # .NET 10 API (runs on :5248)
├── UnityMicroFund/unitymicrofund_web/   # Angular 21 (dev :4200)
├── deploy.sh / update.sh / update-uat.sh / umf.sh   # server deploy tooling
└── mariadb/docker-compose.yml           # the actual DB (MariaDB)
```

- DB: `cd mariadb && docker compose up -d` (MariaDB, NOT the root `docker-compose.yml` despite it also being MariaDB — use `mariadb/` as it persists data). Connection is `Server=localhost;Port=3306;Database=microfundDb`.
- API: `cd UnityMicroFund/UnityMicroFund.API && dotnet restore && dotnet run` → `http://localhost:5248`. Swagger at `/swagger`.
- Web: `cd UnityMicroFund/unitymicrofund_web && npm install && npm start` → `:4200`, proxying `/api` → `:5248` via `proxy.conf.json`.
- DB migrations: `dotnet ef migrations add <Name>` / `dotnet ef database update` from the API project. Migrations also auto-apply on API startup (`db.Database.MigrateAsync()` in `Program.cs`).

The root `README.md` is stale (still references PostgreSQL, port 5000, a Flutter app, and an `UnityMicroFund.Web` dir that never existed). Trust `CLAUDE.md`, the code, and this file instead.

## API — feature-based areas

All feature code lives in `Areas/<Feature>/` with `Controllers/`, `Services/`, `DTOs/` (and `Models/`, `Interfaces/` where used). Active areas: `Accounts`, `Audit`, `Auth`, `CashOut`, `Chat`, `Contributions`, `Dashboard`, `Investments`, `Logging`, `Members`, `OCR`, `Profile`, `Settings`, `Tasks`, `Transactions`. Shared code in `Data/`, `Infrastructure/`.

- Controllers are thin; all business logic goes in services. Every service has an `IXxxService` interface registered as `Scoped` in `Program.cs`.
- Entities are `class`, DTOs are `record`. Use `AsNoTracking()` for reads and pass `cancellationToken` in service methods.
- If you add a new feature/area, register its service(s) in `Program.cs` and add any new imports there.
- SignalR chat hub lives at `/chat` (`Areas/Chat/Hubs/ChatHub`). JWT is passed via query string `access_token` for SignalR connections.
- OCR uses Tesseract 5; on macOS native `.dylib`s are resolved from `/opt/homebrew/lib` (hardcoded in `Program.cs`). `tessdata/` is copied into server publish output.

## Angular — module-based (not standalone)

Despite `CLAUDE.md` and `CODING_STANDARDS_WEB.md` claiming "standalone components", the app is **NgModule-based**: `src/app/app-module.ts` bootstraps `App` (which has `standalone: false`), and `app-routing-module.ts` declares routes via `RouterModule.forRoot(...)`. Follow the existing module pattern; new components use `standalone: false` plus their module.

Feature folders live directly under `src/app/` (`auth`, `dashboard`, `investments`, `investors`, `payments`, `accounts`, `chat`, `reports`, `settings`, `user-management`, `profile`, `logs`, `cashout`, `wallet`) alongside `core/` (guards, interceptors, services), `layout/`, `shared/`.

- Reactive forms via `FormBuilder`; call `form.markAllAsTouched()` before surfacing validation errors.
- Unsubscribe with `takeUntil(this.destroy$)`; use `OnPush` for display components.
- JWT is attached by `AuthInterceptor` from `localStorage`.
- `environment.ts` sets `apiUrl: 'http://localhost:5248/api'`; dev proxy sends `/api` → `:5248`.

## Tests

- Frontend: `npm test` (the `test` script runs `ng test`, which uses the `@angular/build:unit-test` builder backed by vitest — `tsconfig.spec.json` uses `vitest/globals`). Run a single file with `npx ng test -- --run` filtering, or match a pattern.
- Backend: no test project exists in this repo.

## Deploy / CI (what an agent should not break)

- Pushing to `main` triggers `.github/workflows/deploy.yml` → `update.sh` on the prod server. Pushing to `uat` triggers `deploy-uat.yml` → `update-uat.sh` (UAT API on port 5249).
- Live secrets (DB/JWT/Google/Email) live ONLY in the server file `/root/.unitymicrofund` (not in git). Both `deploy.sh` and `update.sh` source it and regenerate `appsettings.Production.json` + `src/environments/environment.prod.ts` at build time on the server. `appsettings.json` and `environment.ts` contain dev-only (and some real-looking) values — **do not rely on or commit production secrets**.
- `server-secrets.example` documents the secrets file format; `umf.sh` (install with `sudo bash umf.sh install`) is the post-deploy CLI for updating email/DB/JWT config and service logs on the server.

## Coding standards

Full detail: `UnityMicroFund/CODING_STANDARDS_API.md` and `UnityMicroFund/CODING_STANDARDS_WEB.md`. Key conventions (also in `CLAUDE.md`):

- Naming: `[Feature]Controller`, `I[Feature]Service`, `[Feature][Action]Dto`, private C# fields `_camelCase`.
- C# using order: System → Microsoft → Project (alphabetical within groups). TS imports: Angular → RxJS → Third-party → Project → Relative.
- Prettier is installed for the web app (`.prettierrc`) but there is no lint/format npm script configured.
