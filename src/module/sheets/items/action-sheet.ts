import { type Dos100Item } from "../../documents/item.js";
import { ACTION_TYPES, ATTACK_ACTION_TYPES, ATTACK_CHARACTERISTIC_DEFAULTS, ACTIVATION_TYPES, COST_HIDDEN_TYPES, DAMAGE_DICE, DAMAGE_TYPE_TAGS, DURATION_TYPES, DURATION_VALUE_TYPES, HELD_TYPES, RANGE_TYPES, RANGE_VALUE_TYPES, SPECIAL_RULES, USAGE_PERIODS, type ActionAttack, type ActionDamage, type ActionDurationType, type ActionRangeType, type ActionSpecialRules, type ActionType, type Actions, type ActivationType, type DamageDie, type ItemRef, type SpecialRuleId, type SpecialRuleOverride } from "../../items/action.js";
import { CHARACTERISTIC_IDS } from "../../characteristic.js";
import { buildActionUpdates, buildOpposedTestRows, deleteOpposedTestOption, reorderOpposedTestOptions } from "./action-updates.js";
import { DamageTypeDialog } from "./damage-type-dialog.js";
import { OpposedTestDialog } from "./opposed-test-dialog.js";
import { SpecialRulesDialog } from "./special-rules-dialog.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ActionSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #updateHookId: number | undefined;
  #tabPanelsScrollTop: number = 0;

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
      editSpecialRules: ActionSheet.prototype._onEditSpecialRules,
      editImage: ActionSheet.prototype._onEditImage,
      addOpposedTest: ActionSheet.prototype._onAddOpposedTest,
      editOpposedTest: ActionSheet.prototype._onEditOpposedTest,
      deleteOpposedTest: ActionSheet.prototype._onDeleteOpposedTest,
      createOpposedTestEffect: ActionSheet.prototype._onCreateOpposedTestEffect,
      editOpposedTestEffect: ActionSheet.prototype._onEditOpposedTestEffect,
      deleteOpposedTestEffect: ActionSheet.prototype._onDeleteOpposedTestEffect,
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
    form: { template: "systems/100dos/templates/items/action/action-shell.hbs", scrollable: [".dos100-action-tab-panels"] },
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
      specialDamageBonus: action.damage?.specialDamageBonus ?? "",
    };
    const diceTypes = (Object.entries(DAMAGE_DICE) as [DamageDie, string][]).map(([value, label]) => ({
      value,
      label,
      selected: value === damageData.dice.die,
    }));
    const damageTypeLabel = damageData.types.map(t => DAMAGE_TYPE_TAGS[t]).join(" ");

    const opposedTestRows = buildOpposedTestRows(
      action.opposedTest?.options ?? [],
      (key: string) => game.i18n.localize(key),
    );
    const targetFailureEffect = action.opposedTest?.targetFailureEffect ?? null;

    const specialRulesMap: ActionSpecialRules = action.specialRules ?? {};
    const specialRulePills = (Object.entries(specialRulesMap) as [SpecialRuleId, SpecialRuleOverride][]).map(([id, override]) => {
      const entry = SPECIAL_RULES[id];
      const displayName = game.i18n.localize(entry?.name ?? id);
      if (override.mode === "disabled") {
        return { label: `- ${displayName}`, variant: "destructive", tooltip: null as string | null };
      }
      const formula = override.mode === "override" ? (override as { mode: "override"; formula?: string }).formula : undefined;
      if (entry?.hasValue === true && formula !== undefined && formula !== "") {
        const tooltip = formula.length > 12 ? formula : null;
        const display = formula.length > 12 ? `${formula.slice(0, 12)}…` : formula;
        return { label: `+ ${displayName} (${display})`, variant: "neutral", tooltip };
      }
      return { label: `+ ${displayName}`, variant: "neutral", tooltip: null as string | null };
    });

    const canCreateEffect = opposedTestRows.length > 0 && targetFailureEffect === null;

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
      specialRulePills,
      opposedTestRows,
      targetFailureEffect,
      canCreateEffect,
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);

    const savedScrollTop = this.#tabPanelsScrollTop;
    requestAnimationFrame(() => {
      const panels = this.element?.querySelector<HTMLElement>(".dos100-action-tab-panels");
      if (panels !== null && panels !== undefined) panels.scrollTop = savedScrollTop;
    });

    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    this.#updateHookId = Hooks.on("updateItem", (doc: unknown, _changes: unknown, options: unknown) => {
      if ((doc as { id: string }).id !== this.#item.id) return;
      if ((options as { render?: boolean }).render === false) return;
      this.#tabPanelsScrollTop = this.element?.querySelector<HTMLElement>(".dos100-action-tab-panels")?.scrollTop ?? 0;
      void this.render(true);
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

    const specialRulesSection = this.element.querySelector<HTMLElement>(".dos100-special-rules-section");
    const syncSpecialRulesSection = (type: string): void => {
      if (specialRulesSection === null) return;
      specialRulesSection.hidden = type === "healing";
    };

    if (actionTypeSelect !== null) {
      syncAttackSection(actionTypeSelect.value);
      syncDamageSection(actionTypeSelect.value);
      syncSpecialRulesSection(actionTypeSelect.value);
      actionTypeSelect.addEventListener("change", () => {
        syncAttackSection(actionTypeSelect.value);
        syncDamageSection(actionTypeSelect.value);
        syncSpecialRulesSection(actionTypeSelect.value);
      });
    }

    // TODO: When Skill Stamp Items exist, dropping one onto the Opposed Tests section
    // should create a Skill Opposed Test option and append it to opposedTest.options.
    let dragIndex: number | null = null;
    for (const row of Array.from(this.element.querySelectorAll<HTMLElement>(".dos100-opposed-tests-body tr[data-index]"))) {
      row.addEventListener("dragstart", () => { dragIndex = Number(row.dataset.index); });
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", () => {
        const targetIndex = Number(row.dataset.index);
        if (dragIndex === null || dragIndex === targetIndex) { dragIndex = null; return; }
        const system = this.#item.system as { actions: Actions };
        const reordered = reorderOpposedTestOptions(
          system.actions.items[this.#actionId].opposedTest?.options ?? [],
          dragIndex,
          targetIndex,
        );
        dragIndex = null;
        this.#saveScrollTop();
        void this.#item.update({ [`system.actions.items.${this.#actionId}.opposedTest.options`]: reordered }, { render: false }).then(() => this.render());
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

    const dd = new foundry.applications.ux.DragDrop.implementation({
      dropSelector: null,
      permissions: { drop: () => true },
      callbacks: { drop: (e: DragEvent) => { void this._onDrop(e); } },
    });
    dd.bind(this.element);

    const dropZone = this.element.querySelector<HTMLElement>("[data-drop-zone='targetFailureEffect']");
    if (dropZone !== null) {
      dropZone.addEventListener("dragenter", (e) => { e.preventDefault(); dropZone.classList.add("drop-target"); });
      dropZone.addEventListener("dragover", (e) => { e.preventDefault(); });
      dropZone.addEventListener("dragleave", (e) => {
        if (!dropZone.contains(e.relatedTarget as Node)) dropZone.classList.remove("drop-target");
      });
      dropZone.addEventListener("drop", () => { dropZone.classList.remove("drop-target"); });
    }

    const actionForm = this.element.querySelector<HTMLFormElement>("form");
    if (actionForm !== null) {
      actionForm.addEventListener("change", async (event: Event) => {
        const fd = new foundry.applications.ux.FormDataExtended(actionForm);
        await this._onSubmitForm(event, actionForm, fd);
      });
    }
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    if (this.#updateHookId !== undefined) Hooks.off("updateItem", this.#updateHookId);
    this.#item.sheet?.render();
    this.#item.actor?.sheet?.render();
    return super.close(options);
  }

  override _onDrop(event: DragEvent): void | Promise<void> {
    return (async () => {
      const system = this.#item.system as { actions: Actions };
      const action = system.actions.items[this.#actionId];
      if ((action.opposedTest?.options ?? []).length === 0) return;
      const raw = event.dataTransfer?.getData("text/plain");
      if (!raw) return;
      let dropData: { type?: string; uuid?: string };
      try { dropData = JSON.parse(raw) as { type?: string; uuid?: string }; } catch { return; }
      if (dropData.type !== "Item" || dropData.uuid === undefined) return;
      const dropped = await fromUuid<Item>(dropData.uuid);
      if (dropped === null || dropped.type !== "effect") return;
      const ref: ItemRef = { uuid: dropped.uuid, name: dropped.name, img: dropped.img };
      this.#saveScrollTop();
      await this.#item.update({ [`system.actions.items.${this.#actionId}.opposedTest.targetFailureEffect`]: ref }, { render: false });
      await this.render();
    })();
  }

  protected async _onAddActionEffectNote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.effectNotes ?? [];
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.effectNotes`]: [...notes, ""] }, { render: false });
    await this.render();
  }

  protected async _onDeleteActionEffectNote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.effectNotes ?? [];
    const index = Number(target.dataset.identifier);
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.effectNotes`]: notes.filter((_: string, i: number) => i !== index) }, { render: false });
    await this.render();
  }

  protected async _onAddActionFootnote(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.footnotes ?? [];
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.footnotes`]: [...notes, ""] }, { render: false });
    await this.render();
  }

  protected async _onDeleteActionFootnote(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const notes = system.actions.items[this.#actionId].notes?.footnotes ?? [];
    const index = Number(target.dataset.identifier);
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.notes.footnotes`]: notes.filter((_: string, i: number) => i !== index) }, { render: false });
    await this.render();
  }

  protected _onEditImage(_event: PointerEvent, target: HTMLElement): void {
    const current = (target as HTMLImageElement).src;
    const fp = new FilePicker({
      type: "image",
      current,
      callback: (path: string) => {
        this.#saveScrollTop();
        void this.#item.update({ [`system.actions.items.${this.#actionId}.img`]: path }, { render: false }).then(() => this.render());
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

  protected async _onEditSpecialRules(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const action = system.actions.items[this.#actionId];
    const current: ActionSpecialRules = { ...(action.specialRules ?? {}) };
    const dialog = new SpecialRulesDialog(this.#item, this.#actionId, current);
    await dialog.render(true);
  }

  protected async _onAddOpposedTest(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const dialog = new OpposedTestDialog(this.#item, this.#actionId, null, null);
    await dialog.render(true);
  }

  protected async _onEditOpposedTest(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const index = Number(target.dataset.index);
    const system = this.#item.system as { actions: Actions };
    const option = (system.actions.items[this.#actionId].opposedTest?.options ?? [])[index];
    if (option === undefined) return;
    const dialog = new OpposedTestDialog(this.#item, this.#actionId, index, option);
    await dialog.render(true);
  }

  protected async _onDeleteOpposedTest(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const index = Number(target.dataset.index);
    const system = this.#item.system as { actions: Actions };
    const updated = deleteOpposedTestOption(
      system.actions.items[this.#actionId].opposedTest?.options ?? [],
      index,
    );
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.opposedTest.options`]: updated }, { render: false });
    await this.render();
  }

  protected async _onCreateOpposedTestEffect(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    if (this.#item.actor === null) return;
    const system = this.#item.system as { actions: Actions };
    const action = system.actions.items[this.#actionId];
    const [created] = await this.#item.actor.createEmbeddedDocuments("Item", [{
      name: `${action.name} — Target Effect`,
      type: "effect",
      system: { deleteOnExpire: true },
    }]);
    if (created === undefined) return;
    const ref: ItemRef = { uuid: created.uuid, name: created.name, img: created.img };
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.opposedTest.targetFailureEffect`]: ref }, { render: false });
    await this.render();
    created.sheet?.render(true);
  }

  protected async _onEditOpposedTestEffect(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const system = this.#item.system as { actions: Actions };
    const ref = system.actions.items[this.#actionId].opposedTest?.targetFailureEffect;
    if (ref === null || ref === undefined) return;
    const item = await fromUuid<Item>(ref.uuid);
    if (item === null) return;
    item.sheet?.render(true);
  }

  protected async _onDeleteOpposedTestEffect(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#saveScrollTop();
    await this.#item.update({ [`system.actions.items.${this.#actionId}.opposedTest.targetFailureEffect`]: null }, { render: false });
    await this.render();
  }

  protected async _onSubmitForm(
    _event: Event,
    _form: HTMLFormElement,
    formData: { object: Record<string, unknown> },
  ): Promise<void> {
    await this.#item.update(buildActionUpdates(this.#actionId, formData.object), { render: false });
  }

  #saveScrollTop(): void {
    this.#tabPanelsScrollTop = this.element?.querySelector<HTMLElement>(".dos100-action-tab-panels")?.scrollTop ?? 0;
  }
}
