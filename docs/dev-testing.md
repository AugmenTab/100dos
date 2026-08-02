# Development Testing

This document describes how to verify the system skeleton. As of the UI test
harness (`scripts/ui-test`), the core PC and Ability sheet persistence flows
have automated coverage — see [Automated coverage](#automated-coverage)
below. Everything else is still verified manually; the intent is to keep
moving checklist items into Playwright as their UI stabilizes.

## Automated coverage

Run:

```bash
scripts/ui-test
```

This drives the real Foundry UI (see `test/e2e/system-smoke.spec.ts` and
`test/e2e/pc-sheet-navigation.spec.ts`) and proves:

- A PC Actor's name can be changed through its rendered sheet, persists after
  closing and reopening the sheet, and matches the underlying Actor document.
- An embedded Ability Item's name can be changed through its rendered sheet,
  persists after closing and reopening the sheet, matches the underlying
  Item document, and the embedded Ability can be removed cleanly.
- The PC sheet's primary navigation (Dashboard, Record, Combat, Medical,
  Inventory, Features, Skills, Spells, Effects, Settings) and Record's nested
  secondary navigation (Basics, XP, Finances, Biography) render in the
  required order, switch correctly, and expose the expected tab semantics.
- Record remembers its most recently selected secondary tab across primary
  navigation and across a forced rerender of the open sheet.
- Both tab levels are operable by keyboard (Arrow/Home/End focus movement,
  Enter/Space activation, independent primary/Record tablists).
- Primary and Record navigation remain usable — without clipped or
  overlapping controls — at representative wide, medium, and narrow sheet
  widths.

It also fails on uncaught browser page errors, `100DOS`-originated console
errors, and failed requests for `/systems/100dos/` assets, and retains a
screenshot and trace for any failing test.

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

## Future automated coverage

Move a checklist item above into `test/e2e/` once its sheet grows real
user-facing interaction beyond a bare name field — for example, once NPC or
Vehicle sheets have distinguishing fields worth asserting on, or once
inventory/embedded-item UI exists for Trait and Effect items.

## Maintenance

When a story adds schema fields, add a verify step to the relevant section for each new field (manual checklist), or a UI assertion (Playwright), depending on where that field's sheet lives. Keep steps minimal — one line per field, checking that it saves and reloads correctly.
