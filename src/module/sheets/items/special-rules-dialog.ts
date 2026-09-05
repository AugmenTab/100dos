import { type Dos100Item } from "../../documents/item.js";
import { normalizeSpecialRules, SPECIAL_RULES, type Actions, type ActionSpecialRules, type SpecialRuleId, type SpecialRuleOverride } from "../../items/action.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForcedDeletion: new () => unknown = ((foundry as any).data.operators as any).ForcedDeletion;

const { HandlebarsApplicationMixin } = foundry.applications.api;

type SpecialRuleRow = {
  id: SpecialRuleId;
  name: string;
  hasValue: boolean;
  mode: "inherit" | "disabled" | "override";
  formula: string;
  placeholder: string;
  formulaDisabled: boolean;
};

export class SpecialRulesDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #current: ActionSpecialRules;

  constructor(item: Dos100Item, actionId: string, current: ActionSpecialRules, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#item = item;
    this.#actionId = actionId;
    this.#current = current;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "special-rules-dialog"],
    position: { width: 480 },
    window: { title: "DOS100.item.specialRulesDialog.title" },
    actions: {
      saveAndClose: SpecialRulesDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/special-rules-dialog.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rows: SpecialRuleRow[] = (Object.entries(SPECIAL_RULES) as [SpecialRuleId, (typeof SPECIAL_RULES)[SpecialRuleId]][]).map(([id, entry]) => {
      const override = this.#current[id];
      const mode: "inherit" | "disabled" | "override" =
        override === undefined         ? "inherit"
        : override.mode === "disabled" ? "disabled"
        :                                "override";
      const formula = override?.mode === "override" ? (override.formula ?? "") : "";
      return {
        id,
        name: entry.name,
        hasValue: entry.hasValue,
        mode,
        formula,
        placeholder: "",
        formulaDisabled: mode !== "override" || !entry.hasValue,
      };
    });
    return { rows };
  }

  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    for (const li of Array.from(this.element.querySelectorAll<HTMLElement>("[data-rule-id-row]"))) {
      const id = li.dataset.ruleIdRow as SpecialRuleId;
      const modeSelect = li.querySelector<HTMLSelectElement>(`select[name="mode-${id}"]`);
      const formulaInput = li.querySelector<HTMLInputElement>("input");
      if (modeSelect === null || modeSelect === undefined) continue;

      const override = this.#current[id];
      const initialMode: "inherit" | "disabled" | "override" =
        override === undefined         ? "inherit"
        : override.mode === "disabled" ? "disabled"
        :                                "override";
      modeSelect.value = initialMode;

      if (formulaInput === null || formulaInput === undefined) continue;
      modeSelect.addEventListener("change", () => {
        const enabled = modeSelect.value === "override" && (SPECIAL_RULES[id]?.hasValue ?? false);
        formulaInput.disabled = !enabled;
        if (!enabled) formulaInput.value = "";
      });
    }
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const rows: Array<{ id: SpecialRuleId; mode: "inherit" | "disabled" | "override"; formula?: string }> = [];
    for (const li of Array.from(this.element.querySelectorAll<HTMLElement>("[data-rule-id-row]"))) {
      const id = li.dataset.ruleIdRow as SpecialRuleId;
      const modeSelect = li.querySelector<HTMLSelectElement>("select");
      const mode = (modeSelect?.value ?? "inherit") as "inherit" | "disabled" | "override";
      const formulaInput = li.querySelector<HTMLInputElement>("input");
      rows.push({ id, mode, formula: formulaInput?.value });
    }
    const result = normalizeSpecialRules(rows);

    // Foundry's _diffObject processes deletion before set operations. Combining
    // a whole-subtree delete with per-key sets on the same path causes the
    // deletion to win when no values actually changed (empty diff overwrites
    // nothing, so ForcedDeletion stays). Fix: delete only the stale keys
    // individually, and set only the live ones. Each key is either deleted OR
    // set — never both in the same update.
    const system = this.#item.system as { actions: Actions };
    const liveRules: ActionSpecialRules = system.actions.items[this.#actionId].specialRules ?? {};
    const base = `system.actions.items.${this.#actionId}.specialRules`;
    const update: Record<string, unknown> = {};

    for (const id of Object.keys(liveRules) as SpecialRuleId[]) {
      if (result[id] === undefined) {
        update[`${base}.${id}`] = new ForcedDeletion();
      }
    }
    for (const [id, override] of Object.entries(result) as [SpecialRuleId, SpecialRuleOverride][]) {
      update[`${base}.${id}.mode`] = override.mode;
      if (override.mode === "override" && "formula" in override) {
        update[`${base}.${id}.formula`] = override.formula;
      }
    }

    await this.#item.update(update);
    await this.close();
  }
}
