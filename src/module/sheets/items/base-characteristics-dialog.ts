import { CHARACTERISTIC_IDS } from "../../characteristic.js";
import { type BaseCharacteristics, parseBaseCharacteristics } from "../../base-characteristics.js";
import { PromptDialog } from "../prompt-dialog.js";

// Edits a complete Base Characteristics lineup: all ten inputs, every one
// required. Adding starts every input blank — never prefilled with zeros —
// so a lineup can't be saved without each value being entered on purpose.
// Resolves the saved lineup, or null on cancel (leaving the Item as it was).
export class BaseCharacteristicsDialog extends PromptDialog<BaseCharacteristics | null> {
  protected override readonly cancelResult: BaseCharacteristics | null = null;
  readonly #initial: BaseCharacteristics | null;

  static async prompt(initial: BaseCharacteristics | null): Promise<BaseCharacteristics | null> {
    return new BaseCharacteristicsDialog(initial).wait();
  }

  constructor(initial: BaseCharacteristics | null, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#initial = initial;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "foundation-dialog", "base-characteristics-dialog"],
    position: { width: 420 },
    window: { title: "DOS100.foundation.baseCharacteristics.addTitle" },
    actions: {
      saveAndClose: BaseCharacteristicsDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/base-characteristics.hbs" },
  };

  get title(): string {
    return game.i18n.localize(
      this.#initial === null
        ? "DOS100.foundation.baseCharacteristics.addTitle"
        : "DOS100.foundation.baseCharacteristics.editTitle",
    );
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      sheetId: this.id,
      characteristics: CHARACTERISTIC_IDS.map((id) => ({
        id,
        abbr: game.i18n.localize(`DOS100.characteristic.${id}.abbr`),
        full: game.i18n.localize(`DOS100.characteristic.${id}.full`),
        value: this.#initial === null ? "" : String(this.#initial[id]),
      })),
    };
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const form = this.element.querySelector<HTMLFormElement>("form");
    if (form === null) return;
    const inputs = new Map(
      CHARACTERISTIC_IDS.map((id) => [id, form.querySelector<HTMLInputElement>(`[name="${id}"]`)] as const),
    );
    const result = parseBaseCharacteristics(
      Object.fromEntries(CHARACTERISTIC_IDS.map((id) => [id, inputs.get(id)?.value ?? ""])),
    );
    const invalid = new Set(result.ok ? [] : result.errors);
    const message = result.ok
      ? ""
      : game.i18n.format("DOS100.foundation.invalidValues", {
          names: result.errors.map((id) => game.i18n.localize(`DOS100.characteristic.${id}.abbr`)).join(", "),
        });
    for (const [id, input] of inputs) input?.setCustomValidity(invalid.has(id) ? message : "");
    if (!form.reportValidity() || !result.ok) return;
    await this.settle(result.value);
  }
}
