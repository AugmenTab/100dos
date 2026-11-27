// The virtual table a simulation plays at. Everything here is a gesture a
// person at a real Foundry table makes — open the sidebar, create a document
// from it, drag an Item onto a sheet, read what's on screen — plus the
// bookkeeping that makes a journey repeatable (lane-scoped names, cleanup,
// pending beats). See docs/adr-0001-player-simulations.md.
import { expect, test as playwright, type Locator, type Page, type TestInfo } from "@playwright/test";
import { SYSTEM_ID } from "../../e2e/support/constants.js";
import { test as base } from "../../e2e/support/diagnostics.js";

export { expect };

type Directory = "actors" | "items";

export class Table {
  constructor(
    readonly page: Page,
    readonly lane: number,
    private readonly testInfo: TestInfo,
  ) {}

  /**
   * Every document a simulation creates is named with this prefix: cleanup
   * finds them by it, and journeys running in parallel lanes never meet one
   * another's documents in the sidebar.
   */
  get prefix(): string {
    return `[Sim ${this.lane}]`;
  }

  name(label: string): string {
    return `${this.prefix} ${label}`;
  }

  /** One narrated step of the journey; shows up by title in the report and the trace. */
  async beat<T>(title: string, body: () => Promise<T>): Promise<T> {
    return playwright.step(title, body);
  }

  /**
   * A beat players perform but the system can't do yet. It stays in the
   * script, in its place in the session, so the journey reads as the whole
   * session and every report lists what is still missing. When the feature
   * lands, replace the call with a real beat.
   */
  async pending(title: string, reason: string): Promise<void> {
    this.testInfo.annotations.push({ type: "pending beat", description: `${title} (${reason})` });
    await playwright.step(`PENDING: ${title}`, async () => {});
  }

  /**
   * World content the journey starts from but isn't about: the GM's prep,
   * already done. Created through the API because another simulation
   * already covers authoring it through the UI. Names are lane-prefixed by
   * the caller (table.name), so clear() removes them.
   */
  async given(title: string, items: Array<{ name: string; type: string; system?: Record<string, unknown> }>): Promise<void> {
    await playwright.step(`GIVEN: ${title}`, async () => {
      await this.page.evaluate(async (items) => {
        for (const data of items) await Item.create(data);
      }, items);
    });
  }

  /** A character that already exists when the journey begins, for journeys that aren't about building one. */
  async givenCharacter(
    title: string,
    actor: { name: string; system?: Record<string, unknown>; items: Array<{ name: string; type: string; system?: Record<string, unknown> }> },
  ): Promise<void> {
    await playwright.step(`GIVEN: ${title}`, async () => {
      await this.page.evaluate(async (actor) => {
        await Actor.create({ type: "pc", ...actor });
      }, actor);
    });
  }

  // ── Sidebar ────────────────────────────────────────────────────────────

  async openDirectory(directory: Directory): Promise<Locator> {
    const tab = this.page.locator(`#sidebar [data-action="tab"][data-tab="${directory}"]`);
    if ((await tab.getAttribute("aria-pressed")) !== "true") await tab.click();
    const panel = this.page.locator(`#${directory}`);
    await expect(panel).toBeVisible();
    return panel;
  }

  directoryEntry(directory: Directory, name: string): Locator {
    return this.page.locator(`#${directory} .directory-item`, { hasText: name });
  }

  /** "Create Item" / "Create Actor" from the sidebar; Foundry opens the new sheet itself. */
  async create(directory: Directory, type: string, name: string): Promise<Locator> {
    const panel = await this.openDirectory(directory);
    await panel.locator('[data-action="createEntry"]').click();
    const dialog = this.page.locator("dialog.application.dialog", { has: this.page.locator('select[name="type"]') });
    await dialog.locator('input[name="name"]').fill(name);
    await dialog.locator('select[name="type"]').selectOption(type);
    await dialog.locator('button[data-action="ok"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(this.directoryEntry(directory, name)).toBeVisible();
    return directory === "actors" ? this.actorSheet(name) : this.worldItemSheet(name);
  }

  /** Click a sidebar entry's name, as a player opens a sheet. */
  async open(directory: Directory, name: string): Promise<Locator> {
    await this.openDirectory(directory);
    await this.directoryEntry(directory, name).locator('[data-action="activateEntry"]').click();
    return directory === "actors" ? this.actorSheet(name) : this.worldItemSheet(name);
  }

  /**
   * Drag a sidebar entry onto a target — a sheet or a drop zone inside one.
   * Playwright's real mouse drag fires Chromium's native HTML5 drag events,
   * so Foundry's own dragstart builds the payload and the sheet's own drop
   * handler receives it.
   */
  async drag(directory: Directory, name: string, target: Locator): Promise<void> {
    await this.openDirectory(directory);
    const source = this.directoryEntry(directory, name);
    const id = await source.getAttribute("data-entry-id");
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    if (!box) throw new Error(`Can't drag "${name}": the target isn't on screen.`);

    // The HTML5 drag events are dispatched here, not produced by moving
    // Playwright's mouse. Chromium's own drag session proved unreliable
    // under parallel load: a drop sometimes came with no dragend, the
    // session stayed open, and the next drag dropped the previous one's
    // data. Dispatching the events still runs the real code on both ends.
    // Foundry's own dragstart handler on the sidebar entry fills the
    // DataTransfer, and the drop goes to whatever element is on top at the
    // target's centre, so a dialog covering the sheet blocks it as it
    // would block a hand.
    const dropped = await source.evaluate(
      (entry, { x, y }) => {
        const data = new DataTransfer();
        const at = { bubbles: true, cancelable: true, composed: true, dataTransfer: data, clientX: x, clientY: y };
        entry.dispatchEvent(new DragEvent("dragstart", { ...at, clientX: 0, clientY: 0 }));
        const under = document.elementFromPoint(x, y);
        if (under) {
          under.dispatchEvent(new DragEvent("dragenter", at));
          under.dispatchEvent(new DragEvent("dragover", at));
          under.dispatchEvent(new DragEvent("drop", at));
        }
        entry.dispatchEvent(new DragEvent("dragend", { ...at, clientX: 0, clientY: 0 }));
        return data.getData("text/plain");
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(dropped, `dragging "${name}" should carry it`).toContain(String(id));
  }

  // ── Sheets ─────────────────────────────────────────────────────────────

  async actorSheet(name: string): Promise<Locator> {
    const id = await this.page.waitForFunction((name) => {
      const sheet = game.actors.getName(name)?.sheet;
      return sheet?.rendered ? sheet.id : null;
    }, name);
    return this.placeAside(await id.jsonValue());
  }

  async worldItemSheet(name: string): Promise<Locator> {
    const id = await this.page.waitForFunction((name) => {
      const sheet = game.items.getName(name)?.sheet;
      return sheet?.rendered ? sheet.id : null;
    }, name);
    return this.placeAside(await id.jsonValue());
  }

  async ownedItemSheet(actorName: string, itemName: string): Promise<Locator> {
    const id = await this.page.waitForFunction(
      ({ actorName, itemName }) => {
        const sheet = game.actors.getName(actorName)?.items.getName(itemName)?.sheet;
        return sheet?.rendered ? sheet.id : null;
      },
      { actorName, itemName },
    );
    return this.placeAside(await id.jsonValue());
  }

  /**
   * Move a freshly opened sheet to the left edge, as a player drags a window
   * clear of the sidebar they're about to drag from. Foundry opens sheets
   * near the middle, where a wide one covers the sidebar tabs.
   */
  private async placeAside(id: string | null): Promise<Locator> {
    // waitForFunction only resolves on a truthy value, so this never fires.
    if (!id) throw new Error("Sheet rendered without an id.");
    await this.page.evaluate((id) => {
      foundry.applications.instances.get(id)?.setPosition({ left: 10, top: 10 });
    }, id);
    return this.page.locator(`#${id}`);
  }

  async close(sheet: Locator): Promise<void> {
    await sheet.locator('.window-header [data-action="close"]').click();
    await expect(sheet).toHaveCount(0);
  }

  // ── What is persisted (assertions only, never setup) ─────────────────

  async worldItem(name: string): Promise<{ type: string; system: Record<string, unknown> }> {
    return this.page.evaluate((name) => {
      const item = game.items.getName(name);
      if (!item) throw new Error(`World Item "${name}" not found.`);
      return JSON.parse(JSON.stringify({ type: item.type, system: item.system })) as { type: string; system: Record<string, unknown> };
    }, name);
  }

  async actor(name: string): Promise<{ system: Record<string, unknown>; items: Array<{ name: string; type: string; system: Record<string, unknown> }>; statuses: string[] }> {
    return this.page.evaluate((name) => {
      const actor = game.actors.getName(name);
      if (!actor) throw new Error(`Actor "${name}" not found.`);
      return JSON.parse(
        JSON.stringify({
          system: actor.system,
          items: actor.items.map((item) => ({ name: item.name, type: item.type, system: item.system })),
          statuses: Array.from(actor.statuses),
        }),
      ) as { system: Record<string, unknown>; items: Array<{ name: string; type: string; system: Record<string, unknown> }>; statuses: string[] };
    }, name);
  }

  // ── Bookkeeping ────────────────────────────────────────────────────────

  /** Removes every world Actor, Item and Combat this lane's simulations made. */
  async clear(): Promise<void> {
    await this.page.evaluate(
      async ({ prefix, systemId, lane }) => {
        for (const combat of game.combats.filter((c) => c.getFlag(systemId, "simLane") === lane)) await combat.delete();
        for (const actor of game.actors.filter((a) => a.name.startsWith(prefix))) await actor.delete();
        for (const item of game.items.filter((i) => i.name.startsWith(prefix))) await item.delete();
      },
      { prefix: `${this.prefix} `, systemId: SYSTEM_ID, lane: this.lane },
    );
  }
}

/**
 * Simulations share the e2e harness — one Foundry session per worker, the
 * clean-join check, and the diagnostics fixture that fails a journey on any
 * uncaught page error — and add a Table that starts and ends empty.
 */
export const test = base.extend<{ table: Table }>({
  table: async ({ foundryPage: page, fixtureLane }, use, testInfo) => {
    const table = new Table(page, fixtureLane, testInfo);
    await table.clear();
    await use(table);
    await table.clear();
  },
});
