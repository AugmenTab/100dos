import { devices, test as base, type Page } from "@playwright/test";
import { AUTH_STATE_PATH } from "./constants.js";
import { ensureGameView } from "./foundry-session.js";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://foundry-test:30000";

/**
 * The expensive Foundry client lifecycle (client boot, world connection,
 * websocket setup, system init, game.ready) is paid once per worker instead
 * of once per test. Test isolation still comes from resetFixtures() inside
 * each test body, not from re-navigating this page. baseURL is a test-scope
 * option in Playwright's fixture typing, so it isn't available to a
 * worker-scoped fixture — read the same env var the config itself does.
 */
export const test = base.extend<Record<never, never>, { foundryPage: Page }>({
  foundryPage: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      });
      const page = await context.newPage();
      await page.goto(BASE_URL);
      await ensureGameView(page);

      // Foundry core sets `html:focus-within { scroll-behavior: smooth; }`
      // (foundry2.css), which is true throughout normal interactive test
      // use — every scrollIntoViewIfNeeded() then pays a real animation
      // duration instead of jumping. Not under test here, so disable it.
      //
      // Forcing animation/transition-duration to 0 was also tried, but
      // caused a real test failure/timeout: some Foundry core UI logic
      // (window/tab transitions) awaits a `transitionend` event that never
      // fires once the duration is zero, stalling until the outer test
      // timeout. scroll-behavior carries no such hazard, so only that is
      // overridden here.
      await page.addStyleTag({
        content: `
          html { scroll-behavior: auto !important; }
        `,
      });

      await use(page);

      await context.close();
    },
    { scope: "worker" },
  ],
});
