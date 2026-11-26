# Test authoring rules

## Classify before writing

Every test must be classified before it is written. There are exactly two tiers:

**Browser tier** (`test/browser/`) — for any assertion about 100DOS's own rendering: template output, markup structure, attribute values, text content, CSS class presence. These run in milliseconds against a local Handlebars instance with no Foundry involved. Default to this tier.

**E2E tier** (`test/e2e/`) — only for behavior that requires Foundry's JavaScript runtime: click handlers that open ApplicationV2 windows, form persistence and Document rerender, ProseMirror integration, window lifecycle (open/close/tab-switch via Foundry's own machinery). If a test can be written without a live Foundry world, it does not belong here.

When in doubt, ask: "Does this assertion require Foundry to run JavaScript?" If no, it's browser-tier.

**Player simulations** (`test/simulations/*.sim.ts`) are not a third tier for feature tests. Each one is a single long journey a player commonly makes (prepare content, build a character, play an encounter), driven through the UI from the sidebar onward. Add a beat to an existing journey only when the feature is something players do in most sessions, and add a new journey only for a new common journey. Follow the rules in `docs/adr-0001-player-simulations.md`.

## E2E tests are expensive

The e2e suite runs against a live Foundry instance with a shared worker-scoped session. Each new e2e test that opens a sheet, opens a dialog, or performs a Foundry API call adds real wall-clock seconds to the suite. The full suite runs in about 40s (80 tests, 3 workers) — do not regress it carelessly. Most of that speed comes from `support/session.ts` disabling Foundry's game canvas, which renders in software here; never re-enable it unless a test genuinely needs the canvas.

Before adding an e2e test:
- Confirm it cannot be a browser-tier test.
- Check how existing tests in the same file share setup. Do not give each test its own full fixture reset + sheet open + navigation if they can share it.
- Each independent Foundry round-trip (resetFixtures, openItemSheet, opening an ApplicationV2 window) has a real cost. Minimize them.

## Do not split what belongs together

Nearly-identical assertions about the same feature belong in one test, not spread across multiple tests each with their own setup. Coupling test failures is acceptable; redundant Foundry round-trips are not.
