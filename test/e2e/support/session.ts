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
 * running on this page at the time.
 *
 * Replays themselves are routine while other workers are writing, so only a
 * boot that replayed document modifications is checked, and only for this
 * damage: an Actor this client holds lacking an Item the server has for it.
 * The server is read directly (a non-broadcast "get"). Another worker can
 * create an Item between that read and the comparison, so a missing Item
 * counts only if it is still missing on a second look a moment later —
 * genuine damage persists for the life of the page. Damage means reload.
 */
async function ensureCleanJoin(page: Page, join: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    let replayed = 0;
    const onConsole = (msg: ConsoleMessage): void => {
      // Other buffered traffic (user activity and the like) is harmless.
      if (/^Applying buffered socket event: modifyDocument/.test(msg.text())) replayed++;
    };
    page.on("console", onConsole);
    try {
      await join();
    } finally {
      page.off("console", onConsole);
    }
    if (replayed === 0) return;
    const missing = await itemsMissingLocally(page);
    if (missing.length === 0) return;
    await page.waitForTimeout(1_000);
    const again = new Set(await itemsMissingLocally(page));
    const persistent = missing.filter((key) => again.has(key));
    if (persistent.length === 0) return;
    if (attempt === CLEAN_JOIN_ATTEMPTS) {
      throw new Error(
        `After ${CLEAN_JOIN_ATTEMPTS} joins this client still lacks Items the server holds: ${persistent.join(", ")}`,
      );
    }
    await page.reload();
  }
}

/** "actorId.itemId" for every server-side Item the client's copy of its Actor lacks. */
async function itemsMissingLocally(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const backend = (globalThis as unknown as {
      CONFIG: { DatabaseBackend: { get(cls: unknown, op: object): Promise<Array<{ id: string; items: Iterable<{ id: string }> }>> } };
    }).CONFIG.DatabaseBackend;
    const serverActors = await backend.get(Actor, { query: {} });
    const missing: string[] = [];
    for (const serverActor of serverActors) {
      const local = game.actors.get(serverActor.id);
      if (!local) continue;
      for (const item of serverActor.items) {
        if (!local.items.get(item.id)) missing.push(`${serverActor.id}.${item.id}`);
      }
    }
    return missing;
  });
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
