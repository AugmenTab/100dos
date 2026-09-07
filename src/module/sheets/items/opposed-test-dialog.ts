import { type Dos100Item } from "../../documents/item.js";
import { CHARACTERISTIC_IDS, type CharacteristicId } from "../../characteristic.js";
import { type Actions, type OpposedTestOption } from "../../items/action.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class OpposedTestDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #index: number | null;
  #option: OpposedTestOption | null;

  constructor(
    item: Dos100Item,
    actionId: string,
    index: number | null,
    option: OpposedTestOption | null,
    options?: Partial<Record<string, unknown>>,
  ) {
    super(options);
    this.#item = item;
    this.#actionId = actionId;
    this.#index = index;
    this.#option = option;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "opposed-test-dialog"],
    position: { width: 360 },
    window: { title: "DOS100.action.opposedTest.dialog.addTitle" },
    actions: {
      saveAndClose: OpposedTestDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/opposed-test-dialog.hbs" },
  };

  get title(): string {
    const key = this.#index === null
      ? "DOS100.action.opposedTest.dialog.addTitle"
      : "DOS100.action.opposedTest.dialog.editTitle";
    return game.i18n.localize(key);
  }

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const currentType = this.#option?.type ?? "characteristic";

    const characteristicOptions = CHARACTERISTIC_IDS.map(id => ({
      value: id,
      label: `DOS100.characteristic.${id}.full`,
      selected: currentType === "characteristic" && this.#option?.type === "characteristic"
        ? this.#option.characteristic === id
        : id === "str",
    }));

    const skillCharacteristics = this.#option?.type === "skill" ? this.#option.characteristics : [];
    const characteristicCheckboxes = CHARACTERISTIC_IDS.map(id => ({
      value: id,
      abbr: id.toUpperCase(),
      checked: skillCharacteristics.includes(id),
    }));

    return {
      currentType,
      characteristicOptions,
      skillName: this.#option?.type === "skill" ? this.#option.name : "",
      skillIdentifier: this.#option?.type === "skill" ? this.#option.identifier : "",
      characteristicCheckboxes,
    };
  }

  // TODO: When Skill Stamp Items exist, dropping one onto this dialog should
  // populate the Skill form with the Stamp's name, identifier, and Characteristic data.
  override _onRender(_context: Record<string, unknown>, _options: Record<string, unknown>): void {
    const typeSelect = this.element.querySelector<HTMLSelectElement>('[name="type"]');
    const syncSections = (type: string): void => {
      for (const section of Array.from(this.element.querySelectorAll<HTMLElement>("[data-type-section]"))) {
        const visible = section.dataset.typeSection === type;
        section.hidden = !visible;
        for (const input of Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"))) {
          input.disabled = !visible;
        }
      }
    };
    if (typeSelect !== null) {
      syncSections(typeSelect.value);
      typeSelect.addEventListener("change", () => syncSections(typeSelect.value));
    }
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const typeSelect = this.element.querySelector<HTMLSelectElement>('[name="type"]');
    const type = typeSelect?.value ?? "characteristic";

    let option: OpposedTestOption;
    if (type === "characteristic") {
      const charSelect = this.element.querySelector<HTMLSelectElement>('[name="characteristic"]');
      option = { type: "characteristic", characteristic: (charSelect?.value ?? "str") as CharacteristicId };
    } else {
      const nameInput = this.element.querySelector<HTMLInputElement>('[name="skillName"]');
      const identifierInput = this.element.querySelector<HTMLInputElement>('[name="skillIdentifier"]');
      const checkedBoxes = Array.from(
        this.element.querySelectorAll<HTMLInputElement>('input[name="skillCharacteristics"]:checked'),
      );
      option = {
        type: "skill",
        name: nameInput?.value ?? "",
        identifier: identifierInput?.value ?? "",
        characteristics: checkedBoxes.map(cb => cb.value as CharacteristicId),
      };
    }

    const system = this.#item.system as { actions: Actions };
    const existing = [...(system.actions.items[this.#actionId].opposedTest?.options ?? [])];
    if (this.#index === null) {
      existing.push(option);
    } else {
      existing[this.#index] = option;
    }

    await this.#item.update({
      [`system.actions.items.${this.#actionId}.opposedTest.options`]: existing,
    });
    await this.close();
  }
}
