# 100dos

A Foundry VTT implementation for the 100DOS TTRPG system, targeting Foundry Virtual Tabletop v14.

## Local Development with Docker

Docker runs a local Foundry instance with the `100dos` system mounted directly from `dist/`.

### First-time setup

1. Copy `.env.example` to `.env` and fill in your Foundry credentials (see comments in the file for options).
2. Build the system files into `dist/`:
   ```sh
   npm run build
   ```
3. Start Foundry:
   ```sh
   docker compose up
   ```
4. Open `http://localhost:30000` in your browser.

The `100dos` system will appear in Foundry's system list. Foundry data (worlds, settings, downloaded assets) is stored in `./foundrydata/`, which is gitignored.

### Development workflow

Build tools run inside the `dev` container — no Node.js needed on the host. Edit files with your editor as normal; the container handles building.

```sh
# Install dependencies (first time, or after package.json changes)
docker compose run --rm dev npm install

# One-off build
docker compose run --rm dev npm run build

# Watch and rebuild on changes
docker compose run --rm dev npm run watch

# Open a shell inside the dev environment
docker compose run --rm dev sh
```

The `dev` service is excluded from `docker compose up` by default (it uses a Docker Compose profile). Use `docker compose run --rm dev` to invoke it directly.

### What is and isn't committed

| Path | Committed | Notes |
|------|-----------|-------|
| `docker-compose.yml` | Yes | Service definition |
| `.env.example` | Yes | Credential template |
| `.env` | **No** | Your actual credentials |
| `foundrydata/` | **No** | Foundry data and license |
| `foundrytestdata/` | **No** | Dedicated Foundry data for `scripts/ui-test` |
| `dist/` | **No** | Build output |
| `test-results/`, `playwright-report/` | **No** | Generated UI test artifacts |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile and bundle source files to `dist/` |
| `npm run watch` | Watch for changes and rebuild automatically |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `scripts/build` | Full static/unit validation: typecheck, lint, unit tests, build |
| `scripts/test` | Unit tests only (Vitest) |
| `scripts/ui-test` | Automated Foundry UI test harness (see below) |
| `scripts/up` | Build and start the ordinary development Foundry instance |
| `scripts/watch` | Build, watch, and start the ordinary development Foundry instance |

## Automated UI Testing

`scripts/ui-test` drives a real Foundry v14 UI through Playwright (Chromium, run
via the official pinned `mcr.microsoft.com/playwright` container — no host
Node.js or browser required) to prove that sheet interactions actually persist
to the underlying Foundry documents.

```sh
scripts/ui-test
```

This will:

1. Build the system into `dist/`.
2. Start a **dedicated** Foundry instance (`foundry-test`) using its own data
   directory, `./foundrytestdata/` — never the ordinary `./foundrydata/` used
   by `scripts/up`. The dedicated instance uses the same Foundry account
   credentials from `.env`, listens on host port `30001` (optional, for
   manual inspection), and creates or reuses one deterministic world:
   `100dos-e2e`.
3. Wait for the instance to become responsive, then run the Playwright suite.
4. Stop the dedicated instance (data persists in `./foundrytestdata/` between
   runs; nothing is re-downloaded).

Reports and traces are written to `playwright-report/` and `test-results/`
(both gitignored). On a failing test, a screenshot and Playwright trace are
retained — inspect a trace with:

```sh
npx playwright show-trace test-results/<test-folder>/trace.zip
```

(run inside the `e2e` container, e.g. `docker compose run --rm e2e npx playwright show-trace ...`).

If a Foundry GM/admin password has been configured for the dedicated test
world, set `FOUNDRY_E2E_GM_PASSWORD` / `FOUNDRY_E2E_ADMIN_PASSWORD` in `.env`
(see `.env.example`). A fresh `foundrytestdata/` has no password by default.

`scripts/ui-test` is separate from `scripts/build` — the ordinary build never
requires Foundry credentials, a browser image, or a running world.

## Manifest

`static/system.json` is the Foundry system manifest. The `url`, `manifest`, and `download` fields are intentionally empty — they will be filled in once the project has a public release.

## Project Structure

```
src/            Source code
  module/       TypeScript system logic
  templates/    Handlebars templates
  styles/       CSS/SCSS stylesheets
  lang/         Localization files
  assets/       Static assets
static/         Foundry manifest and static files
dist/           Generated build output (not committed)
docs/           Documentation
test/
  e2e/          Playwright UI tests and support helpers (see scripts/ui-test)
```
