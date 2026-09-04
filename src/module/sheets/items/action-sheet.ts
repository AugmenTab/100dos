import { type Dos100Item } from "../../documents/item.js";
import { ACTION_TYPES, ATTACK_ACTION_TYPES, ATTACK_CHARACTERISTIC_DEFAULTS, ACTIVATION_TYPES, COST_HIDDEN_TYPES, DAMAGE_DICE, DAMAGE_TYPE_TAGS, DURATION_TYPES, DURATION_VALUE_TYPES, HELD_TYPES, RANGE_TYPES, RANGE_VALUE_TYPES, USAGE_PERIODS, type ActionAttack, type ActionDamage, type ActionDurationType, type ActionRangeType, type ActionType, type Actions, type ActivationType, type DamageDie } from "../../items/action.js";
import { CHARACTERISTIC_IDS } from "../../characteristic.js";
import { buildActionUpdates } from "./action-updates.js";
import { DamageTypeDialog } from "./damage-type-dialog.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #updateHookId: number | undefined;

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "sheet", "action-sheet"],
    position: { width: 600, height: 480 },
    window: { resizable: true, title: "DOS100.item.actionSheet.title" },
    form: { submitOnChange: true },
    actions: {
      addActionEffectNote: ActionSheet.prototype._onAddActionEffectNote,
      deleteActionEffectNote: ActionSheet.prototype._onDeleteActionEffectNote,
      addActionFootnote: ActionSheet.prototype._onAddActionFootnote,
      deleteActionFootnote: ActionSheet.prototype._onDeleteActionFootnote,
      editDamageTypes: ActionSheet.prototype._onEditDamageTypes,
      editImage: ActionSheet.prototype._onEditImage,
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

    const attackData: ActionAttack = {
      name: action.attack?.name ?? "",
      held: action.attack?.held ?? "default",
      characteristic: action.attack?.characteristic ?? (ATTACK_CHARACTERISTIC_DEFAULTS[action.type as ActionType] ?? "wfm"),
      bonus: action.attack?.bonus ?? "",
      critical: {
        success: action.attack?.critical?.success ?? 1,
        failure: action.attack?.critical?.failure ?? 100,
      },
    };
    const heldTypes = Object.entries(HELD_TYPES).map(([value, label]) => ({
      value,
      label,
      selected: value === attackData.held,
    }));
    const characteristicTypes = CHARACTERISTIC_IDS.map((id) => ({
      value: id,
      label: `DOS100.characteristic.${id}.full`,
      selected: id === attackData.characteristic,
    }));

    const damageData: ActionDamage = {
      dice: {
        count: action.damage?.dice?.count ?? 0,
        die: action.damage?.dice?.die ?? "d10",
      },
      base: action.damage?.base ?? "",
      pierce: action.damage?.pierce ?? "",
      types: action.damage?.types ?? ["universal"],
    };
    const diceTypes = (Object.entries(DAMAGE_DICE) as [DamageDie, string][]).map(([value, label]) => ({
      value,
      label,
      selected: value === damageData.dice.die,
    }));
    const damageTypeLabel = damageData.types.map(t => DAMAGE_TYPE_TAGS[t]).join(" ");

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
      attackData,
      heldTypes,
      characteristicTypes,
      damageData,
      diceTypes,
      damageTypeLabel,
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

    const actionTypeSelect = this.element.querySelector<HTMLSelectElement>('[name="type"]');
    const attackSection = this.element.querySelector<HTMLFieldSetElement>('fieldset.dos100-attack-section');

    const syncAttackSection = (type: string): void => {
      if (attackSection === null) return;
      const show = ATTACK_ACTION_TYPES.has(type as ActionType);
      attackSection.hidden = !show;
      attackSection.disabled = !show;
    };

    const syncDamageSection = (type: string): void => {
      const isHealing = type === "healing";
      for (const el of Array.from(this.element.querySelectorAll<HTMLElement>('[data-damage-label][data-healing-label]'))) {
        el.textContent = isHealing ? (el.dataset.healingLabel ?? "") : (el.dataset.damageLabel ?? "");
      }
      for (const row of Array.from(this.element.querySelectorAll<HTMLElement>('.dos100-pierce-row, .dos100-damage-type-row'))) {
        row.hidden = isHealing;
        for (const input of Array.from(row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'))) {
          input.disabled = isHealing;
        }
      }
    };

    if (actionTypeSelect !== null) {
      syncAttackSection(actionTypeSelect.value);
      syncDamageSection(actionTypeSelect.value);
      actionTypeSelect.addEventListener("change", () => {
        syncAttackSection(actionTypeSelect.value);
        syncDamageSection(actionTypeSelect.value);
      });
    }

    const updateSlider = (slider: HTMLInputElement): void => {
      const value = Number(slider.value);
      const min = Number(slider.min);
      const max = Number(slider.max);
      const pct = ((value - min) / (max - min)) * 100;
      slider.style.setProperty("--dos100-fill-pct", `${pct}%`);
      const group = slider.closest(".dos100-slider-group");
      const output = group?.querySelector<HTMLOutputElement>("output");
      if (output !== null && output !== undefined) output.value = String(value);
    };

    for (const slider of Array.from(this.element.querySelectorAll<HTMLInputElement>("input.dos100-slider"))) {
      updateSlider(slider);
      slider.addEventListener("input", () => updateSlider(slider));
    }

    const actionForm = this.element.querySelector<HTMLFormElement>("form");
    if (actionForm !== null) {
      actionForm.addEventListener("change", async (event: Event) => {
        const fd = new FormDataExtended(actionForm);
        await this._onSubmitForm(event, actionForm, fd);
      });
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

  protected _onEditImage(_event: PointerEvent, target: HTMLElement): void {
    const current = (target as HTMLImageElement).src;
    const fp = new FilePicker({
      type: "image",
      current,
      callback: (path: string) => {
        void this.#item.update({ [`system.actions.items.${this.#actionId}.img`]: path });
      },
    });
    void fp.browse();
  }

  protected async _onEditDamageTypes(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const action = system.actions.items[this.#actionId];
    const currentTypes = action.damage?.types ?? ["universal"];
    const dialog = new DamageTypeDialog(this.#item, this.#actionId, currentTypes);
    await dialog.render(true);
  }

  protected async _onSubmitForm(
    _event: Event,
    _form: HTMLFormElement,
    formData: { object: Record<string, unknown> },
  ): Promise<void> {
    await this.#item.update(buildActionUpdates(this.#actionId, formData.object));
  }
}
