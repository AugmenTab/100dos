import { devices, test as base, type ConsoleMessage, type Page } from "@playwright/test";
import { e2eGmUserLabel } from "./e2e-users.js";
import { ensureGameView, waitForGameReady } from "./foundry-session.js";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://foundry-test:30000";

const CLEAN_JOIN_ATTEMPTS = 5;

/**
 * Foundry buffers socket events that arrive while the client is booting and
 * replays them once the world snapshot has loaded. Each replay is dispatched
 * without awaiting the previous one, so another worker's fixture reset
 * caught mid-boot (Actor create, then a separate embedded Item create) can
 * resolve the Item create against the snapshot's Actor instance just before
 * the replayed Actor create replaces that instance with an Item-less copy.
 * This client then permanently lacks those Items, and every later update to
 * them throws "Cannot read properties of undefined (reading '_source')" in
 * core's #handleUpdateDocuments — failing whichever unrelated test is
 * running on this page at the time. A boot that replayed no document
 * modifications can't be affected, so reload until one replays none.
 */
async function ensureCleanJoin(page: Page, join: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    let replayed = 0;
    const onConsole = (msg: ConsoleMessage): void => {
      // Only document modifications can desynchronize the world data;
      // other buffered traffic (user activity and the like) is harmless.
      if (/^Applying buffered socket event: modifyDocument/.test(msg.text())) replayed++;
    };
    page.on("console", onConsole);
    try {
      await join();
    } finally {
      page.off("console", onConsole);
    }
    if (replayed === 0) return;
    if (attempt === CLEAN_JOIN_ATTEMPTS) {
      throw new Error(
        `Foundry replayed buffered socket events on each of ${CLEAN_JOIN_ATTEMPTS} joins; ` +
          "this client's world data may be inconsistent.",
      );
    }
    await page.reload();
  }
}

/**
 * The expensive Foundry client lifecycle (client boot, world connection,
 * websocket setup, system init, game.ready) is paid once per worker instead
 * of once per test. Test isolation still comes from resetFixtures() inside
 * each test body, not from re-navigating this page. baseURL is a test-scope
 * option in Playwright's fixture typing, so it isn't available to a
 * worker-scoped fixture — read the same env var the config itself does.
 */
export const test = base.extend<Record<never, never>, { foundryPage: Page; fixtureLane: number }>({
  // parallelIndex (not workerIndex) is the stable 0..N-1 concurrent-slot id
  // Playwright itself recommends for scoping a shared/exclusive resource —
  // it stays put even if a crashed worker process is restarted mid-run.
  fixtureLane: [
    async ({}, use, workerInfo) => {
      await use(workerInfo.parallelIndex);
    },
    { scope: "worker" },
  ],
  foundryPage: [
    async ({ browser, fixtureLane }, use) => {
      // No shared storageState: each worker joins as its own dedicated
      // [E2E] Gamemaster N user (provisioned once in global-setup.ts).
      // Concurrent workers sharing one authenticated session previously
      // collided on that single user's session slot on the /join screen.
      const context = await browser.newContext({
        ...devices["Desktop Chrome"],
      });
      const page = await context.newPage();
      let joined = false;
      await ensureCleanJoin(page, async () => {
        if (joined) {
          await waitForGameReady(page);
          return;
        }
        await page.goto(BASE_URL);
        await ensureGameView(page, e2eGmUserLabel(fixtureLane));
        joined = true;
      });

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
