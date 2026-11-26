// Player-level verbs for the sheets a journey drives. Each method is one
// thing a person does with the mouse and keyboard; none reaches into
// Foundry's API to make something happen.
import { type Locator } from "@playwright/test";
import { expect, type Table } from "./table.js";

/** Type into a bound field and leave it, which is what submits it. */
async function enter(field: Locator, value: string): Promise<void> {
  await field.fill(value);
  await field.blur();
}

export type ActionSpec = {
  name: string;
  activation?: string;
  uses?: { per: string; value: string };
  type?: string;
  attack?: { name: string; characteristic: string; bonus: string };
  damage?: { dice: string; die: string; base: string; pierce: string };
};

export type ChangeSpec = { mode: "add" | "set"; formula: string; category?: string; target: string };

export class ItemSheetView {
  constructor(
    private readonly table: Table,
    readonly root: Locator,
  ) {}

  private get page() {
    return this.table.page;
  }

  async tab(id: string): Promise<Locator> {
    await this.root.locator(`[role="tab"][data-group="primary"][data-tab="${id}"]`).click();
    const panel = this.root.locator(`.tab[data-group="primary"][data-tab="${id}"]`);
    await expect(panel).toHaveClass(/active/);
    return panel;
  }

  async enter(name: string, value: string): Promise<void> {
    await enter(this.root.locator(`[name="${name}"]`), value);
  }

  /** Add Action in Details, then fill it in through the Action editor. */
  async addAction(spec: ActionSpec): Promise<void> {
    const details = await this.tab("details");
    const editButtons = details.locator('button[data-action="editAction"]');
    const before = await editButtons.count();
    await details.locator('thead button[data-action="addAction"]').click();
    await expect(editButtons).toHaveCount(before + 1);
    await editButtons.last().click();

    const editor = this.page.locator(".action-sheet");
    await expect(editor).toBeVisible();
    await enter(editor.locator('.dos100-item-header input[name="name"]'), spec.name);

    if (spec.activation || spec.uses) {
      await editor.locator('[role="tab"][data-tab="usage"]').click();
      if (spec.activation) await editor.locator('select[name="activation.type"]').selectOption(spec.activation);
      if (spec.uses) {
        await editor.locator('select[name="uses.per"]').selectOption(spec.uses.per);
        await enter(editor.locator('input[name="uses.value"]'), spec.uses.value);
      }
    }
    if (spec.type) {
      await editor.locator('[role="tab"][data-tab="action"]').click();
      await editor.locator('select[name="type"]').selectOption(spec.type);
      if (spec.attack) {
        await enter(editor.locator('input[name="attack.name"]'), spec.attack.name);
        await editor.locator('select[name="attack.characteristic"]').selectOption(spec.attack.characteristic);
        await enter(editor.locator('input[name="attack.bonus"]'), spec.attack.bonus);
      }
      if (spec.damage) {
        await enter(editor.locator('input[name="damage.dice.count"]'), spec.damage.dice);
        await editor.locator('select[name="damage.dice.die"]').selectOption(spec.damage.die);
        await enter(editor.locator('input[name="damage.base"]'), spec.damage.base);
        await enter(editor.locator('input[name="damage.pierce"]'), spec.damage.pierce);
      }
    }
    await this.table.close(editor);
    await expect(details.locator("table.dense-table").first()).toContainText(spec.name);
  }

  /** Add Change on the Changes tab, choosing its target in the picker. */
  async addChange(spec: ChangeSpec): Promise<void> {
    const changes = await this.tab("changes");
    await changes.locator('thead button[data-action="addChange"]').click();
    const editor = this.page.locator(".change-editor-dialog");
    await expect(editor).toBeVisible();
    await editor.locator('select[name="mode"]').selectOption(spec.mode);
    await editor.locator('input[name="formula"]').fill(spec.formula);
    await editor.locator('button[data-action="selectTarget"]').click();
    const picker = this.page.locator(".change-target-picker-dialog");
    await expect(picker).toBeVisible();
    if (spec.category) await picker.locator("nav button", { hasText: spec.category }).click();
    await picker.locator(`button[data-action="pickTarget"][data-target="${spec.target}"]`).click();
    await expect(picker).toHaveCount(0);
    await editor.locator('button[data-action="saveAndClose"]').click();
    await expect(editor).toHaveCount(0);
  }
}

export class PcSheetView {
  constructor(
    private readonly table: Table,
    readonly root: Locator,
  ) {}

  private get page() {
    return this.table.page;
  }

  /** The XP acquisition prompt shared by Ability, Race, Soldier Type, Skill and Education purchases. */
  get xpDialog(): Locator {
    return this.page.locator(".ability-acquisition-dialog");
  }

  /** Where Items dragged onto the character land. */
  get dropZone(): Locator {
    return this.root.locator(".window-content");
  }

  async tab(id: string): Promise<Locator> {
    await this.root.locator(`[role="tab"][data-group="primary"][data-tab="${id}"]`).click();
    const panel = this.root.locator(`.tab[data-group="primary"][data-tab="${id}"]`);
    await expect(panel).toHaveClass(/active/);
    return panel;
  }

  async recordTab(id: string): Promise<Locator> {
    await this.tab("record");
    await this.root.locator(`[role="tab"][data-group="record"][data-tab="${id}"]`).click();
    const panel = this.root.locator(`.tab[data-group="record"][data-tab="${id}"]`);
    await expect(panel).toHaveClass(/active/);
    return panel;
  }

  async enter(name: string, value: string): Promise<void> {
    await enter(this.root.locator(`[name="${name}"]`), value);
  }

  /** Answer an XP prompt: Record (optionally at an edited amount), Skip or Cancel. */
  async answerXp(choice: "record" | "skip" | "cancel", amount?: string): Promise<void> {
    await expect(this.xpDialog).toBeVisible();
    if (amount !== undefined) await this.xpDialog.locator("input[type='number']").fill(amount);
    // An acquisition prompt labels its record button "create"; a training
    // change prompt labels it "record". Either way it's the same choice.
    const selector = {
      record: 'button[data-action="create"], button[data-action="record"]',
      skip: 'button[data-action="skip"]',
      cancel: 'button[data-action="cancelDialog"]',
    }[choice];
    await this.xpDialog.locator(selector).click();
    await expect(this.xpDialog).toHaveCount(0);
  }

  /**
   * Drag an Item from the sidebar onto the tab where it will show (Features
   * by default) and answer its XP prompt, if it raises one. The drop lands in
   * the middle of the sheet, so dropping onto a busy tab such as Skills risks
   * landing on a row with its own drop handling.
   */
  async acquire(itemName: string, xp: "record" | "skip" | "none", onTab = "features"): Promise<void> {
    await this.tab(onTab);
    await this.table.drag("items", itemName, this.dropZone);
    if (xp === "none") return;
    await expect(this.xpDialog).toContainText(itemName);
    await this.answerXp(xp);
  }
}
