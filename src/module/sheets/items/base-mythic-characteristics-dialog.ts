import {
  MYTHIC_CHARACTERISTIC_IDS,
  type BaseMythicCharacteristics,
  type MythicCharacteristicInput,
  parseBaseMythicCharacteristics,
} from "../../base-mythic-characteristics.js";
import { PromptDialog } from "../prompt-dialog.js";

// Edits Base Mythic Characteristics: each of STR/TOU/AGI has its own
// Present checkbox beside its number input, so absence (null) and zero stay
// distinct — an absent row's input is disabled and ignored. Resolves the
// saved structure, or null on cancel (leaving the Item as it was).
export class BaseMythicCharacteristicsDialog extends PromptDialog<BaseMythicCharacteristics | null> {
  protected override readonly cancelResult: BaseMythicCharacteristics | null = null;
  readonly #initial: BaseMythicCharacteristics | null;

  static async prompt(initial: BaseMythicCharacteristics | null): Promise<BaseMythicCharacteristics | null> {
    return new BaseMythicCharacteristicsDialog(initial).wait();
  }

  constructor(initial: BaseMythicCharacteristics | null, options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#initial = initial;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "foundation-dialog", "base-mythic-characteristics-dialog"],
    position: { width: 360 },
    window: { title: "DOS100.foundation.baseMythicCharacteristics.addTitle" },
    actions: {
      saveAndClose: BaseMythicCharacteristicsDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/base-mythic-characteristics.hbs" },
  };

  get title(): string {
    return game.i18n.localize(
      this.#initial === null
        ? "DOS100.foundation.baseMythicCharacteristics.addTitle"
        : "DOS100.foundation.baseMythicCharacteristics.editTitle",
    );
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      sheetId: this.id,
      characteristics: MYTHIC_CHARACTERISTIC_IDS.map((id) => {
        const value = this.#initial?.[id] ?? null;
        return {
          id,
          full: game.i18n.format("DOS100.mythicCharacteristic.fullName", {
            name: game.i18n.localize(`DOS100.characteristic.${id}.full`),
          }),
          present: value !== null,
          value: value === null ? "" : String(value),
        };
      }),
    };
  }

  override _onRender(context: Record<string, unknown>, options: Record<string, unknown>): void {
    super._onRender(context, options);
    for (const checkbox of Array.from(this.element.querySelectorAll<HTMLInputElement>("input[data-present-for]"))) {
      checkbox.addEventListener("change", () => {
        const input = this.element.querySelector<HTMLInputElement>(`input[name="${checkbox.dataset.presentFor}"]`);
        if (input) input.disabled = !checkbox.checked;
      });
    }
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const form = this.element.querySelector<HTMLFormElement>("form");
    if (form === null) return;
    const raw: Partial<Record<(typeof MYTHIC_CHARACTERISTIC_IDS)[number], MythicCharacteristicInput>> = {};
    for (const id of MYTHIC_CHARACTERISTIC_IDS) {
      const present = form.querySelector<HTMLInputElement>(`input[data-present-for="${id}"]`)?.checked ?? false;
      raw[id] = { present, value: form.querySelector<HTMLInputElement>(`input[name="${id}"]`)?.value ?? "" };
    }
    const result = parseBaseMythicCharacteristics(raw);
    const invalid = new Set(result.ok ? [] : result.errors);
    const message = result.ok
      ? ""
      : game.i18n.format("DOS100.foundation.invalidValues", {
          names: result.errors.map((id) => game.i18n.localize(`DOS100.characteristic.${id}.abbr`)).join(", "),
        });
    for (const id of MYTHIC_CHARACTERISTIC_IDS) {
      form.querySelector<HTMLInputElement>(`input[name="${id}"]`)?.setCustomValidity(invalid.has(id) ? message : "");
    }
    if (!form.reportValidity() || !result.ok) return;
    await this.settle(result.value);
  }
}
