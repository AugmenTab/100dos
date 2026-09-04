import { type Dos100Item } from "../../documents/item.js";
import { normalizeSpecialRules, SPECIAL_RULES, type ActionSpecialRules, type SpecialRuleId } from "../../items/action.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

type SpecialRuleRow = {
  id: SpecialRuleId;
  name: string;
  hasValue: boolean;
  mode: "inherit" | "disabled" | "override";
  modeLabel: string;
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
      cycleMode: SpecialRulesDialog.prototype._onCycleMode,
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
        modeLabel: `DOS100.item.specialRulesDialog.mode.${mode}`,
        formula,
        placeholder: "",
        formulaDisabled: mode !== "override" || !entry.hasValue,
      };
    });
    return { rows };
  }

  protected _onCycleMode(_event: PointerEvent, target: HTMLElement): void {
    const id = target.dataset.ruleId as SpecialRuleId;
    const current = target.dataset.currentMode as "inherit" | "disabled" | "override";
    const next: Record<"inherit" | "disabled" | "override", "inherit" | "disabled" | "override"> = {
      inherit: "disabled",
      disabled: "override",
      override: "inherit",
    };
    const newMode = next[current];
    target.dataset.currentMode = newMode;
    target.classList.remove(`dos100-special-rule-cycle--${current}`);
    target.classList.add(`dos100-special-rule-cycle--${newMode}`);
    target.textContent = game.i18n.localize(`DOS100.item.specialRulesDialog.mode.${newMode}`);

    const row = target.closest<HTMLElement>("[data-rule-id-row]");
    const formulaInput = row?.querySelector<HTMLInputElement>("input");
    if (formulaInput !== null && formulaInput !== undefined) {
      const enabled = newMode === "override" && (SPECIAL_RULES[id]?.hasValue ?? false);
      formulaInput.disabled = !enabled;
      if (!enabled) formulaInput.value = "";
    }
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const rows: Array<{ id: SpecialRuleId; mode: "inherit" | "disabled" | "override"; formula?: string }> = [];
    for (const li of Array.from(this.element.querySelectorAll<HTMLElement>("[data-rule-id-row]"))) {
      const id = li.dataset.ruleIdRow as SpecialRuleId;
      const btn = li.querySelector<HTMLElement>("[data-current-mode]");
      const mode = btn?.dataset.currentMode as "inherit" | "disabled" | "override" | undefined;
      if (mode === undefined) continue;
      const formulaInput = li.querySelector<HTMLInputElement>("input");
      rows.push({ id, mode, formula: formulaInput?.value });
    }
    const result = normalizeSpecialRules(rows);
    await this.#item.update({
      [`system.actions.items.${this.#actionId}.specialRules`]: result,
    });
    await this.close();
  }
}
