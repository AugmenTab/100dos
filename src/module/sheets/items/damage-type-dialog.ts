import { type Dos100Item } from "../../documents/item.js";
import { DAMAGE_TYPES, DAMAGE_TYPE_TAGS, normalizeDamageTypes, type DamageType } from "../../items/action.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class DamageTypeDialog extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  #item: Dos100Item;
  #actionId: string;
  #currentTypes: DamageType[];

  constructor(item: Dos100Item, actionId: string, currentTypes: DamageType[], options?: Partial<Record<string, unknown>>) {
    super(options);
    this.#item = item;
    this.#actionId = actionId;
    this.#currentTypes = currentTypes;
  }

  static override DEFAULT_OPTIONS = {
    classes: ["dos100", "damage-type-dialog"],
    position: { width: 280 },
    window: { title: "DOS100.item.damageTypeDialog.title" },
    actions: {
      saveAndClose: DamageTypeDialog.prototype._onSaveAndClose,
    },
  };

  static override PARTS = {
    form: { template: "systems/100dos/templates/items/dialogs/damage-type-dialog.hbs" },
  };

  override async _prepareContext(_options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const damageTypeOptions = (Object.entries(DAMAGE_TYPES) as [DamageType, string][]).map(([value, label]) => ({
      value,
      label,
      tag: DAMAGE_TYPE_TAGS[value],
      selected: this.#currentTypes.includes(value),
    }));
    return { damageTypeOptions };
  }

  protected async _onSaveAndClose(_event: PointerEvent, _target: HTMLElement): Promise<void> {
    const checkboxes = Array.from(
      this.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    );
    const selected = checkboxes
      .filter(cb => cb.checked)
      .map(cb => cb.value as DamageType);
    const normalized = normalizeDamageTypes(selected);
    await this.#item.update({
      [`system.actions.items.${this.#actionId}.damage.types`]: normalized,
    });
    await this.close();
  }
}
