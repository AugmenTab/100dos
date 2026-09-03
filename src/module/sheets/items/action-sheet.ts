import { type Dos100Item } from "../../documents/item.js";
import { ACTION_TYPES, ACTIVATION_TYPES, COST_HIDDEN_TYPES, DURATION_TYPES, DURATION_VALUE_TYPES, RANGE_TYPES, RANGE_VALUE_TYPES, USAGE_PERIODS, type ActionDurationType, type ActionRangeType, type Actions, type ActivationType } from "../../items/action.js";
import { buildActionUpdates } from "./action-updates.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #updateHookId: number | undefined;

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "action-sheet"],
    position: { width: 600, height: 480 },
    window: { resizable: true, title: "DOS100.item.actionSheet.title" },
    form: { handler: ActionSheet.prototype._onSubmitForm, submitOnChange: true },
    actions: {
      addActionEffectNote: ActionSheet.prototype._onAddActionEffectNote,
      deleteActionEffectNote: ActionSheet.prototype._onDeleteActionEffectNote,
      addActionFootnote: ActionSheet.prototype._onAddActionFootnote,
      deleteActionFootnote: ActionSheet.prototype._onDeleteActionFootnote,
    },
  };

  static override TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "DOS100.item.actionSheet.tabs.description" },
        { id: "usage", label: "DOS100.item.actionSheet.tabs.usage" },
        { id: "action", label: "DOS100.item.actionSheet.tabs.action" },
        { id: "miscellaneous", label: "DOS100.item.actionSheet.tabs.miscellaneous" },
      ],
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/action/action-shell.hbs", scrollable: [".tab.active"] },
  };

  constructor(item: Dos100Item, actionId: string, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#item = item;
    this.#actionId = actionId;
  }

  get title(): string {
    const system = this.#item.system as { actions: Actions };
    const action = system.actions.items[this.#actionId];
    return action?.name ?? game.i18n.localize("DOS100.item.actionSheet.title");
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const system = this.#item.system as { actions: Actions };
    const action = system.actions.items[this.#actionId];
    const activationTypes = Object.entries(ACTIVATION_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === action.activation.type,
    }));
    const rangeType = action.range?.type ?? "none";
    const rangeTypes = Object.entries(RANGE_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === rangeType,
    }));
    const durationType = action.duration?.type ?? "na";
    const durationTypes = Object.entries(DURATION_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === durationType,
    }));
    const usagePeriods = Object.entries(USAGE_PERIODS).map(([value, label]) => ({
      value,
      label,
      selected: value === action.uses?.per,
    }));
    const actionTypes = Object.entries(ACTION_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === (action.type ?? "other"),
    }));
    const parentPoolUnlimited = system.actions.uses.per === "unlimited";
    return {
      ...await super._prepareContext(options),
      sheetId: this.id,
      tabs: { primary: this._prepareTabs("primary") },
      action,
      activationTypes,
      rangeTypes,
      durationTypes,
      actionTypes,
      usagePeriods,
      parentPoolUnlimited,
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);

    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    this.#updateHookId = Hooks.on("updateItem", (doc: unknown) => {
      if ((doc as { id: string }).id === this.#item.id) void this.render(true);
    });

    const activationSelect = this.element.querySelector<HTMLSelectElement>('[name="activation.type"]');
    const costInput = this.element.querySelector<HTMLInputElement>('[name="activation.cost"]');

    const syncCostInput = (type: string): void => {
      if (costInput === null) return;
      const hide = COST_HIDDEN_TYPES.has(type as ActivationType);
      costInput.hidden = hide;
      costInput.disabled = hide;
    };

    if (activationSelect !== null) {
      syncCostInput(activationSelect.value);
      activationSelect.addEventListener("change", () => syncCostInput(activationSelect.value));
    }

    const rangeSelect = this.element.querySelector<HTMLSelectElement>('[name="range.type"]');
    const rangeValue = this.element.querySelector<HTMLInputElement>('[name="range.value"]');

    const syncRangeValue = (type: string): void => {
      if (rangeValue === null) return;
      const hide = !RANGE_VALUE_TYPES.has(type as ActionRangeType);
      rangeValue.hidden = hide;
      rangeValue.disabled = hide;
    };

    if (rangeSelect !== null) {
      syncRangeValue(rangeSelect.value);
      rangeSelect.addEventListener("change", () => syncRangeValue(rangeSelect.value));
    }

    const durationSelect = this.element.querySelector<HTMLSelectElement>('[name="duration.type"]');
    const durationValue = this.element.querySelector<HTMLInputElement>('[name="duration.value"]');

    const syncDurationValue = (type: string): void => {
      if (durationValue === null) return;
      const hide = !DURATION_VALUE_TYPES.has(type as ActionDurationType);
      durationValue.hidden = hide;
      durationValue.disabled = hide;
    };

    if (durationSelect !== null) {
      syncDurationValue(durationSelect.value);
      durationSelect.addEventListener("change", () => syncDurationValue(durationSelect.value));
    }

    const itemCostFormula = this.element.querySelector<HTMLInputElement>('[name="uses.itemCost.formula"]');
    const itemCostPerAttack = this.element.querySelector<HTMLInputElement>('[name="uses.itemCost.perAttack"]');

    const syncItemCost = (unlimited: boolean): void => {
      for (const el of [itemCostFormula, itemCostPerAttack]) {
        if (el === null) continue;
        el.hidden = unlimited;
        el.disabled = unlimited;
      }
    };

    const parentPoolUnlimited = (context["parentPoolUnlimited"] as boolean) === true;
    syncItemCost(parentPoolUnlimited);

    const usesSelect = this.element.querySelector<HTMLSelectElement>('[name="uses.per"]');
    const usesCurrent = this.element.querySelector<HTMLInputElement>('[name="uses.value"]');
    const usesMax = this.element.querySelector<HTMLElement>('.dos100-uses-max');

    const syncActionUses = (per: string): void => {
      const unlimited = per === "unlimited";
      if (usesCurrent !== null) { usesCurrent.hidden = unlimited; usesCurrent.disabled = unlimited; }
      if (usesMax !== null) usesMax.hidden = unlimited;
    };

    if (usesSelect !== null) {
      syncActionUses(usesSelect.value);
      usesSelect.addEventListener("change", () => syncActionUses(usesSelect.value));
    }
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    return super.close(options);
  }

  protected async _onAddActionEffectNote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.effectNotes ?? [];
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.effectNotes`]: [...notes, ""] });
  }

  protected async _onDeleteActionEffectNote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.effectNotes ?? [];
    const index = Number(target.dataset.identifier);
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.effectNotes`]: notes.filter((_: string, i: number) => i !== index) });
  }

  protected async _onAddActionFootnote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.footnotes ?? [];
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.footnotes`]: [...notes, ""] });
  }

  protected async _onDeleteActionFootnote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.footnotes ?? [];
    const index = Number(target.dataset.identifier);
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.footnotes`]: notes.filter((_: string, i: number) => i !== index) });
  }

  protected async _onSubmitForm(
    _event: Event,
    _form: HTMLFormElement,
    formData: { object: Record<string, unknown> },
  ): Promise<void> {
    await this.#item.update(buildActionUpdates(this.#actionId, formData.object));
  }
}
