# Development Testing

This document describes how to verify the system. Most of it is covered
automatically by the test tiers below. NPC, Vehicle and the bare Trait and
Effect name round-trip are still checked by hand; the intent is to keep
moving checklist items into Playwright as their UI stabilizes.

## Automated coverage

Run:

```bash
scripts/ui-test
```

This runs both Playwright tiers (see the README). `docs/architecture.md`,
"Testing", describes the tiers, and `test/CLAUDE.md` says which one a new
test belongs in.

- **Browser tier** (`test/browser/`): template rendering for the PC sheet
  (Dashboard, Skills, Educations, Inventory, ledgers, composition) and the
  Item sheets (Ability, Effect, Action editor, Details, Links, Race, Soldier
  Type and Template), plus the shared dialogs.
- **E2E tier** (`test/e2e/`), against live Foundry:
  - PC sheet: navigation and its keyboard and width behaviour, the
    Dashboard, Skills, Educations, Inventory, and the XP and Finances
    ledgers.
  - Ability acquisition by drop, with its XP prompt.
  - Item sheets: Ability, Trait and Effect, Changes and Conditionals with
    the target picker, the Action editor, and Links.
  - Character composition: Race and Soldier Type editors, acquisition, the
    exclusive Dashboard selectors, Templates, and scroll kept across
    re-renders.
- **Player simulations** (`test/simulations/`): see below.

The E2E tier fails on uncaught browser page errors, `100DOS`-originated
console errors, and failed requests for `/systems/100dos/` assets, and
retains a screenshot and trace for any failing test.

## Remaining manual smoke checks

Start the dev environment and open Foundry in a browser:

```bash
scripts/up
```

On the Foundry setup screen, open an existing world running the `100dos` system, or create one if none exists: **Create World → Game System: 100DOS**.

After any rebuild, force-reload the browser (`Ctrl+Shift+R`) to ensure the latest bundle is loaded before running through the checklist.

For each document type below, create a fresh document and run through the verify steps. These steps should be repeated any time a change touches sheet rendering or document registration.

### NPC (Actor)

1. Open the Actors Directory and create a new Actor of type **NPC**.
2. Verify the sheet opens without errors.
3. Verify the sheet displays the type label **NPC**.
4. Enter a name in the name field and submit the form.
5. Verify the name persists after closing and reopening the sheet.

### Vehicle (Actor)

1. Open the Actors Directory and create a new Actor of type **Vehicle**.
2. Verify the sheet opens without errors.
3. Verify the sheet displays the type label **Vehicle**.
4. Enter a name in the name field and submit the form.
5. Verify the name persists after closing and reopening the sheet.

### Trait (Item)

1. Open the Items Directory and create a new Item of type **Trait**.
2. Verify the sheet opens without errors.
3. Enter a name in the name field and submit the form.
4. Verify the name persists after closing and reopening the sheet.

### Effect (Item)

1. Open the Items Directory and create a new Item of type **Effect**.
2. Verify the sheet opens without errors.
3. Enter a name in the name field and submit the form.
4. Verify the name persists after closing and reopening the sheet.

## Console errors

After completing the checklist, open the browser developer console and confirm there are no errors or unhandled warnings from the `100dos` system. Warnings from Foundry core or third-party modules can be ignored.

## Player simulations

`test/simulations/` holds scripted player journeys: preparing content,
building a character, playing an encounter. They drive the real UI from the
sidebar onward and run with the E2E suite (alone with
`--project=simulations`). Each run keeps a trace for replay. See
[ADR 0001](adr-0001-player-simulations.md) for the technique, the philosophy
and the catalog of journeys, including the ones still waiting on features.

## Future automated coverage

Move a checklist item above into `test/e2e/` once its sheet grows real
user-facing interaction beyond a bare name field — for example, once NPC or
Vehicle sheets have distinguishing fields worth asserting on, or once
inventory/embedded-item UI exists for Trait and Effect items.

## Maintenance

When a story adds schema fields, add a verify step to the relevant section for each new field (manual checklist), or a UI assertion (Playwright), depending on where that field's sheet lives. Keep steps minimal — one line per field, checking that it saves and reloads correctly.
