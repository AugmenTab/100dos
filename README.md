# 100dos

A Foundry VTT implementation for the 100DOS TTRPG system, targeting Foundry Virtual Tabletop v14.

## Setup

1. Install [Node.js](https://nodejs.org/) (v18 or later recommended).
2. Clone this repository.
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

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
| `dist/` | **No** | Build output |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile and bundle source files to `dist/` |
| `npm run watch` | Watch for changes and rebuild automatically |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Lint source files |

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
test/           Tests
```
