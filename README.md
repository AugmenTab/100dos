# 100dos

A Foundry VTT implementation for the 100DOS TTRPG system, targeting Foundry Virtual Tabletop v14.

## Setup

1. Install [Node.js](https://nodejs.org/) (v18 or later recommended).
2. Clone this repository.
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

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
