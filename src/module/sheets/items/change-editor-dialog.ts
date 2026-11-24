import {
  type ChangeData,
  type ConditionalChangeData,
  type ChangeMode,
  type ChangeTarget,
  type ConditionalNoteTarget,
} from "../../change.js";
import {
  buildChangeTargetCategories,
  findCategoryForTarget,
  resolveTargetLabel,
  type ActorContext,
  type ChangeTargetCategoryId,
} from "../../change-targets.js";
import {
  buildConditionalNoteTargetCategories,
  findCategoryForConditionalNoteTarget,
  resolveConditionalNoteTargetLabel,
  type ConditionalNoteTargetCategoryId,
} from "../../conditional-note-targets.js";
import { PromptDialog } from "../prompt-dialog.js";

export class ChangeTargetPickerDialog extends PromptDialog<ChangeTarget | null> {
  protected override readonly cancelResult: ChangeTarget | null = null;
  #current: string;
  #activeCategory: ChangeTargetCategoryId;
  #actor: ActorContext;

  static async prompt(current: string, actor: ActorContext = null): Promise<ChangeTarget | null> {
    return new ChangeTargetPickerDialog(current, actor).wait();
  }

  constructor(
    current: string,
    actor: ActorContext,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#current = current;
    this.#actor = actor;
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
    await this.settle(value);
  }
}

export class ConditionalNoteTargetPickerDialog extends PromptDialog<ConditionalNoteTarget | null> {
  protected override readonly cancelResult: ConditionalNoteTarget | null = null;
  #current: string;
  #activeCategory: ConditionalNoteTargetCategoryId;
  #actor: ActorContext;

  static async prompt(current: string, actor: ActorContext = null): Promise<ConditionalNoteTarget | null> {
    return new ConditionalNoteTargetPickerDialog(current, actor).wait();
  }

  constructor(
    current: string,
    actor: ActorContext,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#current = current;
    this.#actor = actor;
    const localize = (key: string) => game.i18n.localize(key);
    const categories = buildConditionalNoteTargetCategories(localize, actor);
    const found = current ? findCategoryForConditionalNoteTarget(current, categories) : null;
    this.#activeCategory = found ?? categories[0].id;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "conditional-note-target-picker-dialog"],
    position: { width: 500, height: 400 },
    window: { title: "DOS100.item.conditionalNoteEditor.targetPicker.title" },
    actions: {
      switchCategory: ConditionalNoteTargetPickerDialog.prototype._onSwitchCategory,
      pickTarget: ConditionalNoteTargetPickerDialog.prototype._onPickTarget,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/change-target-picker.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const localize = (key: string) => game.i18n.localize(key);
    const categories = buildConditionalNoteTargetCategories(localize, this.#actor);
    const active = categories.find(c => c.id === this.#activeCategory) ?? categories[0];
    return {
      categories: categories.map(c => ({ ...c, active: c.id === active.id })),
      activeTargets: active.targets.map(t => ({ ...t, current: t.target === this.#current })),
    };
  }

  protected async _onSwitchCategory(_event: PointerEvent, target: HTMLElement): Promise<void> {
    this.#activeCategory = target.dataset.category as ConditionalNoteTargetCategoryId;
    await this.render();
  }

  protected async _onPickTarget(_event: PointerEvent, target: HTMLElement): Promise<void> {
    const value = target.dataset.target as ConditionalNoteTarget;
    await this.settle(value);
  }
}

export class ChangeEditorDialog extends PromptDialog<ChangeData | ConditionalChangeData | null> {
  protected override readonly cancelResult: ChangeData | ConditionalChangeData | null = null;
  #kind: "change" | "conditional";
  #id: string;
  #enabled: boolean;
  #source: { id: string; name: string };
  #target: string;
  #mode: ChangeMode;
  #formula: string;
  #value: string;
  #actor: ActorContext;

  static async promptChange(
    data: ChangeData,
    titleKey: string,
    actor: ActorContext = null,
  ): Promise<ChangeData | null> {
    return new ChangeEditorDialog("change", data, actor, {
      window: { title: titleKey },
    }).wait() as Promise<ChangeData | null>;
  }

  static async promptConditional(
    data: ConditionalChangeData,
    titleKey: string,
    actor: ActorContext = null,
  ): Promise<ConditionalChangeData | null> {
    return new ChangeEditorDialog("conditional", data, actor, {
      window: { title: titleKey },
    }).wait() as Promise<ConditionalChangeData | null>;
  }

  constructor(
    kind: "change" | "conditional",
    data: ChangeData | ConditionalChangeData,
    actor: ActorContext,
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
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "change-editor-dialog"],
    position: { width: 500 },
    window: { title: "DOS100.item.changeEditor.title.editChange" },
    actions: {
      selectTarget: ChangeEditorDialog.prototype._onSelectTarget,
      saveAndClose: ChangeEditorDialog.prototype._onSaveAndClose,
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
      targetLabel: this.#kind === "conditional"
        ? resolveConditionalNoteTargetLabel(this.#target, localize, this.#actor)
        : resolveTargetLabel(this.#target, localize, this.#actor),
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
    let picked: string | null;
    if (this.#kind === "conditional") {
      picked = await ConditionalNoteTargetPickerDialog.prompt(this.#target, this.#actor);
    } else {
      picked = await ChangeTargetPickerDialog.prompt(this.#target, this.#actor);
    }
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
            target: this.#target as ConditionalNoteTarget,
            value: this.#value,
            source: this.#source,
          };
    await this.settle(result);
  }
}
