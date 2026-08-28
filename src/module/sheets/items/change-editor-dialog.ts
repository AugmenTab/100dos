import {
  type ChangeData,
  type ConditionalChangeData,
  type ChangeMode,
  type ChangeTarget,
} from "../../change.js";
import {
  buildChangeTargetCategories,
  findCategoryForTarget,
  resolveTargetLabel,
  type ActorContext,
  type ChangeTargetCategoryId,
} from "../../change-targets.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class ChangeTargetPickerDialog extends HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  #current: string;
  #activeCategory: ChangeTargetCategoryId;
  #actor: ActorContext;
  #resolve: ((result: ChangeTarget | null) => void) | null;

  static async prompt(current: string, actor: ActorContext = null): Promise<ChangeTarget | null> {
    return new Promise(resolve => {
      const dialog = new ChangeTargetPickerDialog(current, actor, resolve);
      void dialog.render(true);
    });
  }

  constructor(
    current: string,
    actor: ActorContext,
    resolve: (result: ChangeTarget | null) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#current = current;
    this.#actor = actor;
    this.#resolve = resolve;
    const localize = (key: string) => game.i18n.localize(key);
    const categories = buildChangeTargetCategories(localize, actor);
    const found = current ? findCategoryForTarget(current, categories) : null;
    this.#activeCategory = found ?? categories[0].id;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "change-target-picker-dialog"],
    position: { width: 500, height: 400 },
    window: { title: "DOS100.item.changeEditor.targetPicker.title" },
    actions: {
      switchCategory: ChangeTargetPickerDialog.prototype._onSwitchCategory,
      pickTarget: ChangeTargetPickerDialog.prototype._onPickTarget,
      cancelDialog: ChangeTargetPickerDialog.prototype._onCancelDialog,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/change-target-picker.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const localize = (key: string) => game.i18n.localize(key);
    const categories = buildChangeTargetCategories(localize, this.#actor);
    const active = categories.find(c => c.id === this.#activeCategory) ?? categories[0];
    return {
      categories: categories.map(c => ({ ...c, active: c.id === active.id })),
      activeTargets: active.targets.map(t => ({ ...t, current: t.target === this.#current })),
    };
  }

  protected async _onSwitchCategory(_event: PointerEvent, target: HTMLElement): Promise<void> {
    this.#activeCategory = target.dataset.category as ChangeTargetCategoryId;
    await this.render();
  }

  protected async _onPickTarget(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const value = target.dataset.target as ChangeTarget;
    this.#resolve?.(value);
    this.#resolve = null;
    await this.close();
  }

  protected async _onCancelDialog(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#resolve?.(null);
    this.#resolve = null;
    await this.close();
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    this.#resolve?.(null);
    this.#resolve = null;
    return super.close(options);
  }
}

export class ChangeEditorDialog extends HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  #kind: "change" | "conditional";
  #id: string;
  #enabled: boolean;
  #source: { id: string; name: string };
  #target: string;
  #mode: ChangeMode;
  #formula: string;
  #value: string;
  #actor: ActorContext;
  #resolve: ((result: ChangeData | ConditionalChangeData | null) => void) | null;

  static async promptChange(
    data: ChangeData,
    titleKey: string,
    actor: ActorContext = null,
  ): Promise<ChangeData | null> {
    return new Promise<ChangeData | ConditionalChangeData | null>(resolve => {
      const dialog = new ChangeEditorDialog("change", data, actor, resolve, {
        window: { title: titleKey },
      });
      void dialog.render(true);
    }) as Promise<ChangeData | null>;
  }

  static async promptConditional(
    data: ConditionalChangeData,
    titleKey: string,
    actor: ActorContext = null,
  ): Promise<ConditionalChangeData | null> {
    return new Promise<ChangeData | ConditionalChangeData | null>(resolve => {
      const dialog = new ChangeEditorDialog("conditional", data, actor, resolve, {
        window: { title: titleKey },
      });
      void dialog.render(true);
    }) as Promise<ConditionalChangeData | null>;
  }

  constructor(
    kind: "change" | "conditional",
    data: ChangeData | ConditionalChangeData,
    actor: ActorContext,
    resolve: (result: ChangeData | ConditionalChangeData | null) => void,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#kind = kind;
    this.#id = data.id;
    this.#enabled = data.enabled;
    this.#source = { ...data.source };
    this.#target = data.target;
    this.#mode = (data as ChangeData).mode ?? "add";
    this.#formula = (data as ChangeData).formula ?? "";
    this.#value = (data as ConditionalChangeData).value ?? "";
    this.#actor = actor;
    this.#resolve = resolve;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "change-editor-dialog"],
    position: { width: 500 },
    window: { title: "DOS100.item.changeEditor.title.editChange" },
    actions: {
      selectTarget: ChangeEditorDialog.prototype._onSelectTarget,
      saveAndClose: ChangeEditorDialog.prototype._onSaveAndClose,
      cancelDialog: ChangeEditorDialog.prototype._onCancelDialog,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/change-editor.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const localize = (key: string) => game.i18n.localize(key);
    return {
      kind: this.#kind,
      target: this.#target,
      targetLabel: resolveTargetLabel(this.#target, localize, this.#actor),
      modes: [
        { value: "add", label: localize("DOS100.item.changes.mode.add") },
        { value: "set", label: localize("DOS100.item.changes.mode.set") },
      ],
      mode: this.#mode,
      formula: this.#formula,
      value: this.#value,
    };
  }

  private _captureFormValues(): void {
    if (this.#kind === "change") {
      const modeEl = this.element.querySelector<HTMLSelectElement>('select[name="mode"]');
      const formulaEl = this.element.querySelector<HTMLInputElement>('input[name="formula"]');
      if (modeEl) this.#mode = modeEl.value as ChangeMode;
      if (formulaEl) this.#formula = formulaEl.value;
    } else {
      const valueEl = this.element.querySelector<HTMLTextAreaElement>('textarea[name="value"]');
      if (valueEl) this.#value = valueEl.value;
    }
  }

  protected async _onSelectTarget(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this._captureFormValues();
    const picked = await ChangeTargetPickerDialog.prompt(this.#target, this.#actor);
    if (picked !== null) {
      this.#target = picked;
      await this.render();
    }
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this._captureFormValues();
    if (!this.#target) return;
    const result: ChangeData | ConditionalChangeData =
      this.#kind === "change"
        ? {
            id: this.#id,
            enabled: this.#enabled,
            target: this.#target as ChangeTarget,
            mode: this.#mode,
            formula: this.#formula,
            source: this.#source,
          }
        : {
            id: this.#id,
            enabled: this.#enabled,
            target: this.#target as ChangeTarget,
            value: this.#value,
            source: this.#source,
          };
    this.#resolve?.(result);
    this.#resolve = null;
    await this.close();
  }

  protected async _onCancelDialog(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    this.#resolve?.(null);
    this.#resolve = null;
    await this.close();
  }

  override async close(options?: Record<string, unknown>): Promise<this> {
    this.#resolve?.(null);
    this.#resolve = null;
    return super.close(options);
  }
}
